// Premium theme registry. Each theme is a function: (data) => html
// data = { user, regularLinks, socialLinks, profileUrl, seoTitle, seoDesc, ogImageMeta, structuredDataJson, indexable, escapeHtml, getBrandSvg, detectIcon }

const themes = {
  anime: require('./anime'),
  'game-retro': require('./game-retro'),
  'sci-fi': require('./sci-fi'),
  'neon-80an': require('./neon-80an'),
  aesthetic: require('./aesthetic'),
  futuristic: require('./futuristic'),
  'zine-hand': require('./zine-hand'),
  natural: require('./natural'),
  brutalist: require('./brutalist'),
  mystic: require('./mystic')
};

function getTheme(name) {
  return themes[name] || null;
}

function listThemes() {
  return Object.keys(themes);
}

module.exports = { getTheme, listThemes, themes };
