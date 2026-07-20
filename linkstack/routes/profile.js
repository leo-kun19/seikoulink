const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  }
});

function validateImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) return false;
  const hex = buffer.slice(0, 12).toString('hex').toLowerCase();
  if (hex.startsWith('ffd8ff')) return true;
  if (hex.startsWith('89504e470d0a1a0a')) return true;
  if (hex.startsWith('474946383761') || hex.startsWith('474946383961')) return true;
  if (hex.startsWith('52494646') && buffer.slice(8, 12).toString('ascii') === 'WEBP') return true;
  return false;
}

router.use(authenticate);

router.put('/', (req, res) => {
  const { display_name, bio, theme, theme_preset, accent_color, bg_color } = req.body;

  if (display_name !== undefined && (typeof display_name !== 'string' || display_name.length > 50)) {
    return res.status(400).json({ error: 'Nama tampilan max 50 karakter' });
  }
  if (bio !== undefined && (typeof bio !== 'string' || bio.length > 200)) {
    return res.status(400).json({ error: 'Bio max 200 karakter' });
  }
  if (accent_color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(accent_color)) {
    return res.status(400).json({ error: 'Warna aksen format invalid' });
  }
  if (bg_color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(bg_color)) {
    return res.status(400).json({ error: 'Warna background format invalid' });
  }

  // Content moderation on display_name & bio
  const { checkContent, logModeration } = require('../middleware/moderation');
  if (display_name || bio) {
    const check = checkContent('', (display_name || '') + ' ' + (bio || ''));
    if (check.blocked) {
      logModeration(req.user.id, req.ip, '', (display_name || '') + ' / ' + (bio || ''), check.reason, check.category);
      return res.status(400).json({
        error: 'Profil ditolak: ' + check.reason + '. Konten judi/pornografi/phishing tidak diperbolehkan.'
      });
    }
  }

  db.prepare(`
    UPDATE users SET 
      display_name = COALESCE(?, display_name),
      bio = COALESCE(?, bio),
      theme = COALESCE(?, theme),
      theme_preset = COALESCE(?, theme_preset),
      accent_color = COALESCE(?, accent_color),
      bg_color = COALESCE(?, bg_color),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(display_name, bio, theme, theme_preset, accent_color, bg_color, req.user.id);

  logAudit(req.user.id, 'profile_update', req.ip, { fields: Object.keys(req.body) });

  res.json({ success: true });
});

// Change username (rate limited: 1x per 30 days)
router.put('/username', (req, res) => {
  const { username } = req.body;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username wajib diisi' });
  }

  const newUsername = username.toLowerCase().trim();

  if (!/^[a-z0-9_-]{3,30}$/.test(newUsername)) {
    return res.status(400).json({ error: 'Username: 3-30 huruf kecil, angka, dash, underscore' });
  }

  // Reserved usernames
  const reservedUsernames = ['admin', 'api', 'dashboard', 'login', 'register', 'logout', 'static', 'uploads', 'forgot-password', 'reset-password', 'robots.txt', 'favicon.ico', 'www', 'mail', 'ftp', 'sitemap.xml', 'privacy', 'terms'];
  if (reservedUsernames.includes(newUsername)) {
    return res.status(409).json({ error: 'Username tidak tersedia' });
  }

  // Content moderation
  const { checkContent } = require('../middleware/moderation');
  const check = checkContent('', newUsername);
  if (check.blocked) {
    return res.status(400).json({ error: 'Username mengandung kata terlarang' });
  }

  // Get current user
  const user = db.prepare('SELECT username, username_changed_at FROM users WHERE id = ?').get(req.user.id);

  // Check if same username
  if (user.username === newUsername) {
    return res.status(400).json({ error: 'Username sama dengan sekarang' });
  }

  // Rate limit: 1x per 30 days
  if (user.username_changed_at) {
    const lastChange = new Date(user.username_changed_at + 'Z');
    const daysSince = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 30) {
      const remaining = Math.ceil(30 - daysSince);
      return res.status(429).json({ error: `Username hanya bisa diubah 1x per 30 hari. Tunggu ${remaining} hari lagi.` });
    }
  }

  // Check if username taken
  const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(newUsername, req.user.id);
  if (existing) {
    return res.status(409).json({ error: 'Username sudah dipakai' });
  }

  // Update
  db.prepare("UPDATE users SET username = ?, username_changed_at = datetime('now') WHERE id = ?").run(newUsername, req.user.id);

  logAudit(req.user.id, 'username_change', req.ip, { old: user.username, new: newUsername });

  res.json({ success: true, username: newUsername });
});

router.post('/avatar', upload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (!validateImageMagicBytes(req.file.buffer)) {
    return res.status(400).json({ error: 'File bukan gambar valid' });
  }

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `avatar_${req.user.id}_${Date.now()}.webp`;
  const filepath = path.join(uploadsDir, filename);

  try {
    await sharp(req.file.buffer)
      .resize(256, 256, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(filepath);

    const oldAvatar = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.user.id);
    if (oldAvatar && oldAvatar.avatar) {
      const oldPath = path.join(uploadsDir, oldAvatar.avatar);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(filename, req.user.id);
    res.json({ success: true, avatar: filename });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process image' });
  }
});

router.post('/og-image', upload.single('og_image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (!validateImageMagicBytes(req.file.buffer)) {
    return res.status(400).json({ error: 'File bukan gambar valid' });
  }

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `og_${req.user.id}_${Date.now()}.jpg`;
  const filepath = path.join(uploadsDir, filename);

  try {
    await sharp(req.file.buffer)
      .resize(1200, 630, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toFile(filepath);

    const old = db.prepare('SELECT og_image FROM users WHERE id = ?').get(req.user.id);
    if (old && old.og_image) {
      const oldPath = path.join(uploadsDir, old.og_image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    db.prepare('UPDATE users SET og_image = ? WHERE id = ?').run(filename, req.user.id);
    res.json({ success: true, og_image: filename });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process image' });
  }
});

router.post('/banner', upload.single('banner'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (!validateImageMagicBytes(req.file.buffer)) {
    return res.status(400).json({ error: 'File bukan gambar valid' });
  }

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `banner_${req.user.id}_${Date.now()}.jpg`;
  const filepath = path.join(uploadsDir, filename);

  try {
    await sharp(req.file.buffer)
      .resize(1500, 500, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toFile(filepath);

    const old = db.prepare('SELECT banner FROM users WHERE id = ?').get(req.user.id);
    if (old && old.banner) {
      const oldPath = path.join(uploadsDir, old.banner);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    db.prepare('UPDATE users SET banner = ? WHERE id = ?').run(filename, req.user.id);
    res.json({ success: true, banner: filename });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process image' });
  }
});

router.delete('/banner', (req, res) => {
  const old = db.prepare('SELECT banner FROM users WHERE id = ?').get(req.user.id);
  if (old && old.banner) {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const oldPath = path.join(uploadsDir, old.banner);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  db.prepare('UPDATE users SET banner = NULL WHERE id = ?').run(req.user.id);
  res.json({ success: true });
});

router.get('/stats', (req, res) => {
  const totalClicks = db.prepare('SELECT SUM(click_count) as total FROM links WHERE user_id = ?').get(req.user.id);
  const totalViews = db.prepare('SELECT COUNT(*) as total FROM page_views WHERE user_id = ?').get(req.user.id);
  const totalLinks = db.prepare('SELECT COUNT(*) as total FROM links WHERE user_id = ?').get(req.user.id);

  const clicksToday = db.prepare(`
    SELECT COUNT(*) as total FROM clicks 
    WHERE user_id = ? AND clicked_at >= date('now')
  `).get(req.user.id);

  const viewsToday = db.prepare(`
    SELECT COUNT(*) as total FROM page_views 
    WHERE user_id = ? AND viewed_at >= date('now')
  `).get(req.user.id);

  const topLinks = db.prepare(`
    SELECT title, url, click_count FROM links 
    WHERE user_id = ? ORDER BY click_count DESC LIMIT 5
  `).all(req.user.id);

  const last7Days = db.prepare(`
    SELECT date(clicked_at) as day, COUNT(*) as clicks 
    FROM clicks WHERE user_id = ? AND clicked_at >= date('now', '-7 days')
    GROUP BY date(clicked_at) ORDER BY day
  `).all(req.user.id);

  const countryStats = db.prepare(`
    SELECT country, COUNT(*) as count 
    FROM page_views 
    WHERE user_id = ? AND country IS NOT NULL AND country != 'XX'
    GROUP BY country ORDER BY count DESC LIMIT 10
  `).all(req.user.id);

  res.json({
    total_clicks: totalClicks.total || 0,
    total_views: totalViews.total || 0,
    total_links: totalLinks.total || 0,
    clicks_today: clicksToday.total || 0,
    views_today: viewsToday.total || 0,
    top_links: topLinks,
    chart_data: last7Days,
    country_stats: countryStats
  });
});

router.get('/qrcode', async (req, res) => {
  const QRCode = require('qrcode');
  const domain = process.env.DOMAIN || 'link.seikoupay.my.id';
  const user = db.prepare('SELECT username, accent_color, display_name FROM users WHERE id = ?').get(req.user.id);
  const url = 'https://' + domain + '/' + user.username;
  const accent = user.accent_color || '#ff6b35';

  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 600,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: '#1a1a1a', light: '#ffffff' }
    });
    res.json({
      qr: qrDataUrl,
      url: url,
      username: user.username,
      display_name: user.display_name || user.username,
      accent: accent
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

module.exports = router;
