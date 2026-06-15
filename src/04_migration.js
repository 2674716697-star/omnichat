  // =========================================================================
  // MIGRATION / SCHEMA COMPATIBILITY
  // Data structure factories, story-mode flag repair, conversation normalisation.
  // No DOM access, no state mutation (except repairing conv objects).
  // =========================================================================

  function normalizeMentalScore(value) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return '';
    return String(Math.min(10, Math.max(1, n)));
  }

  function createSceneState(seed = {}) {
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

function createSceneWorld(seed) {
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

  function createSceneCharacter(seed) {
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

  function createSceneStatus(seed) {
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

  function createSceneNpc(seed) {
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

  function normalizeSceneNpcs(list) {
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

  function createStoryMode(seed) {
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

  function migrateStoryMode(conv) {
    // Always run repair, even if storyMode.enabled is already set.
    // Old conversations may have storyMode with enabled=false but
    // legacy worldMode/sceneMode=true — repairStoryModeFlags fixes that.
    repairStoryModeFlags(conv);
  }

  // Robust story-mode flag inference from legacy fields and message history.
  // Idempotent — safe to call on already-migrated conversations.
  function repairStoryModeFlags(conv) {
    if (!conv) return;

    // Ensure storyMode object exists
    conv.storyMode = createStoryMode(conv.storyMode);

    // Ensure legacy scene fields exist
    conv.sceneWorld = createSceneWorld(conv.sceneWorld);
    conv.sceneCharacter = createSceneCharacter(conv.sceneCharacter);
    conv.sceneStatus = createSceneStatus(conv.sceneStatus);
    conv.sceneNpcs = normalizeSceneNpcs(conv.sceneNpcs);
    conv.sceneState = createSceneState(conv.sceneState);

    // --- Infer storyStarted from legacy + content ---
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

    // Check messages for story evidence
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

    // --- Infer storyEnabled ---
    var inferredEnabled =
      inferredStarted ||
      !!conv.sceneMode ||
      !!conv.storyMode.enabled;

    // --- Apply ---
    conv.storyMode.enabled = inferredEnabled;
    conv.storyMode.started = inferredStarted;

    // Bidirectional sync: storyMode ↔ legacy
    conv.storyMode.world = conv.sceneWorld;
    conv.storyMode.character = conv.sceneCharacter;
    conv.storyMode.status = conv.sceneStatus;
    conv.storyMode.npcs = conv.sceneNpcs;
    conv.storyMode.sceneState = conv.sceneState;

    syncStoryModeToLegacy(conv);
  }

  // Detect old first user message containing a full world character card
  function looksLikeWorldCharacterCard(text) {
    if (!text || typeof text !== 'string') return false;
    if (text.length <= 300) return false;
    var kw = ['世界观', '世界设定', '角色卡', 'NPC', '主角', '规则'];
    var count = 0;
    for (var i = 0; i < kw.length; i++) { if (text.indexOf(kw[i]) !== -1) count++; }
    return count >= 2;
  }

  // Normalize a single message for forward-compat
  function normalizeMessage(msg, conv) {
    if (!msg) return msg;
    if (!msg.role) msg.role = 'user';
    if (typeof msg.content !== 'string') msg.content = String(msg.content || '');
    // Old world story first user message leaked full card into UI content.
    // Move full card to _requestContent (for API) and add displayContent (for UI).
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

  function normalizeMemoryMode(value) {
    if (value === 'mock-remote') return 'mock-remote';
    if (value === 'remote') return 'remote';
    // All other values (including undefined, null, 'local', unknown strings) default to 'local'
    return 'local';
  }

  // Normalize a conversation to current schema — idempotent
  function normalizeConversation(conv) {
    if (!conv) return conv;
    var oldVersion = conv.schemaVersion || 0;
    if (!Array.isArray(conv.messages)) conv.messages = [];
    // Repair story mode flags from legacy fields before normalizing messages.
    // This ensures normalizeMessage can use isStoryStarted correctly.
    repairStoryModeFlags(conv);

    // --- Schema v2→v3: aux model settings ---
    if (oldVersion < 3) {
      if (!conv.storyAuxProvider) conv.storyAuxProvider = DEFAULTS.storyAuxProvider;
      if (!conv.storyAuxModel) conv.storyAuxModel = DEFAULTS.storyAuxModel;
      if (conv.storyAuxMaxTokens == null) conv.storyAuxMaxTokens = DEFAULTS.storyAuxMaxTokens;
    }
    // --- Schema v3→v4: story memory ---
    // Always run (not just oldVersion < 4) so incomplete/corrupted fields self-heal. Idempotent.
    conv.storyMemory = normalizeStoryMemory(conv.storyMemory);
    // Ensure aux fields exist defensively (belt-and-suspenders)
    if (!conv.storyAuxProvider) conv.storyAuxProvider = DEFAULTS.storyAuxProvider;
    if (!conv.storyAuxModel) conv.storyAuxModel = DEFAULTS.storyAuxModel;
    if (conv.storyAuxMaxTokens == null) conv.storyAuxMaxTokens = DEFAULTS.storyAuxMaxTokens;
    if (conv.storyAuxApiKey == null) conv.storyAuxApiKey = DEFAULTS.storyAuxApiKey;
    // Ensure storyMemory exists for all conversations (belt-and-suspenders)
    if (!conv.storyMemory) conv.storyMemory = createStoryMemory();
    // --- Schema v4→v5: memoryMode ---
    // Always run (not just oldVersion < 5) so invalid values self-heal. Idempotent.
    conv.memoryMode = normalizeMemoryMode(conv.memoryMode);
    // --- Schema v6->v7: memoryMode upgrade (local->remote for old defaults) ---
    // Old conversations before v7 defaulted to 'local' memory mode.
    // Now that DEFAULTS.memoryMode is 'remote', migrate old local defaults
    // so existing conversations can use backend memory.
    // Only fires on v7 upgrade (oldVersion < 7) -- does NOT override
    // a user who manually switches to 'local' after v7.
    // Uses !conv.memoryRemoteEndpoint as heuristic: if the user never
    // configured a remote endpoint, they were on the old default.
    if (oldVersion < 7 && conv.memoryMode === 'local' && !conv.memoryRemoteEndpoint) {
      conv.memoryMode = DEFAULTS.memoryMode;
      conv.memoryRemoteEndpoint = DEFAULTS.memoryRemoteEndpoint;
    }
    // --- Schema v5->v6: memoryRemoteEndpoint ---
    // Always run so missing/corrupted fields self-heal. Idempotent.
    if (typeof conv.memoryRemoteEndpoint !== 'string') {
      conv.memoryRemoteEndpoint = DEFAULTS.memoryRemoteEndpoint;
    }
    // If memoryMode is remote but endpoint is empty, fill in the default.
    // Don't overwrite an existing non-empty endpoint — user may have customized it.
    if (conv.memoryMode === 'remote' && !conv.memoryRemoteEndpoint) {
      conv.memoryRemoteEndpoint = DEFAULTS.memoryRemoteEndpoint;
    }
    // --- Schema v6→v7: remoteMemoryCache ---
    // Defensive repair: ensure the cache object has a valid shape.
    // Corrupt / missing caches are reset to null so the adapter treats them as cold.
    if (conv.remoteMemoryCache) {
      var rmc = conv.remoteMemoryCache;
      if (typeof rmc.memoryText !== 'string' || typeof rmc.updatedAt !== 'number' || rmc.updatedAt < 0) {
        conv.remoteMemoryCache = null;
      }
      // Normalize selectedFactIds to array
      if (rmc && !Array.isArray(rmc.selectedFactIds)) {
        rmc.selectedFactIds = [];
      }
      // Normalize budget
      if (rmc && (typeof rmc.budget !== 'number' || rmc.budget <= 0)) {
        rmc.budget = 4000;
      }
    }
    // Migrate replyCharLimit to new range 100–2000 (clamp + normalize to nearest option)
    var REPLY_CHAR_OPTIONS = [100, 300, 500, 1000, 1500, 2000];
    if (conv.replyCharLimit != null) {
      var rcl = parseInt(conv.replyCharLimit, 10);
      if (!Number.isFinite(rcl) || rcl < 100) {
        conv.replyCharLimit = 500;
      } else if (rcl > 2000) {
        conv.replyCharLimit = 2000;
      } else {
        // Normalize to nearest allowed option
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

  function syncStoryModeToLegacy(conv) {
    if (!conv.storyMode) return;
    conv.sceneMode = conv.storyMode.enabled;
    conv.worldMode = conv.storyMode.started;
    conv.sceneWorld = conv.storyMode.world;
    conv.sceneCharacter = conv.storyMode.character;
    conv.sceneStatus = conv.storyMode.status;
    conv.sceneNpcs = conv.storyMode.npcs;
    conv.sceneState = conv.storyMode.sceneState;
  }

  function syncLegacyToStoryMode(conv) {
    if (!conv) return;
    if (!conv.storyMode) conv.storyMode = createStoryMode();
    var sm = conv.storyMode;
    // Also sync flags — don't lose old truthy values
    sm.enabled = sm.enabled || !!(conv.sceneMode || conv.worldMode);
    sm.started = sm.started || !!conv.worldMode;
    sm.world = createSceneWorld(conv.sceneWorld);
    sm.character = createSceneCharacter(conv.sceneCharacter);
    sm.status = createSceneStatus(conv.sceneStatus);
    sm.npcs = normalizeSceneNpcs(conv.sceneNpcs);
    sm.sceneState = createSceneState(conv.sceneState);
  }

  // Helper: get effective story mode enabled/started state (primary + compat)
  function isStoryEnabled(conv) {
    if (!conv) return false;
    var sm = conv.storyMode;
    return !!(sm && sm.enabled) || !!conv.sceneMode;
  }

  function isStoryStarted(conv) {
    if (!conv) return false;
    var sm = conv.storyMode;
    return !!(sm && sm.started) || !!conv.worldMode;
  }

  // =========================================================================
  // STORY MEMORY — auto chapter tracking for long conversations
  // =========================================================================

  function clipStr(text, max) {
    var s = String(text || '').replace(/\s+/g, ' ').trim();
    if (s.length <= max) return s;
    return s.slice(0, max - 1).trimEnd() + '…';
  }

  function clipStringArray(arr, maxItems, maxPerItem) {
    if (!arr || !Array.isArray(arr)) return [];
    var out = [];
    for (var i = 0; i < arr.length && out.length < maxItems; i++) {
      out.push(clipStr(arr[i], maxPerItem));
    }
    return out;
  }

  function createStoryMemory(seed) {
    seed = seed || {};
    return {
      chapters: normalizeStoryChapters(seed.chapters),
      pinnedFacts: clipStringArray(seed.pinnedFacts, 12, 120),
      unresolvedThreads: clipStringArray(seed.unresolvedThreads, 12, 160),
      lastUpdatedAt: seed.lastUpdatedAt || '',
      lastMessageCount: seed.lastMessageCount || 0,
    };
  }

  function createStoryChapter(seed) {
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

  function normalizeStoryChapters(list) {
    if (!list || !Array.isArray(list)) return [];
    var out = [];
    for (var i = 0; i < list.length && out.length < 12; i++) {
      out.push(createStoryChapter(list[i]));
    }
    return out;
  }

  function normalizeStoryMemory(sm) {
    if (!sm) return createStoryMemory();
    sm.chapters = normalizeStoryChapters(sm.chapters);
    sm.pinnedFacts = clipStringArray(sm.pinnedFacts, 12, 120);
    sm.unresolvedThreads = clipStringArray(sm.unresolvedThreads, 12, 160);
    if (typeof sm.lastUpdatedAt !== 'string') sm.lastUpdatedAt = '';
    if (typeof sm.lastMessageCount !== 'number') sm.lastMessageCount = 0;
    return sm;
  }
