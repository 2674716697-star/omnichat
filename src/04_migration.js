// =========================================================================
// MIGRATION / SCHEMA COMPATIBILITY
// Data structure factories, story-mode flag repair, conversation normalisation.
// No DOM access, no state mutation (except repairing conv objects).
// =========================================================================

import { STORAGE_SCHEMA_VERSION, DEFAULTS } from './01_constants.js';
import { generateId } from './02_utils.js';

export function normalizeMentalScore(value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return '';
  return String(Math.min(10, Math.max(1, n)));
}

export function createSceneState(seed = {}) {
  seed = seed || {};
  return {
    currentRole: seed.currentRole || '',
    currentGoal: seed.currentGoal || '',
    posture: seed.posture || '',
    mental: seed.mental || '',
    mentalScore: normalizeMentalScore(seed.mentalScore),
    physical: seed.physical || '',
    bodyDetails: seed.bodyDetails || '',
    plot: seed.plot || '',
    risk: seed.risk || '',
    innerVoice: seed.innerVoice || '',
    directions: seed.directions || '',
    characterStatuses: seed.characterStatuses || [],
  };
}

export function createSceneWorld(seed) {
  seed = seed || {};
  return {
    openingName: seed.openingName || '',
    setting: seed.setting || '',
    locations: seed.locations || '',
    rules: seed.rules || '',
    mood: seed.mood || '',
    notes: seed.notes || '',
  };
}

export function createSceneCharacter(seed) {
  seed = seed || {};
  return {
    name: seed.name || '',
    age: seed.age || '',
    role: seed.role || '',
    species: seed.species || '',
    appearance: seed.appearance || '',
    traits: seed.traits || '',
    stats: seed.stats || '',
    currentGoal: seed.currentGoal || '',
  };
}

export function createSceneStatus(seed) {
  seed = seed || {};
  return {
    health: seed.health || '',
    stamina: seed.stamina || '',
    composure: seed.composure || '',
    focus: seed.focus || '',
    currentObjective: seed.currentObjective || '',
    constraints: seed.constraints || '',
  };
}

export function createSceneNpc(seed) {
  seed = seed || {};
  return {
    id: seed.id || generateId(),
    name: seed.name || '',
    role: seed.role || '',
    relation: seed.relation || '',
    status: seed.status || '',
    notes: seed.notes || '',
    image: seed.image || '',
  };
}

export function normalizeSceneNpcs(list) {
  if (!list || !Array.isArray(list)) return [];
  var out = [];
  for (var i = 0; i < list.length; i++) {
    out.push(createSceneNpc(list[i]));
  }
  return out;
}

// =========================================================================
// STORY MODE (unified world + scene mode)
// =========================================================================

export function createStoryMode(seed) {
  seed = seed || {};
  return {
    enabled: seed.enabled || false,
    started: seed.started || false,
    world: createSceneWorld(seed.world),
    character: createSceneCharacter(seed.character),
    status: createSceneStatus(seed.status),
    npcs: normalizeSceneNpcs(seed.npcs),
    sceneState: createSceneState(seed.sceneState),
  };
}

export function migrateStoryMode(conv) {
  repairStoryModeFlags(conv);
}

export function repairStoryModeFlags(conv) {
  if (!conv) return;
  conv.storyMode = createStoryMode(conv.storyMode);
  conv.sceneWorld = createSceneWorld(conv.sceneWorld);
  conv.sceneCharacter = createSceneCharacter(conv.sceneCharacter);
  conv.sceneStatus = createSceneStatus(conv.sceneStatus);
  conv.sceneNpcs = normalizeSceneNpcs(conv.sceneNpcs);
  conv.sceneState = createSceneState(conv.sceneState);

  var hw = conv.sceneWorld;
  var hc = conv.sceneCharacter;
  var hasWorld = !!(hw.openingName || hw.era || hw.location || hw.atmosphere || hw.tech || hw.rules);
  var hasChar = !!(hc.name || hc.age || hc.role || hc.traits || hc.background);
  var hasNpcs = conv.sceneNpcs && conv.sceneNpcs.length > 0;
  var hasScene = !!(conv.sceneState.directions || conv.sceneState.plot || conv.sceneState.mental || conv.sceneState.physical);

  var inferredStarted =
    !!conv.worldMode ||
    !!conv.storyMode.started ||
    (!!conv.storyMode.enabled && (hasWorld || hasChar || hasNpcs)) ||
    hasScene;

  if (!inferredStarted && Array.isArray(conv.messages)) {
    for (var mi = 0; mi < conv.messages.length; mi++) {
      var m = conv.messages[mi];
      if (m.role === 'assistant' && m.sceneSnapshot && m.sceneSnapshot.directions) {
        inferredStarted = true; break;
      }
      if (m.role === 'assistant' && m.content && (/@@SCENE/.test(m.content) || /走向/.test(m.content))) {
        inferredStarted = true; break;
      }
      if (m.role === 'user' && looksLikeWorldCharacterCard(m._requestContent || m.content)) {
        inferredStarted = true; break;
      }
    }
  }

  var inferredEnabled =
    inferredStarted ||
    !!conv.sceneMode ||
    !!conv.storyMode.enabled;

  conv.storyMode.enabled = inferredEnabled;
  conv.storyMode.started = inferredStarted;
  conv.storyMode.world = conv.sceneWorld;
  conv.storyMode.character = conv.sceneCharacter;
  conv.storyMode.status = conv.sceneStatus;
  conv.storyMode.npcs = conv.sceneNpcs;
  conv.storyMode.sceneState = conv.sceneState;

  syncStoryModeToLegacy(conv);
}

