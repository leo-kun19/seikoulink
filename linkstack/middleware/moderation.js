const https = require('https');
const db = require('../db');

// ============================================================
// KEYWORD BLOCKLIST (judi online, pornografi, phishing umum)
// Cek di URL (lower-case) dan title
// ============================================================
const BLOCKED_KEYWORDS = [
  // Judi online (Indonesia)
  'slot', 'judi', 'gacor', 'maxwin', 'rtp', 'jackpot', 'togel', 'bandar',
  'casino', 'poker', 'qq', 'domino', 'taruhan', 'betting', 'sportsbook',
  'bandarq', 'pkv', 'idnpoker', 'idnplay', 'sbobet', 'parlay', 'mix-parlay',
  'situs slot', 'slot online', 'agen judi', 'agen bola', 'agen casino',
  'live casino', 'mahjong ways', 'pragmatic play', 'pgsoft', 'slot88',
  'olxtoto', 'totomacau', 'shio', '4d 3d', 'angka jitu',

  // Pornografi
  'porn', 'porno', 'xxx', 'sex', 'bokep', 'hentai', 'jav', 'pornhub',
  'xvideo', 'xnxx', 'redtube', 'youporn', 'onlyfans', 'camgirl',
  'nudes', 'naked', 'telanjang', 'memek', 'kontol', 'ngentot',
  'crot', 'colmek', 'bo viral', 'no sensor',

  // Crypto scam / phishing umum
  'free bitcoin', 'free eth', 'airdrop free', 'wallet connect', 'metamask-verify',
  'claim airdrop', 'mint nft free',
];

// ============================================================
// DOMAIN BLOCKLIST (exact match atau suffix)
// ============================================================
const BLOCKED_DOMAINS = [
  // Porn
  'pornhub.com', 'xvideos.com', 'xnxx.com', 'redtube.com', 'youporn.com',
  'xhamster.com', 'spankbang.com', 'tnaflix.com', 'beeg.com', 'eporner.com',
  'youjizz.com', 'porn.com', 'sex.com', 'tube8.com', 'hclips.com',
  'javhd.com', 'jav.guru', 'hentaihaven.org',

  // Judi online (yang umum diblokir Kominfo)
  'sbobet.com', '188bet.com', 'dafabet.com', 'm88.com', '12bet.com',
  'bet365.com', 'pinnacle.com', '1xbet.com', 'betway.com',

  // URL shortener yang sering dipakai phishing (opsional, bisa di-remove kalau strict)
  // 'bit.ly', 'tinyurl.com', // dibiarkan karena legit usage banyak
];

// Suspicious TLD (sering dipakai phishing/scam)
const SUSPICIOUS_TLDS = ['.tk', '.ml', '.ga', '.cf', '.gq', '.top', '.click', '.xyz'];

/**
 * Check if URL/title contains blocked content
 * @returns {object} { blocked: boolean, reason: string, category: string }
 */
function checkContent(url, title) {
  const text = ((url || '') + ' ' + (title || '')).toLowerCase();

  // Check keyword blocklist
  for (const keyword of BLOCKED_KEYWORDS) {
    // Use word-boundary-ish match to avoid false positives
    const pattern = new RegExp('\\b' + keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (pattern.test(text)) {
      let category = 'other';
      if (['slot', 'judi', 'gacor', 'maxwin', 'togel', 'casino', 'poker', 'taruhan', 'bandar'].some(k => keyword.includes(k))) {
        category = 'gambling';
      } else if (['porn', 'sex', 'bokep', 'hentai', 'jav', 'xxx', 'nudes', 'telanjang'].some(k => keyword.includes(k))) {
        category = 'pornography';
      }
      return { blocked: true, reason: `Mengandung kata terlarang: "${keyword}"`, category };
    }
  }

  // Check domain blocklist
  if (url) {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

      for (const blocked of BLOCKED_DOMAINS) {
        if (hostname === blocked || hostname.endsWith('.' + blocked)) {
          return { blocked: true, reason: `Domain diblokir: ${hostname}`, category: 'blocked-domain' };
        }
      }

      // IP address as URL is suspicious
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        return { blocked: true, reason: 'IP address tidak diperbolehkan, gunakan domain', category: 'suspicious' };
      }

      // Suspicious TLD warning (just flag, allow with notice)
      // for (const tld of SUSPICIOUS_TLDS) {
      //   if (hostname.endsWith(tld)) {
      //     // ... (could log warning but not block)
      //   }
      // }
    } catch (e) {
      return { blocked: true, reason: 'URL format tidak valid', category: 'invalid' };
    }
  }

  return { blocked: false };
}

// ============================================================
// Google Safe Browsing API (optional, real-time phishing/malware check)
// Gratis, butuh API key dari https://console.cloud.google.com/apis/library/safebrowsing.googleapis.com
// Set di .env: SAFE_BROWSING_API_KEY=xxx
// ============================================================
async function checkSafeBrowsing(url) {
  const apiKey = process.env.SAFE_BROWSING_API_KEY;
  if (!apiKey) return { safe: true, skipped: true };

  return new Promise((resolve) => {
    const body = JSON.stringify({
      client: { clientId: 'linkstack', clientVersion: '1.0' },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url }]
      }
    });

    const req = https.request({
      hostname: 'safebrowsing.googleapis.com',
      path: `/v4/threatMatches:find?key=${apiKey}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 5000
    }, (resp) => {
      let data = '';
      resp.on('data', (c) => data += c);
      resp.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.matches && result.matches.length > 0) {
            const threat = result.matches[0].threatType;
            resolve({ safe: false, threat });
          } else {
            resolve({ safe: true });
          }
        } catch (e) {
          resolve({ safe: true, error: 'parse-fail' }); // fail-open
        }
      });
    });

    req.on('error', () => resolve({ safe: true, error: 'request-fail' })); // fail-open
    req.on('timeout', () => { req.destroy(); resolve({ safe: true, error: 'timeout' }); });
    req.write(body);
    req.end();
  });
}

/**
 * Log moderation block to audit_logs for admin review
 */
function logModeration(userId, ip, url, title, reason, category) {
  try {
    db.prepare('INSERT INTO audit_logs (user_id, action, ip, details) VALUES (?, ?, ?, ?)').run(
      userId,
      'link_blocked',
      ip,
      JSON.stringify({ url: url ? url.slice(0, 200) : '', title: title ? title.slice(0, 100) : '', reason, category })
    );
  } catch (e) {
    console.error('[Moderation] Audit log failed:', e.message);
  }
}

module.exports = { checkContent, checkSafeBrowsing, logModeration };
