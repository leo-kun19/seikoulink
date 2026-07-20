const { buildSeoHead, getInitial, getIconForLink, renderGroupedLinks } = require('./_helpers');

module.exports = function renderFuturistic(data) {
  const { user, allLinks, escapeHtml } = data;
  const initial = getInitial(user);
  const avatarContent = user.avatar
    ? `<img src="/uploads/${user.avatar}" alt="${escapeHtml(user.display_name || user.username)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;position:relative;z-index:2">`
    : '';

  const linksHtml = renderGroupedLinks(allLinks, {
    renderDivider: (link) => `<span class="section-tag">${escapeHtml(link.title.toLowerCase())}</span>`,
    renderRegular: (link) => `<a href="/${user.username}/click/${link.id}" class="link-btn" target="_blank" rel="noopener noreferrer">
      <span class="link-icon">${getIconForLink(link)}</span>
      <span class="link-title">${escapeHtml(link.title)}</span>
      <span class="link-arrow">→</span>
    </a>`,
    renderSocial: (link) => `<a href="/${user.username}/click/${link.id}" class="link-btn link-btn-social" target="_blank" rel="noopener noreferrer" title="${escapeHtml(link.title)}">
      <span class="link-icon">${getIconForLink(link)}</span>
    </a>`
  });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  ${buildSeoHead(data)}
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--bg:#0a0a14;--silver:linear-gradient(180deg, #f0f0ff 0%, #c0c0d8 35%, #6a6a8c 50%, #c0c0d8 65%, #f0f0ff 100%);--silver-2:linear-gradient(180deg, #ffffff 0%, #d8d8f0 50%, #8a8aa8 100%);--pink:#ff6ec7;--cyan:#5ee5ff;--purple:#a060ff;--hl:#ffe45c}
    body{font-family:'Space Grotesk',sans-serif;background:var(--bg);color:#fff;min-height:100vh;padding:1.5rem 1rem;position:relative;overflow-x:hidden}
    body::before{content:'';position:fixed;inset:0;background:radial-gradient(circle at 20% 30%, rgba(255,110,199,0.2) 0%, transparent 40%),radial-gradient(circle at 80% 60%, rgba(94,229,255,0.18) 0%, transparent 40%),radial-gradient(circle at 50% 90%, rgba(160,96,255,0.18) 0%, transparent 40%);pointer-events:none;z-index:0}
    body::after{content:'';position:fixed;inset:0;background-image:repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgba(255,255,255,0.02) 3px, rgba(255,255,255,0.02) 4px);pointer-events:none;z-index:1}
    .corner-deco{position:fixed;width:80px;height:80px;border:1px solid rgba(94,229,255,0.3);pointer-events:none;z-index:2}
    .corner-deco.tl{top:1rem;left:1rem;border-right:none;border-bottom:none}
    .corner-deco.tr{top:1rem;right:1rem;border-left:none;border-bottom:none}
    .corner-deco.bl{bottom:1rem;left:1rem;border-right:none;border-top:none}
    .corner-deco.br{bottom:1rem;right:1rem;border-left:none;border-top:none}
    @media(max-width:480px){.corner-deco{width:40px;height:40px}}
    .container{max-width:480px;margin:0 auto;position:relative;z-index:2}
    .top-strip{display:flex;justify-content:space-between;font-family:'Orbitron',monospace;font-size:0.6rem;letter-spacing:0.3em;color:var(--cyan);text-transform:uppercase;margin-bottom:1.5rem;padding-bottom:0.5rem;border-bottom:1px solid rgba(94,229,255,0.3)}
    .top-strip .live{color:var(--pink);animation:flash 1.5s ease-in-out infinite}
    @keyframes flash{0%,100%{opacity:1}50%{opacity:0.5}}
    .header{text-align:center;margin-bottom:2rem;padding:2rem 1rem;position:relative}
    .holo-disc{width:140px;height:140px;margin:0 auto 1.5rem;border-radius:50%;background:conic-gradient(from 45deg, #ff6ec7 0deg, #5ee5ff 90deg, #a060ff 180deg, #ffe45c 270deg, #ff6ec7 360deg);display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 0 40px rgba(255,110,199,0.4),0 0 80px rgba(94,229,255,0.3),inset 0 0 60px rgba(255,255,255,0.4);animation:rotate 8s linear infinite;overflow:hidden}
    .holo-disc::before{content:'';position:absolute;inset:8px;border-radius:50%;background:var(--silver);box-shadow:inset 0 0 20px rgba(0,0,0,0.3);z-index:1}
    .holo-disc-letter{position:absolute;font-family:'Orbitron',sans-serif;font-weight:900;font-size:3.5rem;color:transparent;background:var(--silver-2);background-clip:text;-webkit-background-clip:text;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));letter-spacing:0;animation:rotate 8s linear infinite reverse;z-index:2}
    @keyframes rotate{from{transform:rotate(0)}to{transform:rotate(360deg)}}
    .name{font-family:'Orbitron',sans-serif;font-weight:900;font-size:clamp(1.75rem,7vw,3.5rem);letter-spacing:0.05em;line-height:1.05;background:var(--silver-2);background-clip:text;-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 0 10px rgba(94,229,255,0.5)) drop-shadow(0 2px 4px rgba(0,0,0,0.6));margin-bottom:0.5rem;text-transform:uppercase;word-break:break-word;overflow-wrap:anywhere}
    .tagline{font-family:'Orbitron',monospace;font-size:0.7rem;letter-spacing:0.4em;color:var(--cyan);text-transform:uppercase;margin-bottom:1rem}
    .tagline::before, .tagline::after{content:'◆';margin:0 0.5rem;color:var(--pink)}
    .bio{font-family:'Space Grotesk',sans-serif;font-size:0.95rem;line-height:1.5;color:#e8e8ff;max-width:340px;margin:0 auto;padding:0.875rem 1.25rem;background:linear-gradient(135deg, rgba(255,110,199,0.1) 0%, rgba(94,229,255,0.1) 100%);border:1px solid rgba(255,255,255,0.15);border-radius:24px;backdrop-filter:blur(10px)}
    .section-tag{display:inline-flex;align-items:center;gap:0.5rem;font-family:'Orbitron',monospace;font-size:0.65rem;letter-spacing:0.3em;color:var(--cyan);text-transform:uppercase;margin:1rem auto 0.5rem;padding:0.4rem 0.875rem;background:rgba(94,229,255,0.08);border:1px solid rgba(94,229,255,0.3);border-radius:999px}
    .section-tag::before{content:'▸';color:var(--pink)}
    .links{display:flex;flex-direction:column;gap:0.625rem}
    .link-btn{display:flex;align-items:center;gap:1rem;padding:0.875rem 1.25rem;background:linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.02) 100%);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.2);border-top-color:rgba(255,255,255,0.4);border-radius:18px;text-decoration:none;color:#fff;font-family:'Space Grotesk',sans-serif;font-size:0.95rem;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.2);transition:all .3s ease;position:relative;overflow:hidden}
    .link-btn::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);transition:left .6s}
    .link-btn:hover{transform:translateY(-2px);border-color:var(--cyan);box-shadow:0 6px 30px rgba(94,229,255,0.3),inset 0 1px 0 rgba(255,255,255,0.3)}
    .link-btn:hover::before{left:100%}
    .link-icon{width:36px;height:36px;border-radius:50%;background:var(--silver);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#1a1a2e;box-shadow:inset 0 1px 0 rgba(255,255,255,0.6),inset 0 -1px 0 rgba(0,0,0,0.2),0 2px 4px rgba(0,0,0,0.3)}
    .link-icon svg{width:18px;height:18px}
    .link-title{flex:1}
    .link-arrow{font-family:'Orbitron',sans-serif;color:var(--pink);font-weight:700;font-size:1rem}
    .social-row{display:flex;flex-wrap:wrap;justify-content:center;gap:0.5rem;margin:0.5rem 0}
    .link-btn-social{padding:0;width:54px;height:54px;justify-content:center;border-radius:50%}
    .footer{text-align:center;margin-top:2.5rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,0.1);font-family:'Orbitron',monospace;font-size:0.6rem;letter-spacing:0.4em;color:#a0a0b8;text-transform:uppercase}
    .footer .accent{background:linear-gradient(90deg, var(--pink), var(--cyan));background-clip:text;-webkit-background-clip:text;color:transparent;font-weight:700}
    .footer a{color:inherit;text-decoration:none}
  </style>
</head>
<body>
  <span class="corner-deco tl"></span>
  <span class="corner-deco tr"></span>
  <span class="corner-deco bl"></span>
  <span class="corner-deco br"></span>

  <main class="container">
    <div class="top-strip">
      <span>SYS_v2.0</span>
      <span class="live">● ONLINE</span>
      <span>@${escapeHtml(user.username)}</span>
    </div>

    <header class="header">
      <div class="holo-disc">${avatarContent || `<span class="holo-disc-letter">${initial}</span>`}</div>
      <h1 class="name">${escapeHtml(user.display_name || user.username)}</h1>
      <p class="tagline">digital craftsman</p>
      ${user.bio ? `<p class="bio">${escapeHtml(user.bio)}</p>` : ''}
    </header>

    <div class="links">${linksHtml}</div>

    <div class="footer">powered by <a href="/" class="accent">SeikouLink</a></div>
  </main>
</body>
</html>`;
};
