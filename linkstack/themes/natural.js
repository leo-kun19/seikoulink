const { buildSeoHead, getInitial, getIconForLink, renderGroupedLinks } = require('./_helpers');

module.exports = function renderNatural(data) {
  const { user, allLinks, escapeHtml } = data;
  const initial = getInitial(user);
  const avatarContent = user.avatar
    ? `<img src="/uploads/${user.avatar}" alt="${escapeHtml(user.display_name || user.username)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : initial;

  const linksHtml = renderGroupedLinks(allLinks, {
    renderDivider: (link) => `<h2 class="section-title">${escapeHtml(link.title.toLowerCase())}</h2>`,
    renderRegular: (link) => `<a href="/${user.username}/click/${link.id}" class="link-btn" target="_blank" rel="noopener noreferrer">
      <span class="link-icon">${getIconForLink(link)}</span>
      <span class="link-text"><span class="link-title">${escapeHtml(link.title)}</span></span>
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
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--bg:#f5f1ea;--bg-2:#ebe4d4;--leaf:#3d5c3a;--leaf-soft:#7a9272;--terra:#b8624c;--ink:#2a2620;--soft:#7a716a;--line:#d6cdbb}
    body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--ink);min-height:100vh;padding:2rem 1rem;position:relative;overflow-x:hidden}
    body::before{content:'';position:fixed;top:-100px;right:-100px;width:400px;height:400px;background-image:radial-gradient(ellipse at 30% 30%, rgba(122,146,114,0.15) 0%, transparent 50%),radial-gradient(ellipse at 60% 70%, rgba(184,98,76,0.1) 0%, transparent 50%);pointer-events:none;z-index:0}
    body::after{content:'';position:fixed;bottom:-200px;left:-100px;width:500px;height:500px;background-image:radial-gradient(circle, rgba(61,92,58,0.08) 0%, transparent 60%);pointer-events:none;z-index:0}
    .container{max-width:480px;margin:0 auto;position:relative;z-index:2}
    .date{font-family:'Fraunces',serif;font-style:italic;font-size:0.85rem;color:var(--soft);text-align:center;margin-bottom:1rem;letter-spacing:0.05em}
    .date::before, .date::after{content:'·';margin:0 0.5rem;color:var(--terra)}
    .header{text-align:center;margin-bottom:2.5rem}
    .ornament{display:flex;justify-content:center;align-items:center;gap:0.5rem;margin-bottom:1rem;color:var(--leaf)}
    .ornament svg{width:16px;height:16px}
    .ornament-line{width:60px;height:1px;background:var(--leaf);opacity:0.5}
    .name{font-family:'Fraunces',serif;font-weight:300;font-size:clamp(2rem, 8vw, 4rem);letter-spacing:-0.02em;line-height:1.05;margin-bottom:0.5rem;word-break:break-word;overflow-wrap:anywhere}
    .tagline{font-family:'Fraunces',serif;font-style:italic;font-size:1.05rem;color:var(--soft);letter-spacing:0.02em;margin-bottom:1.5rem}
    .avatar{width:100px;height:100px;margin:0 auto 1.25rem;background:linear-gradient(135deg, var(--leaf-soft) 0%, var(--leaf) 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:2.5rem;color:var(--bg);font-weight:300;position:relative;overflow:hidden}
    .avatar::before{content:'';position:absolute;inset:-6px;border:1px dashed var(--leaf);border-radius:50%;opacity:0.4}
    .bio{font-family:'Fraunces',serif;font-size:1rem;line-height:1.6;color:var(--ink);max-width:340px;margin:0 auto;font-weight:400}
    .section-title{font-family:'Fraunces',serif;font-style:italic;font-weight:600;font-size:1.3rem;color:var(--leaf);margin:1.5rem 0 0.875rem;display:flex;align-items:center;gap:0.75rem}
    .section-title::after{content:'';flex:1;height:1px;background:linear-gradient(90deg, var(--leaf) 0%, transparent 100%);opacity:0.4}
    .links{display:flex;flex-direction:column;gap:0.625rem}
    .link-btn{display:flex;align-items:center;gap:1rem;padding:1rem 1.25rem;background:rgba(255,255,255,0.6);backdrop-filter:blur(10px);border:1px solid var(--line);border-radius:18px;text-decoration:none;color:var(--ink);font-family:'Inter',sans-serif;font-size:0.95rem;font-weight:500;transition:all .3s ease;position:relative}
    .link-btn:hover{background:#fff;border-color:var(--leaf);transform:translateX(4px);box-shadow:0 4px 16px rgba(61,92,58,0.1)}
    .link-icon{width:32px;height:32px;background:var(--bg-2);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--leaf)}
    .link-icon svg{width:16px;height:16px}
    .link-text{flex:1;display:flex;flex-direction:column}
    .link-title{font-family:'Fraunces',serif;font-size:1.1rem;font-weight:600;letter-spacing:-0.005em}
    .link-arrow{font-family:'Fraunces',serif;font-style:italic;color:var(--terra);font-size:1.2rem}
    .social-row{display:flex;flex-wrap:wrap;justify-content:center;gap:0.5rem;margin:0.5rem 0}
    .link-btn-social{padding:0;width:48px;height:48px;justify-content:center;border-radius:50%}
    .footer{margin-top:3rem;text-align:center;font-family:'Fraunces',serif;font-style:italic;font-size:0.85rem;color:var(--soft)}
    .footer a{color:inherit;text-decoration:none}
  </style>
</head>
<body>
  <main class="container">
    <p class="date">@${escapeHtml(user.username)}</p>

    <header class="header">
      <div class="ornament"><span class="ornament-line"></span><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L13 10 L21 11 L13 12 L12 22 L11 12 L3 11 L11 10 Z"/></svg><span class="ornament-line"></span></div>
      <div class="avatar">${avatarContent}</div>
      <h1 class="name">${escapeHtml(user.display_name || user.username)}</h1>
      <p class="tagline">— grown with care, served with love —</p>
      ${user.bio ? `<p class="bio">${escapeHtml(user.bio)}</p>` : ''}
    </header>

    <div class="links">${linksHtml}</div>

    <div class="footer">— planted by <a href="/">SeikouLink</a> —</div>
  </main>
</body>
</html>`;
};
