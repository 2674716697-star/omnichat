// _build.js — Generate omnichat.html from Vite output
// Run: npm run build  (which does: vite build && node _build.js)
// Vite produces dist/index.html (single-file, CSS/JS inlined).
// This script adds build metadata and updates the SW cache version.
const fs = require('fs');

const buildVersion = Date.now().toString(36);
const commitHash = (() => {
  if (process.env.OMNICHAT_BUILD_COMMIT) {
    return process.env.OMNICHAT_BUILD_COMMIT.trim().slice(0, 9);
  }
  return 'precommit';
})();

// --- Update SW cache name so every deploy invalidates old caches ---
(() => {
  const swPath = 'sw.js';
  let swContent = fs.readFileSync(swPath, 'utf-8');
  const newName = 'omnichat-' + buildVersion;
  const oldName = swContent.match(/const CACHE_NAME = '([^']+)'/);
  if (oldName) {
    swContent = swContent.replace("const CACHE_NAME = '" + oldName[1] + "'", "const CACHE_NAME = '" + newName + "'");
    fs.writeFileSync(swPath, swContent, 'utf-8');
    console.log('SW cache:', oldName[1], '->', newName);
  }
})();

// --- Read Vite output and inject build metadata ---
const viteOutput = fs.readFileSync('dist/index.html', 'utf-8');

function injectBuildMeta(input) {
  let output = input
    .replace(/\s*<meta name="build-version"[^>]*>/g, '')
    .replace(/\s*<meta name="build-commit"[^>]*>/g, '');

  output = output.replace(
    /(<meta name="theme-color"[^>]*>)/,
    '$1\n  <meta name="build-version" content="' + buildVersion + '">\n  <meta name="build-commit" content="' + commitHash + '">'
  );

  return output;
}

const html = injectBuildMeta(viteOutput);

fs.writeFileSync('omnichat.html', html, 'utf-8');
fs.writeFileSync('index.html', injectBuildMeta(fs.readFileSync('index.html', 'utf-8')), 'utf-8');

const sizeKB = (html.length / 1024).toFixed(1);
console.log('Build version:', buildVersion);
console.log('Output: omnichat.html (' + sizeKB + ' KB)');
console.log('BUILD OK');
