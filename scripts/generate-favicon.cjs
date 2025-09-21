/*
  Generate favicon.ico and related assets from icon-512.png using favicons.
  Usage:
    bun run scripts/generate-favicon.cjs
*/

const favicons = require('favicons').default;
const fs = require('fs');
const path = require('path');

const srcPng = path.join(__dirname, '../public/assets/icons/icon-512.png');
const outDir = path.join(__dirname, '../public');

(async () => {
  if (!fs.existsSync(srcPng)) {
    console.error('Source icon not found:', srcPng);
    process.exit(1);
  }
  try {
    const response = await favicons(srcPng, {
      path: '/',
      appName: 'Medical Video Recorder',
      appShortName: 'MedRecorder',
      appDescription: 'Offline-capable medical video recording application',
      developerName: 'Medical Video Recorder',
      developerURL: null,
      background: '#ffffff',
      theme_color: '#0ea5e9',
      icons: {
        android: false,
        appleIcon: false,
        appleStartup: false,
        coast: false,
        favicons: true,
        firefox: false,
        windows: false,
        yandex: false
      }
    });
    // Write favicon.ico and browserconfig.xml if present
    for (const image of response.images) {
      fs.writeFileSync(path.join(outDir, image.name), image.contents);
      console.log('Generated', image.name);
    }
    for (const file of response.files) {
      fs.writeFileSync(path.join(outDir, file.name), file.contents);
      console.log('Generated', file.name);
    }
    console.log('Done. favicon.ico and favicon PNGs are now in /public.');
  } catch (err) {
    console.error('Failed to generate favicons:', err.message || err);
    process.exit(1);
  }
})();
