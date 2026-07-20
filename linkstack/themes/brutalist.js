const { buildSeoHead, getInitial, getIconForLink, renderGroupedLinks } = require('./_helpers');

module.exports = function renderBrutalist(data) {
  const { user, allLinks, escapeHtml } = data;
  const initial = getInitial(user);
  const avatarContent = user.avatar
    ? `<img src="/uploads/${user.avatar}" alt="${escapeHtml(user.display_name || user.username)}" style="width:100%;height:100%;object-fit:cover">`
    : initial;

  let regularIdx = 0;
  const linksHtml = renderGroupedLinks(allLinks, {
    renderDivider: (link) => `<span class="section-tag">/ ${escapeHtml(link.title.toUpperCase())}</span>`,
    renderRegular: (link) => {
      regularIdx++;
      const num = String(regularIdx).padStart(2, '0');
      return `<a href="/${user.username}/click/${link.id}" class="link-btn" target="_blank" rel="noopener noreferrer">
        <div class="link-num">${num}</div>
        <div class="link-icon-wrap">${getIconForLink(link)}</div>
        <div class="link-content">
          <div class="link-title">${escapeHtml(link.title)}</div>
        </div>
        <div class="link-action">→</div>
      </a>`;
    },
    renderSocial: (link) => `<a href="/${user.username}/click/${link.id}" class="link-btn link-btn-social" target="_blank" rel="noopener noreferrer" title="${escapeHtml(link.title)}">
      <div class="link-icon-wrap">${getIconForLink(link)}</div>
    </a>`
  });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  ${buildSeoHead(data)}
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--paper:#e8e6e1;--ink:#0a0a0a;--signal:#ff2b00;--hl:#fffd55}
    body{font-family:'Space Mono',monospace;background:var(--paper);background-image:linear-gradient(0deg, rgba(0,0,0,0.04) 1px, transparent 1px),linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px);background-size:20px 20px;color:var(--ink);min-height:100vh;font-size:14px}
    .top-bar{background:var(--ink);color:var(--paper);padding:0.5rem 1.5rem;font-family:'Space Mono',monospace;font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;display:flex;justify-content:space-between}
    .top-bar .signal{color:var(--signal);font-weight:700}
    .frame{max-width:540px;margin:0 auto;padding:2rem 1.5rem 4rem;position:relative}
    .header{border:3px solid var(--ink);background:var(--paper);padding:0;margin-bottom:1.5rem;position:relative}
    .header-meta{border-bottom:3px solid var(--ink);padding:0.5rem 1rem;display:flex;justify-content:space-between;font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;background:var(--ink);color:var(--paper)}
    .header-meta .red{color:var(--signal)}
    .header-content{padding:1.5rem;display:grid;grid-template-columns:80px 1fr;gap:1.25rem;align-items:start}
    .av{width:80px;height:80px;background:var(--ink);color:var(--signal);display:flex;align-items:center;justify-content:center;font-family:'Archivo Black',sans-serif;font-size:3rem;line-height:1;border:3px solid var(--ink);overflow:hidden}
    .name{font-family:'Archivo Black',sans-serif;font-size:clamp(1.5rem, 6vw, 2.75rem);letter-spacing:-0.04em;line-height:0.95;text-transform:uppercase;margin-bottom:0.25rem;word-break:break-word;overflow-wrap:anywhere}
    .name span{background:var(--hl);padding:0 0.2rem}
    .handle{font-family:'Space Mono',monospace;font-size:0.75rem;letter-spacing:0.05em;color:var(--ink);opacity:0.6;margin-bottom:0.5rem}
    .bio-line{border-top:1px solid var(--ink);padding-top:0.75rem;font-family:'Inter',sans-serif;font-size:0.85rem;line-height:1.5;grid-column:1 / -1}
    .section-tag{display:inline-block;background:var(--ink);color:var(--paper);font-family:'Archivo Black',sans-serif;font-size:0.7rem;letter-spacing:0.15em;padding:0.35rem 0.75rem;text-transform:uppercase;margin:1.5rem 0 0}
    .section-tag.sig{background:var(--signal)}
    .links{display:flex;flex-direction:column}
    .link-btn{display:grid;grid-template-columns:60px 40px 1fr 50px;align-items:stretch;text-decoration:none;color:var(--ink);border:3px solid var(--ink);border-bottom-width:1px;background:var(--paper);transition:background .15s;position:relative}
    .link-btn:not(:first-child){border-top-width:0}
    .link-btn:last-child{border-bottom-width:3px}
    .link-btn:hover{background:var(--ink);color:var(--paper)}
    .link-btn:hover .link-num{background:var(--signal);color:var(--ink)}
    .link-num{background:var(--ink);color:var(--paper);font-family:'Archivo Black',sans-serif;font-size:1.1rem;display:flex;align-items:center;justify-content:center;transition:background .15s}
    .link-icon-wrap{display:flex;align-items:center;justify-content:center;border-right:1px solid var(--ink)}
    .link-icon-wrap svg{width:18px;height:18px}
    .link-content{padding:0.75rem 1rem;display:flex;flex-direction:column;gap:0.1rem;justify-content:center}
    .link-title{font-family:'Inter',sans-serif;font-weight:700;font-size:0.95rem;letter-spacing:-0.01em}
    .link-action{border-left:1px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'Archivo Black',sans-serif;font-size:1.2rem}
    .social-row{display:flex;flex-wrap:wrap;gap:0.5rem;padding:0.75rem;background:var(--paper);border:3px solid var(--ink);border-top-width:0}
    .link-btn-social{display:flex;width:48px;height:48px;align-items:center;justify-content:center;background:var(--ink);color:var(--paper);text-decoration:none;border:none;transition:background .15s}
    .link-btn-social:hover{background:var(--signal);color:var(--ink)}
    .link-btn-social .link-icon-wrap{border:none}
    .footer-bar{margin-top:2rem;border-top:3px solid var(--ink);padding-top:1rem;display:flex;justify-content:space-between;font-family:'Space Mono',monospace;font-size:0.65rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--ink)}
    .footer-bar .signal{color:var(--signal);font-weight:700}
    .footer-bar a{color:inherit;text-decoration:none}
    @media(max-width:480px){.link-btn{grid-template-columns:48px 36px 1fr 40px}.link-num{font-size:0.9rem}.link-action{font-size:1rem}}
  </style>
</head>
<body>
  <div class="top-bar">
    <span>SEIKOUVERSE</span>
    <span class="signal">● LIVE</span>
    <span>SK-LINK</span>
  </div>

  <div class="frame">
    <div class="header">
      <div class="header-meta">
        <span>USER <span class="red">@${escapeHtml(user.username)}</span></span>
        <span>2026</span>
        <span>UTC+07</span>
      </div>
      <div class="header-content">
        <div class="av">${avatarContent}</div>
        <div>
          <h1 class="name"><span>${escapeHtml(user.display_name || user.username)}</span></h1>
          <div class="handle">@${escapeHtml(user.username)}</div>
        </div>
        ${user.bio ? `<p class="bio-line">${escapeHtml(user.bio)}</p>` : ''}
      </div>
    </div>

    ${linksHtml}

    <div class="footer-bar">
      <span>END / OF / FILE</span>
      <span class="signal">● <a href="/">POWERED BY SEIKOULINK</a></span>
    </div>
  </div>
</body>
</html>`;
};
