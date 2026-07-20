const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT id, username, email, display_name, is_active, is_admin, email_verified, created_at,
    (SELECT COUNT(*) FROM links WHERE user_id = users.id) as link_count,
    (SELECT SUM(click_count) FROM links WHERE user_id = users.id) as total_clicks
    FROM users ORDER BY created_at DESC
  `).all();
  res.json(users);
});

router.put('/users/:id/toggle', (req, res) => {
  const user = db.prepare('SELECT is_active, is_admin FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.is_admin) return res.status(400).json({ error: 'Tidak bisa ban admin' });

  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(user.is_active ? 0 : 1, req.params.id);
  res.json({ success: true });
});

// Manually verify user email (admin override)
router.put('/users/:id/verify', (req, res) => {
  const user = db.prepare('SELECT email_verified FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare('UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?').run(req.params.id);

  // Audit log
  try {
    db.prepare('INSERT INTO audit_logs (user_id, action, ip, details) VALUES (?, ?, ?, ?)').run(
      req.user.id,
      'admin_verify_user',
      req.ip,
      JSON.stringify({ target_user_id: parseInt(req.params.id) })
    );
  } catch (e) {}

  res.json({ success: true });
});

router.delete('/users/:id', (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/stats', (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as total FROM users').get();
  const totalLinks = db.prepare('SELECT COUNT(*) as total FROM links').get();
  const totalClicks = db.prepare('SELECT SUM(click_count) as total FROM links').get();
  const totalViews = db.prepare('SELECT COUNT(*) as total FROM page_views').get();

  res.json({
    total_users: totalUsers.total,
    total_links: totalLinks.total,
    total_clicks: totalClicks.total || 0,
    total_views: totalViews.total
  });
});

router.get('/audit-logs', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  const logs = db.prepare(`
    SELECT a.*, u.username 
    FROM audit_logs a 
    LEFT JOIN users u ON a.user_id = u.id 
    ORDER BY a.created_at DESC 
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) as c FROM audit_logs').get();

  res.json({ logs, total: total.c, page, pages: Math.ceil(total.c / limit) });
});

// Blocked links report (moderation)
router.get('/blocked-links', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  const logs = db.prepare(`
    SELECT a.*, u.username, u.email
    FROM audit_logs a 
    LEFT JOIN users u ON a.user_id = u.id 
    WHERE a.action = 'link_blocked'
    ORDER BY a.created_at DESC 
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare("SELECT COUNT(*) as c FROM audit_logs WHERE action = 'link_blocked'").get();

  res.json({ logs, total: total.c, page, pages: Math.ceil(total.c / limit) });
});

module.exports = router;
