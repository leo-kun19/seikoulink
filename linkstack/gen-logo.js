const sharp = require('sharp');

async function run() {
  // Generate JPG for Google OAuth
  await sharp('public/logo.png')
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 251, b: 240, alpha: 1 } })
    .flatten({ background: '#fffbf0' })
    .jpeg({ quality: 95 })
    .toFile('public/logo.jpg');
  console.log('Done: public/logo.jpg');

  // Generate favicon.png (32x32)
  await sharp('public/logo.png')
    .resize(32, 32)
    .png()
    .toFile('public/favicon.png');
  console.log('Done: public/favicon.png');

  // Generate favicon-192.png (for PWA/mobile)
  await sharp('public/logo.png')
    .resize(192, 192)
    .png()
    .toFile('public/favicon-192.png');
  console.log('Done: public/favicon-192.png');
}

run().catch(e => console.error(e));
