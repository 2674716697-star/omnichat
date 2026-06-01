  // =========================================================================
  // STORAGE — localStorage save/load, conversation persistence
  // =========================================================================

  function saveToStorage() {
    try {
      // Sync legacy scene fields → storyMode on all conversations before save
      for (var si = 0; si < state.conversations.length; si++) {
        syncLegacyToStoryMode(state.conversations[si]);
      }
      const data = {
        version: STORAGE_VERSION,
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
        apiKeys: state.apiKeys,
        models: state.models,
        chatBackground: state.chatBackground,
        worldStarterEnabled: state.worldStarterEnabled,
        actionPrompts: state.actionPrompts,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        showToast(ERR_MSGS.storageFailed, 'error');
      }
    }
  }

  let debouncedSave = debounce(saveToStorage, 500);

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      state.conversations = data.conversations || [];
      state.conversations.forEach((conv) => {
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
      if (data.apiKeys) {
        state.apiKeys = data.apiKeys;
      } else {
        // Migrate old format
        state.apiKeys = {};
        if (data.xaiApiKey) state.apiKeys.xai = data.xaiApiKey;
        if (data.deepseekApiKey) state.apiKeys.deepseek = data.deepseekApiKey;
      }
      state.models = data.models || { xai: [], deepseek: [], openai: [], openrouter: [], groq: [], moonshot: [], zhipu: [], siliconflow: [] };
      state.chatBackground = data.chatBackground || { type: 'none', value: '', opacity: 35 };
      state.worldStarterEnabled = data.worldStarterEnabled || false;
      state.actionPrompts = data.actionPrompts || { regenerate: '', continue: '', summarize: '', elaborate: '' };
      return true;
    } catch (e) {
      showToast('数据加载失败，将使用全新状态。', 'warning');
      return false;
    }
  }
