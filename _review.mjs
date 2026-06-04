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
check('sendMessageContent used for chip click with full text',
  /我选择.*letter.*请沿这个分支继续/.test(js) && /sendMessageContent\(choiceText\)/.test(js));
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
// repairSceneBlock must force non-streaming (resp.json() incompatible with stream)
var repairFn = (js.match(/function\s+repairSceneBlock[\s\S]*?^  \}/m) || [''])[0];
check('repairSceneBlock forces stream:false (repairConv or stream:false)',
  /repairConv|stream\s*:\s*false/.test(repairFn));
check('repairSceneBlock does NOT pass raw conv to buildRequestBody',
  !/buildRequestBody\(\s*conv\s*,/.test(repairFn));
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
// 7b. STORY MODE CODE QUALITY — guardrails against known regressions
// =========================================================================
console.log('\n--- Story mode code quality ---');

// 7b-1: story route must appear BEFORE sendMessage consumes state._regenerateFlags.
// Extract the sendMessage function body and check ordering.
var sendMsgFn = (js.match(/async function sendMessage\(\)\s*\{[\s\S]*?^  \}/m) || [''])[0];
// The story route (isStoryEnabled check) must appear before the regenFlags read
var storyRouteIdx = sendMsgFn.search(/if\s*\(\s*isStoryEnabled\s*\(\s*conv\s*\)\s*\)\s*\{[\s\S]*?sendStoryTurn/);
var regenFlagsIdx = sendMsgFn.search(/state\._regenerateFlags/);
check('story route appears BEFORE regenFlags consumption in sendMessage',
  storyRouteIdx >= 0 && regenFlagsIdx >= 0 && storyRouteIdx < regenFlagsIdx);

// 7b-2: sendStoryTurn must NOT call buildSceneFallbackDirections in the real fallback path.
// Extract sendStoryTurn function body and ensure no buildSceneFallbackDirections call.
var storyTurnFn = (js.match(/async function sendStoryTurn\s*\([\s\S]*?^  \}/m) || [''])[0];
check('sendStoryTurn does NOT call buildSceneFallbackDirections',
  !/buildSceneFallbackDirections/.test(storyTurnFn));

// 7b-3: DOM bindings must include aux model controls.
check('dom.selectStoryAuxProvider bound', /dom\.selectStoryAuxProvider\s*=\s*\$\(/.test(js));
check('dom.selectStoryAuxModel bound', /dom\.selectStoryAuxModel\s*=\s*\$\(/.test(js));
check('dom.inputStoryAuxModel bound', /dom\.inputStoryAuxModel\s*=\s*\$\(/.test(js));
check('dom.inputStoryAuxMaxTokens bound', /dom\.inputStoryAuxMaxTokens\s*=\s*\$\(/.test(js));

// 7b-4: resolveStoryAuxProviderAndModel helper exists and auto-detects provider.
check('resolveStoryAuxProviderAndModel helper exists',
  /function\s+resolveStoryAuxProviderAndModel/.test(js));
// DeepSeek default aux model must be deepseek-v4-flash (not pro, not chat)
var auxHelperFn = (js.match(/function\s+resolveStoryAuxProviderAndModel[\s\S]*?^  \}/m) || [''])[0];
check('resolveStoryAuxProviderAndModel defaults deepseek to deepseek-v4-flash',
  /deepseek-v4-flash/.test(auxHelperFn));
check('resolveStoryAuxProviderAndModel does NOT default deepseek to pro',
  !/deepseek-v4-pro/.test(auxHelperFn) && !/deepseek-chat/.test(auxHelperFn));
// sendStoryTurn must use resolveStoryAuxProviderAndModel
check('sendStoryTurn uses resolveStoryAuxProviderAndModel',
  /resolveStoryAuxProviderAndModel\(conv\)/.test(storyTurnFn));
// Old logic must NOT exist in sendStoryTurn
check('sendStoryTurn does NOT use old auxProvider = conv.storyAuxProvider || conv.provider',
  !/auxProvider\s*=\s*conv\.storyAuxProvider\s*\|\|\s*conv\.provider/.test(storyTurnFn));
// API key fallback must sync model/provider (helper handles it)
check('resolveStoryAuxProviderAndModel has API key fallback (getApiKey check)',
  /getApiKey\(provider\)/.test(auxHelperFn));
check('resolveStoryAuxProviderAndModel fallback sets provider = conv.provider',
  /provider\s*=\s*conv\.provider/.test(auxHelperFn));
check('resolveStoryAuxProviderAndModel fallback sets model = resolveModel(conv)',
  /auxModel\s*=\s*resolveModel\(conv\)/.test(auxHelperFn));

// 7b-5: Aux API key fallback exists (if aux provider has no key, fall back to main).
check('aux provider API key fallback to main provider',
  /resolveStoryAuxProviderAndModel\(conv\)/.test(storyTurnFn));

// 7b-6: Aux failure uses repairSceneBlock, not local fallback.
check('aux failure path uses repairSceneBlock',
  /repairSceneBlock\(conv,\s*fullContent\)/.test(storyTurnFn));
check('aux failure does NOT show "已使用备选选项" toast',
  !/已使用备选选项/.test(storyTurnFn));

// 7c: sendStoryTurn UX state machine — continuous streaming, no segmented phases
check('sendStoryTurn inserts empty streaming placeholder, passes same ref to streamStoryPart',
  /content:\s*''/.test(storyTurnFn) && /placeholderMsg/.test(storyTurnFn) && /assistantMsg\s*=\s*placeholderMsg/.test(storyTurnFn));
check('sendStoryTurn Part1→Part2 continuous stream (no phase text gating)',
  !/Part 1 完成/.test(storyTurnFn) && !/正在续写/.test(storyTurnFn) && !/part1Preview/.test(storyTurnFn));
check('sendStoryTurn defers reveal: _pendingContent stash → ensureStoryDirections → promote',
  /_pendingContent\s*=\s*fullContent/.test(storyTurnFn) &&
  /ensureStoryDirections\(assistantMsg[\s\S]*assistantMsg\.content\s*=\s*assistantMsg\._pendingContent/.test(storyTurnFn));
check('sendStoryTurn renders before streaming and on final reveal',
  /renderMessages\(\)/.test(storyTurnFn) && /scrollToBottomIfNeeded/.test(storyTurnFn));
check('sendStoryTurn reveals content after directions ready (promoted assistantMsg)',
  /assistantMsg\.content\s*=\s*assistantMsg\._pendingContent/.test(storyTurnFn) && /assistantMsg\.displayParts\s*=\s*assistantMsg\._pendingDisplayParts/.test(storyTurnFn));
check('aux call has timeout protection (withTimeout)',
  /withTimeout\(/.test(storyTurnFn));
check('repair call has timeout protection (withTimeout)',
  /repairSceneBlock/.test(storyTurnFn) && storyTurnFn.indexOf('withTimeout') < storyTurnFn.lastIndexOf('repairSceneBlock'));
check('sendStoryTurn finally sets isStreaming=false',
  /state\.isStreaming\s*=\s*false/.test(storyTurnFn));
check('sendStoryTurn finally nulls abortController',
  /state\.abortController\s*=\s*null/.test(storyTurnFn));
check('sendStoryTurn finally calls updateSendUI',
  /updateSendUI\(\)/.test(storyTurnFn));
check('placeholderMsg._streaming cleared in finally',
  /placeholderMsg\._streaming\s*=\s*false/.test(storyTurnFn));
check('sendStoryTurn finally calls updateScrollToBottomButton(false)',
  /finally[\s\S]*updateScrollToBottomButton\(false\)/.test(storyTurnFn));
check('action buttons show for all non-streaming assistants (not gated by _showActions)',
  /if\s*\(\s*!msg\._streaming\s*\)\s*\{[\s\S]*msg-actions/.test(js) || /!msg\._streaming[\s\S]*msg-actions/.test(js));
check('aux timeout ≤ 25s',
  storyTurnFn.indexOf('20000') > 0 || storyTurnFn.indexOf('25000') > 0);

// 7f: scrollToBottomBtn state machine — no stuck button
var scrollBtnFn = (js.match(/function\s+updateScrollToBottomButton[\s\S]*?^  \}/m) || [''])[0];
check('updateScrollToBottomButton(false) clears detachedContentDirty',
  /false[\s\S]*detachedContentDirty\s*=\s*false/.test(scrollBtnFn) || /!\s*show[\s\S]*detachedContentDirty\s*=\s*false/.test(scrollBtnFn));
check('updateScrollToBottomButton(false) never shows "AI 正在生成"',
  !/false[\s\S]*AI 正在生成/.test(scrollBtnFn.replace(/btn\.textContent\s*=\s*state\.isStreaming[\s\S]*?;/, '')));
check('updateScrollToBottomButton(false) removes .show class',
  /false[\s\S]*classList\.remove\('show'\)/.test(scrollBtnFn) || /!\s*show[\s\S]*classList\.remove\('show'\)/.test(scrollBtnFn));
check('#scrollToBottomBtn default pointer-events:none',
  /#scrollToBottomBtn\s*\{[\s\S]*pointer-events:\s*none/.test(css));
check('#scrollToBottomBtn.show pointer-events:auto',
  /#scrollToBottomBtn\.show\s*\{[\s\S]*pointer-events:\s*auto/.test(css));

// 7g: streaming UX smoothness — no visual jank
check('processStream uses updateLastBubble for streaming (not full renderMessages)',
  /updateLastBubble\(assistantMsg\)/.test(js) && /scheduleRender[\s\S]*updateLastBubble/.test(js));
check('processStream has final flush (flushFinalRender or renderMessages after [DONE])',
  /flushFinalRender/.test(js) || /\[DONE\][\s\S]*renderMessages/.test(js));
check('sendStoryTurn reveals content after _streaming=false (not while streaming)',
  /_streaming\s*=\s*false[\s\S]*renderMessages\(\)/.test(storyTurnFn));
check('sendStoryTurn does NOT assign Part1 content to placeholder directly',
  !/placeholderMsg\.content\s*=\s*part1Content/.test(storyTurnFn));
check('streaming bubble has subtle CSS transition',
  /\.streaming-cursor[\s\S]*transition/.test(css));

// 7h: race-condition guards — flush/cleanup ordering
check('flushFinalRender is awaitable (return new Promise)',
  /const flushFinalRender = \(\) => \{[\s\S]*return new Promise/.test(js));
check('flushFinalRender cancels pending renderScheduled',
  /renderScheduled\s*=\s*false/.test(js));
check('[DONE] handler awaits flushFinalRender',
  /await flushFinalRender\(\)/.test(js));
check('[DONE] handler clears detached flags after flush',
  /flushFinalRender[\s\S]*detachedDuringStreaming\s*=\s*false/.test(js) ||
  /await flushFinalRender[\s\S]*detachedDuringStreaming/.test(js));
check('stopCurrentRequest clears detached flags + scroll button',
  /stopCurrentRequest[\s\S]*detachedDuringStreaming\s*=\s*false[\s\S]*updateScrollToBottomButton/.test(js));
check('normal sendMessage finally clears detached via updateScrollToBottomButton',
  /state\.isStreaming\s*=\s*false[\s\S]*updateScrollToBottomButton\(false\)/.test(js));

// 7i: streaming reasoning/thinking — ensure thinking-section streams in real-time
console.log('\n--- Streaming reasoning/thinking section ---');
// Extract function bodies for targeted checks
var procStreamFn = (js.match(/async function processStream\s*\([\s\S]*?^  \}/m) || [''])[0];
var storyPartFn = (js.match(/async function streamStoryPart\s*\([\s\S]*?^  \}/m) || [''])[0];
var renderBubbleFn = (js.match(/function renderBubbleHTML\s*\([\s\S]*?^  \}/m) || [''])[0];
var updateLastFn = (js.match(/function updateLastBubble\s*\([\s\S]*?^  \}/m) || [''])[0];

check('processStream handles delta.reasoning (appends + scheduleRender)',
  /delta\.reasoning/.test(procStreamFn) && /assistantMsg\.reasoning\s*=/.test(procStreamFn) && /scheduleRender/.test(procStreamFn));
check('processStream calls scheduleRender when delta.content OR delta.reasoning',
  /delta\.content\s*\|\|\s*delta\.reasoning/.test(procStreamFn));
check('processStream remaining buffer also calls scheduleRender',
  /delta\.content\s*\|\|\s*delta\.reasoning\)\s*scheduleRender/.test(procStreamFn));

check('streamStoryPart handles delta.reasoning (appends)',
  /delta\.reasoning/.test(storyPartFn) && /assistantMsg\.reasoning\s*=/.test(storyPartFn));
check('streamStoryPart calls scheduleRender only when content or reasoning changed',
  /delta\.content\s*\|\|\s*delta\.reasoning\)\s*scheduleRender/.test(storyPartFn));

check('renderBubbleHTML shows thinking-section when reasoning exists',
  /reasoning/.test(renderBubbleFn) && /thinking-section/.test(renderBubbleFn));
check('renderBubbleHTML keeps thinking open during streaming with reasoning',
  /isStreamingReasoning\s*=\s*msg\._streaming\s*&&\s*!!reasoning/.test(js));
check('renderBubbleHTML uses renderContentFast for streaming reasoning',
  /msg\._streaming\s*\?\s*renderContentFast\(reasoning\)/.test(renderBubbleFn));
check('renderBubbleHTML uses renderMarkdown for final reasoning',
  /renderMarkdown\(reasoning\)/.test(renderBubbleFn));

check('updateLastBubble updates thinking-content when reasoning changes',
  /thinking-content/.test(updateLastFn) && /renderContentFast\(reasoning\)/.test(updateLastFn));
check('updateLastBubble rebuilds thinking-section when thinkDiv missing',
  /!thinkDiv/.test(updateLastFn) && /bubble\.innerHTML\s*=\s*renderBubbleHTML/.test(updateLastFn));
check('updateLastBubble keeps thinking-section open during streaming (no !msg.content guard)',
  updateLastFn.includes('details.open = true') && !updateLastFn.includes('!msg.content'));
check('updateLastBubble tracks _lastRenderedReasoningLength',
  /_lastRenderedReasoningLength/.test(updateLastFn));

check('no fake/hardcoded reasoning text (no 预先生成的思考)',
  !/预先生成/.test(js) && !/fake.?reason/i.test(js));
check('no fake reasoning title replaced with stream content',
  !/assistantMsg\.reasoning\s*=\s*['"].*思考/.test(js));
check('renderBubbleHTML does NOT hide thinking-section during streaming',
  !/thinking-section[\s\S]*display\s*:\s*none/.test(renderBubbleFn) &&
  !/thinking-section[\s\S]*_streaming\s*===?\s*false[\s\S]*only.*show/.test(renderBubbleFn));

// 7d: sendStoryTurn A/B/C/D resilience — guarantee directions survive aux/repair failure
check('sendStoryTurn saves previousSceneState before aux',
  /previousSceneState\s*=\s*createSceneState\(conv\.sceneState\)/.test(storyTurnFn));
check('ensureStoryDirections function exists',
  /function\s+ensureStoryDirections/.test(js) || /ensureStoryDirections/.test(storyTurnFn));
check('sendStoryTurn calls ensureStoryDirections',
  /ensureStoryDirections\(assistantMsg/.test(storyTurnFn));
check('ensureStoryDirections tries parsing from visible content (parseDirectionOptions)',
  /ensureStoryDirections[\s\S]*parseDirectionOptions\(fullContent\)/.test(js));
check('ensureStoryDirections falls back to repairSceneBlock (C)',
  /ensureStoryDirections[\s\S]*repairSceneBlock/.test(js));
check('ensureStoryDirections inherits previous directions (D)',
  /ensureStoryDirections[\s\S]*previousSceneState[\s\S]*directions/.test(js) &&
  /assistantMsg\.sceneSnapshot\s*=\s*createSceneState\(previousSceneState\)/.test(js));
check('ensureStoryDirections has hard fallback directions (E)',
  /ensureStoryDirections[\s\S]*_buildHardFallbackDirections/.test(js) &&
  /ensureStoryDirections[\s\S]*conv\.sceneState\.directions\s*=\s*fallbackDirs/.test(js));
check('hard fallback builder returns 4 labeled directions',
  /function\s+_buildHardFallbackDirections/.test(js) &&
  /lines\.push\('A\./.test(js) &&
  /lines\.push\('B\./.test(js) &&
  /lines\.push\('C\./.test(js) &&
  /lines\.push\('D\./.test(js));
check('_showActions gated by parseDirectionOptions length >= 4',
  /parseDirectionOptions\(finalDirs\)\.length\s*>=\s*4/.test(storyTurnFn));
check('fallback writes assistantMsg.sceneSnapshot (not just conv.sceneState)',
  /assistantMsg\.sceneSnapshot\s*=/.test(storyTurnFn));
check('sendStoryTurn waits to reveal final content until directions are ready',
  /_pendingContent\s*=\s*fullContent/.test(storyTurnFn) &&
  /ensureStoryDirections\(assistantMsg[\s\S]*assistantMsg\.content\s*=\s*assistantMsg\._pendingContent/.test(storyTurnFn));

// 7e-streaming: world story uses continuous streaming (no segmented reveal)
console.log('\n--- World story streaming ---');
check('streamStoryPart function exists',
  /function\s+streamStoryPart/.test(js));
check('streamStoryPart calls callChatModel with stream:true',
  /callChatModel[\s\S]*stream\s*:\s*true/.test(js.match(/function\s+streamStoryPart[\s\S]*?^  \}/m)?.[0] || ''));
check('streamStoryPart uses parseStreamDelta',
  /parseStreamDelta/.test(js.match(/function\s+streamStoryPart[\s\S]*?^  \}/m)?.[0] || ''));
check('streamStoryPart uses updateLastBubble for incremental render',
  /updateLastBubble/.test(js.match(/function\s+streamStoryPart[\s\S]*?^  \}/m)?.[0] || ''));
check('streamStoryPart has throttle gap (50-80ms)',
  /minRenderGap\s*=\s*(?:5\d|6\d|7\d|80)/.test(js.match(/function\s+streamStoryPart[\s\S]*?^  \}/m)?.[0] || ''));
check('sendStoryTurn uses streamStoryPart once (single generation)',
  (storyTurnFn.match(/streamStoryPart\(conv,\s*model,\s*messages/g) || []).length === 1);
check('sendStoryTurn does NOT reference messages1/messages2 (no dual messages)',
  !/messages1|messages2/.test(storyTurnFn));
check('sendStoryTurn does NOT use non-streaming callChatModel for story generation',
  !/callChatModel\(conv,\s*model,\s*messages,\s*\{\s*stream\s*:\s*false/.test(storyTurnFn));
check('sendStoryTurn placeholder starts empty (content: \'\')',
  /content:\s*''/.test(storyTurnFn));
check('sendStoryTurn placeholder has _streaming:true',
  /_streaming:\s*true/.test(storyTurnFn));
check('sendStoryTurn does NOT show "Part 1 完成" segmented preview',
  !/Part 1 完成/.test(storyTurnFn));
check('sendStoryTurn does NOT replace content with "正在提取" placeholder',
  !/正在提取场景状态与剧情走向/.test(storyTurnFn));
check('sendStoryTurn keeps _streaming=true until directions ready (after ensureStoryDirections)',
  /ensureStoryDirections\(assistantMsg[\s\S]*_streaming\s*=\s*false/.test(storyTurnFn));
check('sendStoryTurn reveals content from _pendingContent after directions',
  /_streaming\s*=\s*false[\s\S]*assistantMsg\.content\s*=\s*assistantMsg\._pendingContent/.test(storyTurnFn) ||
  /assistantMsg\.content\s*=\s*assistantMsg\._pendingContent[\s\S]*_streaming\s*=\s*false/.test(storyTurnFn));
check('streamStoryPart only shows thinking from reasoning_content delta (no fake reasoning)',
  /delta\.reasoning/.test(js.match(/function\s+streamStoryPart[\s\S]*?^  \}/m)?.[0] || ''));
check('sendStoryTurn does NOT reference part1Content/part2Content (single story flow)',
  !/part1Content|part2Content/.test(storyTurnFn));

// 7e: render-time fallback for broken _showActions assistant without directions
check('findPreviousSceneSnapshotForRender function exists',
  /function\s+findPreviousSceneSnapshotForRender/.test(js));
check('createMessageElement repairs broken _showActions assistant',
  /createMessageElement[\s\S]*_showActions[\s\S]*findPreviousSceneSnapshotForRender/.test(js) ||
  /msg\._showActions[\s\S]*findPreviousSceneSnapshotForRender/.test(js));
check('renderSceneStatusTable also has fallback for broken assistant',
  /renderSceneStatusTable[\s\S]*_showActions[\s\S]*findPreviousSceneSnapshotForRender/.test(js));
check('fallback writes msg.sceneSnapshot (createSceneState)',
  /msg\.sceneSnapshot\s*=\s*createSceneState\(fallback/.test(js));

// =========================================================================
// 8. BUILD VERSION
// =========================================================================
console.log('\n--- Build version ---');
check('build-version meta in omnichat.html', /name=["']build-version["']/.test(html));
check('build-commit meta in omnichat.html', /name=["']build-commit["']/.test(html));
check('build-version meta in index.html', /name=["']build-version["']/.test(idx));
check('build-commit meta in index.html', /name=["']build-commit["']/.test(idx));
check('__BUILD_VERSION__ in script.js', /__BUILD_VERSION__/.test(js));
check('__BUILD_COMMIT__ in script.js', /__BUILD_COMMIT__/.test(js));
check('window.__BUILD_VERSION__ in omnichat.html', /window\.__BUILD_VERSION__/.test(html));
check('window.__BUILD_COMMIT__ in omnichat.html', /window\.__BUILD_COMMIT__/.test(html));
check('index.html keeps external stylesheet', /<link rel=["']stylesheet["'] href=["']style\.css["']>/.test(idx));
check('index.html keeps external script', /<script src=["']script\.js["']><\/script>/.test(idx));
check('omnichat.html has inline style', /<style>[\s\S]*<\/style>/.test(html));

// Validate content is not empty/unknown
var buildVerMatch = html.match(/<meta\s+name=["']build-version["']\s+content=["']([^"']*)["']/);
var buildComMatch = html.match(/<meta\s+name=["']build-commit["']\s+content=["']([^"']*)["']/);
var indexBuildVerMatch = idx.match(/<meta\s+name=["']build-version["']\s+content=["']([^"']*)["']/);
var indexBuildComMatch = idx.match(/<meta\s+name=["']build-commit["']\s+content=["']([^"']*)["']/);
check('build-version content is not empty',
  buildVerMatch && buildVerMatch[1] && buildVerMatch[1].length > 0);
check('build-commit content is not empty',
  buildComMatch && buildComMatch[1] && buildComMatch[1].length > 0);
check('build-commit content is not "unknown"',
  buildComMatch && buildComMatch[1] && buildComMatch[1] !== 'unknown');
check('build-commit content is not "dev"',
  buildComMatch && buildComMatch[1] && buildComMatch[1] !== 'dev');
check('index.html build-version matches omnichat.html',
  indexBuildVerMatch && buildVerMatch && indexBuildVerMatch[1] === buildVerMatch[1]);
check('index.html build-commit matches omnichat.html',
  indexBuildComMatch && buildComMatch && indexBuildComMatch[1] === buildComMatch[1]);

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
// 12b. AUX MODEL DEFAULTS & CLEANUP
// =========================================================================
console.log('\n--- Aux model defaults & cleanup ---');
const htmlSrc = read('omnichat.html');
// storyAuxMaxTokens must be 5000, not 1200 or 10000
var auxTokens1200inJS = /storyAuxMaxTokens:\s*1200/.test(js);
var auxTokens1200inHTML = /storyAuxMaxTokens:\s*1200/.test(htmlSrc);
var auxTokens10000inJS = /storyAuxMaxTokens:\s*10000/.test(js);
var auxTokens10000inHTML = /storyAuxMaxTokens:\s*10000/.test(htmlSrc);
check('script.js: no storyAuxMaxTokens: 1200', !auxTokens1200inJS);
check('omnichat.html: no storyAuxMaxTokens: 1200', !auxTokens1200inHTML);
check('script.js: no storyAuxMaxTokens: 10000', !auxTokens10000inJS);
check('omnichat.html: no storyAuxMaxTokens: 10000', !auxTokens10000inHTML);
check('script.js: has storyAuxMaxTokens: 5000', /storyAuxMaxTokens:\s*5000/.test(js));
check('omnichat.html: has storyAuxMaxTokens: 5000', /storyAuxMaxTokens:\s*5000/.test(htmlSrc));
// Both index.html and omnichat.html must have selectStoryAuxModel
check('index.html: has selectStoryAuxModel', /selectStoryAuxModel/.test(idx));
check('omnichat.html: has selectStoryAuxModel', /selectStoryAuxModel/.test(htmlSrc));
// script.js must bind dom.selectStoryAuxModel AND use it in settings save
var bindsSelectAuxModel = /dom\.selectStoryAuxModel\s*=\s*\$\(/.test(js);
var usesInSyncFromUI = /dom\.selectStoryAuxModel/.test(js) && /conv\.storyAuxModel\s*=/.test(js);
check('script.js: binds dom.selectStoryAuxModel', bindsSelectAuxModel);
check('script.js: uses selectStoryAuxModel in settings save', usesInSyncFromUI);
// Temp test files must not exist
var noCCReport = !exists('_cc_test_report.md');
var noConsoleTest = !exists('_console_test.js');
var noTestApi = !exists('_test_api.mjs');
var noTestBrowser = !exists('_test_browser.mjs');
var noTestLogic = !exists('_test_logic.mjs');
check('_cc_test_report.md deleted', noCCReport);
check('_console_test.js deleted', noConsoleTest);
check('_test_api.mjs deleted', noTestApi);
check('_test_browser.mjs deleted', noTestBrowser);
check('_test_logic.mjs deleted', noTestLogic);

// =========================================================================
// 12c. DEFAULT VALUES & TOGGLE STYLES
// =========================================================================
console.log('\n--- Defaults & toggle checks ---');
check('DEFAULTS.maxTokens is 5000',
  /maxTokens:\s*5000/.test(js) && !/maxTokens:\s*2000/.test(js.match(/DEFAULTS\s*=[\s\S]*?^\s*\};/m)?.[0] || ''));
check('DEFAULTS.storyAuxMaxTokens is 5000',
  /storyAuxMaxTokens:\s*5000/.test(js));
check('index.html inputMaxTokens value is 5000',
  /inputMaxTokens.*value\s*=\s*"5000"/.test(idx));
check('omnichat.html inputMaxTokens value is 5000',
  /inputMaxTokens.*value\s*=\s*"5000"/.test(htmlSrc));
check('index.html inputStoryAuxMaxTokens value is 5000',
  /inputStoryAuxMaxTokens.*value\s*=\s*"5000"/.test(idx));
check('omnichat.html inputStoryAuxMaxTokens value is 5000',
  /inputStoryAuxMaxTokens.*value\s*=\s*"5000"/.test(htmlSrc));
// Toggle stability
check('toggle-slider has border-radius (pill shape)',
  /\.toggle-slider\s*\{[\s\S]*border-radius:\s*1[3-9]px/.test(css));
check('setting-row toggle has flex-shrink:0',
  /\.setting-row\s+\.toggle\s*\{[\s\S]*flex-shrink:\s*0/.test(css) ||
  /\.story-mode-setting\s+\.toggle\s*\{[\s\S]*flex-shrink/.test(css));
// Story mode guardrails still present
check('ensureStoryDirections still in js',
  /function\s+ensureStoryDirections/.test(js));
check('findPreviousSceneSnapshotForRender still in js',
  /function\s+findPreviousSceneSnapshotForRender/.test(js));
// Bug fix: ensureStoryDirections preserves A/B/C/D letter prefixes
check('ensureStoryDirections preserves letter prefix in dirsStr',
  /d\.letter\s*\+\s*['\"]\.\s*['\"]\s*\+\s*d\.content/.test(js.match(/function\s+ensureStoryDirections[\s\S]*?^  \}/m)?.[0] || ''));
// Aux messages use single storyContent payload
check('buildAuxMessages payload uses story field (not part1/part2)',
  /story\s*:\s*storyContent/.test(js) && !/part1\s*:/.test(js.match(/function\s+buildAuxMessages[\s\S]*?^  \}/m)?.[0] || ''));

// =========================================================================
// 12d. REPLY CHAR LIMIT — per-turn Chinese character count target
// =========================================================================
console.log('\n--- Reply char limit ---');
// Default value
check('DEFAULTS.replyCharLimit is 500',
  /replyCharLimit:\s*500\b/.test(js.match(/DEFAULTS\s*=[\s\S]*?^\s*\};/m)?.[0] || ''));
// HTML select element
check('index.html has inputReplyCharLimit select',
  /inputReplyCharLimit/.test(idx));
check('index.html has option value="100"',
  /value\s*=\s*"100"/.test(idx.match(/inputReplyCharLimit[\s\S]*?<\/select>/)?.[0] || ''));
check('index.html has option value="300"',
  /value\s*=\s*"300"/.test(idx.match(/inputReplyCharLimit[\s\S]*?<\/select>/)?.[0] || ''));
check('index.html has option value="500"',
  /value\s*=\s*"500"/.test(idx.match(/inputReplyCharLimit[\s\S]*?<\/select>/)?.[0] || ''));
check('index.html has option value="1000"',
  /value\s*=\s*"1000"/.test(idx.match(/inputReplyCharLimit[\s\S]*?<\/select>/)?.[0] || ''));
check('index.html has option value="1500"',
  /value\s*=\s*"1500"/.test(idx.match(/inputReplyCharLimit[\s\S]*?<\/select>/)?.[0] || ''));
check('index.html has option value="2000"',
  /value\s*=\s*"2000"/.test(idx.match(/inputReplyCharLimit[\s\S]*?<\/select>/)?.[0] || ''));
// No legacy high options
check('index.html does NOT have option value="2500"',
  !/value\s*=\s*"2500"/.test(idx.match(/inputReplyCharLimit[\s\S]*?<\/select>/)?.[0] || ''));
check('index.html does NOT have option value="3000"',
  !/value\s*=\s*"3000"/.test(idx.match(/inputReplyCharLimit[\s\S]*?<\/select>/)?.[0] || ''));
check('index.html does NOT have option value="4000"',
  !/value\s*=\s*"4000"/.test(idx.match(/inputReplyCharLimit[\s\S]*?<\/select>/)?.[0] || ''));
// DOM binding
check('dom.inputReplyCharLimit bound in script.js',
  /dom\.inputReplyCharLimit\s*=\s*\$\(/.test(js));
// Settings save
check('syncSettingsFromUI reads replyCharLimit',
  /conv\.replyCharLimit\s*=\s*parseInt\(dom\.inputReplyCharLimit\.value/.test(js));
// Settings load
check('syncSettingsToUI writes replyCharLimit',
  /dom\.inputReplyCharLimit\.value\s*=\s*conv\.replyCharLimit/.test(js));
// createConversation includes replyCharLimit
check('createConversation sets replyCharLimit',
  /replyCharLimit:\s*DEFAULTS\.replyCharLimit/.test(js));
// Migration clamps old >2000 values down to 2000
check('normalizeConversation clamps replyCharLimit > 2000',
  /conv\.replyCharLimit\s*=\s*2000/.test(js));
// Migration defaults missing/<100 values to 500
check('normalizeConversation defaults replyCharLimit < 100 to 500',
  /rcl\s*<\s*100/.test(js) && /conv\.replyCharLimit\s*=\s*500/.test(js));
// Migration normalizes intermediate values to nearest option
check('normalizeConversation has REPLY_CHAR_OPTIONS for normalization',
  /REPLY_CHAR_OPTIONS/.test(js) && /100.*300.*500.*1000.*1500.*2000/.test(js));
// Regular chat constraint has ±50 tolerance
check('regular chat replyCharLimit constraint mentions ±50',
  /回复字数约束/.test(js) && /±50/.test(js));
// Regular chat constraint mentions upper bound
check('regular chat constraint mentions do not exceed limit+50',
  /不要超出/.test(js) && /\+\s*50/.test(js));
// World story single-pass: single round character count constraint
check('_buildStoryMessages has single-round char limit constraint',
  /本轮剧情正文目标约/.test(js) && /优先自然完整/.test(js));
// World story single-pass: no Part1/Part2 split
check('_buildStoryMessages does NOT reference Part1/Part2 split targets',
  !/第一部分目标约/.test(js) && !/第二部分目标约/.test(js) && !/part1Target/.test(js) && !/part2Target/.test(js) && !/minSegTarget/.test(js) && !/总计不超过/.test(js));
// Emotional stability rule present in story writing rules
check('_buildStoryMessages contains emotional stability rule',
  /情绪基调保持克制/.test(js) && /平稳推进/.test(js) && /不要主动升级紧张感/.test(js));
// Single-round constraint does NOT mention total upper bound or split
check('_buildStoryMessages single-round constraint mentions ±50 tolerance',
  /±50/.test(js) && /优先自然完整/.test(js));
// Constraint appends to user message (not system) for stronger adherence
check('char limit constraint appends to user message',
  /回复字数约束/.test(js) && /messages\[.*\]\.role\s*===\s*['\"]user['\"]/.test(js));
// Constraint tells model to ignore historical reply length
check('char limit constraint says ignore historical reply length',
  /不要参考历史回复的长度/.test(js));
// Escalation flag set on truncation or scene repair failure
check('_charLimitEscalate set on finishReason=length or _sceneRepairFailed',
  /_charLimitEscalate\s*=\s*true/.test(js));
// Escalation warning message
check('escalation adds warning about previous abnormal reply',
  /上一轮回复异常/.test(js));
// Must not break aux model parsing
check('buildAuxMessages does NOT contain char limit constraint',
  !/回复字数约束/.test(js.match(/function\s+buildAuxMessages[\s\S]*?^  \}/m)?.[0] || ''));

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
// 14. SYNTAX VALIDATION — script.js & omnichat.html inline script must parse
// =========================================================================
console.log('\n--- Syntax validation ---');
try {
  execSync('node --check script.js', { encoding: 'utf8', stdio: 'pipe' });
  pass('script.js parses without SyntaxError');
} catch (e) {
  fail('script.js parse error: ' + (e.stderr || e.message || '').replace(/\n/g, ' '));
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
    pass('omnichat.html inline script parses without SyntaxError');
  } else {
    warn('omnichat.html inline script not found for syntax check');
  }
} catch (e2) {
  fail('omnichat.html inline script parse error: ' + (e2.stderr || e2.message || '').replace(/\n/g, ' '));
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