export function looksLikeWorldCharacterCard(text) {
  if (!text || typeof text !== 'string') return false;
  if (text.length <= 300) return false;
  var kw = ['世界观', '世界设定', '角色卡', 'NPC', '主角', '规则'];
  var count = 0;
  for (var i = 0; i < kw.length; i++) { if (text.indexOf(kw[i]) !== -1) count++; }
  return count >= 2;
}

export function normalizeMessage(msg, conv) {
  if (!msg) return msg;
  if (!msg.role) msg.role = 'user';
  if (typeof msg.content !== 'string') msg.content = String(msg.content || '');
  if (
    conv && isStoryStarted(conv) &&
    msg.role === 'user' &&
    !msg.displayContent &&
    !msg._requestContent &&
    looksLikeWorldCharacterCard(msg.content)
  ) {
    msg.displayContent = '世界故事已开启。你的设定已发送给 AI，接下来将生成第一幕。';
    msg._requestContent = msg.content;
  }
  return msg;
}

export function normalizeMemoryMode(value) {
  if (value === 'mock-remote') return 'mock-remote';
  if (value === 'remote') return 'remote';
  return 'local';
}

export function normalizeConversation(conv) {
  if (!conv) return conv;
  var oldVersion = conv.schemaVersion || 0;
  if (!Array.isArray(conv.messages)) conv.messages = [];
  repairStoryModeFlags(conv);

  if (oldVersion < 3) {
    if (!conv.storyAuxProvider) conv.storyAuxProvider = DEFAULTS.storyAuxProvider;
    if (!conv.storyAuxModel) conv.storyAuxModel = DEFAULTS.storyAuxModel;
    if (conv.storyAuxMaxTokens == null) conv.storyAuxMaxTokens = DEFAULTS.storyAuxMaxTokens;
  }
  conv.storyMemory = normalizeStoryMemory(conv.storyMemory);
  if (!conv.storyAuxProvider) conv.storyAuxProvider = DEFAULTS.storyAuxProvider;
  if (!conv.storyAuxModel) conv.storyAuxModel = DEFAULTS.storyAuxModel;
  if (conv.storyAuxMaxTokens == null) conv.storyAuxMaxTokens = DEFAULTS.storyAuxMaxTokens;
  if (conv.storyAuxApiKey == null) conv.storyAuxApiKey = DEFAULTS.storyAuxApiKey;
  if (!conv.storyMemory) conv.storyMemory = createStoryMemory();
  conv.memoryMode = normalizeMemoryMode(conv.memoryMode);

  if (oldVersion < 7 && conv.memoryMode === 'local' && !conv.memoryRemoteEndpoint) {
    conv.memoryMode = DEFAULTS.memoryMode;
    conv.memoryRemoteEndpoint = DEFAULTS.memoryRemoteEndpoint;
  }
  if (typeof conv.memoryRemoteEndpoint !== 'string') {
    conv.memoryRemoteEndpoint = DEFAULTS.memoryRemoteEndpoint;
  }
  if (conv.memoryMode === 'remote' && !conv.memoryRemoteEndpoint) {
    conv.memoryRemoteEndpoint = DEFAULTS.memoryRemoteEndpoint;
  }
  if (conv.remoteMemoryCache) {
    var rmc = conv.remoteMemoryCache;
    if (typeof rmc.memoryText !== 'string' || typeof rmc.updatedAt !== 'number' || rmc.updatedAt < 0) {
      conv.remoteMemoryCache = null;
    }
    if (rmc && !Array.isArray(rmc.selectedFactIds)) {
      rmc.selectedFactIds = [];
    }
    if (rmc && (typeof rmc.budget !== 'number' || rmc.budget <= 0)) {
      rmc.budget = 4000;
    }
  }

  var REPLY_CHAR_OPTIONS = [100, 300, 500, 1000, 1500, 2000];
  if (conv.replyCharLimit != null) {
    var rcl = parseInt(conv.replyCharLimit, 10);
    if (!Number.isFinite(rcl) || rcl < 100) {
      conv.replyCharLimit = 500;
    } else if (rcl > 2000) {
      conv.replyCharLimit = 2000;
    } else {
      var bestRcl = REPLY_CHAR_OPTIONS[0];
      var bestRclDist = Math.abs(rcl - bestRcl);
      for (var roi = 1; roi < REPLY_CHAR_OPTIONS.length; roi++) {
        var distRcl = Math.abs(rcl - REPLY_CHAR_OPTIONS[roi]);
        if (distRcl < bestRclDist) { bestRclDist = distRcl; bestRcl = REPLY_CHAR_OPTIONS[roi]; }
      }
      conv.replyCharLimit = bestRcl;
    }
  } else {
    conv.replyCharLimit = DEFAULTS.replyCharLimit;
  }

  for (var i = 0; i < conv.messages.length; i++) {
    conv.messages[i] = normalizeMessage(conv.messages[i], conv);
  }
  conv.schemaVersion = STORAGE_SCHEMA_VERSION;
  if (oldVersion < STORAGE_SCHEMA_VERSION) window.__migrated = true;
  return conv;
}

