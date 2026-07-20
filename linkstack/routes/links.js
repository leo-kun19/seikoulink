const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { checkContent, checkSafeBrowsing, logModeration } = require('../middleware/moderation');

const router = express.Router();

router.use(authenticate);

router.get('/', (req, res) => {
  const links = db.prepare(`
    SELECT id, user_id, title, url, icon, sort_order, is_active, is_social, is_divider,
    CASE WHEN password IS NOT NULL THEN 1 ELSE 0 END as has_password,
    schedule_start, schedule_end, click_count, created_at
    FROM links WHERE user_id = ? ORDER BY sort_order ASC
  `).all(req.user.id);
  res.json(links);
});

router.post('/', async (req, res) => {
  let { title, url, icon, is_social, is_divider, password, schedule_start, schedule_end } = req.body;

  if (!title || typeof title !== 'string' || title.length > 100) {
    return res.status(400).json({ error: 'Title required (max 100 chars)' });
  }

  const linkCount = db.prepare('SELECT COUNT(*) as c FROM links WHERE user_id = ?').get(req.user.id);
  if (linkCount.c >= 100) {
    return res.status(400).json({ error: 'Maksimal 100 link per user' });
  }

  if (is_divider) {
    url = '';
  } else {
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL required' });
    if (url.length > 500) return res.status(400).json({ error: 'URL too long' });
    url = url.trim();
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url;
    }
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ error: 'Hanya http/https yang diperbolehkan' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // === Content moderation: keyword + domain blocklist ===
    const check = checkContent(url, title);
    if (check.blocked) {
      logModeration(req.user.id, req.ip, url, title, check.reason, check.category);
      return res.status(400).json({
        error: 'Link ditolak: ' + check.reason + '. Konten judi online, pornografi, dan phishing tidak diperbolehkan.'
      });
    }

    // === Google Safe Browsing (kalau API key ada) ===
    const sb = await checkSafeBrowsing(url);
    if (!sb.safe) {
      logModeration(req.user.id, req.ip, url, title, 'Google Safe Browsing: ' + sb.threat, 'malware');
      return res.status(400).json({
        error: 'Link ditolak: terdeteksi sebagai ' + sb.threat + ' oleh Google Safe Browsing.'
      });
    }
  }

  let hashedPassword = null;
  if (password && typeof password === 'string' && password.trim()) {
    if (password.length > 100) return res.status(400).json({ error: 'Password too long' });
    const bcrypt = require('bcryptjs');
    hashedPassword = bcrypt.hashSync(password.trim(), 12);
  }

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM links WHERE user_id = ?').get(req.user.id);
  const sortOrder = (maxOrder.max_order || 0) + 1;

  const result = db.prepare('INSERT INTO links (user_id, title, url, icon, sort_order, is_social, is_divider, password, schedule_start, schedule_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    req.user.id, title.slice(0, 100), url, (icon || 'link').slice(0, 50), sortOrder,
    is_social ? 1 : 0,
    is_divider ? 1 : 0,
    hashedPassword,
    schedule_start || null, schedule_end || null
  );

  res.json({ id: result.lastInsertRowid, title, url, icon: icon || 'link', sort_order: sortOrder });

  logAudit(req.user.id, 'link_create', req.ip, { link_id: result.lastInsertRowid, title });
});

router.put('/:id', async (req, res) => {
  let { title, url, icon, is_active, is_social, is_divider, password, schedule_start, schedule_end } = req.body;
  const link = db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

  if (!link) {
    return res.status(404).json({ error: 'Link not found' });
  }

  if (title !== undefined && (typeof title !== 'string' || title.length > 100)) {
    return res.status(400).json({ error: 'Title invalid' });
  }

  if (url) {
    if (typeof url !== 'string' || url.length > 500) {
      return res.status(400).json({ error: 'URL invalid' });
    }
    url = url.trim();
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url;
    }
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ error: 'Hanya http/https yang diperbolehkan' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // === Content moderation on edit ===
    const checkTitle = title || link.title;
    const check = checkContent(url, checkTitle);
    if (check.blocked) {
      logModeration(req.user.id, req.ip, url, checkTitle, check.reason, check.category);
      return res.status(400).json({
        error: 'Link ditolak: ' + check.reason + '. Konten judi online, pornografi, dan phishing tidak diperbolehkan.'
      });
    }

    const sb = await checkSafeBrowsing(url);
    if (!sb.safe) {
      logModeration(req.user.id, req.ip, url, checkTitle, 'Google Safe Browsing: ' + sb.threat, 'malware');
      return res.status(400).json({
        error: 'Link ditolak: terdeteksi sebagai ' + sb.threat + ' oleh Google Safe Browsing.'
      });
    }
  } else if (title) {
    // Title-only change: still check title
    const check = checkContent(link.url || '', title);
    if (check.blocked) {
      logModeration(req.user.id, req.ip, link.url, title, check.reason, check.category);
      return res.status(400).json({
        error: 'Title ditolak: ' + check.reason
      });
    }
  }

  let hashedPassword = link.password;
  if (password === '') {
    hashedPassword = null;
  } else if (password && typeof password === 'string' && password.trim()) {
    if (password.length > 100) return res.status(400).json({ error: 'Password too long' });
    const bcrypt = require('bcryptjs');
    hashedPassword = bcrypt.hashSync(password.trim(), 12);
  }

  db.prepare('UPDATE links SET title = ?, url = ?, icon = ?, is_active = ?, is_social = ?, is_divider = ?, password = ?, schedule_start = ?, schedule_end = ?, sort_order = COALESCE(?, sort_order) WHERE id = ? AND user_id = ?').run(
    title || link.title,
    url !== undefined ? url : link.url,
    (icon || link.icon).slice(0, 50),
    is_active !== undefined ? is_active : link.is_active,
    is_social !== undefined ? (is_social ? 1 : 0) : link.is_social,
    is_divider !== undefined ? (is_divider ? 1 : 0) : link.is_divider,
    hashedPassword,
    schedule_start !== undefined ? schedule_start : link.schedule_start,
    schedule_end !== undefined ? schedule_end : link.schedule_end,
    req.body.sort_order,
    req.params.id,
    req.user.id
  );

  logAudit(req.user.id, 'link_edit', req.ip, { link_id: parseInt(req.params.id), title: title || link.title });

  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM links WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Link not found' });
  }
  logAudit(req.user.id, 'link_delete', req.ip, { link_id: parseInt(req.params.id) });
  res.json({ success: true });
});

router.put('/reorder/batch', (req, res) => {
  const { orders } = req.body;
  if (!Array.isArray(orders)) {
    return res.status(400).json({ error: 'Orders array required' });
  }

  const stmt = db.prepare('UPDATE links SET sort_order = ? WHERE id = ? AND user_id = ?');
  const transaction = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item.sort_order, item.id, req.user.id);
    }
  });

  transaction(orders);
  res.json({ success: true });
});

module.exports = router;
