const { buildSeoHead, getInitial, getIconForLink, renderGroupedLinks } = require('./_helpers');

module.exports = function renderGameRetro(data) {
  const { user, allLinks, escapeHtml } = data;
  const initial = getInitial(user);
  const avatarContent = user.avatar
    ? `<img src="/uploads/${user.avatar}" alt="${escapeHtml(user.display_name || user.username)}" style="width:100%;height:100%;object-fit:cover">`
    : '';

  const linksHtml = renderGroupedLinks(allLinks, {
    renderDivider: (link) => `<div class="section-label">▸ ${escapeHtml(link.title)}</div>`,
    renderRegular: (link) => `<a href="/${user.username}/click/${link.id}" class="link-btn" target="_blank" rel="noopener noreferrer">
      <span class="link-icon">${getIconForLink(link)}</span>
      <span class="link-title">${escapeHtml(link.title)}</span>
      <span class="link-arrow">▶</span>
    </a>`,
    renderSocial: (link) => `<a href="/${user.username}/click/${link.id}" class="link-btn link-btn-social" target="_blank" rel="noopener noreferrer" title="${escapeHtml(link.title)}">
      <span class="link-icon">${getIconForLink(link)}</span>
    </a>`
  });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  ${buildSeoHead(data)}
  <link href="https://fonts.googleapis.com/css2?family=VT323&family=Press+Start+2P&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box;image-rendering:pixelated}
    :root{--grass:#7cb342;--grass-dark:#558b2f;--dirt:#8b4513;--dirt-dark:#5d2e0a;--stone:#7e7e7e;--stone-dark:#494949;--gold:#ffd700;--xp:#a8e063;--text:#fff;--text-shadow:#3f3f3f}
    body{font-family:'VT323',monospace;background:linear-gradient(180deg, #87ceeb 0%, #5dade2 50%, #4a90c2 100%);color:var(--text);min-height:100vh;padding:2rem 1rem;position:relative;overflow-x:hidden}
    body::before{content:'';position:fixed;bottom:0;left:0;right:0;height:200px;background:repeating-linear-gradient(0deg, transparent 0, transparent 32px, rgba(0,0,0,0.05) 32px, rgba(0,0,0,0.05) 64px),repeating-linear-gradient(90deg, transparent 0, transparent 32px, rgba(0,0,0,0.05) 32px, rgba(0,0,0,0.05) 64px),linear-gradient(180deg, var(--grass) 0%, var(--grass-dark) 20%, var(--dirt) 25%, var(--dirt-dark) 100%);z-index:0;pointer-events:none}
    .container{max-width:480px;margin:0 auto;position:relative;z-index:2}
    .achievement{background:linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%);border:2px solid #1a1a1a;padding:0.75rem 1rem;display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem;animation:slideIn 0.6s ease-out;box-shadow:0 4px 0 #1a1a1a}
    @keyframes slideIn{from{transform:translateY(-30px);opacity:0}to{transform:translateY(0);opacity:1}}
    .achievement-icon{width:32px;height:32px;background:var(--gold);border:2px solid #1a1a1a;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:'Press Start 2P',monospace;font-size:0.7rem;color:#000}
    .achievement-text{font-family:'Press Start 2P',monospace;font-size:0.55rem;line-height:1.6;letter-spacing:0.05em}
    .achievement-text small{color:var(--gold);display:block;font-size:0.45rem;margin-bottom:0.25rem}
    .profile{background:rgba(0,0,0,0.7);border:3px solid #1a1a1a;padding:1.5rem;text-align:center;margin-bottom:1.5rem;box-shadow:0 6px 0 #1a1a1a}
    .avatar{width:80px;height:80px;margin:0 auto 1rem;background:#fdbcb4;border:3px solid #1a1a1a;position:relative;box-shadow:inset -4px -4px 0 rgba(0,0,0,0.3),inset 4px 4px 0 rgba(255,255,255,0.15);overflow:hidden}
    .name{font-family:'Press Start 2P',monospace;font-size:clamp(0.7rem,3.5vw,1rem);letter-spacing:0.05em;line-height:1.4;margin-bottom:0.5rem;text-shadow:2px 2px 0 var(--text-shadow);word-break:break-word;overflow-wrap:anywhere}
    .level{font-family:'VT323',monospace;font-size:1.1rem;color:var(--xp);margin-bottom:1rem;letter-spacing:0.05em}
    .bio{font-size:1.1rem;line-height:1.4;color:#e0e0e0;letter-spacing:0.02em}
    .links{display:flex;flex-direction:column;gap:0.5rem}
    .section-label{font-family:'Press Start 2P',monospace;font-size:0.6rem;letter-spacing:0.1em;color:#fff;margin:1rem 0 0.25rem;text-shadow:2px 2px 0 var(--text-shadow);text-transform:uppercase}
    .link-btn{display:flex;align-items:center;gap:1rem;padding:0.875rem 1rem;background:linear-gradient(180deg, var(--stone) 0%, var(--stone-dark) 100%);border:3px solid #1a1a1a;text-decoration:none;color:#fff;font-family:'VT323',monospace;font-size:1.2rem;letter-spacing:0.03em;box-shadow:0 4px 0 #1a1a1a,inset 2px 2px 0 rgba(255,255,255,0.2),inset -2px -2px 0 rgba(0,0,0,0.3);transition:transform .1s,box-shadow .1s}
    .link-btn:hover{transform:translateY(2px);box-shadow:0 2px 0 #1a1a1a,inset 2px 2px 0 rgba(255,255,255,0.2),inset -2px -2px 0 rgba(0,0,0,0.3);background:linear-gradient(180deg, #8e8e8e 0%, #5a5a5a 100%)}
    .link-icon{width:32px;height:32px;background:var(--gold);border:2px solid #1a1a1a;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#000}
    .link-icon svg{width:16px;height:16px}
    .link-title{flex:1;text-shadow:1px 1px 0 #000}
    .link-arrow{font-family:'Press Start 2P',monospace;font-size:0.7rem;color:#fff}
    .social-row{display:flex;flex-wrap:wrap;justify-content:center;gap:0.5rem;margin:0.5rem 0}
    .link-btn-social{padding:0;width:54px;height:54px;justify-content:center}
    .link-btn-social .link-icon{margin:0}
    .footer{text-align:center;margin-top:2rem;font-family:'Press Start 2P',monospace;font-size:0.55rem;letter-spacing:0.1em;color:#fff;text-shadow:2px 2px 0 var(--text-shadow)}
    .footer a{color:inherit;text-decoration:none}
  </style>
</head>
<body>
  <main class="container">
    <div class="achievement">
      <div class="achievement-icon">★</div>
      <div class="achievement-text">
        <small>Pencapaian Diraih!</small>
        Profil dibuka oleh visitor
      </div>
    </div>

    <div class="profile">
      <div class="avatar">${avatarContent}</div>
      <h1 class="name">${escapeHtml((user.display_name || user.username).toUpperCase())}</h1>
      <div class="level">▸ ${escapeHtml(user.username)} ◂</div>
      ${user.bio ? `<p class="bio">${escapeHtml(user.bio)}</p>` : ''}
    </div>

    <div class="links">${linksHtml}</div>

    <div class="footer">[ <a href="/">POWERED BY SEIKOULINK</a> ]</div>
  </main>
</body>
</html>`;
};
