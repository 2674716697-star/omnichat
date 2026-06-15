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

// Helper: extract function body by counting braces from a given start position
function extractBraceBlock(source, startIdx) {
  const braceStart = source.indexOf('{', startIdx);
  if (braceStart === -1) return '';
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.substring(braceStart + 1, i);
    }
  }
  return '';
}

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*--.*$/gm, '');
}

function collectProjectTablesCreated(sql) {
  const tables = new Set();
  const re = /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?public"?\.)?"?([a-z_][a-z0-9_]*)"?/gi;
  let match;
  while ((match = re.exec(sql))) {
    tables.add(match[1].toLowerCase());
  }
  return tables;
}

function collectKnownProjectTableRefs(sql, knownTables) {
  const refs = new Set();
  for (const table of knownTables) {
    const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tableRef = `(?:"?public"?\\.)?"?${escaped}"?\\b`;
    const patterns = [
      new RegExp(`\\bALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?${tableRef}`, 'i'),
      new RegExp(`\\bGRANT\\b[\\s\\S]{0,160}\\bON\\s+(?:TABLE\\s+)?${tableRef}`, 'i'),
      new RegExp(`\\bREFERENCES\\s+${tableRef}`, 'i'),
      new RegExp(`\\bFROM\\s+${tableRef}`, 'i'),
      new RegExp(`\\bJOIN\\s+${tableRef}`, 'i'),
      new RegExp(`\\bUPDATE\\s+${tableRef}`, 'i'),
      new RegExp(`\\bINSERT\\s+INTO\\s+${tableRef}`, 'i'),
    ];
    if (patterns.some((re) => re.test(sql))) refs.add(table);
  }
  return refs;
}

function validateProjectMigrationOrdering() {
  const dir = 'supabase/migrations';
  const knownTables = [
    'conversations',
    'messages',
    'story_states',
    'story_chapters',
    'memory_facts',
    'user_profiles',
  ];
  if (!fs.existsSync(dir)) {
    return { ok: false, failures: [`${dir} does not exist`] };
  }

  const files = fs.readdirSync(dir)
    .filter((name) => /\.sql$/i.test(name))
    .sort();
  const createdBefore = new Set();
  const failures = [];

  for (const file of files) {
    const sql = stripSqlComments(read(`${dir}/${file}`));
    const createdHere = collectProjectTablesCreated(sql);
    const available = new Set([...createdBefore, ...createdHere]);
    const refs = collectKnownProjectTableRefs(sql, knownTables);
    for (const ref of refs) {
      if (!available.has(ref)) {
        failures.push(`${file} references ${ref} before that table is created`);
      }
    }
    for (const table of createdHere) {
      if (knownTables.includes(table)) createdBefore.add(table);
    }
  }

  return { ok: failures.length === 0, failures };
}

