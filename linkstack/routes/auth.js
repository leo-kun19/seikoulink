const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000;

// Rate limit for resend verification
const verificationResendTimes = new Map();

function checkBruteForce(ip) {
  const record = loginAttempts.get(ip);
  if (!record) return false;
  if (Date.now() - record.lastAttempt > LOCK_TIME) {
    loginAttempts.delete(ip);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip) {
  const record = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  record.count++;
  record.lastAttempt = Date.now();
  loginAttempts.set(ip, record);
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

function issueTokens(res, userId) {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(userId, tokenHash, expiresAt);

  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function sendVerificationEmail(user, token) {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const domain = process.env.DOMAIN || 'link.seikoupay.my.id';
  const verifyUrl = `https://${domain}/api/auth/verify-email?token=${token}`;

  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: user.email,
    subject: 'Verifikasi Email - SeikouLink',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem">
      <h2 style="margin-bottom:1rem">Verifikasi Email</h2>
      <p>Halo <strong>${user.username}</strong>,</p>
      <p>Klik tombol di bawah untuk verifikasi email kamu:</p>
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#ff6b35;color:#fff;text-decoration:none;font-weight:bold;margin:1.5rem 0">Verifikasi Email</a>
      <p style="font-size:0.85rem;color:#666">Kamu punya waktu 3 hari untuk verifikasi. Setelah itu akun akan dinonaktifkan sampai email diverifikasi.</p>
    </div>`
  });
}

router.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
  }

  if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
    return res.status(400).json({ error: 'Username: 3-30 chars, lowercase, numbers, dash, underscore only' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (password.length < 8 || password.length > 100) {
    return res.status(400).json({ error: 'Password 8-100 characters' });
  }

  const reservedUsernames = ['admin', 'api', 'dashboard', 'login', 'register', 'logout', 'static', 'uploads', 'forgot-password', 'reset-password', 'robots.txt', 'favicon.ico', 'www', 'mail', 'ftp', 'sitemap.xml'];
  if (reservedUsernames.includes(username.toLowerCase())) {
    return res.status(409).json({ error: 'Username tidak tersedia' });
  }

  // Content moderation on username
  const { checkContent } = require('../middleware/moderation');
  const usernameCheck = checkContent('', username);
  if (usernameCheck.blocked) {
    return res.status(400).json({ error: 'Username tidak diperbolehkan: mengandung kata terlarang' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.status(409).json({ error: 'Username atau email sudah dipakai' });
  }

  const hash = bcrypt.hashSync(password, 12);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  const result = db.prepare(
    "INSERT INTO users (username, email, password, display_name, email_verified, verification_token, verification_sent_at) VALUES (?, ?, ?, ?, 0, ?, datetime('now'))"
  ).run(username, email, hash, username, verificationToken);

  // Send verification email (fire-and-forget, log on error)
  sendVerificationEmail({ username, email }, verificationToken).catch(function(err) {
    console.error('[Register] Verification email error:', err.message);
  });

  // Issue tokens
  issueTokens(res, result.lastInsertRowid);

  logAudit(result.lastInsertRowid, 'register', req.ip, { username, email });

  res.json({ success: true, username });
});

router.post('/login', (req, res) => {
  const { login, password } = req.body;
  const ip = req.ip;

  if (checkBruteForce(ip)) {
    return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' });
  }

  if (!login || !password || typeof login !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'All fields required' });
  }

  if (login.length > 100 || password.length > 100) {
    return res.status(400).json({ error: 'Input too long' });
  }

  const user = db.prepare('SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1').get(login, login);

  const dummyHash = '$2a$12$abcdefghijklmnopqrstuv.WX1234567890ABCDEFGHIJKLMNOP12345';
  const validPassword = user
    ? bcrypt.compareSync(password, user.password)
    : (bcrypt.compareSync(password, dummyHash), false);

  if (!user || !validPassword) {
    recordFailedAttempt(ip);
    logAudit(user ? user.id : null, 'login_failed', ip, { login });
    const remaining = MAX_ATTEMPTS - (loginAttempts.get(ip)?.count || 0);
    return res.status(401).json({ error: 'Login gagal. ' + (remaining > 0 ? remaining + ' percobaan tersisa.' : 'Akun terkunci 15 menit.') });
  }

  clearAttempts(ip);

  // Check if 2FA is enabled
  if (user.totp_enabled) {
    // Issue a temporary token for 2FA verification (5 min expiry)
    const tempToken = jwt.sign({ id: user.id, purpose: '2fa' }, process.env.JWT_SECRET, { expiresIn: '5m' });
    return res.json({ requires_2fa: true, temp_token: tempToken });
  }

  // Issue tokens
  issueTokens(res, user.id);

  logAudit(user.id, 'login', ip, { username: user.username });

  res.json({ success: true, username: user.username, is_admin: user.is_admin });
});

// 2FA login verification
router.post('/2fa/login', (req, res) => {
  const { temp_token, totp_code } = req.body;

  if (!temp_token || !totp_code) {
    return res.status(400).json({ error: 'Token dan kode 2FA wajib diisi' });
  }

  try {
    const decoded = jwt.verify(temp_token, process.env.JWT_SECRET);
    if (decoded.purpose !== '2fa') {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1 AND totp_enabled = 1').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Verify TOTP
    const { TOTP } = require('otpauth');
    const totp = new TOTP({
      issuer: 'SeikouLink',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: user.totp_secret
    });

    const delta = totp.validate({ token: totp_code, window: 1 });
    if (delta === null) {
      return res.status(401).json({ error: 'Kode 2FA salah' });
    }

    // Issue tokens
    issueTokens(res, user.id);

    logAudit(user.id, 'login', req.ip, { username: user.username, '2fa': true });

    res.json({ success: true, username: user.username, is_admin: user.is_admin });
  } catch (err) {
    return res.status(401).json({ error: 'Token expired atau invalid' });
  }
});

router.post('/logout', (req, res) => {
  // Revoke refresh token if present
  const refreshToken = req.cookies.refresh_token;
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ? AND user_id = ?').run(tokenHash, decoded.id);

      logAudit(decoded.id, 'logout', req.ip, {});
    } catch (e) {
      // Token invalid/expired, just clear cookies
    }
  }

  res.clearCookie('token');
  res.clearCookie('refresh_token');
  res.json({ success: true });
});

// Refresh token endpoint
router.post('/refresh', (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = db.prepare(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND user_id = ? AND revoked = 0'
    ).get(tokenHash, decoded.id);

    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (new Date(storedToken.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const user = db.prepare('SELECT id, username, is_admin, is_active FROM users WHERE id = ? AND is_active = 1').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Revoke old refresh token
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?').run(storedToken.id);

    // Issue new tokens
    issueTokens(res, user.id);

    res.json({ success: true });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, username, email, display_name, bio, avatar, og_image, banner, theme, theme_preset, accent_color, bg_color, is_admin, email_verified, totp_enabled, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// Email verification
router.get('/verify-email', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send('Token tidak valid');
  }

  const user = db.prepare('SELECT id, username FROM users WHERE verification_token = ?').get(token);
  if (!user) {
    return res.status(400).send('Token tidak valid atau sudah digunakan');
  }

  db.prepare('UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);

  // Reactivate if was deactivated due to unverified email
  db.prepare('UPDATE users SET is_active = 1 WHERE id = ?').run(user.id);

  logAudit(user.id, 'email_verified', req.ip, { username: user.username });

  const domain = process.env.DOMAIN || 'link.seikoupay.my.id';
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="3;url=https://${domain}/login"><title>Email Terverifikasi</title>
  <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fffbf0}
  .card{background:#fff;border:3px solid #1a1a1a;box-shadow:6px 6px 0 #1a1a1a;padding:2rem;text-align:center;max-width:400px}
  h1{color:#22c55e;margin-bottom:1rem}p{color:#666}</style></head>
  <body><div class="card"><h1>✓ Email Terverifikasi!</h1><p>Akun kamu sudah aktif. Redirect ke login dalam 3 detik...</p></div></body></html>`);
});

// Resend verification email
router.post('/resend-verification', authenticate, async (req, res) => {
  const user = db.prepare('SELECT id, username, email, email_verified, verification_sent_at FROM users WHERE id = ?').get(req.user.id);

  if (user.email_verified) {
    return res.status(400).json({ error: 'Email sudah terverifikasi' });
  }

  // Rate limit: 1 per 5 minutes
  const lastSent = verificationResendTimes.get(user.id);
  if (lastSent && Date.now() - lastSent < 5 * 60 * 1000) {
    const remaining = Math.ceil((5 * 60 * 1000 - (Date.now() - lastSent)) / 1000);
    return res.status(429).json({ error: `Tunggu ${remaining} detik sebelum kirim ulang` });
  }

  // Check SMTP config
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('[Verification] SMTP config missing');
    return res.status(500).json({ error: 'SMTP belum dikonfigurasi di server' });
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  db.prepare("UPDATE users SET verification_token = ?, verification_sent_at = datetime('now') WHERE id = ?").run(verificationToken, user.id);

  try {
    await sendVerificationEmail(user, verificationToken);
    verificationResendTimes.set(user.id, Date.now());
    console.log(`[Verification] Email sent to ${user.email}`);
    res.json({ success: true, message: 'Email verifikasi dikirim ulang' });
  } catch (err) {
    console.error('[Verification] Send error:', err.message);
    res.status(500).json({ error: 'Gagal kirim email: ' + err.message });
  }
});

// 2FA Setup (admin only)
router.post('/2fa/setup', authenticate, requireAdmin, (req, res) => {
  const { TOTP, Secret } = require('otpauth');
  const QRCode = require('qrcode');

  const user = db.prepare('SELECT id, email, totp_enabled FROM users WHERE id = ?').get(req.user.id);

  if (user.totp_enabled) {
    return res.status(400).json({ error: '2FA sudah aktif' });
  }

  // Generate secret
  const secret = new Secret({ size: 20 });

  const totp = new TOTP({
    issuer: 'SeikouLink',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret
  });

  const uri = totp.toString();

  // Store secret temporarily (not enabled yet until verified)
  db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(secret.base32, req.user.id);

  QRCode.toDataURL(uri, { width: 256, margin: 1 }).then(qrDataUrl => {
    res.json({
      secret: secret.base32,
      uri: uri,
      qr: qrDataUrl
    });
  }).catch(() => {
    res.status(500).json({ error: 'Failed to generate QR code' });
  });
});

// 2FA Verify (enable after setup)
router.post('/2fa/verify', authenticate, (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Kode 2FA wajib diisi' });
  }

  const user = db.prepare('SELECT id, email, totp_secret, totp_enabled FROM users WHERE id = ?').get(req.user.id);

  if (!user.totp_secret) {
    return res.status(400).json({ error: 'Setup 2FA dulu' });
  }

  if (user.totp_enabled) {
    return res.status(400).json({ error: '2FA sudah aktif' });
  }

  const { TOTP } = require('otpauth');
  const totp = new TOTP({
    issuer: 'SeikouLink',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: user.totp_secret
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) {
    return res.status(401).json({ error: 'Kode 2FA salah' });
  }

  db.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').run(req.user.id);

  logAudit(req.user.id, '2fa_enabled', req.ip, {});

  res.json({ success: true, message: '2FA berhasil diaktifkan' });
});

// 2FA Disable
router.post('/2fa/disable', authenticate, (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password wajib diisi' });
  }

  const user = db.prepare('SELECT id, password as pw_hash, totp_enabled FROM users WHERE id = ?').get(req.user.id);

  if (!user.totp_enabled) {
    return res.status(400).json({ error: '2FA belum aktif' });
  }

  if (!bcrypt.compareSync(password, user.pw_hash)) {
    return res.status(401).json({ error: 'Password salah' });
  }

  db.prepare('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?').run(req.user.id);

  logAudit(req.user.id, '2fa_disabled', req.ip, {});

  res.json({ success: true, message: '2FA dinonaktifkan' });
});

