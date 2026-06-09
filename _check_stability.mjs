import fs from 'fs';
import { execSync } from 'child_process';

const read = (p) => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
const css = read('style.css');
const js = read('script.js');
const html = read('omnichat.html');
const sw = read('sw.js');

let failed = false;

function check(name, ok) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) failed = true;
}

// --- Forbidden bottom selectors ---
console.log('--- Forbidden bottom selectors ---');
const forbiddenSelectors = [
  [/\.scene-immersive\s+\.bottom-bar\b/, 'scene-immersive .bottom-bar'],
  [/\.scene-immersive\s+\.quick-actions\b/, 'scene-immersive .quick-actions'],
  [/\.scene-immersive\s+\.btn-quick\b(?!-)/, 'scene-immersive .btn-quick'],
  [/\.scene-immersive\s+\.input-row\b/, 'scene-immersive .input-row'],
  [/\.scene-immersive\s+\.input-message\b/, 'scene-immersive .input-message'],
  [/\.scene-immersive\s+\.input-message:focus\b/, 'scene-immersive .input-message:focus'],
];

for (const [re, name] of forbiddenSelectors) {
  check(`no "${name}"`, !re.test(css));
}

// --- Package / dependency hygiene ---
console.log('\n--- Package hygiene ---');
check('no package.json', !fs.existsSync('package.json'));
check('no package-lock.json', !fs.existsSync('package-lock.json'));

// --- Security artifacts ---
console.log('\n--- Security artifacts ---');
check('no security-pull', !/security-pull/.test(html + css + js));
check('no security-panel', !/security-panel/.test(html + css + js));

// --- Service worker ---
console.log('\n--- Service worker ---');
check('sw cache omnichat-v4', /CACHE_NAME\s*=\s*['"]omnichat-v4['"]/.test(sw));

// --- Build version ---
console.log('\n--- Build version ---');
check('build-version meta exists', /name=["']build-version["']/.test(html));
check('__BUILD_VERSION__ exists in script.js', /__BUILD_VERSION__/.test(js));

// --- Splash ---
console.log('\n--- Splash ---');
check('html starts with is-splashing', /<html[^>]*class=["'][^"']*is-splashing/.test(html));
check('splash z-index 99999', /\.splash\s*\{[\s\S]*z-index:\s*99999/.test(css));
check('splash::after extends below viewport', /\.splash::after\s*\{[\s\S]*bottom:\s*-\d+px[\s\S]*height:\s*\d+px/.test(css));
check('is-splashing hides bottom-bar', /html\.is-splashing\s+\.bottom-bar[\s\S]*display:\s*none/.test(css));
check('is-splashing locks body background', /html\.is-splashing[\s\S]*background:\s*#[0-9a-fA-F]+\s*!important/.test(css));

// --- Global purple-black bottom UI ---
console.log('\n--- Global bottom UI ---');
check('bottom-bar has glass background', /\.bottom-bar\s*\{[\s\S]*background:\s*var\(--glass-bg/.test(css));
check('bottom-bar has glass blur', /\.bottom-bar\s*\{[\s\S]*backdrop-filter:\s*var\(--glass-blur\)/.test(css));
check('bottom-bar has glass border', /\.bottom-bar\s*\{[\s\S]*border:\s*1px\s+solid\s+var\(--glass-border\)/.test(css));
check('input-message has glass background', /\.input-message\s*\{[\s\S]*background:\s*var\(--glass/.test(css));
check('input-message has glass border', /\.input-message\s*\{[\s\S]*border:\s*1px\s+solid\s+var\(--glass-border/.test(css));
check('input-message:focus scene-accent', /\.input-message:focus\s*\{[\s\S]*border-color:\s*var\(--scene-accent\)/.test(css));

// --- Stability features ---
console.log('\n--- Stability features ---');
check('bottom-bar position fixed', /\.bottom-bar\s*\{[\s\S]*position:\s*fixed/.test(css));
check('--bottom-bar-h dynamic', /--bottom-bar-h/.test(js));
check('updateBottomBarHeight function', /function\s+updateBottomBarHeight/.test(js));

// --- Historical conversation migration integrity ---
console.log('\n--- Migration integrity ---');
check('STORAGE_SCHEMA_VERSION defined', /STORAGE_SCHEMA_VERSION\s*=\s*\d+/.test(js));
check('normalizeConversation exists', /function\s+normalizeConversation/.test(js));
check('normalizeMessage exists', /function\s+normalizeMessage/.test(js));
check('looksLikeWorldCharacterCard exists', /function\s+looksLikeWorldCharacterCard/.test(js));
check('loadFromStorage calls normalizeConversation', /state\.conversations\s*=\s*state\.conversations\.map\(normalizeConversation\)/.test(js));
check('switchConversation calls normalizeConversation', /function\s+switchConversation[\s\S]*normalizeConversation\(conv\)/.test(js));
check('import path calls normalizeConversation', /normalizeConversation\(c\)/.test(js));
check('createConversation sets schemaVersion', /schemaVersion:\s*STORAGE_SCHEMA_VERSION/.test(js));
check('render uses displayContent fallback', /displayContent\s*\|\|\s*(msg\.)?content/.test(js));
check('API uses _requestContent fallback', /_requestContent\s*\|\|\s*(m\.)?content/.test(js));

// --- Syntax validation ---
console.log('\n--- Syntax validation ---');
try {
  execSync('node --check script.js', { encoding: 'utf8', stdio: 'pipe' });
  check('script.js parses without SyntaxError', true);
} catch (e) {
  check('script.js parses without SyntaxError', false);
  console.error('   ' + (e.stderr || e.message || '').replace(/\n/g, ' '));
}

// Also validate omnichat.html inline script parses
try {
  var omniJs = html.match(/<script>([\s\S]*?)<\/script>/);
  if (omniJs && omniJs[1]) {
    execSync('node --check', {
      encoding: 'utf8',
      stdio: 'pipe',
      input: omniJs[1],
    });
    check('omnichat.html inline script parses without SyntaxError', true);
  } else {
    console.error('   omnichat.html inline script not found for syntax check');
    check('omnichat.html inline script parses without SyntaxError', false);
  }
} catch (e2) {
  check('omnichat.html inline script parses without SyntaxError', false);
  console.error('   ' + (e2.stderr || e2.message || '').replace(/\n/g, ' '));
}

console.log('\n' + '='.repeat(50));
if (failed) {
  console.error('\n❌ STABILITY CHECK FAILED');
  process.exit(1);
}
console.log('\n✅ ALL STABILITY CHECKS PASSED');
