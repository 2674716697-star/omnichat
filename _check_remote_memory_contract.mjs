// _check_remote_memory_contract.mjs
// =============================================================================
// Remote-memory contract check script.
// Node ESM, zero npm dependencies.
//
// DEFAULT MODE (no env var set):
//   node _check_remote_memory_contract.mjs
//   → Checks local source code contract only.  No network requests.
//
// REMOTE MODE:
//   $env:RUN_REMOTE_MEMORY_CONTRACT='1'; node _check_remote_memory_contract.mjs
//   → Also POSTs to the remote endpoint.  Writes one test conversation/fact.
//
// Optional override: $env:REMOTE_MEMORY_ENDPOINT='https://...'
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function read(p) {
  const full = path.resolve(__dirname, p);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

let failed = false;

function check(label, ok) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failed = true;
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
  const fullDir = path.resolve(__dirname, dir);
  if (!fs.existsSync(fullDir)) {
    return { ok: false, failures: [`${dir} does not exist`] };
  }

  const files = fs.readdirSync(fullDir)
    .filter((name) => /\.sql$/i.test(name))
    .sort();
  const createdBefore = new Set();
  const failures = [];

  for (const file of files) {
    const sql = stripSqlComments(read(`${dir}/${file}`) || '');
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

// ---------------------------------------------------------------------------
// 1. Source-code contract checks (always run)
// ---------------------------------------------------------------------------

console.log('='.repeat(60));
console.log('Remote Memory Contract Check');
console.log('='.repeat(60));

const mk = 'Remote Memory/Auth Contract';
console.log(`\n--- ${mk}: Source checks ---`);

// --- 1a. Edge function source files exist ---
const updatePath = 'supabase/functions/memory-update/index.ts';
const retrievePath = 'supabase/functions/memory-retrieve/index.ts';
const memUpdateTs = read(updatePath);
const memRetrieveTs = read(retrievePath);

check(`File exists: ${updatePath}`, memUpdateTs !== null);
check(`File exists: ${retrievePath}`, memRetrieveTs !== null);

if (!memUpdateTs || !memRetrieveTs) {
  console.error('\n❌ Cannot read edge function sources.  Aborting contract check.');
  process.exit(1);
}

// --- 1b. CORS Allow-Headers ---
function verifyCorsHeaders(source, label) {
  const match = source.match(/Access-Control-Allow-Headers["']?\s*:\s*["']([^"']+)["']/);
  if (!match) {
    check(`${label} CORS Allow-Headers declared`, false);
    return;
  }
  const h = match[1];
  check(`${label} CORS: Content-Type`, /Content-Type/i.test(h));
  check(`${label} CORS: Authorization`, /Authorization/i.test(h));
  check(`${label} CORS: apikey`, /apikey/i.test(h));
}

verifyCorsHeaders(memUpdateTs, 'memory-update');
verifyCorsHeaders(memRetrieveTs, 'memory-retrieve');

// --- 1c. Both have getOptionalAuthUserId ---
check('memory-update has getOptionalAuthUserId',
  /(?:async\s+)?function\s+getOptionalAuthUserId/.test(memUpdateTs));
check('memory-retrieve has getOptionalAuthUserId',
  /(?:async\s+)?function\s+getOptionalAuthUserId/.test(memRetrieveTs));

// --- 1d. update specifics ---
check('memory-update has resolveConversationOwnership',
  /(?:async\s+)?function\s+resolveConversationOwnership/.test(memUpdateTs));

// Conversation create must use .insert(), not .upsert()
check('memory-update conversation create uses .insert()',
  /\.from\s*\(\s*["']conversations["']\s*\)[\s\S]{0,350}\.insert\s*\(/.test(memUpdateTs));
check('memory-update conversation create does NOT use .upsert()',
  !/\.from\s*\(\s*["']conversations["']\s*\)[\s\S]{0,350}\.upsert\s*\(/.test(memUpdateTs));

// Conditional claim must use .is("user_id", null)
check('memory-update has .is("user_id", null) claim',
  /\.is\s*\(\s*['"]user_id['"]\s*,\s*null\s*\)/.test(memUpdateTs));

// Malformed Authorization → 401
check('memory-update malformed auth → 401',
  /if\s*\(\s*!token\s*\)[\s\S]{0,150}jsonAuthError\s*\(\s*401/.test(memUpdateTs));

// --- 1e. retrieve specifics ---
check('memory-retrieve has emptyResult helper',
  /function\s+emptyResult/.test(memRetrieveTs));

// Unauthenticated request on an owned row → emptyResult (not 403)
check('memory-retrieve owned-row + anonymous → emptyResult',
  /rowUserId\s*!==\s*null/.test(memRetrieveTs) &&
  /return\s+emptyResult\s*\(\s*\)/.test(memRetrieveTs));

// Malformed Authorization → 401
check('memory-retrieve malformed auth → 401',
  /if\s*\(\s*!token\s*\)[\s\S]{0,150}jsonAuthError\s*\(\s*401/.test(memRetrieveTs));

// No conversation → emptyResult
check('memory-retrieve no conversation → emptyResult',
  /!\s*conv/.test(memRetrieveTs) &&
  /emptyResult\s*\(\s*\)/.test(memRetrieveTs));

// --- 1f. Migration ordering integrity ---
const migGrant = read('supabase/migrations/20260614171000_grant_service_role_memory_tables.sql');
const migUserProfiles = read('supabase/migrations/20260614172000_add_user_profiles.sql');

if (migGrant) {
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

// --- 1g. Schema: user_profiles table ---
const schemaSql = read('supabase/memory_schema.sql');
if (schemaSql) {
  check('schema: user_profiles table exists',
    /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+user_profiles/i.test(schemaSql));
  check('schema: user_profiles has avatar_url',
    /avatar_url\s+text\s+NOT\s+NULL/i.test(schemaSql));
  check('schema: user_profiles has profile_background_url',
    /profile_background_url\s+text\s+NOT\s+NULL/i.test(schemaSql));
  check('schema: user_profiles has personalization_json',
    /personalization_json\s+jsonb\s+NOT\s+NULL/i.test(schemaSql));

  // JSONB extension fields (2026-06-15)
  check('schema: user_profiles has schema_version',
    /schema_version\s+integer\s+NOT\s+NULL\s+DEFAULT\s+1/i.test(schemaSql));
  check('schema: user_profiles has public_profile_json',
    /public_profile_json\s+jsonb\s+NOT\s+NULL/i.test(schemaSql));
  check('schema: user_profiles has private_profile_json',
    /private_profile_json\s+jsonb\s+NOT\s+NULL/i.test(schemaSql));
  check('schema: user_profiles has ui_state_json',
    /ui_state_json\s+jsonb\s+NOT\s+NULL/i.test(schemaSql));
  check('schema: user_profiles has asset_settings_json',
    /asset_settings_json\s+jsonb\s+NOT\s+NULL/i.test(schemaSql));

  // No API key or secret columns in user_profiles (check broader range for new fields)
  const upDef = schemaSql.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+user_profiles[\s\S]{0,2000}\)/i)?.[0] || '';
  check('schema: user_profiles has NO api_key column',
    !/api_key/i.test(upDef));
  check('schema: user_profiles has NO provider_secret column',
    !/provider_secret|secret_key/i.test(upDef));

  check('schema: service_role grant includes user_profiles',
    /GRANT\s+SELECT.*ON\s+user_profiles\s+TO\s+service_role/i.test(schemaSql));
  check('schema: user_profiles has updated_at trigger',
    /trg_user_profiles_updated_at/i.test(schemaSql));
  // Migration file exists
  const upMig = read('supabase/migrations/20260614172000_add_user_profiles.sql');
  check('migration: 20260614172000_add_user_profiles.sql exists', upMig !== null);
  if (upMig) {
    check('migration: idempotent (IF NOT EXISTS)',
      /IF\s+NOT\s+EXISTS/i.test(upMig));
    check('migration: includes service_role grant',
      /GRANT\s+SELECT.*ON\s+user_profiles\s+TO\s+service_role/i.test(upMig));
    // JSONB extension fields in migration
    check('migration: has schema_version',
      /schema_version\s+integer\s+NOT\s+NULL\s+DEFAULT\s+1/i.test(upMig));
    check('migration: has public_profile_json',
      /public_profile_json\s+jsonb\s+NOT\s+NULL/i.test(upMig));
    check('migration: has private_profile_json',
      /private_profile_json\s+jsonb\s+NOT\s+NULL/i.test(upMig));
    check('migration: has ui_state_json',
      /ui_state_json\s+jsonb\s+NOT\s+NULL/i.test(upMig));
    check('migration: has asset_settings_json',
      /asset_settings_json\s+jsonb\s+NOT\s+NULL/i.test(upMig));
    // No API key or secret in migration
    const upMigDef = upMig.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+user_profiles[\s\S]{0,2000}\)/i)?.[0] || '';
    check('migration: has NO api_key column',
      !/api_key/i.test(upMigDef));
    check('migration: has NO provider_secret column',
      !/provider_secret|secret_key/i.test(upMigDef));
  }
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

// --- 1h. Response contract checks (Phase 2 minimal contract) ---
console.log(`\n--- ${mk}: Response contract ---`);

// memory-update UpdateResponse must contain: ok, conversationUuid, insertedFact,
// chapters, pinnedFacts, unresolvedThreads
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

// memory-retrieve RetrieveResponse must contain: memoryText, selectedChapterIds,
// selectedFactIds
check('memory-retrieve RetrieveResponse has memoryText',
  /interface\s+RetrieveResponse[\s\S]{0,500}\bmemoryText\b/.test(memRetrieveTs));
check('memory-retrieve RetrieveResponse has selectedChapterIds',
  /interface\s+RetrieveResponse[\s\S]{0,500}\bselectedChapterIds\b/.test(memRetrieveTs));
check('memory-retrieve RetrieveResponse has selectedFactIds',
  /interface\s+RetrieveResponse[\s\S]{0,500}\bselectedFactIds\b/.test(memRetrieveTs));

// --- 1i. Table write/read scope (Phase 2 minimal contract) ---
console.log(`\n--- ${mk}: Table write/read scope ---`);

// memory-update must NOT write to messages or story_chapters tables.
// This is intentional — avoids half-baked remote sync polluting data.
check('memory-update does NOT write messages table',
  !/\.from\s*\(\s*['"]messages['"]\s*\)/.test(memUpdateTs));
check('memory-update does NOT write story_chapters table',
  !/\.from\s*\(\s*['"]story_chapters['"]\s*\)/.test(memUpdateTs));

// memory-retrieve must NOT query messages or story_chapters tables.
check('memory-retrieve does NOT query messages table',
  !/\.from\s*\(\s*['"]messages['"]\s*\)/.test(memRetrieveTs));
check('memory-retrieve does NOT query story_chapters table',
  !/\.from\s*\(\s*['"]story_chapters['"]\s*\)/.test(memRetrieveTs));

// memory-update still writes to story_states and memory_facts.
check('memory-update writes story_states table',
  /\.from\s*\(\s*['"]story_states['"]\s*\)/.test(memUpdateTs));
check('memory-update writes memory_facts table',
  /\.from\s*\(\s*['"]memory_facts['"]\s*\)/.test(memUpdateTs));

// memory-retrieve still queries only memory_facts (plus conversations for lookup).
check('memory-retrieve queries memory_facts table',
  /\.from\s*\(\s*['"]memory_facts['"]\s*\)/.test(memRetrieveTs));
check('memory-retrieve queries conversations table (for id lookup)',
  /\.from\s*\(\s*['"]conversations['"]\s*\)/.test(memRetrieveTs));

// --- 1j. Remote mode default-skip verification ---
console.log(`\n--- ${mk}: Remote mode safety ---`);

// Verify the remote mode guard: RUN_REMOTE_MEMORY_CONTRACT must be explicitly
// set to '1' for any network requests to be sent.  Default (no env var) must
// skip all remote tests.
const selfSource = read('_check_remote_memory_contract.mjs');
if (selfSource) {
  check('remote mode guarded by RUN_REMOTE_MEMORY_CONTRACT',
    /process\.env\.RUN_REMOTE_MEMORY_CONTRACT\s*===\s*['"]1['"]/.test(selfSource));
  check('remote mode defaults to skip (no env = no POST)',
    /const\s+runRemote\s*=\s*process\.env\.RUN_REMOTE_MEMORY_CONTRACT\s*===\s*['"]1['"]/.test(selfSource));
  check('remote mode shows SKIPPED message when off',
    /REMOTE TESTS SKIPPED/.test(selfSource));
}

// Also verify this script itself is not accidentally being run in remote mode.
// The env var check is above (lines 332-339); this assertion double-checks it.
check('RUN_REMOTE_MEMORY_CONTRACT env var is not set accidentally',
  typeof process.env.RUN_REMOTE_MEMORY_CONTRACT === 'undefined' ||
  process.env.RUN_REMOTE_MEMORY_CONTRACT === '1');

// --- 1k. Schema doc integrity: memory_schema.sql vs migrations relationship ---
console.log(`\n--- ${mk}: Schema doc integrity ---`);

const backendPlan = read('BACKEND_MEMORY_PLAN.md');
const functionsReadme = read('supabase/functions/README.md');

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

// Base migration header content check
const baseMig = read('supabase/migrations/20260612130000_create_memory_schema.sql');
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
// 2. Frontend contract checks
// ---------------------------------------------------------------------------

console.log(`\n--- ${mk}: Frontend checks ---`);

const scriptJs = read('script.js');
if (!scriptJs) {
  console.error('\n❌ Cannot read script.js.  Aborting frontend contract check.');
  process.exit(1);
}

// --- 2a. buildRemoteMemoryHeaders exists ---
const brmhIdx = scriptJs.search(/async\s+function\s+buildRemoteMemoryHeaders\s*\(/);
check('buildRemoteMemoryHeaders exists in script.js', brmhIdx !== -1);

// --- 2b. Extract function body ---
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

if (brmhIdx !== -1) {
  const brmhBody = extractBraceBlock(scriptJs, brmhIdx);
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

    // When no token → only Content-Type, no Authorization, no apikey
    check('Authorization NOT set before if(token) guard',
      !/headers\s*\[\s*['"]Authorization['"]\s*\]\s*=/.test(beforeGuard) &&
      !/headers\s*\.\s*Authorization\s*=/.test(beforeGuard));

    // apikey must appear inside the if(token) block
    check('apikey set inside if(token) block',
      /headers\s*\[\s*['"]apikey['"]\s*\]\s*=/.test(afterGuard));

    // Authorization must appear inside the if(token) block
    check('Authorization set inside if(token) block',
      /headers\s*\[\s*['"]Authorization['"]\s*\]\s*=/.test(afterGuard));
  }
} else {
  check('buildRemoteMemoryHeaders has if(token) guard', false);
  check('apikey NOT set before if(token) guard', false);
  check('Authorization NOT set before if(token) guard', false);
  check('apikey set inside if(token) block', false);
  check('Authorization set inside if(token) block', false);
}

// --- 2c. await buildRemoteMemoryHeaders() used at least twice ---
const brmhCallCount = (scriptJs.match(/await\s+buildRemoteMemoryHeaders\s*\(\s*\)/g) || []).length;
check('await buildRemoteMemoryHeaders() used 2+ times', brmhCallCount >= 2);

// --- 2d. Runtime config helper (Phase 1.2) ---
check('getRuntimeConfigValue exists in script.js',
  /function\s+getRuntimeConfigValue\s*\(/.test(scriptJs));
check('getRuntimeConfigValue reads window.__MIRA_CONFIG__',
  /window\s*\.\s*__MIRA_CONFIG__/.test(scriptJs));
check('getRuntimeConfigValue reads meta[name="mira:..."]',
  /meta\s*\[\s*['"]name['"]\s*\]\s*=\s*=?\s*['"]mira:/.test(scriptJs) ||
  /mira:\s*['"][)\]]?\s*\+/.test(scriptJs));

// --- 2e. getSupabaseClient uses runtime config ---
const gscIdx = scriptJs.search(/function\s+getSupabaseClient\s*\(/);
if (gscIdx !== -1) {
  const gscBody = extractBraceBlock(scriptJs, gscIdx);
  check('getSupabaseClient calls getRuntimeConfigValue',
    /getRuntimeConfigValue\s*\(/.test(gscBody));
}

// --- 2f. buildRemoteMemoryHeaders uses runtime config ---
if (brmhIdx !== -1) {
  const brmhBody = extractBraceBlock(scriptJs, brmhIdx);
  check('buildRemoteMemoryHeaders uses runtime publishable key',
    /getRuntimeConfigValue\s*\(/.test(brmhBody));
}

// ---------------------------------------------------------------------------
// 3. No hardcoded secrets
// ---------------------------------------------------------------------------

console.log(`\n--- ${mk}: Secret hygiene ---`);
const allSrc = (memUpdateTs + memRetrieveTs + scriptJs);
check('no sb_secret hardcoded', !/sb_secret/.test(allSrc));
check('no p9zhINZ hardcoded', !/p9zhINZ/.test(allSrc));
check('no service_role JWT hardcoded', !/service_role\s*['"`][\w-]+\.[\w-]+\.[\w-]+/.test(allSrc));
check('no SUPABASE_SERVICE_ROLE_KEY= hardcoded secret',
  !/SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"`]eyJ/.test(allSrc) &&
  !/SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"`]sb_/.test(allSrc));

// ---------------------------------------------------------------------------
// 3b. Pre-commit hygiene (gitignore + git tracking + doc checks)
// ---------------------------------------------------------------------------

console.log(`\n--- ${mk}: Pre-commit hygiene ---`);

// .gitignore must contain supabase/.temp/
const gitignore = read('.gitignore');
check('.gitignore contains supabase/.temp/',
  gitignore !== null && /supabase\/\.temp\//.test(gitignore));

// Git must not track any files under supabase/.temp
try {
  const tracked = execSync('git ls-files supabase/.temp', { encoding: 'utf8', stdio: 'pipe' }).trim();
  check('no tracked files under supabase/.temp', tracked === '');
  if (tracked !== '') {
    console.error('   TRACKED FILES: ' + tracked.replace(/\n/g, ', '));
  }
} catch (e) {
  check('no tracked files under supabase/.temp (git accessible)', false);
  console.error('   git ls-files failed: ' + (e.stderr || e.message || '').replace(/\n/g, ' '));
}

// Publishable key exposure documented in README/plan (uses vars from 1k above)
check('BACKEND_MEMORY_PLAN.md: publishable key exposure acknowledged',
  /publishable\s+key.*不是\s*secret|publishable.*not.*secret|公开仓库.*暴露|public.*repo.*expos/i.test(backendPlan || ''));
check('supabase/functions/README.md: push safety or publishable key documented',
  /publishable\s+key.*不是\s*secret|publishable.*not.*secret|推送前.*安全|pre-commit.*secret|公开仓库.*暴露|push.*前.*检查/i.test(functionsReadme || ''));

// ---------------------------------------------------------------------------
// 4. Remote mode (only when RUN_REMOTE_MEMORY_CONTRACT=1)
// ---------------------------------------------------------------------------

const runRemote = process.env.RUN_REMOTE_MEMORY_CONTRACT === '1';

if (runRemote) {
  console.log(`\n--- ${mk}: Remote checks ---`);
} else {
  console.log(`\n--- ${mk}: REMOTE TESTS SKIPPED ---`);
  console.log('To enable remote tests, set:');
  console.log('  PowerShell: $env:RUN_REMOTE_MEMORY_CONTRACT="1"; node _check_remote_memory_contract.mjs');
  console.log('  Bash:       RUN_REMOTE_MEMORY_CONTRACT=1 node _check_remote_memory_contract.mjs');
  console.log('');
  console.log('Remote mode will POST test data to the endpoint.');
  console.log('Optional: $env:REMOTE_MEMORY_ENDPOINT="https://..." to override the default URL.');
}

if (runRemote) {
  const endpointBase = process.env.REMOTE_MEMORY_ENDPOINT ||
    'https://lazsvokcrbykzjgzegpq.supabase.co/functions/v1';

  const updateUrl = `${endpointBase}/memory-update`;
  const retrieveUrl = `${endpointBase}/memory-retrieve`;

  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const conversationId = `contract-${ts}-${rand}`;
  const testContent = `Contract test run at ${new Date(ts).toISOString()}`;

  console.log(`  endpoint : ${endpointBase}`);
  console.log(`  conv id  : ${conversationId}`);
  console.log('');

  let remoteFailed = false;

  // --- 4a. POST /memory-update (personal mode, Content-Type only) ---
  console.log('[1/3] POST memory-update (personal mode)...');
  try {
    const res1 = await fetch(updateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        storyContent: testContent,
      }),
    });
    const json1 = await res1.json();
    check(`memory-update personal mode → 200 (got ${res1.status})`, res1.status === 200);
    check(`memory-update personal mode → ok:true`, json1 && json1.ok === true);
    if (res1.status !== 200 || !json1 || json1.ok !== true) {
      remoteFailed = true;
      console.error('   Response:', JSON.stringify(json1).slice(0, 200));
    }
  } catch (e) {
    check('memory-update personal mode → no network error', false);
    console.error('   Error:', e.message);
    remoteFailed = true;
  }

  // --- 4b. POST /memory-retrieve (personal mode, Content-Type only) ---
  console.log('[2/3] POST memory-retrieve (personal mode)...');

  // Small delay to let DB write settle (async + eventual consistency on free tier)
  if (!remoteFailed) {
    await sleep(1000);
  }

  try {
    const res2 = await fetch(retrieveUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        userText: 'contract check',
        budget: 2000,
      }),
    });
    const json2 = await res2.json();
    check(`memory-retrieve personal mode → 200 (got ${res2.status})`, res2.status === 200);

    const memText = (json2 && typeof json2.memoryText === 'string') ? json2.memoryText : '';
    check('memory-retrieve personal mode → has memoryText field',
      json2 && typeof json2.memoryText === 'string');
    check('memory-retrieve personal mode → memoryText contains test content',
      memText.includes('Contract test'));

    if (res2.status !== 200) {
      remoteFailed = true;
      console.error('   Response:', JSON.stringify(json2).slice(0, 200));
    }
  } catch (e) {
    check('memory-retrieve personal mode → no network error', false);
    console.error('   Error:', e.message);
    remoteFailed = true;
  }

  // --- 4c. POST /memory-update with malformed Authorization ---
  console.log('[3/3] POST memory-update (malformed Authorization)...');
  let authHardeningDeployed = true;
  try {
    const res3 = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer malformed-token',
      },
      body: JSON.stringify({
        conversationId: `${conversationId}-auth-test`,
        storyContent: 'auth hardening test',
      }),
    });
    if (res3.status === 401) {
      check('memory-update malformed auth → 401 (hardening deployed)', true);
    } else if (res3.status === 200) {
      check('memory-update malformed auth → 401 (hardening deployed)', false);
      authHardeningDeployed = false;
    } else {
      check(`memory-update malformed auth → 401 (got ${res3.status})`, false);
    }
  } catch (e) {
    check('memory-update malformed auth → 401 (hardening deployed)', false);
    console.error('   Error:', e.message);
    authHardeningDeployed = false;
  }

  if (!authHardeningDeployed) {
    console.warn('');
    console.warn('⚠  WARN: remote auth hardening may not be deployed.');
    console.warn('   malformed Authorization did NOT return 401.');
    console.warn('   This is expected if the remote has not deployed Phase 1.1 yet.');
    console.warn('   This does NOT fail the contract check.');
    // Don't set remoteFailed — this is advisory only
  }

  if (remoteFailed) {
    failed = true;
  }

  console.log(`\n--- ${mk}: Remote test data written ---`);
  console.log(`  conversationId: ${conversationId}`);
  console.log('  This test data can be left in the DB; it is self-identifying (prefix: contract-).');
}

// ---------------------------------------------------------------------------
// 4.5 Release readiness script
// ---------------------------------------------------------------------------

console.log(`\n--- ${mk}: Release readiness script ---`);

const releaseReadinessScript = read('_check_release_readiness.mjs');
check('_check_release_readiness.mjs exists',
  releaseReadinessScript !== null && releaseReadinessScript !== '');

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

// ---------------------------------------------------------------------------
// 5. Final result
// ---------------------------------------------------------------------------

console.log('\n' + '='.repeat(60));
if (failed) {
  console.error('\n❌ REMOTE MEMORY CONTRACT CHECK FAILED');
  process.exit(1);
}
console.log('\n✅ REMOTE MEMORY CONTRACT CHECK PASSED');

// ---------------------------------------------------------------------------
// Util
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
