// Build standalone omnichat.html
const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf-8');
const css = fs.readFileSync('style.css', 'utf-8');
const js = fs.readFileSync('script.js', 'utf-8');

// Use replacer functions to avoid String.replace $ interpolation
html = html.replace(
  '<link rel="stylesheet" href="style.css">',
  () => '<style>\n' + css + '\n  </style>'
);

html = html.replace(
  '<script src="script.js"></script>',
  () => '<script>\n' + js + '\n  </script>'
);

// Add PWA manifest
html = html.replace(
  '<meta name="theme-color" content="#0f0f0f">',
  '<meta name="theme-color" content="#0f0f0f">\n  <link rel="manifest" href="manifest.json">'
);

// Add apple-touch-icon
const icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='192' height='192' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='40' fill='%230f0f0f'/%3E%3Cpath d='M96 52c-24 0-44 20-44 44s20 44 44 44 44-20 44-44-20-44-44-44zm0 16c15 0 28 13 28 28s-13 28-28 28-28-13-28-28 13-28 28-28z' fill='%234a9eff'/%3E%3Ccircle cx='96' cy='96' r='16' fill='%236ab4ff'/%3E%3C/svg%3E";
html = html.replace(
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n  <link rel="apple-touch-icon" href="' + icon + '">'
);

// Add SW registration before closing body
const swReg = '\n  <script>if("serviceWorker" in navigator){navigator.serviceWorker.register("sw.js").catch(function(){})}</script>\n</body>';
html = html.replace('</body>', swReg);

fs.writeFileSync('omnichat.html', html, 'utf-8');

// Verify
const verifyHtml = fs.readFileSync('omnichat.html', 'utf-8');
const hasDoubleDollar = verifyHtml.includes('const $$');
console.log('Has $$:', hasDoubleDollar);
console.log('Has manifest:', verifyHtml.includes('manifest.json'));
console.log('Has SW:', verifyHtml.includes('serviceWorker'));
console.log('Size:', (verifyHtml.length / 1024).toFixed(1) + ' KB');

if (!hasDoubleDollar) {
  console.log('ERROR: $$ variable was corrupted!');
  process.exit(1);
}
console.log('BUILD OK');
