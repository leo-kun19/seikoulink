const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');

function authenticate(req, res, next) {
  const accessToken = req.cookies.token || req.headers.authorization?.split(' ')[1];
  const refreshToken = req.cookies.refresh_token;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Try access token first
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const user = db.prepare('SELECT id, username, email, is_admin, is_active, email_verified, created_at FROM users WHERE id = ? AND is_active = 1').get(decoded.id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Check email verification grace period (3 days)
      if (!user.email_verified) {
        const createdAt = new Date(user.created_at + 'Z');
        const now = new Date();
        const daysSinceCreation = (now - createdAt) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation > 3) {
          return res.status(403).json({ error: 'Verifikasi email dulu' });
        }
      }

      req.user = user;
      return next();
    } catch (err) {
      // Access token expired or invalid, try refresh
      if (err.name !== 'TokenExpiredError') {
        // If not expired but invalid, try refresh token
        if (!refreshToken) {
          return res.status(401).json({ error: 'Invalid token' });
        }
      }
    }
  }

  // Try refresh token
  if (refreshToken) {
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

      const user = db.prepare('SELECT id, username, email, is_admin, is_active, email_verified, created_at FROM users WHERE id = ? AND is_active = 1').get(decoded.id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Check email verification grace period
      if (!user.email_verified) {
        const createdAt = new Date(user.created_at + 'Z');
        const now = new Date();
        const daysSinceCreation = (now - createdAt) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation > 3) {
          return res.status(403).json({ error: 'Verifikasi email dulu' });
        }
      }

      // Revoke old refresh token
      db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?').run(storedToken.id);

      // Issue new access token
      const newAccessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      // Issue new refresh token
      const newRefreshToken = jwt.sign({ id: user.id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });
      const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(user.id, newTokenHash, expiresAt);

      // Set new cookies
      res.cookie('token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000
      });

      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      req.user = user;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  return res.status(401).json({ error: 'Unauthorized' });
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