router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email wajib diisi' });
  }

  const user = db.prepare('SELECT id, email, username FROM users WHERE email = ? AND is_active = 1').get(email);

  res.json({ success: true, message: 'Jika email terdaftar, link reset akan dikirim.' });

  if (!user) return;

  const recentReset = db.prepare("SELECT id FROM password_resets WHERE user_id = ? AND created_at > datetime('now', '-5 minutes')").get(user.id);
  if (recentReset) return;

  const activeResets = db.prepare("SELECT COUNT(*) as count FROM password_resets WHERE user_id = ? AND created_at > datetime('now', '-1 hour') AND used = 0").get(user.id);
  if (activeResets.count >= 3) return;

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, resetToken, expiresAt);

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const domain = process.env.DOMAIN || 'link.seikoupay.my.id';
  const resetUrl = 'https://' + domain + '/reset-password?token=' + resetToken;

  transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: user.email,
    subject: 'Reset Password - SeikouLink',
    html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem">' +
      '<h2 style="margin-bottom:1rem">Reset Password</h2>' +
      '<p>Halo <strong>' + user.username + '</strong>,</p>' +
      '<p>Kamu minta reset password. Klik tombol di bawah untuk buat password baru:</p>' +
      '<a href="' + resetUrl + '" style="display:inline-block;padding:12px 24px;background:#ff6b35;color:#fff;text-decoration:none;font-weight:bold;margin:1.5rem 0">Reset Password</a>' +
      '<p style="font-size:0.85rem;color:#666">Link ini berlaku 1 jam. Kalau kamu tidak minta reset, abaikan email ini.</p>' +
      '</div>'
  }).catch(function(err) {
    console.error('Email send error:', err.message);
  });
});

