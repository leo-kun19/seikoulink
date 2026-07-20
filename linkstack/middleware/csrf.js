const crypto = require('crypto');

/**
 * CSRF Protection Middleware
 * - Generates a CSRF token stored in a non-httpOnly cookie (_csrf) so JS can read it
 * - Validates X-CSRF-Token header on state-changing requests (POST, PUT, DELETE)
 * - Skips: public unlock routes, social bot requests
 */
function csrfProtection(req, res, next) {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const isSocialBot = ua.includes('facebookexternalhit') ||
    ua.includes('whatsapp') ||
    ua.includes('twitterbot') ||
    ua.includes('telegrambot') ||
    ua.includes('linkedinbot') ||
    ua.includes('discordbot') ||
    ua.includes('googlebot') ||
    ua.includes('bingbot');

  if (isSocialBot) {
    return next();
  }

  if (req.method === 'POST' && /^\/[a-z0-9_-]+\/unlock\/\d+$/.test(req.path)) {
    return next();
  }

  // Skip CSRF for auth endpoints (login, register, forgot-password, reset-password, refresh)
  // These have their own protection (brute force, rate limiting)
  if (req.path.startsWith('/auth/login') ||
      req.path.startsWith('/auth/register') ||
      req.path.startsWith('/auth/forgot-password') ||
      req.path.startsWith('/auth/reset-password') ||
      req.path.startsWith('/auth/refresh') ||
      req.path.startsWith('/auth/verify-email') ||
      req.path.startsWith('/auth/google') ||
      req.path.startsWith('/auth/2fa/login')) {
    return next();
  }

  if (!req.cookies._csrf) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('_csrf', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
    req._csrfToken = token;
  } else {
    req._csrfToken = req.cookies._csrf;
  }

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const headerToken = req.headers['x-csrf-token'];
    const cookieToken = req.cookies._csrf;

    if (!cookieToken || !headerToken || headerToken !== cookieToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  }

  next();
}

module.exports = { csrfProtection };
