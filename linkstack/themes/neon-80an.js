const { buildSeoHead, getInitial, getIconForLink, renderGroupedLinks } = require('./_helpers');

module.exports = function renderNeon80an(data) {
  const { user, allLinks, escapeHtml } = data;
  const initial = getInitial(user);
  const avatarContent = user.avatar
    ? `<img src="/uploads/${user.avatar}" alt="${escapeHtml(user.display_name || user.username)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : initial;

  const linksHtml = renderGroupedLinks(allLinks, {
    renderDivider: (link) => `<div class="section-label">${escapeHtml(link.title.toLowerCase())}</div>`,
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
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--void:#0a0205;--void-2:#1a0510;--neon:#e91e35;--neon-glow:#ff3850;--crimson:#7a0e1f;--bone:#f0e6d2}
    body{font-family:'Inter',sans-serif;background:radial-gradient(ellipse at top, #2a0815 0%, var(--void) 60%);color:var(--bone);min-height:100vh;padding:2rem 1rem;position:relative;overflow-x:hidden}
    body::before{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgba(233,30,53,0.03) 3px, rgba(233,30,53,0.03) 4px);pointer-events:none;z-index:1;animation:scanline 8s linear infinite}
    @keyframes scanline{from{background-position:0 0}to{background-position:0 100px}}
    body::after{content:'';position:fixed;inset:0;background-image:radial-gradient(circle at 20% 30%, rgba(233,30,53,0.08) 0%, transparent 50%),radial-gradient(circle at 80% 70%, rgba(233,30,53,0.08) 0%, transparent 50%);pointer-events:none;z-index:0}
    .container{max-width:520px;margin:0 auto;position:relative;z-index:3}
    .vhs-tag{font-family:'Inter',sans-serif;font-size:0.65rem;letter-spacing:0.4em;color:var(--neon);text-transform:uppercase;margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;font-weight:500}
    .vhs-tag::before{content:'● REC';color:var(--neon);animation:rec 1.5s ease-in-out infinite}
    @keyframes rec{0%,49%{opacity:1}50%,100%{opacity:0.3}}
    .profile{text-align:center;margin-bottom:3rem;padding:2rem 1rem;position:relative}
    .profile::before{content:'';position:absolute;top:0;left:50%;width:120px;height:1px;background:linear-gradient(90deg, transparent, var(--neon), transparent);transform:translateX(-50%)}
    .avatar{width:140px;height:140px;margin:0 auto 1.5rem;border-radius:50%;background:radial-gradient(circle at 30% 30%, var(--crimson), var(--void));display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:4rem;color:var(--bone);position:relative;box-shadow:0 0 30px rgba(233,30,53,0.4),0 0 60px rgba(233,30,53,0.2),inset 0 0 30px rgba(233,30,53,0.3);border:2px solid var(--neon);animation:pulse-glow 3s ease-in-out infinite;overflow:hidden}
    @keyframes pulse-glow{0%,100%{box-shadow:0 0 30px rgba(233,30,53,0.4), 0 0 60px rgba(233,30,53,0.2), inset 0 0 30px rgba(233,30,53,0.3)}50%{box-shadow:0 0 50px rgba(233,30,53,0.6), 0 0 100px rgba(233,30,53,0.3), inset 0 0 40px rgba(233,30,53,0.4)}}
    .name{font-family:'Cormorant Garamond',serif;font-size:clamp(2rem, 7vw, 3.75rem);font-weight:700;letter-spacing:0.02em;line-height:0.95;margin-bottom:0.5rem;color:var(--neon-glow);text-shadow:0 0 10px rgba(233,30,53,0.8),0 0 20px rgba(233,30,53,0.5),0 0 40px rgba(233,30,53,0.3);text-transform:uppercase;word-break:break-word;overflow-wrap:anywhere}
    .subtitle{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.1rem;letter-spacing:0.3em;color:#888;text-transform:uppercase;margin-bottom:1rem}
    .bio{font-family:'Cormorant Garamond',serif;font-size:1.1rem;line-height:1.5;color:#aaa;max-width:380px;margin:0 auto;font-style:italic}
    .section-label{font-family:'Inter',sans-serif;font-size:0.7rem;letter-spacing:0.4em;color:var(--neon);margin:2rem 0 1rem;text-align:center;text-transform:uppercase;font-weight:500}
    .section-label::before, .section-label::after{content:'━━';margin:0 0.75rem;color:rgba(233,30,53,0.4)}
    .links{display:flex;flex-direction:column;gap:0.875rem}
    .link-btn{display:flex;align-items:center;gap:1rem;padding:1rem 1.25rem;background:rgba(26,5,16,0.6);backdrop-filter:blur(10px);border:1px solid rgba(233,30,53,0.3);text-decoration:none;color:var(--bone);font-family:'Inter',sans-serif;font-size:0.95rem;font-weight:500;letter-spacing:0.02em;transition:all .3s ease;position:relative;overflow:hidden}
    .link-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg, transparent 0%, rgba(233,30,53,0.1) 50%, transparent 100%);opacity:0;transition:opacity .3s}
    .link-btn:hover{border-color:var(--neon);transform:translateY(-2px);box-shadow:0 4px 20px rgba(233,30,53,0.3)}
    .link-btn:hover::before{opacity:1}
    .link-icon{width:38px;height:38px;border:1px solid var(--neon);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--neon-glow);background:rgba(233,30,53,0.05)}
    .link-icon svg{width:18px;height:18px}
    .link-title{flex:1}
    .link-arrow{color:var(--neon);font-size:1.2rem;transition:transform .3s}
    .link-btn:hover .link-arrow{transform:translateX(4px)}
    .social-row{display:flex;flex-wrap:wrap;justify-content:center;gap:0.75rem;margin:0.5rem 0}
    .link-btn-social{padding:0;width:54px;height:54px;justify-content:center;border-radius:50%}
    .footer{text-align:center;margin-top:3rem;padding-top:1.5rem;border-top:1px dashed rgba(233,30,53,0.3);font-family:'Cormorant Garamond',serif;font-style:italic;font-size:0.85rem;letter-spacing:0.15em;color:#666}
    .footer a{color:inherit;text-decoration:none}
  </style>
</head>
<body>
  <main class="container">
    <div class="vhs-tag"><span></span><span>SP / @${escapeHtml(user.username)}</span></div>

    <header class="profile">
      <div class="avatar">${avatarContent}</div>
      <h1 class="name">${escapeHtml(user.display_name || user.username)}</h1>
      <p class="subtitle">— a synthwave ritual —</p>
      ${user.bio ? `<p class="bio">${escapeHtml(user.bio)}</p>` : ''}
    </header>

    <div class="links">${linksHtml}</div>

    <div class="footer">— <a href="/">END OF TAPE</a> —</div>
  </main>
</body>
</html>`;
};
