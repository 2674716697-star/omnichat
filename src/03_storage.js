  // =========================================================================
  // STORAGE — localStorage save/load, conversation persistence
  // =========================================================================

  // Persist apiKeys to a stable independent key so they survive build-version
  // changes, PWA updates, cache clearing, and main-data migration failures.
  function saveSecretsAndPrefs() {
    try {
      localStorage.setItem(SECRETS_STORAGE_KEY, JSON.stringify(state.apiKeys));
    } catch(e) {}
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({
        models: state.models,
        activeTheme: state.activeTheme || '',
        chatBackground: state.chatBackground,
        themeOverrides: state.themeOverrides,
        worldStarterEnabled: state.worldStarterEnabled,
        actionPrompts: state.actionPrompts,
      }));
    } catch(e) {}
  }

  // Restore apiKeys and user prefs from stable independent keys.
  // Called early in loadFromStorage so keys/settings are available even if
  // the main omnichat_data is missing or corrupted.
  function loadSecretsAndPrefs() {
    // Restore API keys
    try {
      var secretsRaw = localStorage.getItem(SECRETS_STORAGE_KEY);
      if (secretsRaw) {
        var secrets = JSON.parse(secretsRaw);
        if (secrets && typeof secrets === 'object' && Object.keys(secrets).length > 0) {
          state.apiKeys = secrets;
        }
      }
    } catch(e) {}

    // Restore user prefs
    try {
      var prefsRaw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (prefsRaw) {
        var prefs = JSON.parse(prefsRaw);
        if (prefs && typeof prefs === 'object') {
          if (prefs.models) state.models = prefs.models;
          if (prefs.hasOwnProperty('activeTheme')) state.activeTheme = prefs.activeTheme;
          if (prefs.chatBackground) state.chatBackground = prefs.chatBackground;
          if (prefs.themeOverrides) state.themeOverrides = prefs.themeOverrides;
          if (prefs.hasOwnProperty('worldStarterEnabled')) state.worldStarterEnabled = prefs.worldStarterEnabled;
          if (prefs.actionPrompts) state.actionPrompts = prefs.actionPrompts;
        }
      }
    } catch(e) {}
  }

  function saveToStorage() {
    try {
      // Sync legacy scene fields → storyMode on all conversations before save
      for (var si = 0; si < state.conversations.length; si++) {
        syncLegacyToStoryMode(state.conversations[si]);
      }
      var data = {
        version: STORAGE_VERSION,
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
        apiKeys: state.apiKeys,
        models: state.models,
        activeTheme: state.activeTheme || '',
        chatBackground: state.chatBackground,
        themeOverrides: state.themeOverrides,
        worldStarterEnabled: state.worldStarterEnabled,
        actionPrompts: state.actionPrompts,
      };
      // Always save secrets/prefs FIRST, so they survive even if the main
      // data blob later hits QuotaExceededError.
      saveSecretsAndPrefs();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        showToast(ERR_MSGS.storageFailed, 'error');
        // Even if the main data write failed, retry saving secrets/prefs
        // so API keys and settings are preserved as much as possible.
        saveSecretsAndPrefs();
      }
    }
  }

  var debouncedSave = debounce(saveToStorage, 500);

  function loadFromStorage() {
    // Step 1: Always restore secrets and prefs from stable independent keys.
    // This ensures API keys and settings are available even if the main
    // omnichat_data key is missing, corrupted, or from an older version.
    loadSecretsAndPrefs();

    // Step 2: Load main data (conversations, etc.)
    var mainOk = false;
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        state.conversations = Array.isArray(data.conversations) ? data.conversations : [];
        state.conversations.forEach(function(conv) {
          conv.sceneState = createSceneState(conv.sceneState);
          conv.sceneWorld = createSceneWorld(conv.sceneWorld);
          conv.sceneCharacter = createSceneCharacter(conv.sceneCharacter);
          conv.sceneStatus = createSceneStatus(conv.sceneStatus);
          conv.sceneNpcs = normalizeSceneNpcs(conv.sceneNpcs);
          // Migrate old scene/world data to unified storyMode
          migrateStoryMode(conv);
        });
        // Migrate conversations to current message display model (idempotent)
        window.__migrated = false;
        state.conversations = state.conversations.map(normalizeConversation);
        if (window.__migrated) setTimeout(function() { saveToStorage(); }, 0);
        state.currentConversationId = data.currentConversationId || null;

        // Secrets: stable key always wins. Only fall back to main data
        // (or migrate old flat format) if stable secrets were empty.
        var hasSecrets = Object.keys(state.apiKeys).length > 0;
        if (!hasSecrets && data.apiKeys) {
          state.apiKeys = data.apiKeys;
        } else if (!hasSecrets) {
          // Migrate old flat key format
          state.apiKeys = {};
          if (data.xaiApiKey) state.apiKeys.xai = data.xaiApiKey;
          if (data.deepseekApiKey) state.apiKeys.deepseek = data.deepseekApiKey;
        }

        // Prefs: stable key wins, main data fills gaps
        var defaultModels = { xai: [], deepseek: [], openai: [], openrouter: [], groq: [], moonshot: [], zhipu: [], siliconflow: [] };
        if (!state.models || Object.keys(state.models).length === 0) {
          state.models = data.models || defaultModels;
        }
        if (!state.activeTheme && data.activeTheme) {
          state.activeTheme = data.activeTheme;
        }
        // ChatBackground: prefs always wins. Only fall back to main data when
        // state still has the initial default stub (type='none' AND no value
        // AND default opacity). Never discard prefs-restored opacity settings
        // just because type is 'none'.
        var cbIsDefault = state.chatBackground
          && state.chatBackground.type === 'none'
          && !state.chatBackground.value
          && state.chatBackground.opacity === 35;
        if (!state.chatBackground || cbIsDefault) {
          if (data.chatBackground) state.chatBackground = data.chatBackground;
          else if (!state.chatBackground) state.chatBackground = { type: 'none', value: '', opacity: 35 };
        }
        if (!state.worldStarterEnabled && data.worldStarterEnabled) {
          state.worldStarterEnabled = data.worldStarterEnabled;
        }
        if (!state.actionPrompts || Object.keys(state.actionPrompts).length === 0) {
          state.actionPrompts = data.actionPrompts || { regenerate: '', continue: '', summarize: '', elaborate: '' };
        }
        // ThemeOverrides: prefs wins, main data fills gaps
        if (!state.themeOverrides || Object.keys(state.themeOverrides).length === 0) {
          if (data.themeOverrides) state.themeOverrides = data.themeOverrides;
        }

        mainOk = true;
      }
    } catch (e) {
      // Main data corrupted — secrets and prefs were already restored above.
      // Remove the corrupted key so we don't keep hitting this on every reload;
      // Step 4 below will write a fresh save if secrets exist.
      console.warn('[OmniChat] 主数据加载失败，已清除损坏数据并恢复密钥和设置。', e);
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      mainOk = false;
    }

    // Step 3: Ensure actionPrompts always has all required keys (defensive merge)
    var defaultActionPrompts = { regenerate: '', continue: '', summarize: '', elaborate: '' };
    if (state.actionPrompts) {
      for (var ak in defaultActionPrompts) {
        if (defaultActionPrompts.hasOwnProperty(ak) && !state.actionPrompts.hasOwnProperty(ak)) {
          state.actionPrompts[ak] = defaultActionPrompts[ak];
        }
      }
    }

    // Step 4: If we restored secrets from stable key but there's no main data,
    // trigger a save so omnichat_data stays in sync.
    if (Object.keys(state.apiKeys).length > 0 && !mainOk) {
      setTimeout(function() { saveToStorage(); }, 0);
    }

    return mainOk;
  }
