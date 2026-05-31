// _build_script.js — Concatenate src/*.js into script.js
// Run: node _build_script.js
// After: node _build.js && node _safe_check.mjs

import fs from 'fs';

const SRC = 'src';
const OUT = 'script.js';

// Files are concatenated in this order.
// Each file contributes a section of the IIFE that is script.js.
const ORDER = [
  '00_header.js',       // file banner + IIFE open
  '01_constants.js',    // STORAGE_KEY, PROVIDERS, DEFAULTS, ERR_MSGS
  '02_utils.js',        // generateId, nowISO, escapeHtml, debounce
  '99_legacy_main.js',  // STATE, DOM, storage, story, adapter, render, send, events, init
];

// Read and concatenate
let output = '';
for (const file of ORDER) {
  const path = `${SRC}/${file}`;
  if (!fs.existsSync(path)) {
    console.error(`❌ Missing source file: ${path}`);
    process.exit(1);
  }
  const content = fs.readFileSync(path, 'utf8');
  output += content;
  // Ensure newline separation between files
  if (!content.endsWith('\n')) output += '\n';
}

// Verify critical identifiers exist in output
const REQUIRED = [
  'STORAGE_SCHEMA_VERSION',
  'repairStoryModeFlags',
  'normalizeConversation',
  'sendMessage',
  'processStream',
  'init',
];

const missing = REQUIRED.filter(id => !output.includes(id));
if (missing.length > 0) {
  console.error('❌ Missing required identifiers after concatenation:');
  missing.forEach(id => console.error('   - ' + id));
  process.exit(1);
}

// Write to script.js
fs.writeFileSync(OUT, output);
console.log(`✅ script.js built from ${ORDER.length} source files (${output.length} bytes).`);
console.log(`   All ${REQUIRED.length} required identifiers present.`);
