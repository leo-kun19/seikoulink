const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const geoip = require('geoip-lite');
const db = require('../db');

const router = express.Router();

const unlockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip + req.params.linkId,
  handler: (req, res) => {
    res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' });
  }
});

function getCountry(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return 'XX';
  const cleanIp = ip.replace(/^::ffff:/, '');
  const geo = geoip.lookup(cleanIp);
  return geo ? geo.country : 'XX';
}

router.get('/:username', (req, res) => {
  const user = db.prepare(`
    SELECT id, username, display_name, bio, avatar, og_image, banner, theme, theme_preset, accent_color, bg_color, is_admin, email_verified
    FROM users WHERE username = ? AND is_active = 1
  `).get(req.params.username);

  if (!user) {
    return res.status(404).sendFile(require('path').join(__dirname, '..', 'public', '404.html'));
  }

  const links = db.prepare('SELECT id, title, url, icon, is_social, is_divider, password, schedule_start, schedule_end FROM links WHERE user_id = ? AND is_active = 1 ORDER BY sort_order ASC').all(user.id);

  const now = new Date().toISOString();
  const activeLinks = links.filter(link => {
    if (!link.is_social && !link.is_divider) {
      if (link.schedule_start && now < link.schedule_start) return false;
      if (link.schedule_end && now > link.schedule_end) return false;
    }
    return true;
  });

  const socialLinks = activeLinks.filter(l => l.is_social);
  const regularLinks = activeLinks.filter(l => !l.is_social);

  const ipHash = crypto.createHash('sha256').update(req.ip + req.params.username).digest('hex').slice(0, 16);
  const country = getCountry(req.ip);
  db.prepare('INSERT INTO page_views (user_id, ip_hash, country) VALUES (?, ?, ?)').run(user.id, ipHash, country);

  // Determine if page should be indexable by Google
  const hasPublicLinks = activeLinks.some(l => !l.is_divider);
  const indexable = !user.is_admin && user.email_verified === 1 && hasPublicLinks;

  // Check if user picked a premium theme
  const { getTheme } = require('../themes');
  const premiumTheme = getTheme(user.theme_preset);

  if (premiumTheme) {
    // Use premium theme renderer - pass all active links in order (preserve dividers position)
    const html = renderPremiumTheme(premiumTheme, user, activeLinks, indexable);
    return res.send(html);
  }

  // Fallback to default theme
  const html = generateProfilePage(user, regularLinks, socialLinks, indexable);
  res.send(html);
});

function renderPremiumTheme(themeFn, user, allLinks, indexable) {
  const domain = process.env.DOMAIN || 'link.seikoupay.my.id';
  const profileUrl = `https://${domain}/${user.username}`;
  const avatarUrl = user.avatar ? `/uploads/${user.avatar}` : null;
  const ogImage = user.og_image ? `/uploads/${user.og_image}` : avatarUrl;

  const ogImageMeta = ogImage ? `<meta property="og:image" content="https://${domain}${ogImage}">
  <meta property="og:image:secure_url" content="https://${domain}${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(user.display_name || user.username)}">
  <meta name="twitter:image" content="https://${domain}${ogImage}">` : '';

  const seoTitle = (user.display_name || user.username) + ' (@' + user.username + ') - Link in Bio | SeikouLink';
  const seoDesc = user.bio
    ? (user.bio.length > 155 ? user.bio.slice(0, 155) + '...' : user.bio)
    : `Lihat semua link ${user.display_name || user.username} - sosmed, portofolio, dan kontak dalam satu halaman.`;

  // Split for SEO same-as schema only (gather social URLs for Person sameAs)
  const socialLinks = allLinks.filter(l => l.is_social);
  const sameAs = socialLinks.map(l => l.url).filter(u => u && /^https?:\/\//i.test(u)).slice(0, 10);
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    'name': user.display_name || user.username,
    'alternateName': user.username,
    'url': profileUrl,
    'description': user.bio || `${user.display_name || user.username} - Link in Bio`,
    'identifier': user.username
  };
  if (avatarUrl) personSchema.image = `https://${domain}${avatarUrl}`;
  if (sameAs.length > 0) personSchema.sameAs = sameAs;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `https://${domain}/` },
      { '@type': 'ListItem', 'position': 2, 'name': user.display_name || user.username, 'item': profileUrl }
    ]
  };

  const structuredDataJson = `<script type="application/ld+json">${JSON.stringify(personSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`;

  return themeFn({
    user,
    allLinks,
    regularLinks: allLinks.filter(l => !l.is_social),
    socialLinks: allLinks.filter(l => l.is_social),
    profileUrl,
    seoTitle,
    seoDesc,
    ogImageMeta,
    structuredDataJson,
    indexable,
    escapeHtml
  });
}

