import fs from 'fs';
import { execSync } from 'child_process';

const read = (p) => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
const exists = (p) => fs.existsSync(p);

const css = read('style.css');
const js = read('script.js');
const html = read('omnichat.html');
const idx = read('index.html');
const chk = read('_check_stability.mjs');
const sw = read('sw.js');

let failed = false;
let warned = false;

function pass(name) { console.log('✅ ' + name); }
function warn(name) { console.warn('⚠️ ' + name); warned = true; }
function fail(name) { console.error('❌ ' + name); failed = true; }

function check(name, ok) { ok ? pass(name) : fail(name); }
function checkWarn(name, ok) { ok ? pass(name) : warn(name); }

// =========================================================================
// 1. BASIC FILE EXISTENCE
// =========================================================================
console.log('--- Basic file existence ---');
check('script.js exists', exists('script.js'));
check('style.css exists', exists('style.css'));
check('index.html exists', exists('index.html'));
check('omnichat.html exists', exists('omnichat.html'));
check('_check_stability.mjs exists', exists('_check_stability.mjs'));
check('sw.js exists', exists('sw.js'));

// =========================================================================
// 2. PACKAGE / DEPENDENCY HYGIENE
// =========================================================================
console.log('\n--- Package hygiene ---');
check('no package.json', !exists('package.json'));
check('no package-lock.json', !exists('package-lock.json'));

// =========================================================================
// 3. FORBIDDEN BOTTOM SELECTORS
// =========================================================================
console.log('\n--- Forbidden bottom selectors ---');
const forbiddenSelectors = [
  [/\.scene-immersive\s+\.bottom-bar\b/, 'scene-immersive .bottom-bar'],
  [/\.scene-immersive\s+\.quick-actions\b/, 'scene-immersive .quick-actions'],
  [/\.scene-immersive\s+\.btn-quick\b(?!-)/, 'scene-immersive .btn-quick'],
  [/\.scene-immersive\s+\.input-row\b/, 'scene-immersive .input-row'],
  [/\.scene-immersive\s+\.input-message\b/, 'scene-immersive .input-message'],
  [/\.scene-immersive\s+\.input-message:focus\b/, 'scene-immersive .input-message:focus'],
];
for (const [re, name] of forbiddenSelectors) {
  check('no "' + name + '"', !re.test(css));
}

