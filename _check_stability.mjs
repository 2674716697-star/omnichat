import fs from 'fs';

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
check('sw cache omnichat-v3', /CACHE_NAME\s*=\s*['"]omnichat-v3['"]/.test(sw));

// --- Build version ---
console.log('\n--- Build version ---');
check('build-version meta exists', /name=["']build-version["']/.test(html));
check('__BUILD_VERSION__ exists in script.js', /__BUILD_VERSION__/.test(js));

// --- Splash ---
console.log('\n--- Splash ---');
check('html starts with is-splashing', /<html[^>]*class=["'][^"']*is-splashing/.test(html));
check('splash z-index 99999', /\.splash\s*\{[\s\S]*z-index:\s*99999/.test(css));
check('splash::after exists', /\.splash::after\s*\{[\s\S]*bottom:\s*-200px[\s\S]*height:\s*240px/.test(css));
check('is-splashing hides bottom-bar', /html\.is-splashing\s+\.bottom-bar[\s\S]*display:\s*none/.test(css));

// --- Global purple-black bottom UI ---
console.log('\n--- Global bottom UI ---');
check('bottom-bar bg #100a18', /\.bottom-bar\s*\{[\s\S]*background:\s*#100a18/.test(css));
check('bottom-bar blur saturate(180%)', /\.bottom-bar\s*\{[\s\S]*saturate\(180%\)\s*blur\(24px\)/.test(css));
check('bottom-bar purple border', /\.bottom-bar\s*\{[\s\S]*border:\s*1px\s+solid\s+rgba\(220,\s*92,\s*145,\s*0\.2\)/.test(css));
check('input-message bg rgba(14,8,22,0.6)', /\.input-message\s*\{[\s\S]*background:\s*rgba\(14,\s*8,\s*22,\s*0\.6\)/.test(css));
check('input-message border rgba(180,130,160,0.18)', /\.input-message\s*\{[\s\S]*border:\s*1px\s+solid\s+rgba\(180,\s*130,\s*160,\s*0\.18\)/.test(css));
check('input-message:focus scene-accent', /\.input-message:focus\s*\{[\s\S]*border-color:\s*var\(--scene-accent\)/.test(css));

// --- Stability features ---
console.log('\n--- Stability features ---');
check('bottom-bar position fixed', /\.bottom-bar\s*\{[\s\S]*position:\s*fixed/.test(css));
check('--bottom-bar-h dynamic', /--bottom-bar-h/.test(js));
check('updateBottomBarHeight function', /function\s+updateBottomBarHeight/.test(js));

console.log('\n' + '='.repeat(50));
if (failed) {
  console.error('\n❌ STABILITY CHECK FAILED');
  process.exit(1);
}
console.log('\n✅ ALL STABILITY CHECKS PASSED');