// --- Forbidden bottom selectors ---
console.log('--- UI smoke: forbidden immersive overrides ---');
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
check('sw cache versioned omnichat-vN', /CACHE_NAME\s*=\s*['"]omnichat-v\d+['"]/.test(sw));

// --- Build version ---
console.log('\n--- Build version ---');
check('build-version meta exists', /name=["']build-version["']/.test(html));
check('__BUILD_VERSION__ exists in script.js', /__BUILD_VERSION__/.test(js));

// --- Splash ---
console.log('\n--- UI smoke: splash lifecycle ---');
check('index/html contains id="splash"', /<\w+[^>]*\bid=["']splash["']/.test(html));
check('script/html contains classList.add("dismissed")', /classList\.add\(["']dismissed["']\)/.test(html + js));
check('script/html removes is-splashing', /classList\.remove\(["']is-splashing["']\)/.test(html + js));
check('html starts with is-splashing', /<html[^>]*class=["'][^"']*is-splashing/.test(html));
check('is-splashing hides bottom-bar', /html\.is-splashing\s+\.bottom-bar[\s\S]*display:\s*none/.test(css));

// --- Global bottom UI ---
console.log('\n--- UI smoke: bottom input lifecycle ---');
check('bottom-bar selector exists in CSS/HTML', /\.bottom-bar\b/.test(css + html));
check('input-message selector/id exists in CSS/HTML', /(?:\.input-message|#input-message|id=["']input-message["'])/.test(css + html));
check('bottom-bar position fixed', /\.bottom-bar\s*\{[\s\S]*position:\s*fixed/.test(css));
check('--bottom-bar-h dynamic variable exists', /--bottom-bar-h/.test(js));
check('updateBottomBarHeight function exists', /function\s+updateBottomBarHeight/.test(js));

// --- Stability features ---
console.log('\n--- Stability features ---');
check('bottom-bar position fixed', /\.bottom-bar\s*\{[\s\S]*position:\s*fixed/.test(css));
check('--bottom-bar-h dynamic', /--bottom-bar-h/.test(js));
check('updateBottomBarHeight function', /function\s+updateBottomBarHeight/.test(js));

// --- Historical conversation migration integrity ---
console.log('\n--- Migration integrity ---');
check('STORAGE_SCHEMA_VERSION defined', /STORAGE_SCHEMA_VERSION\s*=\s*\d+/.test(js));
check('STORAGE_SCHEMA_VERSION = 7', /STORAGE_SCHEMA_VERSION\s*=\s*7\b/.test(js));
check('normalizeConversation exists', /function\s+normalizeConversation/.test(js));
check('normalizeMessage exists', /function\s+normalizeMessage/.test(js));
check('looksLikeWorldCharacterCard exists', /function\s+looksLikeWorldCharacterCard/.test(js));
check('loadFromStorage calls normalizeConversation', /state\.conversations\s*=\s*state\.conversations\.map\(normalizeConversation\)/.test(js));
check('switchConversation calls normalizeConversation', /function\s+switchConversation[\s\S]*normalizeConversation\(conv\)/.test(js));
check('import path calls normalizeConversation', /normalizeConversation\(c\)/.test(js));
check('createConversation sets schemaVersion', /schemaVersion:\s*STORAGE_SCHEMA_VERSION/.test(js));
check('render uses displayContent fallback', /displayContent\s*\|\|\s*(msg\.)?content/.test(js));
check('API uses _requestContent fallback', /_requestContent\s*\|\|\s*(m\.)?content/.test(js));

// --- Phase 1/1.1/1.2: new runtime functions ---
console.log('\n--- Phase 1/1.1/1.2: Runtime functions ---');
check('getRuntimeConfigValue exists', /function\s+getRuntimeConfigValue\s*\(/.test(js));
check('getRuntimeConfigValue reads window.__MIRA_CONFIG__', /window\s*\.\s*__MIRA_CONFIG__/.test(js));
check('getSupabaseClient exists', /function\s+getSupabaseClient\s*\(/.test(js));
check('getSupabaseClient calls getRuntimeConfigValue', (() => {
  const idx = js.search(/function\s+getSupabaseClient\s*\(/);
  if (idx === -1) return false;
  return /getRuntimeConfigValue\s*\(/.test(extractBraceBlock(js, idx));
})());
check('getSupabaseAccessToken exists', /async\s+function\s+getSupabaseAccessToken\s*\(/.test(js));
check('prefetchRemoteMemory exists', /function\s+prefetchRemoteMemory\s*\(/.test(js));
check('_prefetchRemoteMemoryImpl exists', /async\s+function\s+_prefetchRemoteMemoryImpl\s*\(/.test(js));
check('prefetchRemoteMemory uses AbortController', /new\s+AbortController/.test(js));
check('prefetchRemoteMemory has timeout (3500ms)', /3500/.test(js));
check('getRemoteMemoryCacheText exists', /function\s+getRemoteMemoryCacheText\s*\(/.test(js));
check('buildMemoryRetrievePayload exists', /function\s+buildMemoryRetrievePayload\s*\(/.test(js));
check('buildMemoryEndpointUrl exists', /function\s+buildMemoryEndpointUrl\s*\(/.test(js));
check('normalizeMemoryRetrieveResult exists', /function\s+normalizeMemoryRetrieveResult\s*\(/.test(js));
check('hasRemoteMemoryConfig exists', /function\s+hasRemoteMemoryConfig\s*\(/.test(js));

// --- Phase 1: Supabase config constants ---
console.log('\n--- Phase 1: Supabase config ---');
check('frontend JS has no hardcoded service role assignment', !/service_role\s*['"`][\w-]+\.[\w-]+\.[\w-]+/.test(js));
check('getRuntimeConfigValue exists', /function\s+getRuntimeConfigValue\s*\(/.test(js));
check('buildRemoteMemoryHeaders exists', /async\s+function\s+buildRemoteMemoryHeaders\s*\(/.test(js));

// --- Phase 1/1.2: State initialization ---
console.log('\n--- Phase 1/1.2: State initialization ---');
check('_remoteMemoryPrefetchLocks in state', /_remoteMemoryPrefetchLocks\s*:\s*\{\s*\}/.test(js));

// --- Phase 1: v6→v7 migration ---
console.log('\n--- Phase 1: v6→v7 migration ---');
check('v6→v7: oldVersion < 7 migration block', /oldVersion\s*<\s*7/.test(js));
check('v6→v7: memoryMode upgrade local→remote', /conv\.memoryMode\s*===\s*['"]local['"]\s*&&\s*!conv\.memoryRemoteEndpoint/.test(js));
check('v6→v7: remoteMemoryCache normalization', /if\s*\(\s*conv\.remoteMemoryCache\s*\)/.test(js));
check('v6→v7: selectedFactIds normalized to array', /!Array\.isArray\(.*selectedFactIds/.test(js));
check('v6→v7: budget falls back to 4000', /budget\s*=\s*4000/.test(js));

// --- Phase 1: Defaults ---
console.log('\n--- Phase 1: Defaults ---');
check('DEFAULTS.memoryMode is remote', /memoryMode\s*:\s*['"]remote['"]/.test(js));
check('memoryRemoteEndpoint default or runtime override path exists', /memoryRemoteEndpoint\s*:\s*['"]https?:\/\//.test(js));

// --- Phase 1: Remote memory cache (30-min TTL) ---
console.log('\n--- Phase 1: Remote memory cache ---');
check('remote memory cache 30-min TTL', /30\s*\*\s*60\s*\*\s*1000/.test(js));
check('remote memory cache prefetch on update success', /prefetchRemoteMemory\s*\(/.test(js));

// --- Phase 1.2: Runtime config safety ---
console.log('\n--- Phase 1.2: Runtime config safety ---');
check('getRuntimeConfigValue never throws (try/catch)', (() => {
  const idx = js.search(/function\s+getRuntimeConfigValue\s*\(/);
  if (idx === -1) return false;
  const body = extractBraceBlock(js, idx);
  return /try\s*\{/.test(body) && /catch\s*\(\s*_\s*\)/.test(body);
})());
check('getRuntimeConfigValue falls back to fallback arg', /return\s+fallback/.test(js));
check('createConversation uses getRuntimeConfigValue for endpoint', /getRuntimeConfigValue\s*\(\s*['"]memoryRemoteEndpoint['"]/.test(js));
check('buildRemoteMemoryHeaders uses getRuntimeConfigValue for publishable key', (() => {
  const brmhIdx2 = js.search(/async\s+function\s+buildRemoteMemoryHeaders\s*\(/);
  if (brmhIdx2 === -1) return false;
  return /getRuntimeConfigValue\s*\(/.test(extractBraceBlock(js, brmhIdx2));
})());

// =============================================================================
// Remote Memory / Auth Safety (Phase 1/1.1 invariants)
// =============================================================================
console.log('\n--- Remote Memory/Auth Safety ---');

// Read supabase edge function source files
const memUpdateTs = read('supabase/functions/memory-update/index.ts');
const memRetrieveTs = read('supabase/functions/memory-retrieve/index.ts');

// ---------------------------------------------------------------------------
// 1. buildRemoteMemoryHeaders existence
// ---------------------------------------------------------------------------
const brmhIdx = js.search(/async\s+function\s+buildRemoteMemoryHeaders\s*\(/);
check('buildRemoteMemoryHeaders exists in script.js', brmhIdx !== -1);

// ---------------------------------------------------------------------------
// 2. apikey must NOT be sent unconditionally (must be inside if(token) guard)
// ---------------------------------------------------------------------------
if (brmhIdx !== -1) {
  const brmhBody = extractBraceBlock(js, brmhIdx);
  const hasIfToken = /if\s*\(\s*token\s*\)/.test(brmhBody);
  check('buildRemoteMemoryHeaders has if(token) guard', hasIfToken);

  if (hasIfToken) {
    const ifTokenIdx = brmhBody.search(/if\s*\(\s*token\s*\)/);
    const beforeGuard = brmhBody.substring(0, ifTokenIdx);
    const afterGuard = brmhBody.substring(ifTokenIdx);

    // apikey must NOT appear before the if(token) guard
    check('apikey NOT set before if(token) guard',
      !/headers\s*\[\s*['"]apikey['"]\s*\]\s*=/.test(beforeGuard) &&
      !/headers\s*\.\s*apikey\s*=/.test(beforeGuard));

    // apikey must appear inside the if(token) block
    check('apikey set inside if(token) block',
      /headers\s*\[\s*['"]apikey['"]\s*\]\s*=/.test(afterGuard));
  }
} else {
  check('buildRemoteMemoryHeaders has if(token) guard', false);
  check('apikey NOT set before if(token) guard', false);
  check('apikey set inside if(token) block', false);
}

// ---------------------------------------------------------------------------
// 3. await buildRemoteMemoryHeaders() used at least twice (fetch + update)
// ---------------------------------------------------------------------------
const brmhCallCount = (js.match(/await\s+buildRemoteMemoryHeaders\s*\(\s*\)/g) || []).length;
check('await buildRemoteMemoryHeaders() used 2+ times', brmhCallCount >= 2);

// ---------------------------------------------------------------------------
// 4. memory-update/index.ts invariants
// ---------------------------------------------------------------------------
const updateHasOptAuth = /(?:async\s+)?function\s+getOptionalAuthUserId/.test(memUpdateTs);
check('memory-update has getOptionalAuthUserId', updateHasOptAuth);

// Malformed Authorization (header present but token invalid/empty) → 401
check('memory-update malformed auth → 401',
  /if\s*\(\s*!token\s*\)[\s\S]{0,150}jsonAuthError\s*\(\s*401/.test(memUpdateTs));

// Conversation create path must use .insert(), NOT .upsert()
// (story_states .upsert is allowed — don't flag all upserts)
check('memory-update conversation create uses .insert()',
  /\.from\s*\(\s*["']conversations["']\s*\)[\s\S]{0,350}\.insert\s*\(/.test(memUpdateTs));
check('memory-update conversation create does NOT use .upsert()',
  !/\.from\s*\(\s*["']conversations["']\s*\)[\s\S]{0,350}\.upsert\s*\(/.test(memUpdateTs));

// Conditional claim with .is("user_id", null) — must exist
check('memory-update has .is("user_id", null) claim',
  /\.is\s*\(\s*['"]user_id['"]\s*,\s*null\s*\)/.test(memUpdateTs));

// resolveConversationOwnership must exist
check('memory-update has resolveConversationOwnership',
  /(?:async\s+)?function\s+resolveConversationOwnership/.test(memUpdateTs));

// ---------------------------------------------------------------------------
// 5. memory-retrieve/index.ts invariants
// ---------------------------------------------------------------------------
const retrieveHasOptAuth = /(?:async\s+)?function\s+getOptionalAuthUserId/.test(memRetrieveTs);
check('memory-retrieve has getOptionalAuthUserId', retrieveHasOptAuth);

// Malformed Authorization → 401
check('memory-retrieve malformed auth → 401',
  /if\s*\(\s*!token\s*\)[\s\S]{0,150}jsonAuthError\s*\(\s*401/.test(memRetrieveTs));

// Unauthenticated access to owned row → emptyResult (not 403)
check('memory-retrieve has rowUserId !== null check',
  /rowUserId\s*!==\s*null/.test(memRetrieveTs));
check('memory-retrieve has emptyResult helper',
  /function\s+emptyResult/.test(memRetrieveTs));
check('memory-retrieve returns emptyResult for unowned-access',
  /rowUserId\s*!==\s*null/.test(memRetrieveTs) &&
  /return\s+emptyResult\s*\(\s*\)/.test(memRetrieveTs));

// ---------------------------------------------------------------------------
// 6. CORS Allow-Headers must include Content-Type, Authorization, apikey
// ---------------------------------------------------------------------------
function checkCorsHeaders(source, label) {
  const match = source.match(/Access-Control-Allow-Headers["']?\s*:\s*["']([^"']+)["']/);
  if (!match) {
    check(`${label} CORS Allow-Headers declared`, false);
    return;
  }
  const headers = match[1];
  check(`${label} CORS: Content-Type`, /Content-Type/.test(headers));
  check(`${label} CORS: Authorization`, /Authorization/.test(headers));
  check(`${label} CORS: apikey`, /apikey/.test(headers));
}

checkCorsHeaders(memUpdateTs, 'memory-update');
checkCorsHeaders(memRetrieveTs, 'memory-retrieve');

// ---------------------------------------------------------------------------
// 7. No hardcoded service-role secrets anywhere
// ---------------------------------------------------------------------------
const allSourceFiles = js + html + memUpdateTs + memRetrieveTs + sw + css;
check('no sb_secret hardcoded', !/sb_secret/.test(allSourceFiles));
check('no p9zhINZ hardcoded', !/p9zhINZ/.test(allSourceFiles));
check('no service_role JWT hardcoded', !/service_role\s*['"`][\w-]+\.[\w-]+\.[\w-]+/.test(allSourceFiles));
check('no SUPABASE_SERVICE_ROLE_KEY= hardcoded secret',
  !/SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"`]eyJ/.test(allSourceFiles) &&
  !/SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"`]sb_/.test(allSourceFiles));

// ---------------------------------------------------------------------------
// 7b. Pre-commit hygiene (gitignore + git tracking)
// ---------------------------------------------------------------------------
console.log('\n--- Pre-commit hygiene ---');

// .gitignore must contain supabase/.temp/
const gitignore = read('.gitignore');
check('.gitignore contains supabase/.temp/',
  /supabase\/\.temp\//.test(gitignore));

// Git must not track any files under supabase/.temp
try {
  const tracked = execSync('git ls-files supabase/.temp', { encoding: 'utf8', stdio: 'pipe' }).trim();
  check('no tracked files under supabase/.temp', tracked === '');
  if (tracked !== '') {
    console.error('   TRACKED FILES FOUND:');
    console.error('   ' + tracked.replace(/\n/g, '\n   '));
  }
} catch (e) {
  check('no tracked files under supabase/.temp (git accessible)', false);
  console.error('   git ls-files failed: ' + (e.stderr || e.message || '').replace(/\n/g, ' '));
}

// Publishable key exposure documented in README/plan
const backendPlan2 = read('BACKEND_MEMORY_PLAN.md');
const functionsReadme2 = read('supabase/functions/README.md');
check('BACKEND_MEMORY_PLAN.md mentions publishable key exposure',
  /publishable\s+key.*不是\s*secret|publishable.*not.*secret|公开仓库.*暴露|public.*repo.*expos/i.test(backendPlan2 || ''));
check('supabase/functions/README.md mentions publishable key exposure or push safety',
  /publishable\s+key.*不是\s*secret|publishable.*not.*secret|推送前.*安全|pre-commit.*secret|公开仓库.*暴露|push.*前.*检查/i.test(functionsReadme2 || ''));

// ---------------------------------------------------------------------------
// 8. Response contract checks (Phase 2 minimal contract)
// ---------------------------------------------------------------------------
console.log('\n--- Response contract: memory-update ---');
check('memory-update UpdateResponse has ok',
  /interface\s+UpdateResponse[\s\S]{0,500}\bok\b/.test(memUpdateTs) ||
  /ok\s*:\s*true/.test(memUpdateTs));
check('memory-update UpdateResponse has conversationUuid',
  /interface\s+UpdateResponse[\s\S]{0,500}\bconversationUuid\b/.test(memUpdateTs));
check('memory-update UpdateResponse has insertedFact',
  /interface\s+UpdateResponse[\s\S]{0,500}\binsertedFact\b/.test(memUpdateTs));
check('memory-update UpdateResponse has chapters',
  /interface\s+UpdateResponse[\s\S]{0,500}\bchapters\b/.test(memUpdateTs));
check('memory-update UpdateResponse has pinnedFacts',
  /interface\s+UpdateResponse[\s\S]{0,500}\bpinnedFacts\b/.test(memUpdateTs));
check('memory-update UpdateResponse has unresolvedThreads',
  /interface\s+UpdateResponse[\s\S]{0,500}\bunresolvedThreads\b/.test(memUpdateTs));

console.log('\n--- Response contract: memory-retrieve ---');
check('memory-retrieve RetrieveResponse has memoryText',
  /interface\s+RetrieveResponse[\s\S]{0,500}\bmemoryText\b/.test(memRetrieveTs));
check('memory-retrieve RetrieveResponse has selectedChapterIds',
  /interface\s+RetrieveResponse[\s\S]{0,500}\bselectedChapterIds\b/.test(memRetrieveTs));
check('memory-retrieve RetrieveResponse has selectedFactIds',
  /interface\s+RetrieveResponse[\s\S]{0,500}\bselectedFactIds\b/.test(memRetrieveTs));

// ---------------------------------------------------------------------------
// 9. Table write/read scope (Phase 2 minimal contract)
// ---------------------------------------------------------------------------
console.log('\n--- Table write/read scope ---');

// memory-update must NOT write to messages or story_chapters tables
check('memory-update does NOT write messages table',
  !/\.from\s*\(\s*['"]messages['"]\s*\)/.test(memUpdateTs));
check('memory-update does NOT write story_chapters table',
  !/\.from\s*\(\s*['"]story_chapters['"]\s*\)/.test(memUpdateTs));

// memory-retrieve must NOT query messages or story_chapters tables
check('memory-retrieve does NOT query messages table',
  !/\.from\s*\(\s*['"]messages['"]\s*\)/.test(memRetrieveTs));
check('memory-retrieve does NOT query story_chapters table',
  !/\.from\s*\(\s*['"]story_chapters['"]\s*\)/.test(memRetrieveTs));

// memory-update still writes to story_states and memory_facts
check('memory-update writes story_states table',
  /\.from\s*\(\s*['"]story_states['"]\s*\)/.test(memUpdateTs));
check('memory-update writes memory_facts table',
  /\.from\s*\(\s*['"]memory_facts['"]\s*\)/.test(memUpdateTs));

// memory-retrieve still queries only memory_facts (plus conversations for lookup)
check('memory-retrieve queries memory_facts table',
  /\.from\s*\(\s*['"]memory_facts['"]\s*\)/.test(memRetrieveTs));
check('memory-retrieve queries conversations table (for id lookup)',
  /\.from\s*\(\s*['"]conversations['"]\s*\)/.test(memRetrieveTs));

// ---------------------------------------------------------------------------
// 10. Migration ordering integrity
// ---------------------------------------------------------------------------
console.log('\n--- Migration ordering ---');
const migGrant = read('supabase/migrations/20260614171000_grant_service_role_memory_tables.sql');
const migUserProfiles = read('supabase/migrations/20260614172000_add_user_profiles.sql');

if (migGrant) {
  // 20260614171000 MUST NOT reference user_profiles (table created in 20260614172000)
  // Strip SQL comments before checking (-- ... lines)
  const migGrantNoComments = migGrant.replace(/^\s*--.*$/gm, '');
  check('mig 20260614171000 does NOT contain user_profiles',
    !/user_profiles/i.test(migGrantNoComments));
  check('mig 20260614171000 does NOT contain user_profiles GRANT',
    !/GRANT\s+SELECT.*ON\s+user_profiles\s+TO\s+service_role/i.test(migGrantNoComments));
} else {
  check('mig 20260614171000 does NOT contain user_profiles', false);
  check('mig 20260614171000 does NOT contain user_profiles GRANT', false);
}

if (migUserProfiles) {
  // 20260614172000 MUST contain the service_role grant for user_profiles
  check('mig 20260614172000 contains user_profiles GRANT',
    /GRANT\s+SELECT.*ON\s+user_profiles\s+TO\s+service_role/i.test(migUserProfiles));
} else {
  check('mig 20260614172000 contains user_profiles GRANT', false);
}

const genericMigrationOrder = validateProjectMigrationOrdering();
check('all migrations reference only current/prior project tables', genericMigrationOrder.ok);
if (!genericMigrationOrder.ok) {
  for (const failure of genericMigrationOrder.failures) {
    console.error('   ' + failure);
  }
}

// ---------------------------------------------------------------------------
// 11. Schema: user_profiles table
// ---------------------------------------------------------------------------
console.log('\n--- Schema: user_profiles ---');
const memSchemaSql = read('supabase/memory_schema.sql');
if (memSchemaSql) {
  check('schema: user_profiles table exists',
    /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+user_profiles/i.test(memSchemaSql));
  check('schema: user_profiles has avatar_url',
    /avatar_url\s+text\s+NOT\s+NULL/i.test(memSchemaSql));
  check('schema: user_profiles has profile_background_url',
    /profile_background_url\s+text\s+NOT\s+NULL/i.test(memSchemaSql));
  check('schema: user_profiles has personalization_json',
    /personalization_json\s+jsonb\s+NOT\s+NULL/i.test(memSchemaSql));

  // JSONB extension fields (2026-06-15)
  check('schema: user_profiles has schema_version',
    /schema_version\s+integer\s+NOT\s+NULL\s+DEFAULT\s+1/i.test(memSchemaSql));
  check('schema: user_profiles has public_profile_json',
    /public_profile_json\s+jsonb\s+NOT\s+NULL/i.test(memSchemaSql));
  check('schema: user_profiles has private_profile_json',
    /private_profile_json\s+jsonb\s+NOT\s+NULL/i.test(memSchemaSql));
  check('schema: user_profiles has ui_state_json',
    /ui_state_json\s+jsonb\s+NOT\s+NULL/i.test(memSchemaSql));
  check('schema: user_profiles has asset_settings_json',
    /asset_settings_json\s+jsonb\s+NOT\s+NULL/i.test(memSchemaSql));

  // No API key or secret columns in user_profiles
  const upMatch = memSchemaSql.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+user_profiles[\s\S]{0,2000}\)/i);
  const upDef = upMatch ? upMatch[0] : '';
  check('schema: user_profiles has NO api_key column',
    !/api_key/i.test(upDef));
  check('schema: user_profiles has NO provider_secret column',
    !/provider_secret|secret_key/i.test(upDef));

  check('schema: service_role grant includes user_profiles',
    /GRANT\s+SELECT.*ON\s+user_profiles\s+TO\s+service_role/i.test(memSchemaSql));
  check('schema: user_profiles has updated_at trigger',
    /trg_user_profiles_updated_at/i.test(memSchemaSql));
} else {
  check('schema: user_profiles table exists', false);
  check('schema: user_profiles has avatar_url', false);
  check('schema: user_profiles has profile_background_url', false);
  check('schema: user_profiles has personalization_json', false);
  check('schema: user_profiles has schema_version', false);
  check('schema: user_profiles has public_profile_json', false);
  check('schema: user_profiles has private_profile_json', false);
  check('schema: user_profiles has ui_state_json', false);
  check('schema: user_profiles has asset_settings_json', false);
  check('schema: user_profiles has NO api_key column', false);
  check('schema: user_profiles has NO provider_secret column', false);
  check('schema: service_role grant includes user_profiles', false);
  check('schema: user_profiles has updated_at trigger', false);
}

// ---------------------------------------------------------------------------
// 12. Schema doc integrity: memory_schema.sql vs migrations relationship
// ---------------------------------------------------------------------------
console.log('\n--- Schema doc integrity ---');

const backendPlan = read('BACKEND_MEMORY_PLAN.md');
const functionsReadme = read('supabase/functions/README.md');

// Check docs contain the correct terminology
if (backendPlan) {
  check('BACKEND_MEMORY_PLAN.md mentions "完整参考 schema" or equivalent',
    /完整参考\s*schema|当前完整\s*schema|canonical\s+reference\s+schema/i.test(backendPlan));
  check('BACKEND_MEMORY_PLAN.md mentions incremental migration approach',
    /增量\s*migration|增量执行|按时间戳.*执行|二选一/i.test(backendPlan));
  // Must NOT claim old base migration is kept in sync with memory_schema.sql
  check('BACKEND_MEMORY_PLAN.md does NOT claim base migration is synced from memory_schema.sql',
    !/内容从.*memory_schema\.sql.*复制|两边要同步更新|BOTH files must be updated in sync/i.test(backendPlan));
  // Must have deployment path guidance
  check('BACKEND_MEMORY_PLAN.md has two-path deployment guidance',
    /二选一|不要混用|路径\s*A|路径\s*B|SQL\s*Editor.*完整|CLI.*migration/i.test(backendPlan));
} else {
  check('BACKEND_MEMORY_PLAN.md exists', false);
}

if (functionsReadme) {
  check('supabase/functions/README.md mentions "完整参考 schema" or equivalent',
    /完整参考\s*schema|当前完整\s*schema|complete\s+reference\s+schema/i.test(functionsReadme));
  check('supabase/functions/README.md mentions incremental migration approach',
    /增量\s*migration|增量执行|按时间戳顺序|migrations.*增量/i.test(functionsReadme));
  // Must NOT claim old base migration contents are synced from memory_schema.sql
  check('supabase/functions/README.md does NOT claim base migration is synced from memory_schema.sql',
    !/内容从\s*memory_schema\.sql\s*同步|内容从.*memory_schema.*复制/i.test(functionsReadme));
  // Must have deployment path guidance
  check('supabase/functions/README.md has two-path deployment guidance',
    /二选一|不要混用|路径\s*A|路径\s*B|SQL\s*Editor.*完整|CLI.*migration/i.test(functionsReadme));
} else {
  check('supabase/functions/README.md exists', false);
}

// Verify base migration header file exists (don't modify it, just confirm it exists)
const baseMig = read('supabase/migrations/20260612130000_create_memory_schema.sql');
check('base migration 20260612130000 exists', baseMig !== null);
if (baseMig) {
  check('base migration does NOT claim "BOTH files must be updated in sync"',
    !/BOTH files must be updated in sync/i.test(baseMig));
  check('base migration does NOT claim "CLI-compatible copy"',
    !/CLI-compatible copy/i.test(baseMig));
  check('base migration says "历史基础 migration" or "initial schema snapshot"',
    /历史基础\s*migration|初始.*schema.*快照|initial schema snapshot|historical base migration/i.test(baseMig));
} else {
  check('base migration does NOT claim "BOTH files must be updated in sync"', false);
  check('base migration does NOT claim "CLI-compatible copy"', false);
  check('base migration says "历史基础 migration" or "initial schema snapshot"', false);
}

// ---------------------------------------------------------------------------
// 13. Release readiness script
// ---------------------------------------------------------------------------
console.log('\n--- Release readiness script ---');

const releaseReadinessScript = read('_check_release_readiness.mjs');
check('_check_release_readiness.mjs exists', releaseReadinessScript !== null && releaseReadinessScript !== '');

if (releaseReadinessScript) {
  check('_check_release_readiness.mjs runs git status --short',
    /git\s+status\s+--short/.test(releaseReadinessScript));
  check('_check_release_readiness.mjs runs git ls-files supabase/.temp',
    /git\s+ls-files\s+supabase\/\.temp/.test(releaseReadinessScript));
  check('_check_release_readiness.mjs checks SUPABASE_SERVICE_ROLE_KEY',
    /SUPABASE_SERVICE_ROLE_KEY/.test(releaseReadinessScript));
  check('_check_release_readiness.mjs checks publishable key',
    /publishable\s+key|publishableKey|PUBLISHABLE/.test(releaseReadinessScript));
  check('_check_release_readiness.mjs is read-only (no stage/commit/push)',
    /READ-ONLY|read.only|does not stage|does NOT stage|no.*write/i.test(releaseReadinessScript));
} else {
  check('_check_release_readiness.mjs runs git status --short', false);
  check('_check_release_readiness.mjs runs git ls-files supabase/.temp', false);
  check('_check_release_readiness.mjs checks SUPABASE_SERVICE_ROLE_KEY', false);
  check('_check_release_readiness.mjs checks publishable key', false);
  check('_check_release_readiness.mjs is read-only (no stage/commit/push)', false);
}

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
  const omniJs = html.match(/<script>([\s\S]*?)<\/script>/);
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
