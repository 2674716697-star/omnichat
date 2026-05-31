// Build standalone omnichat.html with minification
const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf-8');
const css = fs.readFileSync('style.css', 'utf-8');
const js = fs.readFileSync('script.js', 'utf-8');
const buildVersion = Date.now().toString(36);
const commitHash = (() => {
  try {
    return require('child_process').execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (_) { return 'unknown'; }
})();

// Minify CSS: remove comments, collapse whitespace, remove unnecessary semicolons
function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')           // Remove comments
    .replace(/\s+/g, ' ')                        // Collapse whitespace
    .replace(/\s*([{}:;,])\s*/g, '$1')           // Remove space around symbols
    .replace(/;}/g, '}')                         // Remove trailing semicolons
    .replace(/:\s*0\s*px/g, ':0')                // 0px -> 0
    .replace(/^\s+|\s+$/gm, '')                  // Trim lines
    .replace(/\n/g, '')                           // Remove newlines
    .trim();
}

// Minify JS: remove comments, collapse whitespace (safe for our codebase)
function minifyJS(js) {
  let out = '';
  let inString = false, inTemplate = false, inSingleComment = false, inMultiComment = false;
  let stringChar = '';
  let prev = '', prev2 = '';

  for (let i = 0; i < js.length; i++) {
    const ch = js[i];

    // String tracking
    if (!inSingleComment && !inMultiComment) {
      if (!inString && !inTemplate && (ch === '"' || ch === "'" || ch === '`')) {
        if (ch === '`') inTemplate = true;
        else inString = true;
        stringChar = ch;
      } else if (inString && ch === stringChar && prev !== '\\') {
        inString = false;
      } else if (inTemplate && ch === '`' && prev !== '\\') {
        inTemplate = false;
      }
    }

    // Comment detection
    if (!inString && !inTemplate && !inSingleComment && !inMultiComment) {
      if (ch === '/' && js[i + 1] === '/') {
        inSingleComment = true;
        i++; continue;
      }
      if (ch === '/' && js[i + 1] === '*') {
        inMultiComment = true;
        i++; continue;
      }
    }

    if (inSingleComment && ch === '\n') {
      inSingleComment = false;
      if (prev !== ';' && prev !== '{' && prev !== '}' && prev !== '\n') out += ';';
      out += '\n';
      continue;
    }

    if (inMultiComment && ch === '*' && js[i + 1] === '/') {
      inMultiComment = false;
      i++;
      continue;
    }

    if (inSingleComment || inMultiComment) continue;

    // Collapse whitespace
    if (!inString && !inTemplate && ch === ' ' && (prev === ' ' || prev === '\n' || prev === '\t')) continue;
    if (!inString && !inTemplate && ch === '\t') { out += ' '; continue; }

    out += ch;
    prev2 = prev; prev = ch;
  }

  // Remove blank lines
  out = out.split('\n').filter(l => l.trim()).join('\n');
  // Remove leading/trailing whitespace per line
  out = out.split('\n').map(l => l.trim()).join('\n');

  return out;
}

const cssMin = minifyCSS(css);
const jsMin = minifyJS(js);

// Strip previous build meta tags (prevents accumulation across builds)
html = html.replace(/\s*<meta name="build-version"[^>]*>/g, '');
html = html.replace(/\s*<meta name="build-commit"[^>]*>/g, '');
html = html.replace(/\s*<link rel="apple-touch-icon"[^>]*>/g, '');

// Add fresh build version meta tags
html = html.replace(
  '<meta name="theme-color" content="#000000">',
  '<meta name="theme-color" content="#000000">\n  <meta name="build-version" content="' + buildVersion + '">\n  <meta name="build-commit" content="' + commitHash + '">'
);

// Inline minified CSS
html = html.replace(
  '<link rel="stylesheet" href="style.css">',
  () => '<style>' + cssMin + '</style>'
);

// Inline minified JS with version
html = html.replace(
  '<script src="script.js"></script>',
  () => '<script>' + jsMin + '</script>'
);

// Add apple-touch-icon
const icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='192' height='192' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='40' fill='%230f0f0f'/%3E%3Cpath d='M96 52c-24 0-44 20-44 44s20 44 44 44 44-20 44-44-20-44-44-44zm0 16c15 0 28 13 28 28s-13 28-28 28-28-13-28-28 13-28 28-28z' fill='%234a9eff'/%3E%3Ccircle cx='96' cy='96' r='16' fill='%236ab4ff'/%3E%3C/svg%3E";
html = html.replace(
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n  <link rel="apple-touch-icon" href="' + icon + '">'
);

fs.writeFileSync('omnichat.html', html, 'utf-8');
// Write the same built app to index.html so GitHub Pages default entry works
fs.writeFileSync('index.html', html, 'utf-8');

// Verify
const verifyHtml = fs.readFileSync('omnichat.html', 'utf-8');
const sizeKB = (verifyHtml.length / 1024).toFixed(1);
const origSize = ((css.length + js.length + fs.readFileSync('index.html','utf-8').length) / 1024).toFixed(1);

console.log('Build version:', buildVersion);
console.log('CSS: ' + (css.length/1024).toFixed(1) + 'KB -> ' + (cssMin.length/1024).toFixed(1) + 'KB (' + (100-cssMin.length/css.length*100).toFixed(0) + '% reduced)');
console.log('JS:  ' + (js.length/1024).toFixed(1) + 'KB -> ' + (jsMin.length/1024).toFixed(1) + 'KB (' + (100-jsMin.length/js.length*100).toFixed(0) + '% reduced)');
console.log('Output: ' + sizeKB + ' KB (from ' + origSize + ' KB source)');
console.log('BUILD OK');
console.log('BUILD OK');
