const { buildSeoHead, getInitial, getIconForLink, renderGroupedLinks } = require('./_helpers');

module.exports = function renderSciFi(data) {
  const { user, allLinks, escapeHtml } = data;
  const initial = getInitial(user);
  const avatarContent = user.avatar
    ? `<img src="/uploads/${user.avatar}" alt="${escapeHtml(user.display_name || user.username)}" style="width:100%;height:100%;object-fit:cover">`
    : initial;

  let regularIdx = 0;
  const linksHtml = renderGroupedLinks(allLinks, {
    renderDivider: (link) => `<div class="section-label">${escapeHtml(link.title.toUpperCase())}</div>`,
    renderRegular: (link) => {
      regularIdx++;
      const num = String(regularIdx).padStart(2, '0');
      return `<a href="/${user.username}/click/${link.id}" class="link-btn" target="_blank" rel="noopener noreferrer">
        <span class="link-icon">${getIconForLink(link)}</span>
        <span class="link-id">[${num}]</span>
        <span class="link-title">${escapeHtml(link.title)}</span>
        <span class="link-status">▸ OPEN</span>
      </a>`;
    },
    renderSocial: (link) => `<a href="/${user.username}/click/${link.id}" class="link-btn link-btn-social" target="_blank" rel="noopener noreferrer" title="${escapeHtml(link.title)}">
      <span class="link-icon">${getIconForLink(link)}</span>
    </a>`
  });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  ${buildSeoHead(data)}
  <link href="https://fonts.googleapis.com/css2?family=Major+Mono+Display&family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--void:#0a0805;--void-2:#15110a;--emergency:#ff4500;--warning:#ffaa00;--terminal:#00ff88;--bone:#f5f0e8;--grid:rgba(255,69,0,0.08)}
    body{font-family:'Inter',sans-serif;background:var(--void);color:var(--bone);min-height:100vh;padding:1.5rem 1rem;position:relative;overflow-x:hidden}
    body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(var(--grid) 1px, transparent 1px),linear-gradient(90deg, var(--grid) 1px, transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0}
    body::after{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 3px);pointer-events:none;z-index:1}
    .alert-bar{position:fixed;top:0;left:0;right:0;background:var(--emergency);color:#000;font-family:'Major Mono Display',monospace;font-size:0.7rem;letter-spacing:0.3em;padding:0.5rem 1rem;text-align:center;z-index:10;animation:flash 2s ease-in-out infinite;border-bottom:2px solid #000}
    @keyframes flash{0%,100%{opacity:1}50%{opacity:0.7}}
    .container{max-width:540px;margin:3rem auto 0;position:relative;z-index:2}
    .readout{font-family:'Major Mono Display',monospace;font-size:0.65rem;letter-spacing:0.15em;color:var(--warning);margin-bottom:0.5rem;display:flex;justify-content:space-between;text-transform:uppercase;border-bottom:1px solid rgba(255,170,0,0.3);padding-bottom:0.5rem}
    .readout-blink{color:var(--terminal)}
    .readout-blink::after{content:'';display:inline-block;width:8px;height:8px;background:var(--terminal);border-radius:50%;margin-left:0.5rem;animation:blink 1.5s ease-in-out infinite;vertical-align:middle}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
    .profile{border:1px solid var(--emergency);padding:1.5rem;margin-bottom:1.5rem;background:rgba(255,69,0,0.03);position:relative}
    .profile::before{content:'';position:absolute;top:-1px;left:24px;width:60px;height:3px;background:var(--void)}
    .profile-label{position:absolute;top:-7px;left:24px;background:var(--void);color:var(--emergency);font-family:'Major Mono Display',monospace;font-size:0.6rem;letter-spacing:0.2em;padding:0 8px}
    .id-grid{display:grid;grid-template-columns:80px 1fr;gap:1rem;margin-bottom:1rem}
    .avatar{width:80px;height:80px;background:var(--void-2);border:1px solid var(--emergency);display:flex;align-items:center;justify-content:center;position:relative;font-family:'Major Mono Display',monospace;font-size:2.5rem;color:var(--emergency);overflow:hidden}
    .avatar::before{content:'';position:absolute;top:-1px;left:-1px;width:8px;height:8px;border-top:2px solid var(--terminal);border-left:2px solid var(--terminal)}
    .avatar::after{content:'';position:absolute;bottom:-1px;right:-1px;width:8px;height:8px;border-bottom:2px solid var(--terminal);border-right:2px solid var(--terminal)}
    .id-info{display:flex;flex-direction:column;justify-content:center;gap:0.25rem}
    .name{font-family:'Major Mono Display',monospace;font-size:clamp(1rem,4vw,1.5rem);letter-spacing:0.05em;line-height:1.1;color:var(--bone);text-transform:uppercase;word-break:break-word;overflow-wrap:anywhere}
    .codename{font-family:'Major Mono Display',monospace;font-size:0.65rem;letter-spacing:0.2em;color:var(--warning);text-transform:uppercase}
    .bio{font-size:0.85rem;line-height:1.5;color:#bbb;padding-top:0.75rem;border-top:1px dashed rgba(255,69,0,0.3);font-family:'Inter',sans-serif}
    .section-label{font-family:'Major Mono Display',monospace;font-size:0.65rem;letter-spacing:0.2em;color:var(--emergency);margin:1.5rem 0 0.75rem;text-transform:uppercase;display:flex;align-items:center;gap:0.5rem}
    .section-label::before{content:'';width:24px;height:1px;background:var(--emergency)}
    .section-label::after{content:'';flex:1;height:1px;background:linear-gradient(90deg, var(--emergency), transparent)}
    .links{display:flex;flex-direction:column;gap:0.5rem}
    .link-btn{display:flex;align-items:center;gap:1rem;padding:0.875rem 1rem;background:rgba(255,69,0,0.03);border:1px solid rgba(255,69,0,0.4);text-decoration:none;color:var(--bone);font-family:'Inter',sans-serif;font-size:0.85rem;font-weight:500;transition:all .2s;position:relative}
    .link-btn::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--emergency);transition:width .2s}
    .link-btn:hover{background:rgba(255,69,0,0.1);border-color:var(--emergency);transform:translateX(4px)}
    .link-btn:hover::before{width:6px}
    .link-id{font-family:'Major Mono Display',monospace;font-size:0.55rem;letter-spacing:0.15em;color:var(--warning)}
    .link-icon{width:24px;height:24px;flex-shrink:0;color:var(--emergency);display:flex;align-items:center;justify-content:center}
    .link-icon svg{width:18px;height:18px}
    .link-title{flex:1}
    .link-status{font-family:'Major Mono Display',monospace;font-size:0.6rem;letter-spacing:0.15em;color:var(--terminal);text-transform:uppercase}
    .social-row{display:flex;flex-wrap:wrap;justify-content:center;gap:0.5rem;margin:0.5rem 0}
    .link-btn-social{padding:0;width:48px;height:48px;justify-content:center;border-radius:50%}
    .link-btn-social::before{display:none}
    .footer-bar{margin-top:2rem;padding-top:1rem;border-top:1px solid rgba(255,69,0,0.3);font-family:'Major Mono Display',monospace;font-size:0.55rem;letter-spacing:0.2em;color:var(--warning);text-align:center;text-transform:uppercase}
    .footer-bar a{color:inherit;text-decoration:none}
  </style>
</head>
<body>
  <div class="alert-bar">⚠ TERMINAL ACCESS ⚠ STATUS: ONLINE ⚠</div>

  <main class="container">
    <div class="readout">
      <span>SEKTOR/${escapeHtml(user.username.toUpperCase())} ◆ TERMINAL_07</span>
      <span class="readout-blink">LIVE</span>
    </div>

    <section class="profile">
      <span class="profile-label">// PROFILE</span>
      <div class="id-grid">
        <div class="avatar">${avatarContent}</div>
        <div class="id-info">
          <div class="name">${escapeHtml(user.display_name || user.username)}</div>
          <div class="codename">// @${escapeHtml(user.username)}</div>
        </div>
      </div>
      ${user.bio ? `<p class="bio">${escapeHtml(user.bio)}</p>` : ''}
    </section>

    <div class="links">${linksHtml}</div>

    <div class="footer-bar">END.OF.TRANSMISSION ◆ <a href="/">POWERED.BY.SEIKOULINK</a></div>
  </main>
</body>
</html>`;
};
