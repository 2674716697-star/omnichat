// _build_script.js — Concatenate src/*.js into script.js
// Run: node _build_script.js
// After: node _build.js && node _safe_check.mjs

import fs from 'fs';

const SRC = 'src';
const OUT = 'script.js';

// Files are concatenated in this order.
// Each file contributes a section of the IIFE that is script.js.
const ORDER = [
  '00_header.js',               // file banner + IIFE open
  '01_constants.js',            // STORAGE_KEY, PROVIDERS, DEFAULTS, ERR_MSGS
  '02_utils.js',                // generateId, nowISO, escapeHtml, debounce
  '03_storage.js',              // saveToStorage, loadFromStorage, debouncedSave, saveSecretsAndPrefs, loadSecretsAndPrefs
  '04_migration.js',            // Migration: createStoryMode, repairStoryModeFlags, normalizeConversation, etc.
  '05_providers.js',            // Provider Adapter: getProviderConfig, buildRequestHeaders, parseStreamDelta, etc.
  '06_story_parser.js',         // Story Parser: getSceneLine, parseDirectionOptions, parseSceneChoiceInput, etc.
  '07_markdown.js',             // Markdown: renderMarkdown, renderContentFast, getVisibleAssistantContent
  '08_conversation_actions.js', // Conversation Actions: newConversation, switchConversation, export/import, etc.
  '09_model_management.js',     // Model Management: populateModelSelect, refreshModels, updateToolWarning
  '99_legacy_main.js',          // STATE, DOM, render, send, events, init
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
  'PROVIDERS',
  'SECRETS_STORAGE_KEY',
  'PREFS_STORAGE_KEY',
  'saveToStorage',
  'loadFromStorage',
  'debouncedSave',
  'saveSecretsAndPrefs',
  'loadSecretsAndPrefs',
  'createStoryMode',
  'repairSceneBlock',
  'repairStoryModeFlags',
  'migrateStoryMode',
  'looksLikeWorldCharacterCard',
  'normalizeMessage',
  'normalizeConversation',
  'syncStoryModeToLegacy',
  'syncLegacyToStoryMode',
  'isStoryEnabled',
  'isStoryStarted',
  'PROVIDER_CAPS',
  'getProviderConfig',
  'getProviderCap',
  'buildRequestHeaders',
  'buildRequestBody',
  'parseModelList',
  'parseStreamDelta',
  'parseNonStreamResponse',
  'getSceneLine',
  'getSceneLineAny',
  'getSceneDirections',
  'parseDirectionOptions',
  'parseCharacterStatuses',
  'getSceneBodyDetails',
  'parseSceneChoiceInput',
  'buildSceneFallbackDirections',
  'sendStoryTurn',
  'streamStoryPart',
  'callChatModel',
  'buildAuxMessages',
  'resolveStoryAuxProviderAndModel',
  'tryParseAuxResponse',
  'renderMarkdown',
  'renderContentFast',
  'appendFastText',
  'getVisibleAssistantContent',
  'isSafeMarkdownUrl',
  'newConversation',
  'switchConversation',
  'clearCurrentConversation',
  'deleteLastRound',
  'copyLastAssistantReply',
  'exportAllJSON',
  'importJSON',
  'populateModelSelect',
  'refreshModels',
  'updateToolWarning',
  'sendMessage',
  'processStream',
  'renderMessages',
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
