// _check_release_readiness.mjs
// =============================================================================
// Read-only pre-commit / pre-push summary check.
// Zero npm dependencies, Node ESM.
//
// Usage:
//   node _check_release_readiness.mjs
//
// What it does:
//   1. Reads git status --short, groups uncommitted changes by category.
//   2. Checks git ls-files supabase/.temp is empty.
//   3. Checks .gitignore contains supabase/.temp/.
//   4. Scans text source files for obvious real secrets.
//   5. Checks RUN_REMOTE_MEMORY_CONTRACT env var.
//   6. Warns if Supabase project URL / publishable key defaults are present.
//
// Output: PASS / FAIL / WARN with clear summary.
//
// This script is READ-ONLY: it never stages, commits, pushes, or writes
// any file. It also never sends network requests.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let exitCode = 0;
const warnings = [];

function ok(msg) {
  console.log(`  [OK] ${msg}`);
}

function fail(msg) {
  console.log(`  [FAIL] ${msg}`);
  exitCode = 1;
}

function warn(msg) {
  console.log(`  [WARN] ${msg}`);
  warnings.push(msg);
}

function info(msg) {
  console.log(`  [INFO] ${msg}`);
}

function read(p) {
  const full = path.resolve(__dirname, p);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

function parseStatusPath(line) {
  // git status --short format is "XY path" or "XY old -> new".
  // Preserve dotfile names such as ".gitignore".
  const raw = line.length > 3 ? line.slice(3) : '';
  const pathPart = raw.trim();
  if (!pathPart) return '';
  const renameParts = pathPart.split(' -> ');
  return renameParts[renameParts.length - 1].trim();
}

function countLines(content, index) {
  let count = 1;
  for (let i = 0; i < index; i++) {
    if (content[i] === '\n') count++;
  }
  return count;
}

console.log('='.repeat(60));
console.log('Release Readiness Check');
console.log('='.repeat(60));

console.log('\n--- 1. Uncommitted changes grouping ---');

let statusOutput = '';
try {
  statusOutput = execSync('git status --short', { encoding: 'utf8', stdio: 'pipe' }).replace(/\s+$/g, '');
} catch (e) {
  fail(`git status --short failed: ${(e.stderr || e.message || '').replace(/\n/g, ' ').slice(0, 200)}`);
  console.log('\n[FAIL] RELEASE READINESS: FAIL (git unavailable)');
  process.exit(1);
}

if (!statusOutput) {
  ok('No uncommitted changes; clean working tree');
} else {
  const lines = statusOutput.split(/\r?\n/).filter(Boolean);
  info(`${lines.length} uncommitted change(s) found`);

  const groups = {
    'Frontend/UI': [],
    'Backend/Supabase': [],
    'Checks/Docs': [],
    'Other/Unknown': [],
  };

  for (const line of lines) {
    const filepath = parseStatusPath(line);
    const ext = path.extname(filepath).toLowerCase();
    const base = path.basename(filepath);
    const dir = filepath.replace(/\\/g, '/');

    if (
      ext === '.html' || ext === '.css' ||
      base === 'script.js' || base === 'sw.js' ||
      (dir.startsWith('src/') && base !== '01_constants.js')
    ) {
      groups['Frontend/UI'].push(filepath);
    } else if (
      dir.startsWith('supabase/') ||
      base === '01_constants.js'
    ) {
      groups['Backend/Supabase'].push(filepath);
    } else if (
      base.startsWith('_check_') || base === '_build_script.js' ||
      ext === '.md' || base === '.gitignore' || base === 'CLAUDE.md'
    ) {
      groups['Checks/Docs'].push(filepath);
    } else {
      groups['Other/Unknown'].push(filepath);
    }
  }

  for (const [group, files] of Object.entries(groups)) {
    if (files.length > 0) {
      console.log(`\n  [${group}] (${files.length} file(s)):`);
      for (const f of files) {
        console.log(`    ${f}`);
      }
    }
  }

  info('Review groupings above to decide whether to split commits.');
  info('This script does NOT stage, commit, or push.');
}

console.log('\n--- 2. supabase/.temp/ tracking check ---');

try {
  const tracked = execSync('git ls-files supabase/.temp', { encoding: 'utf8', stdio: 'pipe' }).trim();
  if (tracked === '') {
    ok('No tracked files under supabase/.temp/');
  } else {
    fail('TRACKED files found under supabase/.temp/:');
    for (const f of tracked.split(/\r?\n/).filter(Boolean)) {
      console.log(`      ${f}`);
    }
    console.log('   Fix: git rm --cached supabase/.temp/*');
  }
} catch (e) {
  fail(`git ls-files failed: ${(e.stderr || e.message || '').replace(/\n/g, ' ').slice(0, 200)}`);
}

console.log('\n--- 3. .gitignore check ---');

const gitignore = read('.gitignore');
if (gitignore === null) {
  fail('.gitignore file not found');
} else if (/supabase\/\.temp\//.test(gitignore)) {
  ok('.gitignore contains supabase/.temp/');
} else {
  fail('.gitignore does NOT contain supabase/.temp/');
}

console.log('\n--- 4. Secret hygiene scan ---');

const TEXT_EXTS = new Set([
  '.js', '.mjs', '.ts', '.html', '.css', '.sql', '.json', '.md', '.yml', '.yaml',
  '.txt', '.toml', '.cfg', '.ini', '.env', '.gitignore',
]);

function isTextFile(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  if (TEXT_EXTS.has(ext)) return true;
  const base = path.basename(filepath);
  return base === '.gitignore' || base === 'CLAUDE.md' || base === 'Dockerfile' || base === 'Makefile';
}

function collectTextFiles(dir, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(__dirname, full).replace(/\\/g, '/');
    const skipDir = entry.isDirectory() && (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === '.next' ||
      entry.name === '.cache' ||
      entry.name === 'dist' ||
      rel === 'supabase/.temp' ||
      rel.startsWith('supabase/.temp/')
    );
    if (skipDir) continue;

    if (entry.isDirectory()) {
      collectTextFiles(full, files);
    } else if (entry.isFile() && isTextFile(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const allTextFiles = collectTextFiles(__dirname);

const HARD_SECRETS = [
  { pattern: 'sb_secret', label: 'sb_secret' },
  { pattern: 'p9zhINZ', label: 'p9zhINZ' },
];

function isSearchPatternContext(line, pattern) {
  if (new RegExp(`/${pattern}/`).test(line)) return true;
  if (new RegExp(`pattern\\s*:\\s*['"\`]${pattern}['"\`]`).test(line)) return true;
  if (/\.test\(/.test(line) && line.includes(pattern)) return true;
  if (/\bno\s+.*hardcoded\b/i.test(line) && line.includes(pattern)) return true;
  if (/无|没有|硬编码|密钥|secret/i.test(line) && line.includes(pattern)) return true;
  return false;
}

for (const secret of HARD_SECRETS) {
  let foundAny = false;
  for (const fp of allTextFiles) {
    const rel = path.relative(__dirname, fp).replace(/\\/g, '/');
    if (rel === '_check_release_readiness.mjs') continue;
    const content = read(rel);
    if (!content) continue;
    if (content.includes(secret.pattern)) {
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(secret.pattern)) {
          if (isSearchPatternContext(lines[i], secret.pattern)) continue;
          console.log(`  [FAIL] ${rel}:${i + 1} contains "${secret.pattern}"`);
          foundAny = true;
        }
      }
    }
  }
  if (foundAny) {
    fail(`Hardcoded "${secret.label}" found in source files`);
  } else {
    ok(`No "${secret.label}" found`);
  }
}

const SRK_ASSIGN_RE = /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"`](eyJ|sb_)/g;

{
  let foundSrk = false;
  for (const fp of allTextFiles) {
    const rel = path.relative(__dirname, fp).replace(/\\/g, '/');
    const content = read(rel);
    if (!content) continue;

    SRK_ASSIGN_RE.lastIndex = 0;
    const matches = [...content.matchAll(SRK_ASSIGN_RE)];
    for (const m of matches) {
      const lineStart = content.lastIndexOf('\n', m.index) + 1;
      const lineEnd = content.indexOf('\n', m.index);
      const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);

      if (/Deno\.env\.get\s*\(/.test(line)) continue;

      console.log(`  [FAIL] ${rel}:${countLines(content, m.index)} hardcoded SUPABASE_SERVICE_ROLE_KEY value`);
      foundSrk = true;
    }
  }

  if (foundSrk) {
    fail('SUPABASE_SERVICE_ROLE_KEY hardcoded value found');
  } else {
    ok('No SUPABASE_SERVICE_ROLE_KEY hardcoded value');
  }
}

const MODEL_KEY_PREFIXES = [
  { prefix: 'sk-proj-', label: 'OpenAI project key (sk-proj-...)' },
  { prefix: 'sk-ant-api', label: 'Anthropic API key (sk-ant-api...)' },
  { prefix: 'sk-or-', label: 'OpenRouter key (sk-or-...)' },
  { prefix: 'xai-', label: 'xAI key (xai-...)' },
  { prefix: 'gsk_', label: 'Groq key (gsk_...)' },
];

for (const { prefix, label } of MODEL_KEY_PREFIXES) {
  const escaped = prefix.replace(/[-_]/g, '\\$&');
  const re = new RegExp(`=\\s*['"\`]${escaped}[A-Za-z0-9_\\-]{20,}['"\`]`, 'g');

  let foundAny = false;
  for (const fp of allTextFiles) {
    const rel = path.relative(__dirname, fp).replace(/\\/g, '/');
    const content = read(rel);
    if (!content) continue;

    re.lastIndex = 0;
    const matches = [...content.matchAll(re)];
    for (const m of matches) {
      const lineNo = countLines(content, m.index);
      const lineStart = content.lastIndexOf('\n', m.index) + 1;
      const lineEnd = content.indexOf('\n', m.index);
      const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);

      if (/keyHint\s*:/.test(line)) continue;
      if (/Deno\.env\.get/.test(line)) continue;
      if (/\bkeyHint\b/.test(content.substring(Math.max(0, m.index - 60), m.index))) continue;
      if (/\/\/|#|--/.test(line) && !/['"`]/.test(line)) continue;

      console.log(`  [FAIL] ${rel}:${lineNo} possible ${label}`);
      foundAny = true;
    }
  }
  if (foundAny) {
    fail(`${label} assignment found`);
  } else {
    ok(`No ${label} assignment found`);
  }
}

{
  const re = /=\s*['"`]sk-(?!proj-|or-|ant-)[A-Za-z0-9_\-]{20,}['"`]/g;
  let foundAny = false;
  for (const fp of allTextFiles) {
    const rel = path.relative(__dirname, fp).replace(/\\/g, '/');
    const content = read(rel);
    if (!content) continue;

    re.lastIndex = 0;
    const matches = [...content.matchAll(re)];
    for (const m of matches) {
      const lineStart = content.lastIndexOf('\n', m.index) + 1;
      const lineEnd = content.indexOf('\n', m.index);
      const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);

      if (/keyHint\s*:/.test(line)) continue;
      if (/Deno\.env\.get/.test(line)) continue;
      if (/(api\.openai\.com|api\.deepseek\.com|api\.siliconflow\.cn)/.test(line)) continue;

      console.log(`  [FAIL] ${rel}:${countLines(content, m.index)} possible generic API key (sk-...)`);
      foundAny = true;
    }
  }
  if (foundAny) {
    fail('Generic model API key assignment found');
  } else {
    ok('No generic model API key assignment found');
  }
}

console.log('\n--- 5. RUN_REMOTE_MEMORY_CONTRACT env var ---');

const rrmc = process.env.RUN_REMOTE_MEMORY_CONTRACT;
if (rrmc === undefined || rrmc === '') {
  ok('RUN_REMOTE_MEMORY_CONTRACT not set (safe default)');
} else if (rrmc === '1') {
  warn('RUN_REMOTE_MEMORY_CONTRACT=1; remote write tests ENABLED. Ensure you intended this.');
} else if (rrmc === '0') {
  ok('RUN_REMOTE_MEMORY_CONTRACT=0 (remote tests disabled)');
} else {
  warn(`RUN_REMOTE_MEMORY_CONTRACT="${rrmc}"; unexpected value. Only "1" enables remote tests.`);
}

console.log('\n--- 6. Supabase default exposure check ---');

const supabaseUrlPattern = /https:\/\/[a-z]{20}\.supabase\.co/;
const publishableKeyPattern = /sb_publishable_[A-Za-z0-9_-]{20,}/;

let foundProjectUrl = false;
let foundPubKey = false;

for (const fp of allTextFiles) {
  const rel = path.relative(__dirname, fp).replace(/\\/g, '/');
  const content = read(rel);
  if (!content) continue;

  if (rel === '_check_release_readiness.mjs') continue;
  if (supabaseUrlPattern.test(content)) {
    foundProjectUrl = true;
  }
  if (publishableKeyPattern.test(content)) {
    foundPubKey = true;
  }
}

if (foundProjectUrl) {
  warn('Supabase project URL default found in source files.');
  warn('  If pushing to a PUBLIC repo, this URL will be permanently exposed in git history.');
  warn('  Anyone with this URL can call your Edge Functions and access your DB (in personal mode).');
  warn('  Accept this risk before pushing to a public repo, or use runtime config injection instead.');
} else {
  ok('No Supabase project URL default found');
}

if (foundPubKey) {
  warn('Supabase publishable key default found in source files.');
  warn('  Publishable key itself is NOT a secret, but in a public repo it permanently enters git history.');
  warn('  Combined with project URL, anyone can call your Supabase API.');
  warn('  Accept this exposure risk before pushing to a public repo.');
} else {
  ok('No Supabase publishable key default found');
}

console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));

console.log(`  Exit code : ${exitCode}`);
console.log(`  Warnings  : ${warnings.length}`);

if (warnings.length > 0) {
  console.log('\n  Warnings:');
  for (const w of warnings) {
    console.log(`    [WARN] ${w}`);
  }
}

console.log('');

if (exitCode !== 0) {
  console.log('[FAIL] RELEASE READINESS: FAIL');
  console.log('');
  console.log('  Fix the [FAIL] items above before committing/pushing.');
  console.log('  [WARN] items are advisory and do not block release.');
} else if (warnings.length > 0) {
  console.log('[WARN] RELEASE READINESS: PASS WITH WARNINGS');
  console.log('');
  console.log('  All hard checks passed. Review warnings above before pushing.');
  console.log('  This does NOT block commit/push.');
} else {
  console.log('[OK] RELEASE READINESS: PASS');
  console.log('');
  console.log('  All checks passed. Ready to commit/push.');
}

console.log('');
console.log('Reminders:');
console.log('  - This script is READ-ONLY: it did not stage, commit, or push anything.');
console.log('  - It did not send any network requests.');
console.log('  - For full contract verification, also run:');
console.log('      node _check_stability.mjs');
console.log('      node _check_remote_memory_contract.mjs');

process.exit(exitCode);
