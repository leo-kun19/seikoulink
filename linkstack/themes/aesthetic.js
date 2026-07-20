const { buildSeoHead, getInitial, getIconForLink, renderGroupedLinks } = require('./_helpers');

module.exports = function renderAesthetic(data) {
  const { user, allLinks, escapeHtml } = data;
  const initial = getInitial(user);
  const avatarContent = user.avatar
    ? `<img src="/uploads/${user.avatar}" alt="${escapeHtml(user.display_name || user.username)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : initial;

  const linksHtml = renderGroupedLinks(allLinks, {
    renderDivider: (link) => `<div class="section-label">${escapeHtml(link.title.toUpperCase())}</div>`,
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
  <link href="https://fonts.googleapis.com/css2?family=Monoton&family=Bebas+Neue&family=Noto+Sans+JP:wght@400;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--pink:#ff77c6;--cyan:#7df9ff;--purple:#bd5fff;--magenta:#ff00b3;--void:#0d0026;--bone:#ffeefa}
    body{font-family:'Inter',sans-serif;background:linear-gradient(180deg, #0d0026 0%, #2d0066 50%, #4d0099 100%);color:var(--bone);min-height:100vh;padding:2rem 1rem;position:relative;overflow-x:hidden}
    body::before{content:'';position:fixed;bottom:-20%;left:-10%;right:-10%;height:60%;background:repeating-linear-gradient(0deg, transparent 0, transparent 30px, rgba(255,119,198,0.3) 30px, rgba(255,119,198,0.3) 31px),repeating-linear-gradient(90deg, transparent 0, transparent 30px, rgba(125,249,255,0.3) 30px, rgba(125,249,255,0.3) 31px);transform:perspective(400px) rotateX(60deg);transform-origin:center top;pointer-events:none;z-index:0;mask-image:linear-gradient(180deg, transparent 0%, black 30%, black 100%);-webkit-mask-image:linear-gradient(180deg, transparent 0%, black 30%, black 100%)}
    .sun{position:fixed;top:15%;left:50%;transform:translateX(-50%);width:300px;height:300px;background:linear-gradient(180deg, #ff7eb9 0%, #ff8fa3 30%, #ffa57a 60%, #ffd4a3 100%);border-radius:50%;pointer-events:none;z-index:0;box-shadow:0 0 80px rgba(255,119,198,0.6);mask-image:repeating-linear-gradient(0deg, black 0, black 8px, transparent 8px, transparent 14px);-webkit-mask-image:repeating-linear-gradient(0deg, black 0, black 8px, transparent 8px, transparent 14px)}
    .container{max-width:520px;margin:0 auto;position:relative;z-index:2;padding-top:2rem}
    .top-jp{font-family:'Noto Sans JP',sans-serif;font-weight:700;font-size:0.85rem;letter-spacing:0.4em;color:var(--cyan);text-align:center;margin-bottom:0.5rem;text-shadow:0 0 8px var(--cyan)}
    .profile{text-align:center;margin-bottom:3rem;padding-top:8rem}
    .avatar{width:130px;height:130px;margin:0 auto 1.5rem;background:linear-gradient(135deg, var(--cyan) 0%, var(--pink) 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Monoton',cursive;font-size:3.5rem;color:var(--void);box-shadow:0 0 30px rgba(255,119,198,0.6),0 0 60px rgba(125,249,255,0.4);position:relative;overflow:hidden}
    .avatar::before{content:'';position:absolute;inset:-8px;border:2px solid var(--cyan);border-radius:50%;animation:rotate 12s linear infinite;opacity:0.5;pointer-events:none}
    @keyframes rotate{from{transform:rotate(0)}to{transform:rotate(360deg)}}
    .name{font-family:'Monoton',cursive;font-size:clamp(2rem, 8vw, 4rem);letter-spacing:0.05em;line-height:1.05;margin-bottom:0.5rem;background:linear-gradient(180deg, var(--cyan) 0%, var(--pink) 50%, var(--magenta) 100%);background-clip:text;-webkit-background-clip:text;color:transparent;text-shadow:2px 2px 0 var(--magenta),4px 4px 0 var(--purple);word-break:break-word;overflow-wrap:anywhere}
    .bio{font-family:'Inter',sans-serif;font-size:0.95rem;line-height:1.6;color:var(--bone);max-width:380px;margin:0 auto;padding:0.875rem 1.25rem;background:rgba(13,0,38,0.5);backdrop-filter:blur(10px);border:1px solid var(--cyan);box-shadow:0 0 20px rgba(125,249,255,0.3),inset 0 0 20px rgba(255,119,198,0.1)}
    .section-label{font-family:'Bebas Neue',sans-serif;font-size:1.2rem;letter-spacing:0.4em;color:var(--cyan);margin:2rem 0 1rem;text-align:center;text-shadow:0 0 12px var(--cyan)}
    .section-label::before, .section-label::after{content:'◆';margin:0 0.75rem;color:var(--pink);text-shadow:0 0 8px var(--pink)}
    .links{display:flex;flex-direction:column;gap:0.875rem}
    .link-btn{display:flex;align-items:center;gap:1rem;padding:1rem 1.25rem;background:linear-gradient(135deg, rgba(255,119,198,0.15) 0%, rgba(125,249,255,0.15) 100%);backdrop-filter:blur(10px);border:1px solid var(--pink);text-decoration:none;color:var(--bone);font-family:'Inter',sans-serif;font-size:0.95rem;font-weight:500;transition:all .3s ease;position:relative;overflow:hidden;box-shadow:0 0 15px rgba(255,119,198,0.2)}
    .link-btn::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg, transparent, rgba(125,249,255,0.4), transparent);transition:left .6s}
    .link-btn:hover{border-color:var(--cyan);box-shadow:0 0 25px rgba(125,249,255,0.5),0 0 50px rgba(255,119,198,0.3);transform:translateY(-2px)}
    .link-btn:hover::before{left:100%}
    .link-icon{width:36px;height:36px;background:linear-gradient(135deg, var(--cyan) 0%, var(--pink) 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--void)}
    .link-icon svg{width:18px;height:18px}
    .link-title{flex:1;letter-spacing:0.02em}
    .link-arrow{font-family:'Bebas Neue',sans-serif;color:var(--cyan);font-size:1.2rem;letter-spacing:0.1em}
    .social-row{display:flex;flex-wrap:wrap;justify-content:center;gap:0.75rem;margin:0.5rem 0}
    .link-btn-social{padding:0;width:54px;height:54px;justify-content:center;border-radius:50%}
    .footer-en{font-family:'Bebas Neue',sans-serif;font-size:0.85rem;letter-spacing:0.4em;color:var(--cyan);margin-top:1rem;text-shadow:0 0 8px var(--cyan);text-align:center}
    .footer-en a{color:inherit;text-decoration:none}
  </style>
</head>
<body>
  <div class="sun"></div>

  <main class="container">
    <div class="top-jp">エ ス テ テ ィ ッ ク</div>

    <header class="profile">
      <div class="avatar">${avatarContent}</div>
      <h1 class="name">${escapeHtml(user.display_name || user.username)}</h1>
      ${user.bio ? `<p class="bio">${escapeHtml(user.bio)}</p>` : ''}
    </header>

    <div class="links">${linksHtml}</div>

    <div class="footer-en">— <a href="/">powered by seikoulink</a> —</div>
  </main>
</body>
</html>`;
};
