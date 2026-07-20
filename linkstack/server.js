require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3500;

app.set('trust proxy', 1);

// Compression for performance & SEO (Core Web Vitals)
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://static.cloudflareinsights.com"],
      connectSrc: ["'self'", "https://unpkg.com"],
      formAction: ["'self'", "https://link.seikoupay.my.id", "https://accounts.google.com"],
      mediaSrc: ["'self'", "data:"]
    }
  }
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    return ua.includes('facebookexternalhit') ||
      ua.includes('whatsapp') ||
      ua.includes('twitterbot') ||
      ua.includes('telegrambot') ||
      ua.includes('linkedinbot') ||
      ua.includes('discordbot') ||
      ua.includes('googlebot') ||
      ua.includes('bingbot');
  }
});
app.use('/api/', limiter);

app.get('/robots.txt', (req, res) => {
  const domain = process.env.DOMAIN || 'link.seikoupay.my.id';
  res.type('text/plain');
  res.send(`User-agent: facebookexternalhit
Allow: /

User-agent: meta-externalagent
Allow: /

User-agent: WhatsApp
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: TelegramBot
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: Discordbot
Allow: /

User-agent: Slackbot
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard
Disallow: /admin
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password

Sitemap: https://${domain}/sitemap.xml
`);
});

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Dynamic sitemap
app.get('/sitemap.xml', (req, res) => {
  const db = require('./db');
  const domain = process.env.DOMAIN || 'link.seikoupay.my.id';

  // Hanya include user yang:
  // 1. Active (is_active = 1)
  // 2. Bukan admin (is_admin = 0)
  // 3. Email sudah verified (email_verified = 1)
  // 4. Punya minimal 1 link aktif (biar gak banyak halaman kosong)
  const users = db.prepare(`
    SELECT u.username, u.updated_at
    FROM users u
    WHERE u.is_active = 1
      AND u.is_admin = 0
      AND u.email_verified = 1
      AND EXISTS (
        SELECT 1 FROM links l 
        WHERE l.user_id = u.id AND l.is_active = 1 AND l.is_divider = 0
      )
    ORDER BY u.updated_at DESC
  `).all();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Landing page
  xml += `  <url>\n    <loc>https://${domain}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

  // User profile pages (public, verified, dengan link)
  users.forEach(function(u) {
    const lastmod = u.updated_at ? u.updated_at.split(' ')[0] : new Date().toISOString().split('T')[0];
    xml += `  <url>\n    <loc>https://${domain}/${u.username}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });

  xml += '</urlset>';

  res.type('application/xml');
  res.send(xml);
});

const authRoutes = require('./routes/auth');
const linkRoutes = require('./routes/links');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const { csrfProtection } = require('./middleware/csrf');

// Set CSRF cookie on page loads (GET requests to HTML pages)
app.use((req, res, next) => {
  if (!req.cookies._csrf && req.method === 'GET') {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('_csrf', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
  }
  next();
});

// CSRF protection for API routes (state-changing)
app.use('/api/', csrfProtection);

app.use('/api/auth', authRoutes);
app.use('/api/links', linkRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

app.get('/dashboard', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res, next) => {
  if (req.path.endsWith('/') && req.path.length > 1) {
    const newPath = req.path.slice(0, -1) + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    return res.redirect(301, newPath);
  }
  next();
});

app.use('/', publicRoutes);

app.listen(PORT, '127.0.0.1', () => {
  console.log(`SeikouLink running on port ${PORT}`);
});

// Auto-ban unverified users after 3 days
const db = require('./db');

function banUnverifiedUsers() {
  try {
    const expired = db.prepare(`
      SELECT id, username, email FROM users 
      WHERE email_verified = 0 
      AND is_admin = 0 
      AND is_active = 1 
      AND created_at <= datetime('now', '-3 days')
    `).all();

    if (expired.length > 0) {
      const stmt = db.prepare('UPDATE users SET is_active = 0 WHERE id = ?');
      expired.forEach(function(user) {
        stmt.run(user.id);
        console.log(`[Auto-Ban] User "${user.username}" (${user.email}) banned - email not verified within 3 days`);
      });
    }
  } catch (e) {
    console.error('[Auto-Ban] Error:', e.message);
  }
}

// Run on startup and every hour
banUnverifiedUsers();
setInterval(banUnverifiedUsers, 60 * 60 * 1000);
