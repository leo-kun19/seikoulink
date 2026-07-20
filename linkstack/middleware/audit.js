const db = require('../db');

/**
 * Log an audit event
 * @param {number|null} userId - User ID (null for failed logins)
 * @param {string} action - Action type: login, login_failed, logout, register, link_create, link_edit, link_delete, profile_update, password_change
 * @param {string} ip - Request IP address
 * @param {object} details - Additional details (will be JSON stringified)
 */
function logAudit(userId, action, ip, details = {}) {
  try {
    db.prepare(
      'INSERT INTO audit_logs (user_id, action, ip, details) VALUES (?, ?, ?, ?)'
    ).run(userId, action, ip || null, JSON.stringify(details));
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = { logAudit };