router.post('/reset-password', (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token dan password baru wajib diisi' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password minimal 8 karakter' });
  }

  const reset = db.prepare('SELECT * FROM password_resets WHERE token = ? AND used = 0').get(token);
  if (!reset) {
    return res.status(400).json({ error: 'Link reset tidak valid atau sudah digunakan' });
  }

  if (new Date(reset.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Link reset sudah expired. Minta ulang.' });
  }

  const hash = bcrypt.hashSync(password, 12);

  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, reset.user_id);
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(reset.id);

  // Revoke all refresh tokens for this user
  db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(reset.user_id);

  logAudit(reset.user_id, 'password_change', req.ip, { method: 'reset' });

  res.json({ success: true, message: 'Password berhasil direset. Silakan login.' });
});

// ============================================================
// Google OAuth
// ============================================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = () => `https://${process.env.DOMAIN || 'link.seikoupay.my.id'}/api/auth/google/callback`;

// Step 1: Redirect user to Google consent screen
router.get('/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).send('Google OAuth belum dikonfigurasi');
  }

  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 5 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI(),
    response_type: 'code',
    scope: 'openid email profile',
    state: state,
    access_type: 'online',
    prompt: 'select_account'
  });

  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params.toString());
});

// Step 2: Google redirects back with code
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const domain = process.env.DOMAIN || 'link.seikoupay.my.id';

  if (!code || !state) {
    return res.redirect(`https://${domain}/login?error=oauth_failed`);
  }

  // Verify state
  if (state !== req.cookies.oauth_state) {
    return res.redirect(`https://${domain}/login?error=oauth_state`);
  }
  res.clearCookie('oauth_state');

  try {
    // Exchange code for tokens
    const https = require('https');
    const tokenData = await new Promise((resolve, reject) => {
      const body = new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI(),
        grant_type: 'authorization_code'
      }).toString();

      const req = https.request({
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
      }, (resp) => {
        let data = '';
        resp.on('data', c => data += c);
        resp.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Token parse failed')); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    if (!tokenData.access_token) {
      console.error('[Google OAuth] Token error:', tokenData);
      return res.redirect(`https://${domain}/login?error=oauth_token`);
    }

    // Get user info from Google
    const userInfo = await new Promise((resolve, reject) => {
      https.get({
        hostname: 'www.googleapis.com',
        path: '/oauth2/v2/userinfo',
        headers: { Authorization: 'Bearer ' + tokenData.access_token }
      }, (resp) => {
        let data = '';
        resp.on('data', c => data += c);
        resp.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('UserInfo parse failed')); }
        });
      }).on('error', reject);
    });

    if (!userInfo.email) {
      return res.redirect(`https://${domain}/login?error=oauth_email`);
    }

    const email = userInfo.email.toLowerCase();
    const name = userInfo.name || email.split('@')[0];

    // Check if user exists with this email
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (user) {
      // Existing user — login
      if (!user.is_active) {
        return res.redirect(`https://${domain}/login?error=banned`);
      }

      // Mark email as verified (Google already verified it)
      if (!user.email_verified) {
        db.prepare('UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);
      }

      issueTokens(res, user.id);
      logAudit(user.id, 'login', req.ip, { method: 'google', email });

      if (user.is_admin) {
        return res.redirect(`https://${domain}/admin`);
      }
      return res.redirect(`https://${domain}/dashboard`);
    }

    // New user — register
    // Generate unique username from email/name
    let baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user';
    let username = baseUsername;
    let suffix = 1;
    while (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
      username = baseUsername + suffix;
      suffix++;
    }

    // Check reserved usernames
    const reservedUsernames = ['admin', 'api', 'dashboard', 'login', 'register', 'logout', 'static', 'uploads', 'forgot-password', 'reset-password', 'robots.txt', 'favicon.ico', 'www', 'mail', 'ftp', 'sitemap.xml'];
    if (reservedUsernames.includes(username)) {
      username = baseUsername + Math.floor(Math.random() * 999);
    }

    // Create user (no password needed, email already verified by Google)
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hash = bcrypt.hashSync(randomPassword, 12);

    const result = db.prepare(
      "INSERT INTO users (username, email, password, display_name, email_verified, verification_token, verification_sent_at) VALUES (?, ?, ?, ?, 1, NULL, NULL)"
    ).run(username, email, hash, name);

    issueTokens(res, result.lastInsertRowid);
    logAudit(result.lastInsertRowid, 'register', req.ip, { method: 'google', username, email });

    return res.redirect(`https://${domain}/dashboard`);

  } catch (err) {
    console.error('[Google OAuth] Error:', err.message);
    return res.redirect(`https://${domain}/login?error=oauth_error`);
  }
});

module.exports = router;