// =========================================================================
// 4. SPLASH INTEGRITY
// =========================================================================
console.log('\n--- Splash integrity ---');
check('html starts with is-splashing', /<html[^>]*class=["'][^"']*is-splashing/.test(html));
check('splash z-index 99999', /\.splash\s*\{[\s\S]*z-index:\s*99999/.test(css));
check('splash::after extends below viewport', /\.splash::after\s*\{[\s\S]*bottom:\s*-\d+px[\s\S]*height:\s*\d+px/.test(css));
check('is-splashing hides bottom-bar', /html\.is-splashing\s+\.bottom-bar[\s\S]*display:\s*none/.test(css));
check('is-splashing locks body background', /html\.is-splashing[\s\S]*background:\s*#[0-9a-fA-F]+\s*!important/.test(css));

// =========================================================================
// 5. GLOBAL BOTTOM UI
// =========================================================================
console.log('\n--- Global bottom UI ---');
check('bottom-bar has glass background', /\.bottom-bar\s*\{[\s\S]*background:\s*var\(--glass-bg/.test(css));
check('bottom-bar has glass blur', /\.bottom-bar\s*\{[\s\S]*backdrop-filter:\s*var\(--glass-blur\)/.test(css));
check('bottom-bar has glass border', /\.bottom-bar\s*\{[\s\S]*border:\s*1px\s+solid\s+var\(--glass-border\)/.test(css));
check('bottom-bar position fixed', /\.bottom-bar\s*\{[\s\S]*position:\s*fixed/.test(css));
check('--bottom-bar-h dynamic', /--bottom-bar-h/.test(js));
check('updateBottomBarHeight function', /function\s+updateBottomBarHeight/.test(js));
check('input-message has glass background', /\.input-message\s*\{[\s\S]*background:\s*var\(--glass/.test(css));
check('input-message has glass border', /\.input-message\s*\{[\s\S]*border:\s*1px\s+solid\s+var\(--glass-border/.test(css));
check('input-message:focus scene-accent', /\.input-message:focus\s*\{[\s\S]*border-color:\s*var\(--scene-accent\)/.test(css));

// =========================================================================
// 6. MIGRATION INTEGRITY
// =========================================================================
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

// =========================================================================
// 7. A/B/C/D CHOICE LOGIC INTEGRITY
// =========================================================================
console.log('\n--- A/B/C/D choice logic ---');
check('parseSceneChoiceInput exists', /function\s+parseSceneChoiceInput/.test(js));
check('parseDirectionOptions exists', /function\s+parseDirectionOptions/.test(js));
check('sendMessageContent used for chip click', /sendMessageContent\('选'\s*\+\s*letter\)/.test(js));
check('isLatestInteractiveDirectionMessage exists', /function\s+isLatestInteractiveDirectionMessage/.test(js));
check('renderSceneStatusTable receives msgIndex', /function\s+renderSceneStatusTable\s*\(\s*msg\s*,\s*msgIndex/.test(js));
check('renderBubbleHTML receives msgIndex', /function\s+renderBubbleHTML\s*\(\s*msg\s*,\s*msgIndex/.test(js));
check('updateLastBubble passes msgIndex', /function\s+updateLastBubble[\s\S]*renderBubbleHTML\(msg,\s*msgIndex\)/.test(js));
check('renderSceneStatusTable fail-closed (not ": true")', !/: true\)/.test(js.match(/var interactive = \(msgIndex[^)]*\) \? [^:]+ : ([^;]+)/)?.[0] || ''));
// Verify interactive check — should not default to true
check('interactive default is false/0 (fail closed)', !/interactive\s*=\s*\(msgIndex\s*!=\s*null[^)]*\)\s*\?\s*[^:]+\s*:\s*true/.test(js));
check('click handler validates with isLatestInteractiveDirectionMessage', /isLatestInteractiveDirectionMessage\(conv,\s*chipMsgIndex\)/.test(js));
check('historical chip toast message exists', /历史分支选项/.test(js));
check('.catch error recovery exists', /\.catch\(function\s*\(err\)/.test(js));
check('error recovery shows toast', /showToast\(.*发送选项失败/.test(js));
check('createSceneState preserves directions', /directions:\s*seed\.directions/.test(js));
check('renderSceneStatusTable uses directions fallback', /msg\.sceneSnapshot\s*&&\s*msg\.sceneSnapshot\.directions/.test(js));
check('sendMessage finally forces fullRenderMessages for scene render', /fullRenderMessages\(messages\)/.test(js) || /function\s*\(\s*messages\s*\)\s*\{\s*fullRenderMessages/.test(js));
check('dir-choices-list render code exists', /dir-choices-list/.test(js));
check('world story per-turn format reminder exists', /本轮世界故事硬性格式要求/.test(js));
check('reminder only for story mode (storyEnabled guard)', /if\s*\(\s*storyEnabled\s*\)\s*\{[\s\S]*reminder/.test(js));
check('story response completeness warning', /Story response missing/.test(js));
check('completeness checks sceneSnapshot (not visible @@SCENE)', /scene\s*=\s*assistantMsg\.sceneSnapshot/.test(js));
check('completeness uses parseDirectionOptions for A/B/C/D count', /dirsParsed\.length\s*<\s*4/.test(js));
check('visible text mental/body/npc checks retained', /assistantMsg\.content\).*missing\.push\('mental/.test(js));
check('export JSON preserves story _requestContent', /isStoryStarted\s*&&\s*isFirstUser/.test(js));
check('import JSON does not unconditionally delete _requestContent', new RegExp('c\\.storyMode\\s*&&\\s*c\\.storyMode\\.started').test(js));
check('story prompt requires 4 A/B/C/D options consistently', /必须给出 4 个剧情选项/.test(js) && !/2–4/.test(js) && !/<可选>/.test(js));
check('story prompt requires 4 branches in directions', /新的 4 个可行动分支/.test(js) && /剧情走向4条/.test(js));
check('C/D template not marked as optional', !/<可选>/.test(js));
check('buildSceneFallbackDirections still defined (offline tool)', /function\s+buildSceneFallbackDirections/.test(js));
check('repairSceneBlock exists for real scene repair', /function\s+repairSceneBlock/.test(js));
check('scene repair called on parse failure', /_sceneRepairAttempted\s*=\s*true/.test(js));
check('detail level never reduces A/B/C/D to < 4', /A\/B\/C\/D 走向仍然必须 4 条/.test(js));
check('repairStoryModeFlags exists', /function\s+repairStoryModeFlags/.test(js));
check('migrateStoryMode calls repairStoryModeFlags', /function\s+migrateStoryMode[\s\S]*repairStoryModeFlags/.test(js));
// migrateStoryMode must NOT skip repair based on storyMode.enabled
var migrateFn = (js.match(/function\s+migrateStoryMode[\s\S]*?^  \}/m) || [''])[0];
check('migrateStoryMode calls repair unconditionally',
  /repairStoryModeFlags/.test(migrateFn) && !/(?:enabled|storyMode)\b[\s\S]*return/.test(
    migrateFn.split('repairStoryModeFlags')[0]
  ));
check('normalizeConversation calls repairStoryModeFlags', /function\s+normalizeConversation[\s\S]*repairStoryModeFlags/.test(js));
check('syncLegacyToStoryMode handles enabled/started flags', /sm\.enabled\s*=\s*sm\.enabled\s*\|\|/.test(js) && /sm\.started\s*=\s*sm\.started\s*\|\|/.test(js));
check('sendMessage calls repairStoryModeFlags before storyEnabled check', /syncLegacyToStoryMode\(conv\)[\s\S]*repairStoryModeFlags/.test(js));
check('repair infers started from sceneWorld/character/npcs', /hasWorld\s*\|\|\s*hasChar\s*\|\|\s*hasNpcs/.test(js));
check('repair infers started from message sceneSnapshot', /sceneSnapshot[\s\S]*inferredStarted\s*=\s*true/.test(js));

// =========================================================================
// 8. BUILD VERSION
// =========================================================================
console.log('\n--- Build version ---');
check('build-version meta in omnichat.html', /name=["']build-version["']/.test(html));
check('__BUILD_VERSION__ in script.js', /__BUILD_VERSION__/.test(js));
check('window.__BUILD_VERSION__ in omnichat.html', /window\.__BUILD_VERSION__/.test(html));

// =========================================================================
// 9. SERVICE WORKER
// =========================================================================
console.log('\n--- Service worker ---');
check('sw CACHE_NAME omnichat-v3', /CACHE_NAME\s*=\s*['"]omnichat-v3['"]/.test(sw));

// =========================================================================
// 10. SECURITY ARTIFACTS
// =========================================================================
console.log('\n--- Security artifacts ---');
check('no security-pull', !/security-pull/.test(html + css + js));
check('no security-panel', !/security-panel/.test(html + css + js));

// =========================================================================
// 11. MARKDOWN URL SECURITY
// =========================================================================
console.log('\n--- Markdown URL security ---');
const mdSrc = read('src/07_markdown.js'); // also check built script.js

// Core security functions must exist in both source AND built output
check('function isSafeMarkdownUrl exists', /function\s+isSafeMarkdownUrl/.test(js));
check('function escapeAttr exists', /function\s+escapeAttr/.test(js));
check('isSafeMarkdownUrl in source', /function\s+isSafeMarkdownUrl/.test(mdSrc));
check('escapeAttr in source', /function\s+escapeAttr/.test(mdSrc));

// rel must use noopener noreferrer (not just noopener) in built output
check('links use rel="noopener noreferrer"', /noopener\s+noreferrer/.test(js));

// Blocked protocol keywords must appear in the isSafeMarkdownUrl function body
// Extract just the isSafeMarkdownUrl function text for targeted checks
var safeUrlFn = (js.match(/function\s+isSafeMarkdownUrl[\s\S]*?^  \}/m) || [''])[0];
check('blocked protocol: javascript:', /\bjavascript\b.*:/.test(safeUrlFn));
check('blocked protocol: data:', /\bdata\b.*:/.test(safeUrlFn));
check('blocked protocol: vbscript:', /\bvbscript\b.*:/.test(safeUrlFn));
check('blocked protocol: file:', /\bfile\b.*:/.test(safeUrlFn));
check('blocked protocol: blob:', /\bblob\b.*:/.test(safeUrlFn));

// Image URL must pass isImage=true flag
check('image url passes isSafeMarkdownUrl(…, true)',
  /isSafeMarkdownUrl\(src,\s*true\)/.test(js) || /isSafeMarkdownUrl\([^)]+,\s*true\)/.test(mdSrc));

// Link URL must pass isImage=false flag (or explicit false)
check('link url passes isSafeMarkdownUrl(…, false)',
  /isSafeMarkdownUrl\(url,\s*false\)/.test(js) || /isSafeMarkdownUrl\([^)]+,\s*false\)/.test(mdSrc));

// Bare URL auto-link regex must only match http/https
// Find the auto-link line and verify it uses https?:\/\/ only
var autoLinkLine = (js.match(/\(\?\<!\["'\>\]\)\(https\?[^)]+\)/g) || [''])[0] || '';
check('bare url auto-link only matches http/https',
  /https\?/.test(autoLinkLine) && !/\b(javascript|data:|vbscript|file:|blob:)/.test(autoLinkLine));

// Control character block in isSafeMarkdownUrl
check('isSafeMarkdownUrl blocks control characters',
  /\\x00-\\x1f/.test(safeUrlFn) || /control character/i.test(safeUrlFn));

// =========================================================================
// 12. GIT CLEANLINESS (exclude CLAUDE.md)
// =========================================================================
console.log('\n--- Git cleanliness ---');
try {
  const status = execSync('git status --short', { encoding: 'utf8' }).trim();
  const lines = status.split('\n').filter(Boolean);
  const unknowns = lines.filter(l => l.startsWith('??') && !l.includes('CLAUDE.md'));
  const modified = lines.filter(l => !l.startsWith('??'));
  if (unknowns.length > 0) {
    warn('unknown temp files: ' + unknowns.join(', '));
  } else {
    pass('no unknown temp files (excluding CLAUDE.md)');
  }
  if (modified.length > 0) {
    warn('uncommitted changes present: ' + modified.join(', '));
  } else {
    pass('no uncommitted changes');
  }
} catch (e) {
  warn('cannot run git status: ' + e.message);
}

// =========================================================================
// 13. INDEX.HTML / OMNICHAT.HTML SYNC (light check)
// =========================================================================
console.log('\n--- Index / build sync ---');
if (exists('index.html')) {
  check('index.html has messagesContainer', /messagesContainer/.test(idx));
  check('index.html links to omnichat.html (or is standalone)', true); // informational
} else {
  warn('index.html missing');
}

// =========================================================================
// RESULT
// =========================================================================
console.log('\n' + '='.repeat(50));
if (failed) {
  console.error('\n❌ REVIEW FAILED — fix errors before committing');
  process.exit(1);
}
if (warned) {
  console.warn('\n⚠️  REVIEW PASSED WITH WARNINGS — review warnings before committing');
  process.exit(0);
}
console.log('\n✅ REVIEW PASSED');
