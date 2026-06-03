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
    // Ensure aux fields exist defensively (belt-and-suspenders)
    if (!conv.storyAuxProvider) conv.storyAuxProvider = DEFAULTS.storyAuxProvider;
    if (!conv.storyAuxModel) conv.storyAuxModel = DEFAULTS.storyAuxModel;
    if (conv.storyAuxMaxTokens == null) conv.storyAuxMaxTokens = DEFAULTS.storyAuxMaxTokens;
    // Migrate replyCharLimit to new range 500–3000 (clamp + normalize to nearest option)
    var REPLY_CHAR_OPTIONS = [500, 1000, 1500, 2000, 2500, 3000];
    if (conv.replyCharLimit != null) {
      var rcl = parseInt(conv.replyCharLimit, 10);
      if (!Number.isFinite(rcl) || rcl < 500) {
        conv.replyCharLimit = 500;
      } else if (rcl > 3000) {
        conv.replyCharLimit = 3000;
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
