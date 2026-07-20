const { buildSeoHead, getInitial, getIconForLink, renderGroupedLinks } = require('./_helpers');

module.exports = function renderZineHand(data) {
  const { user, allLinks, escapeHtml } = data;
  const initial = getInitial(user);
  const avatarContent = user.avatar
    ? `<img src="/uploads/${user.avatar}" alt="${escapeHtml(user.display_name || user.username)}" style="width:100%;height:100%;object-fit:cover">`
    : initial;

  const linksHtml = renderGroupedLinks(allLinks, {
    renderDivider: (link) => `<span class="section-tab">— ${escapeHtml(link.title.toLowerCase())}</span>`,
    renderRegular: (link) => `<a href="/${user.username}/click/${link.id}" class="link-btn" target="_blank" rel="noopener noreferrer">
      <span class="link-num">${getIconForLink(link)}</span>
      <span class="link-title">${escapeHtml(link.title)}</span>
      <span class="link-arrow">→</span>
    </a>`,
    renderSocial: (link) => `<a href="/${user.username}/click/${link.id}" class="link-btn link-btn-social" target="_blank" rel="noopener noreferrer" title="${escapeHtml(link.title)}">
      <span class="link-num">${getIconForLink(link)}</span>
    </a>`
  });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  ${buildSeoHead(data)}
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Special+Elite&family=Patrick+Hand&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--paper:#f4ead5;--paper-2:#ede0c4;--ink:#2a1f15;--tape:rgba(255,255,180,0.55);--tape-edge:rgba(180,160,80,0.4);--red:#c63d2f;--teal:#3a7a76}
    body{font-family:'Patrick Hand',cursive;background:var(--paper);background-image:repeating-linear-gradient(0deg, transparent 0, transparent 24px, rgba(180,150,100,0.07) 24px, rgba(180,150,100,0.07) 25px),radial-gradient(circle at 20% 80%, rgba(180,150,100,0.12) 0%, transparent 40%),radial-gradient(circle at 80% 20%, rgba(180,150,100,0.1) 0%, transparent 40%);color:var(--ink);min-height:100vh;padding:2rem 1rem;position:relative}
    .container{max-width:480px;margin:0 auto;position:relative;z-index:1}
    .header-tape{position:relative;padding:2rem 1.5rem 1.5rem;background:var(--paper-2);border:1px dashed rgba(42,31,21,0.3);margin-bottom:1.5rem;transform:rotate(-0.5deg);box-shadow:3px 3px 0 rgba(42,31,21,0.1)}
    .header-tape::before{content:'';position:absolute;top:-12px;left:30%;width:90px;height:24px;background:var(--tape);border:1px solid var(--tape-edge);transform:rotate(-3deg);opacity:0.7}
    .header-tape::after{content:'';position:absolute;top:-12px;right:20%;width:70px;height:22px;background:var(--tape);border:1px solid var(--tape-edge);transform:rotate(4deg);opacity:0.7}
    .stamp-corner{position:absolute;top:8px;right:8px;font-family:'Special Elite',monospace;font-size:0.55rem;color:var(--red);border:2px solid var(--red);padding:0.2rem 0.4rem;letter-spacing:0.1em;transform:rotate(8deg);opacity:0.7}
    .header-row{display:flex;gap:1rem;align-items:center;margin-bottom:0.75rem}
    .photo-pol{width:90px;height:110px;background:#fff;border:1px solid rgba(0,0,0,0.1);padding:6px 6px 18px;box-shadow:2px 3px 6px rgba(0,0,0,0.1);transform:rotate(-3deg);flex-shrink:0}
    .photo-pol-img{width:100%;height:100%;background:linear-gradient(135deg, #e8c39e, #c89b6f);display:flex;align-items:center;justify-content:center;font-family:'Caveat',cursive;font-weight:700;font-size:2.5rem;color:#fff;overflow:hidden}
    .info{flex:1}
    .info .label{font-family:'Special Elite',monospace;font-size:0.65rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--red);margin-bottom:0.25rem}
    .name{font-family:'Caveat',cursive;font-weight:700;font-size:clamp(1.75rem,6vw,2.5rem);line-height:1;color:var(--ink);margin-bottom:0.25rem;word-break:break-word;overflow-wrap:anywhere}
    .name-underline{width:50px;height:3px;background:var(--red);transform:skew(-15deg)}
    .bio-block{background:var(--paper);padding:0.75rem 1rem;border:1px solid rgba(42,31,21,0.2);font-size:1.1rem;line-height:1.5;transform:rotate(0.3deg);position:relative}
    .bio-block::before{content:'❝';position:absolute;top:-12px;left:8px;font-family:'Caveat',cursive;font-size:2.5rem;color:var(--red);line-height:1}
    .section-tab{display:inline-block;background:var(--ink);color:var(--paper);font-family:'Special Elite',monospace;font-size:0.7rem;letter-spacing:0.15em;padding:0.3rem 0.8rem;text-transform:uppercase;margin:1.25rem 0 0.5rem;transform:rotate(-1deg);box-shadow:2px 2px 0 rgba(42,31,21,0.2)}
    .links{display:flex;flex-direction:column;gap:0.75rem}
    .link-btn{display:flex;align-items:center;gap:0.875rem;padding:0.875rem 1.25rem;background:#fff;border:1px solid rgba(0,0,0,0.15);text-decoration:none;color:var(--ink);font-family:'Caveat',cursive;font-size:1.4rem;font-weight:600;box-shadow:3px 3px 0 rgba(42,31,21,0.15);transition:transform .15s, box-shadow .15s;position:relative}
    .link-btn:nth-child(odd){transform:rotate(-0.5deg)}
    .link-btn:nth-child(even){transform:rotate(0.5deg)}
    .link-btn:hover{transform:rotate(0) translateY(-2px);box-shadow:5px 5px 0 var(--red)}
    .link-btn::before{content:'';position:absolute;top:-8px;left:20%;width:40px;height:14px;background:var(--tape);border:1px solid var(--tape-edge);transform:rotate(-4deg);opacity:0.6}
    .link-num{flex-shrink:0;color:var(--red);width:24px;height:24px;display:flex;align-items:center;justify-content:center}
    .link-num svg{width:20px;height:20px}
    .link-title{flex:1;line-height:1}
    .link-arrow{font-family:'Caveat',cursive;font-size:1.6rem;color:var(--teal)}
    .social-row{display:flex;flex-wrap:wrap;justify-content:center;gap:0.5rem;margin:0.5rem 0}
    .link-btn-social{padding:0.6rem;justify-content:center;width:54px;height:54px;font-size:0;border-radius:8px}
    .footer{margin-top:2.5rem;text-align:center;font-family:'Special Elite',monospace;font-size:0.7rem;letter-spacing:0.2em;color:var(--ink);opacity:0.6;text-transform:uppercase}
    .footer::before, .footer::after{content:'~';margin:0 0.5rem;color:var(--red)}
    .footer a{color:inherit;text-decoration:none}
  </style>
</head>
<body>
  <main class="container">
    <header class="header-tape">
      <span class="stamp-corner">@${escapeHtml(user.username.slice(0,8).toUpperCase())}</span>
      <div class="header-row">
        <div class="photo-pol"><div class="photo-pol-img">${avatarContent}</div></div>
        <div class="info">
          <div class="label">— hi, my name is</div>
          <h1 class="name">${escapeHtml(user.display_name || user.username)}</h1>
          <div class="name-underline"></div>
        </div>
      </div>
      ${user.bio ? `<div class="bio-block">${escapeHtml(user.bio)}</div>` : ''}
    </header>

    <div class="links">${linksHtml}</div>

    <div class="footer"><a href="/">made with love by seikoulink</a></div>
  </main>
</body>
</html>`;
};