router.get('/:username/click/:linkId', (req, res) => {
  const link = db.prepare(`
    SELECT l.*, u.username FROM links l 
    JOIN users u ON l.user_id = u.id 
    WHERE l.id = ? AND u.username = ? AND l.is_active = 1
  `).get(req.params.linkId, req.params.username);

  if (!link) {
    return res.redirect('/');
  }

  if (link.password) {
    return res.redirect(`/${req.params.username}/unlock/${link.id}`);
  }

  const ipHash = crypto.createHash('sha256').update(req.ip + link.id.toString()).digest('hex').slice(0, 16);
  const country = getCountry(req.ip);

  db.prepare('UPDATE links SET click_count = click_count + 1 WHERE id = ?').run(link.id);
  db.prepare('INSERT INTO clicks (link_id, user_id, ip_hash, user_agent, referer, country) VALUES (?, ?, ?, ?, ?, ?)').run(
    link.id, link.user_id, ipHash, req.headers['user-agent'] || '', req.headers.referer || '', country
  );

  res.redirect(link.url);
});

router.get('/:username/unlock/:linkId', (req, res) => {
  const link = db.prepare(`
    SELECT l.id, l.title, u.username, u.accent_color, u.bg_color FROM links l 
    JOIN users u ON l.user_id = u.id 
    WHERE l.id = ? AND u.username = ? AND l.is_active = 1 AND l.password IS NOT NULL
  `).get(req.params.linkId, req.params.username);

  if (!link) {
    return res.redirect(`/${req.params.username}`);
  }

  const error = req.query.error ? '<div class="error">Password salah</div>' : '';
  const accent = link.accent_color || '#ff6b35';
  const bg = link.bg_color || '#fffbf0';

  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unlock - ${escapeHtml(link.title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Space Grotesk',sans-serif;background:${bg};min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}
    .card{background:#fff;border:3px solid #1a1a1a;box-shadow:6px 6px 0 #1a1a1a;padding:2rem;max-width:380px;width:100%}
    h1{font-size:1.5rem;font-weight:800;letter-spacing:-0.03em;margin-bottom:0.5rem}
    .desc{color:#666;font-size:0.9rem;margin-bottom:1.5rem}
    .lock{width:48px;height:48px;background:${accent};border:3px solid #1a1a1a;display:flex;align-items:center;justify-content:center;margin-bottom:1rem;color:#fff;font-size:1.5rem}
    label{display:block;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.4rem}
    input{width:100%;padding:0.75rem;font-family:inherit;font-size:1rem;border:2px solid #1a1a1a;background:${bg};outline:none;margin-bottom:1rem}
    input:focus{box-shadow:3px 3px 0 #1a1a1a}
    button{width:100%;padding:0.75rem;background:${accent};color:#fff;font-family:inherit;font-size:1rem;font-weight:700;border:3px solid #1a1a1a;box-shadow:4px 4px 0 #1a1a1a;cursor:pointer;transition:transform 0.1s,box-shadow 0.1s}
    button:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 #1a1a1a}
    button:disabled{opacity:0.6;cursor:not-allowed;transform:none}
    .error{background:#dc2626;color:#fff;padding:0.5rem 0.75rem;font-size:0.85rem;font-weight:600;margin-bottom:1rem;border:2px solid #1a1a1a;display:none}
    a.back{display:block;text-align:center;margin-top:1rem;font-size:0.85rem;color:#666;text-decoration:none}
  </style></head><body>
  <div class="card">
    <div class="lock">&#128274;</div>
    <h1>Konten Terkunci</h1>
    <p class="desc">Link "${escapeHtml(link.title)}" dilindungi password.</p>
    <div class="error" id="err">Password salah</div>
    <label>Password</label>
    <input type="password" id="pw" autofocus>
    <button id="btn">Buka Link</button>
    <a class="back" href="/${link.username}">&larr; Kembali</a>
  </div>
  <script>
    var btn = document.getElementById('btn');
    var pw = document.getElementById('pw');
    pw.addEventListener('keydown', function(e){ if(e.key==='Enter') unlock(); });
    btn.addEventListener('click', unlock);
    async function unlock() {
      var pw = document.getElementById('pw').value;
      var btn = document.getElementById('btn');
      var err = document.getElementById('err');
      if (!pw) return;
      btn.disabled = true;
      btn.textContent = 'Memeriksa...';
      err.style.display = 'none';
      try {
        var res = await fetch('/${link.username}/unlock/${link.id}', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({p: pw})
        });
        var data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          err.style.display = 'block';
          btn.disabled = false;
          btn.textContent = 'Buka Link';
          document.getElementById('pw').value = '';
          document.getElementById('pw').focus();
        }
      } catch(e) {
        err.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Buka Link';
      }
    }
  </script>
  </body></html>`);
});

router.post('/:username/unlock/:linkId', unlockLimiter, async (req, res) => {
  const link = db.prepare(`
    SELECT l.*, u.username FROM links l 
    JOIN users u ON l.user_id = u.id 
    WHERE l.id = ? AND u.username = ? AND l.is_active = 1 AND l.password IS NOT NULL
  `).get(req.params.linkId, req.params.username);

  if (!link) {
    return res.status(404).json({ error: 'Not found' });
  }

  const password = req.body.p;
  if (!password || !bcrypt.compareSync(password, link.password)) {
    await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
    return res.status(401).json({ error: 'Wrong password' });
  }

  const ipHash = crypto.createHash('sha256').update(req.ip + link.id.toString()).digest('hex').slice(0, 16);
  const country = getCountry(req.ip);

  db.prepare('UPDATE links SET click_count = click_count + 1 WHERE id = ?').run(link.id);
  db.prepare('INSERT INTO clicks (link_id, user_id, ip_hash, user_agent, referer, country) VALUES (?, ?, ?, ?, ?, ?)').run(
    link.id, link.user_id, ipHash, req.headers['user-agent'] || '', req.headers.referer || '', country
  );

  res.json({ url: link.url });
});

const brandSvgs = {
  instagram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
  'whatsapp-business': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.05 4.91A9.816 9.816 0 0012.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zM12.04 20.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.183 8.183 0 012.41 5.83c.02 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18s-.22-.16-.47-.28zm-3.85-3.34h-1.13v-1.13h-1.16v1.13H9.29v1.16h1.13v1.13h1.16v-1.13h1.13z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
  spotify: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>',
  discord: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg>',
  shopee: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4a4.8 4.8 0 014.8 4.8h-1.6a3.2 3.2 0 00-6.4 0H7.2A4.8 4.8 0 0112 2.4zM5.6 8.4h12.8c.442 0 .8.358.8.8v9.6c0 1.325-1.075 2.4-2.4 2.4H7.2c-1.325 0-2.4-1.075-2.4-2.4V9.2c0-.442.358-.8.8-.8z"/></svg>',
  tokopedia: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>',
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  donate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
};

function detectIcon(url) {
  if (!url) return 'link';
  url = url.toLowerCase();
  if (url.includes('instagram.com') || url.includes('instagram')) return 'instagram';
  if (url.includes('wa.me') || url.includes('whatsapp')) return 'whatsapp';
  if (url.includes('t.me') || url.includes('telegram')) return 'telegram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'x';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('github.com')) return 'github';
  if (url.includes('spotify.com')) return 'spotify';
  if (url.includes('discord')) return 'discord';
  if (url.includes('shopee')) return 'shopee';
  if (url.includes('tokopedia')) return 'tokopedia';
  if (url.includes('mailto:') || url.includes('mail')) return 'email';
  if (url.includes('saweria') || url.includes('trakteer') || url.includes('ko-fi') || url.includes('donate')) return 'donate';
  if (url.includes('shop') || url.includes('store')) return 'store';
  return 'globe';
}

function getBrandSvg(name) {
  return brandSvgs[name] || brandSvgs['link'];
}

function isDarkColor(hex) {
  if (!hex) return false;
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

function generateProfilePage(user, links, socialLinks, indexable) {
  const accent = user.accent_color || '#ff6b35';
  const bg = user.bg_color || '#fffbf0';
  const isDark = isDarkColor(bg);
  const fg = isDark ? '#f5f5f5' : '#1a1a1a';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.15)' : '#1a1a1a';
  const shadowColor = isDark ? 'rgba(0,0,0,0.5)' : '#1a1a1a';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : '#555';
  const avatarUrl = user.avatar ? `/uploads/${user.avatar}` : null;
  const ogImage = user.og_image ? `/uploads/${user.og_image}` : avatarUrl;

  const socialHtml = socialLinks.length > 0 ? '<div class="social-icons">' + socialLinks.map(link => {
    let iconName = link.icon;
    if (!iconName || iconName === 'auto' || iconName === 'link') {
      iconName = detectIcon(link.url);
    }
    return `<a href="/${user.username}/click/${link.id}" class="social-icon" target="_blank" rel="noopener noreferrer" title="${escapeHtml(link.title)}">${getBrandSvg(iconName)}</a>`;
  }).join('') + '</div>' : '';

  const linksHtml = links.map(link => {
    if (link.is_divider) {
      return `<div class="link-divider"><span>${escapeHtml(link.title)}</span></div>`;
    }
    let iconName = link.icon;
    if (!iconName || iconName === 'auto' || iconName === 'link') {
      iconName = detectIcon(link.url);
    }
    const iconSvg = getBrandSvg(iconName);
    const lockBadge = link.password ? '<span class="link-lock" title="Password protected"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>' : '';
    return `
    <a href="/${user.username}/click/${link.id}" class="link-btn" target="_blank" rel="noopener noreferrer">
      <span class="link-icon">${iconSvg}</span>
      <span class="link-title">${escapeHtml(link.title)}</span>
      ${lockBadge}
      <span class="link-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg></span>
    </a>
  `;
  }).join('');

  const bannerUrl = user.banner ? `/uploads/${user.banner}` : null;
  const bannerHtml = bannerUrl ? `<div class="banner"><img src="${bannerUrl}" alt="Banner ${escapeHtml(user.display_name || user.username)}" loading="eager"></div>` : '';

  const domain = process.env.DOMAIN || 'link.seikoupay.my.id';
  const profileUrl = `https://${domain}/${user.username}`;

  const ogImageMeta = ogImage ? `<meta property="og:image" content="https://${domain}${ogImage}">
  <meta property="og:image:secure_url" content="https://${domain}${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:alt" content="${escapeHtml(user.display_name || user.username)}">
  <meta name="twitter:image" content="https://${domain}${ogImage}">` : '';

  // Build Person structured data with sameAs from user's social links
  const sameAs = socialLinks
    .map(l => l.url)
    .filter(u => u && /^https?:\/\//i.test(u))
    .slice(0, 10);

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    'name': user.display_name || user.username,
    'alternateName': user.username,
    'url': profileUrl,
    'description': user.bio || `${user.display_name || user.username} - Link in Bio`,
    'identifier': user.username
  };
  if (avatarUrl) personSchema.image = `https://${domain}${avatarUrl}`;
  if (sameAs.length > 0) personSchema.sameAs = sameAs;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `https://${domain}/` },
      { '@type': 'ListItem', 'position': 2, 'name': user.display_name || user.username, 'item': profileUrl }
    ]
  };

  // Title & description optimized for SEO (60 char title, 160 char desc)
  const seoTitle = (user.display_name || user.username) + ' (@' + user.username + ') - Link in Bio | SeikouLink';
  const seoDesc = user.bio
    ? (user.bio.length > 155 ? user.bio.slice(0, 155) + '...' : user.bio)
    : `Lihat semua link ${user.display_name || user.username} - sosmed, portofolio, dan kontak dalam satu halaman.`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(seoTitle)}</title>
  <meta name="description" content="${escapeHtml(seoDesc)}">
  <meta name="robots" content="${indexable ? 'index, follow, max-image-preview:large, max-snippet:-1' : 'noindex, follow'}">
  <meta name="googlebot" content="${indexable ? 'index, follow' : 'noindex, follow'}">
  <meta name="theme-color" content="${accent}">
  <link rel="canonical" href="${profileUrl}">
  <meta property="og:title" content="${escapeHtml(user.display_name || user.username)} - Link in Bio">
  <meta property="og:description" content="${escapeHtml(seoDesc)}">
  <meta property="og:url" content="${profileUrl}">
  <meta property="og:site_name" content="SeikouLink">
  <meta property="og:locale" content="id_ID">
  ${ogImageMeta}
  <meta property="og:type" content="profile">
  <meta property="profile:username" content="${escapeHtml(user.username)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(user.display_name || user.username)} - Link in Bio">
  <meta name="twitter:description" content="${escapeHtml(seoDesc)}">

  <script type="application/ld+json">${JSON.stringify(personSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>

  <link rel="icon" type="image/png" href="/static/favicon.png">
  <link rel="apple-touch-icon" href="/static/favicon-192.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="dns-prefetch" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{
      --accent:${accent};
      --bg:${bg};
      --fg:${fg};
      --muted:${mutedColor};
      --card-bg:${cardBg};
      --card-border:${cardBorder};
      --shadow-color:${shadowColor};
      --shadow:5px 5px 0 var(--shadow-color);
      --shadow-hover:7px 7px 0 var(--shadow-color);
    }
    html,body{height:auto;min-height:100%}
    body{
      font-family:'Space Grotesk',sans-serif;
      background:var(--bg);
      color:var(--fg);
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:3rem 1rem;
      position:relative;
      overflow-x:hidden;
    }
    body::before{
      content:'';
      position:fixed;
      inset:0;
      background:
        radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--accent) 15%, transparent) 0%, transparent 45%),
        radial-gradient(circle at 85% 80%, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 50%);
      pointer-events:none;
      z-index:0;
    }
    .profile-container{
      width:100%;
      max-width:600px;
      position:relative;
      z-index:1;
      animation:fadeIn 0.6s ease-out;
    }
    @keyframes fadeIn{
      from{opacity:0;transform:translateY(20px)}
      to{opacity:1;transform:translateY(0)}
    }
    @keyframes slideUp{
      from{opacity:0;transform:translateY(15px)}
      to{opacity:1;transform:translateY(0)}
    }
    .profile-header{
      text-align:center;
      margin-bottom:2.5rem;
    }
    .avatar{
      width:104px;
      height:104px;
      border:3px solid var(--card-border);
      box-shadow:var(--shadow);
      margin:0 auto 1.25rem;
      overflow:hidden;
      background:var(--accent);
      display:flex;
      align-items:center;
      justify-content:center;
    }
    .avatar img{
      width:100%;
      height:100%;
      object-fit:cover;
    }
    .avatar-letter{
      font-size:2.75rem;
      font-weight:800;
      color:#fff;
      letter-spacing:-0.04em;
    }
    .display-name{
      font-size:1.625rem;
      font-weight:800;
      letter-spacing:-0.04em;
      margin-bottom:0.5rem;
      color:var(--fg);
    }
    .bio{
      font-size:0.95rem;
      color:var(--muted);
      max-width:380px;
      margin:0 auto;
      line-height:1.55;
    }
    .links-list{
      display:flex;
      flex-direction:column;
      gap:0.875rem;
    }
    .link-btn{
      display:flex;
      align-items:center;
      gap:0.875rem;
      padding:1.1rem 1.25rem;
      background:var(--card-bg);
      border:3px solid var(--card-border);
      box-shadow:var(--shadow);
      text-decoration:none;
      color:var(--fg);
      font-weight:600;
      font-size:0.95rem;
      transition:transform 0.18s cubic-bezier(0.25,0.1,0.25,1), box-shadow 0.18s ease, background 0.18s ease;
      backdrop-filter:blur(8px);
      animation:slideUp 0.5s cubic-bezier(0.25,0.1,0.25,1) backwards;
    }
    .link-btn:nth-child(1){animation-delay:0.1s}
    .link-btn:nth-child(2){animation-delay:0.18s}
    .link-btn:nth-child(3){animation-delay:0.26s}
    .link-btn:nth-child(4){animation-delay:0.34s}
    .link-btn:nth-child(5){animation-delay:0.42s}
    .link-btn:nth-child(6){animation-delay:0.5s}
    .link-btn:nth-child(7){animation-delay:0.58s}
    .link-btn:nth-child(8){animation-delay:0.66s}
    .link-btn:nth-child(9){animation-delay:0.74s}
    .link-btn:nth-child(n+10){animation-delay:0.82s}
    .link-btn:hover{
      transform:translate(-3px,-3px);
      box-shadow:var(--shadow-hover);
      background:var(--accent);
      color:#fff;
      border-color:var(--accent);
    }
    .link-btn:hover .link-arrow{
      opacity:1;
      transform:translateX(3px);
    }
    .link-btn:active{
      transform:translate(2px,2px);
      box-shadow:2px 2px 0 var(--shadow-color);
    }
    .link-icon{
      width:28px;
      height:28px;
      flex-shrink:0;
      display:flex;
      align-items:center;
      justify-content:center;
    }
    .link-icon svg{
      width:24px;
      height:24px;
    }
    .link-title{
      flex:1;
      letter-spacing:-0.01em;
    }
    .link-arrow{
      width:18px;
      height:18px;
      opacity:0.4;
      transition:opacity 0.18s ease, transform 0.18s ease;
    }
    .link-arrow svg{
      width:100%;
      height:100%;
    }
    .social-icons{
      display:flex;
      justify-content:center;
      gap:0.5rem;
      margin-top:1.25rem;
      flex-wrap:wrap;
    }
    .social-icon{
      width:42px;
      height:42px;
      display:flex;
      align-items:center;
      justify-content:center;
      color:var(--fg);
      background:var(--card-bg);
      border:2px solid var(--card-border);
      transition:all 0.18s ease;
    }
    .social-icon:hover{
      background:var(--accent);
      color:#fff;
      border-color:var(--accent);
      transform:translateY(-3px);
      box-shadow:3px 3px 0 var(--shadow-color);
    }
    .social-icon svg{
      width:20px;
      height:20px;
    }
    .footer-brand{
      text-align:center;
      margin-top:3rem;
      font-size:0.75rem;
      color:var(--muted);
      opacity:0.6;
    }
    .footer-brand a{
      color:var(--muted);
      text-decoration:none;
      font-weight:700;
      letter-spacing:0.04em;
      text-transform:uppercase;
      border-bottom:1px solid var(--muted);
      padding-bottom:1px;
    }
    .footer-brand a:hover{
      color:var(--accent);
      border-color:var(--accent);
    }
    .banner{
      width:100%;
      height:180px;
      margin:0 0 -52px;
      overflow:hidden;
      position:relative;
      animation:fadeIn 0.5s ease-out;
      border:3px solid var(--card-border);
      box-shadow:var(--shadow);
    }
    .banner img{
      width:100%;
      height:100%;
      object-fit:cover;
      display:block;
    }
    .banner+.profile-header{
      position:relative;
      z-index:2;
    }
    .banner+.profile-header .avatar{
      box-shadow:var(--shadow), 0 0 0 4px var(--bg);
    }
    .link-divider{
      display:flex;
      align-items:center;
      gap:1rem;
      margin:1rem 0 0.25rem;
      font-size:0.7rem;
      font-weight:700;
      letter-spacing:0.15em;
      text-transform:uppercase;
      color:var(--muted);
      animation:slideUp 0.4s ease-out backwards;
    }
    .link-divider::before,
    .link-divider::after{
      content:'';
      flex:1;
      height:2px;
      background:var(--card-border);
      opacity:0.4;
    }
    .link-divider span{
      flex-shrink:0;
    }
    .link-lock{
      width:18px;
      height:18px;
      flex-shrink:0;
      opacity:0.5;
      color:var(--accent);
    }
    .link-lock svg{
      width:100%;
      height:100%;
    }
    .link-btn:hover .link-lock{
      opacity:1;
      color:#fff;
    }
    @media(max-width:480px){
      body{padding:2rem 1rem}
      .profile-container{max-width:100%}
      .avatar{width:88px;height:88px}
      .avatar-letter{font-size:2.25rem}
      .display-name{font-size:1.4rem}
      .link-btn{padding:0.95rem 1rem;font-size:0.9rem;gap:0.75rem}
      .link-icon{width:24px;height:24px}
      .link-icon svg{width:22px;height:22px}
    }
  </style>
</head>
<body>
  <div class="profile-container">
    ${bannerHtml}
    <header class="profile-header">
      <div class="avatar">
        ${avatarUrl ? `<img src="${avatarUrl}" alt="${escapeHtml(user.display_name || user.username)}">` : `<span class="avatar-letter">${(user.display_name || user.username).charAt(0).toUpperCase()}</span>`}
      </div>
      <h1 class="display-name">${escapeHtml(user.display_name || user.username)}</h1>
      ${user.bio ? `<p class="bio">${escapeHtml(user.bio)}</p>` : ''}
      ${socialHtml}
    </header>
    <div class="links-list">
      ${linksHtml}
    </div>
    <div class="footer-brand">
      <a href="/">SeikouLink</a>
    </div>
  </div>
  <script>/* icons rendered server-side */</script>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = router;
