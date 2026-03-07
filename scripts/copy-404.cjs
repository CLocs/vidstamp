// Copy index.html to 404.html so GitHub Pages serves the SPA for all routes
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '../dist/index.html');
const dest = path.join(__dirname, '../dist/404.html');
if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log('Copied index.html → 404.html for GitHub Pages SPA fallback');
}
