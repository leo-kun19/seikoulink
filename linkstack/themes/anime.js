const { buildSeoHead, getInitial, getIconForLink, renderGroupedLinks } = require('./_helpers');

module.exports = function renderAnime(data) {
  const { user, allLinks, escapeHtml } = data;
  const initial = getInitial(user);
  const avatarContent = user.avatar
    ? `<img src="/uploads/${user.avatar}" alt="${escapeHtml(user.display_name || user.username)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : initial;

  const linksHtml = renderGroupedLinks(allLinks, {
    renderDivider: (link) => `<div class="section-label">★ ${escapeHtml(link.title)} ★</div>`,
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
  <link href="https://fonts.googleapis.com/css2?family=Bowlby+One&family=Zen+Maru+Gothic:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--pink:#ff6b9d;--pink-dark:#d4467a;--paper:#fff5ee;--ink:#1a1a1a;--soft:#fce4ec}
    body{font-family:'Zen Maru Gothic',sans-serif;background:var(--paper);color:var(--ink);min-height:100vh;padding:2rem 1rem;position:relative;overflow-x:hidden}
    body::before{content:'';position:fixed;inset:0;background-image:radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px);background-size:8px 8px;pointer-events:none;z-index:0}
    .speed-lines{position:fixed;top:0;left:0;width:100%;height:120px;background:repeating-linear-gradient(90deg, transparent 0, transparent 4px, rgba(255,107,157,0.12) 4px, rgba(255,107,157,0.12) 5px);pointer-events:none;z-index:0}
    .sakura{position:fixed;pointer-events:none;animation:fall 8s linear infinite;font-size:1rem;z-index:0;top:-50px}
    .sakura:nth-child(1){left:10%;animation-delay:0s;animation-duration:9s}
    .sakura:nth-child(2){left:30%;animation-delay:2s;animation-duration:11s}
    .sakura:nth-child(3){left:50%;animation-delay:4s;animation-duration:8s}
    .sakura:nth-child(4){left:70%;animation-delay:1s;animation-duration:10s}
    .sakura:nth-child(5){left:90%;animation-delay:3s;animation-duration:12s}
    @keyframes fall{from{transform:translateY(-50px) rotate(0deg);opacity:0}10%{opacity:1}90%{opacity:1}to{transform:translateY(120vh) rotate(720deg);opacity:0}}
    .container{max-width:520px;margin:0 auto;position:relative;z-index:1}
    .badge{display:inline-block;font-family:'Bowlby One',sans-serif;background:var(--ink);color:var(--pink);padding:0.25rem 0.75rem;font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;transform:rotate(-3deg);margin-bottom:1rem;box-shadow:3px 3px 0 var(--pink)}
    .profile{text-align:center;margin-bottom:2.5rem;position:relative}
    .avatar{width:120px;height:120px;margin:0 auto 1rem;border:4px solid var(--ink);border-radius:50%;background:var(--pink);display:flex;align-items:center;justify-content:center;font-family:'Bowlby One',sans-serif;font-size:3rem;color:#fff;box-shadow:6px 6px 0 var(--ink);position:relative;overflow:hidden}
    .avatar::after{content:'';position:absolute;top:-8px;right:-8px;width:32px;height:32px;background:var(--pink);border:3px solid var(--ink);border-radius:50%;animation:pop 2s ease-in-out infinite}
    @keyframes pop{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}
    .name{font-family:'Bowlby One',sans-serif;font-size:clamp(1.75rem,6vw,2.5rem);letter-spacing:-0.02em;line-height:1.05;margin-bottom:0.5rem;text-shadow:3px 3px 0 var(--pink);word-break:break-word;overflow-wrap:anywhere}
    .bio{font-size:0.95rem;line-height:1.6;color:#444;max-width:380px;margin:0 auto;padding:0.75rem 1rem;background:var(--soft);border:2px solid var(--ink);border-radius:20px}
    .links{display:flex;flex-direction:column;gap:0.875rem}
    .section-label{font-family:'Bowlby One',sans-serif;font-size:0.75rem;letter-spacing:0.2em;text-align:center;color:var(--pink-dark);margin:1.5rem 0 0.5rem}
    .link-btn{display:flex;align-items:center;gap:1rem;padding:1rem 1.25rem;background:#fff;border:3px solid var(--ink);border-radius:24px 8px 24px 8px;text-decoration:none;color:var(--ink);font-weight:700;font-size:0.95rem;box-shadow:5px 5px 0 var(--ink);transition:transform .15s,box-shadow .15s,background .15s;position:relative;overflow:hidden}
    .link-btn::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg, transparent, rgba(255,107,157,0.2), transparent);transition:left .5s}
    .link-btn:hover{transform:translate(-3px,-3px);box-shadow:8px 8px 0 var(--pink);background:var(--soft)}
    .link-btn:hover::before{left:100%}
    .link-icon{width:36px;height:36px;background:var(--pink);border:2px solid var(--ink);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff}
    .link-icon svg{width:18px;height:18px}
    .link-title{flex:1}
    .link-arrow{font-family:'Bowlby One',sans-serif;color:var(--pink-dark);font-size:1.2rem}
    .social-row{display:flex;flex-wrap:wrap;justify-content:center;gap:0.75rem;margin:0.5rem 0}
    .link-btn-social{padding:0;width:54px;height:54px;justify-content:center;border-radius:50%}
    .footer{text-align:center;margin-top:2.5rem;font-family:'Bowlby One',sans-serif;font-size:0.7rem;letter-spacing:0.2em;color:var(--ink);opacity:0.5}
    .footer a{color:inherit;text-decoration:none}
    @media(max-width:480px){.name{font-size:1.8rem}}
  </style>
</head>
<body>
  <div class="speed-lines"></div>
  <div class="sakura">🌸</div><div class="sakura">🌸</div><div class="sakura">🌸</div><div class="sakura">🌸</div><div class="sakura">🌸</div>

  <main class="container">
    <header class="profile">
      <div class="badge">★ ${escapeHtml(user.username)} ★</div>
      <div class="avatar">${avatarContent}</div>
      <h1 class="name">${escapeHtml(user.display_name || user.username)}</h1>
      ${user.bio ? `<p class="bio">${escapeHtml(user.bio)}</p>` : ''}
    </header>

    <div class="links">${linksHtml}</div>

    <div class="footer">— つづく — <br><a href="/">Powered by SeikouLink</a></div>
  </main>
</body>
</html>`;
};
