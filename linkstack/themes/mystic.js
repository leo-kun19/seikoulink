const { buildSeoHead, getInitial, getIconForLink, renderGroupedLinks } = require('./_helpers');

module.exports = function renderMystic(data) {
  const { user, allLinks, escapeHtml } = data;
  const initial = getInitial(user);
  const avatarContent = user.avatar
    ? `<img src="/uploads/${user.avatar}" alt="${escapeHtml(user.display_name || user.username)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : initial;

  const linksHtml = renderGroupedLinks(allLinks, {
    renderDivider: (link) => `<div class="section-divider"><span>${escapeHtml(link.title)}</span></div>`,
    renderRegular: (link) => `<a href="/${user.username}/click/${link.id}" class="link-btn" target="_blank" rel="noopener noreferrer">
      <span class="link-icon">${getIconForLink(link)}</span>
      <span class="link-title">${escapeHtml(link.title)}</span>
      <span class="link-arrow">↗</span>
    </a>`,
    renderSocial: (link) => `<a href="/${user.username}/click/${link.id}" class="link-btn link-btn-social" target="_blank" rel="noopener noreferrer" title="${escapeHtml(link.title)}">
      <span class="link-icon">${getIconForLink(link)}</span>
    </a>`
  });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  ${buildSeoHead(data)}
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--void:#08051a;--void-2:#13092e;--gold:#d4af6c;--gold-glow:#f4d590;--gold-soft:#8a7146;--bone:#ede5d3;--line:rgba(212,175,108,0.3)}
    body{font-family:'Cormorant Garamond',serif;background:radial-gradient(ellipse at top, #1a0e3a 0%, var(--void) 70%);color:var(--bone);min-height:100vh;padding:0;position:relative;overflow-x:hidden}
    body::before{content:'';position:fixed;inset:0;background-image:radial-gradient(2px 2px at 20% 30%, white, transparent),radial-gradient(1px 1px at 60% 70%, white, transparent),radial-gradient(1px 1px at 80% 20%, white, transparent),radial-gradient(2px 2px at 30% 80%, white, transparent),radial-gradient(1px 1px at 90% 50%, white, transparent),radial-gradient(1px 1px at 10% 60%, white, transparent),radial-gradient(2px 2px at 50% 15%, white, transparent),radial-gradient(1px 1px at 70% 90%, white, transparent);background-size:200px 200px, 300px 300px, 250px 250px, 220px 220px, 280px 280px, 240px 240px, 260px 260px, 290px 290px;pointer-events:none;z-index:0;opacity:0.4;animation:twinkle 4s ease-in-out infinite}
    @keyframes twinkle{0%,100%{opacity:0.4}50%{opacity:0.7}}
    body::after{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at center, transparent 0%, rgba(8,5,26,0.6) 80%);pointer-events:none;z-index:1}
    .container{max-width:480px;margin:0 auto;padding:3rem 1.5rem 3rem;position:relative;z-index:2}
    .top-symbol{text-align:center;margin-bottom:1.5rem}
    .top-symbol svg{width:60px;height:60px;color:var(--gold);filter:drop-shadow(0 0 8px rgba(212,175,108,0.5))}
    .roman{font-family:'Cinzel',serif;font-size:0.65rem;letter-spacing:0.5em;color:var(--gold);text-align:center;text-transform:uppercase;margin-bottom:0.5rem}
    .header{text-align:center;margin-bottom:3rem;padding:2rem 1rem;border:1px solid var(--line);background:rgba(19,9,46,0.4);backdrop-filter:blur(10px);position:relative}
    .header::before, .header::after{content:'❋';position:absolute;color:var(--gold);font-size:1.5rem;opacity:0.6}
    .header::before{top:-12px;left:50%;transform:translateX(-50%);background:var(--void);padding:0 0.5rem}
    .header::after{bottom:-12px;left:50%;transform:translateX(-50%);background:var(--void);padding:0 0.5rem}
    .moon{width:100px;height:100px;margin:0 auto 1rem;border-radius:50%;background:radial-gradient(circle at 65% 35%, var(--gold-glow) 0%, var(--gold) 30%, var(--gold-soft) 70%, var(--void) 100%);box-shadow:0 0 30px rgba(212,175,108,0.4),0 0 60px rgba(212,175,108,0.2),inset -10px -10px 20px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-family:'Cinzel',serif;font-size:2.2rem;font-weight:700;color:var(--void);position:relative;overflow:hidden}
    .moon::before{content:'';position:absolute;inset:-12px;border:1px solid var(--gold);border-radius:50%;opacity:0.5;animation:rotate 30s linear infinite;pointer-events:none}
    @keyframes rotate{from{transform:rotate(0)}to{transform:rotate(360deg)}}
    .name{font-family:'Cinzel',serif;font-weight:500;font-size:clamp(1.5rem, 6vw, 2.5rem);letter-spacing:0.15em;line-height:1.1;color:var(--gold-glow);text-transform:uppercase;text-shadow:0 0 10px rgba(212,175,108,0.5),0 0 20px rgba(212,175,108,0.3);margin-bottom:0.75rem;word-break:break-word;overflow-wrap:anywhere;hyphens:auto}
    .tagline{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1rem;color:var(--bone);letter-spacing:0.1em;opacity:0.8;margin-bottom:1.25rem}
    .tagline::before, .tagline::after{content:'·';margin:0 0.5rem;color:var(--gold)}
    .bio{font-family:'Cormorant Garamond',serif;font-size:1.05rem;font-style:italic;line-height:1.6;color:#c9c2b3;max-width:340px;margin:0 auto;padding-top:1rem;border-top:1px solid var(--line)}
    .section-divider{display:flex;align-items:center;justify-content:center;gap:0.75rem;margin:1.5rem 0 1rem}
    .section-divider::before, .section-divider::after{content:'';flex:1;height:1px;background:linear-gradient(90deg, transparent, var(--gold), transparent);max-width:80px}
    .section-divider span{font-family:'Cinzel',serif;font-size:0.75rem;letter-spacing:0.4em;color:var(--gold);text-transform:uppercase}
    .links{display:flex;flex-direction:column;gap:0.75rem}
    .link-btn{display:flex;align-items:center;gap:1rem;padding:1rem 1.25rem;background:rgba(19,9,46,0.5);backdrop-filter:blur(10px);border:1px solid var(--line);text-decoration:none;color:var(--bone);font-family:'Cormorant Garamond',serif;font-size:1.1rem;font-weight:500;letter-spacing:0.05em;transition:all .4s ease;position:relative}
    .link-btn:hover{border-color:var(--gold);transform:translateX(4px);box-shadow:0 4px 20px rgba(212,175,108,0.2)}
    .link-icon{width:32px;height:32px;border:1px solid var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--gold-glow);background:rgba(212,175,108,0.05)}
    .link-icon svg{width:16px;height:16px}
    .link-title{flex:1}
    .link-arrow{font-family:'Cinzel',serif;color:var(--gold);font-size:1rem;letter-spacing:0.1em}
    .social-row{display:flex;flex-wrap:wrap;justify-content:center;gap:0.5rem;margin:0.5rem 0}
    .link-btn-social{padding:0;width:48px;height:48px;justify-content:center;border-radius:50%}
    .footer{margin-top:3rem;text-align:center;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:0.9rem;color:var(--gold-soft);letter-spacing:0.1em}
    .footer::before, .footer::after{content:'❋';margin:0 0.5rem;color:var(--gold)}
    .footer a{color:inherit;text-decoration:none}
  </style>
</head>
<body>
  <main class="container">
    <div class="top-symbol"><svg viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="1"><circle cx="30" cy="30" r="24"/><circle cx="30" cy="30" r="18"/><path d="M30 6 L30 54 M6 30 L54 30 M13 13 L47 47 M47 13 L13 47"/><circle cx="30" cy="30" r="3" fill="currentColor"/></svg></div>
    <p class="roman">— @${escapeHtml(user.username)} —</p>

    <header class="header">
      <div class="moon">${avatarContent}</div>
      <h1 class="name">${escapeHtml(user.display_name || user.username)}</h1>
      <p class="tagline">guided by stars</p>
      ${user.bio ? `<p class="bio">${escapeHtml(user.bio)}</p>` : ''}
    </header>

    <div class="links">${linksHtml}</div>

    <div class="footer">written under the stars by <a href="/">SeikouLink</a></div>
  </main>
</body>
</html>`;
};