export function syncStoryModeToLegacy(conv) {
  if (!conv.storyMode) return;
  conv.sceneMode = conv.storyMode.enabled;
  conv.worldMode = conv.storyMode.started;
  conv.sceneWorld = conv.storyMode.world;
  conv.sceneCharacter = conv.storyMode.character;
  conv.sceneStatus = conv.storyMode.status;
  conv.sceneNpcs = conv.storyMode.npcs;
  conv.sceneState = conv.storyMode.sceneState;
}

export function syncLegacyToStoryMode(conv) {
  if (!conv) return;
  if (!conv.storyMode) conv.storyMode = createStoryMode();
  var sm = conv.storyMode;
  sm.enabled = sm.enabled || !!(conv.sceneMode || conv.worldMode);
  sm.started = sm.started || !!conv.worldMode;
  sm.world = createSceneWorld(conv.sceneWorld);
  sm.character = createSceneCharacter(conv.sceneCharacter);
  sm.status = createSceneStatus(conv.sceneStatus);
  sm.npcs = normalizeSceneNpcs(conv.sceneNpcs);
  sm.sceneState = createSceneState(conv.sceneState);
}

export function isStoryEnabled(conv) {
  if (!conv) return false;
  var sm = conv.storyMode;
  return !!(sm && sm.enabled) || !!conv.sceneMode;
}

export function isStoryStarted(conv) {
  if (!conv) return false;
  var sm = conv.storyMode;
  return !!(sm && sm.started) || !!conv.worldMode;
}

// =========================================================================
// STORY MEMORY
// =========================================================================

export function clipStr(text, max) {
  var s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

export function clipStringArray(arr, maxItems, maxPerItem) {
  if (!arr || !Array.isArray(arr)) return [];
  var out = [];
  for (var i = 0; i < arr.length && out.length < maxItems; i++) {
    out.push(clipStr(arr[i], maxPerItem));
  }
  return out;
}

export function createStoryMemory(seed) {
  seed = seed || {};
  return {
    chapters: normalizeStoryChapters(seed.chapters),
    pinnedFacts: clipStringArray(seed.pinnedFacts, 12, 120),
    unresolvedThreads: clipStringArray(seed.unresolvedThreads, 12, 160),
    lastUpdatedAt: seed.lastUpdatedAt || '',
    lastMessageCount: seed.lastMessageCount || 0,
  };
}

export function createStoryChapter(seed) {
  seed = seed || {};
  return {
    id: seed.id || generateId(),
    turnStart: seed.turnStart || 0,
    turnEnd: seed.turnEnd || 0,
    title: clipStr(seed.title || '', 40),
    summary: clipStr(seed.summary || '', 600),
    keyEvents: clipStringArray(seed.keyEvents, 8, 160),
    characterChanges: clipStringArray(seed.characterChanges, 8, 120),
    relationshipChanges: clipStringArray(seed.relationshipChanges, 8, 120),
    unresolvedThreads: clipStringArray(seed.unresolvedThreads, 8, 160),
    createdAt: seed.createdAt || '',
  };
}

export function normalizeStoryChapters(list) {
  if (!list || !Array.isArray(list)) return [];
  var out = [];
  for (var i = 0; i < list.length && out.length < 12; i++) {
    out.push(createStoryChapter(list[i]));
  }
  return out;
}

export function normalizeStoryMemory(sm) {
  if (!sm) return createStoryMemory();
  sm.chapters = normalizeStoryChapters(sm.chapters);
  sm.pinnedFacts = clipStringArray(sm.pinnedFacts, 12, 120);
  sm.unresolvedThreads = clipStringArray(sm.unresolvedThreads, 12, 160);
  if (typeof sm.lastUpdatedAt !== 'string') sm.lastUpdatedAt = '';
  if (typeof sm.lastMessageCount !== 'number') sm.lastMessageCount = 0;
  return sm;
}
