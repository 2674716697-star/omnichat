// =========================================================================
// STORAGE — localStorage save/load, conversation persistence
// =========================================================================

import { STORAGE_KEY, SECRETS_STORAGE_KEY, PREFS_STORAGE_KEY, STORAGE_VERSION, ERR_MSGS } from './01_constants.js';
import { debounce } from './02_utils.js';
import { state } from './state.js';
import {
  syncLegacyToStoryMode,
  createSceneState, createSceneWorld, createSceneCharacter, createSceneStatus,
  normalizeSceneNpcs, migrateStoryMode, normalizeConversation
} from './04_migration.js';
import { showToast } from './13_ui.js';

export function saveSecretsAndPrefs() {
  var hasKeys = Object.keys(state.apiKeys).length > 0;
  if (!hasKeys) {
    try {
      var existingSecrets = localStorage.getItem(SECRETS_STORAGE_KEY);
      if (existingSecrets && existingSecrets !== '{}') return;
    } catch(e) { console.warn('[Storage] secrets read failed:', e); }
  }
  if (hasKeys) {
    try {
      localStorage.setItem(SECRETS_STORAGE_KEY, JSON.stringify(state.apiKeys));
    } catch(e) { console.warn('[Storage] secrets read failed:', e); }
  }

  var hasModels = state.models && Object.keys(state.models).some(function(k) {
    return Array.isArray(state.models[k]) && state.models[k].length > 0;
  });
  var hasPrefs = hasModels || state.activeTheme || (state.chatBackground && state.chatBackground.type !== 'none');
  if (!hasPrefs) {
    try {
      var existingPrefs = localStorage.getItem(PREFS_STORAGE_KEY);
      if (existingPrefs && existingPrefs !== '{}') return;
    } catch(e) { console.warn('[Storage] secrets read failed:', e); }
  }
  if (hasPrefs) {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({
        models: state.models,
        activeTheme: state.activeTheme || '',
        chatBackground: state.chatBackground,
        themeOverrides: state.themeOverrides,
        worldStarterEnabled: state.worldStarterEnabled,
        actionPrompts: state.actionPrompts,
      }));
    } catch(e) { console.warn('[Storage] secrets read failed:', e); }
  }
}

export function loadSecretsAndPrefs() {
  try {
    var secretsRaw = localStorage.getItem(SECRETS_STORAGE_KEY);
    if (secretsRaw) {
      var secrets = JSON.parse(secretsRaw);
      if (secrets && typeof secrets === 'object' && Object.keys(secrets).length > 0) {
        state.apiKeys = secrets;
      }
    }
  } catch(e) { console.warn('[Storage] parse failed:', e); }

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
  } catch(e) { console.warn('[Storage] parse failed:', e); }
}

export function saveToStorage() {
  try {
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
    saveSecretsAndPrefs();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      showToast(ERR_MSGS.storageFailed, 'error');
      saveSecretsAndPrefs();
    }
  }
}

export let debouncedSave = debounce(saveToStorage, 500);

export function overrideDebouncedSave(fn) {
  debouncedSave = fn;
}

export function restoreDebouncedSave() {
  debouncedSave = debounce(saveToStorage, 500);
}

export function loadFromStorage() {
  loadSecretsAndPrefs();

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
        migrateStoryMode(conv);
      });
      window.__migrated = false;
      state.conversations = state.conversations.map(normalizeConversation);
      if (window.__migrated) setTimeout(function() { saveToStorage(); }, 0);
      state.currentConversationId = data.currentConversationId || null;

      var hasSecrets = Object.keys(state.apiKeys).length > 0;
      if (!hasSecrets && data.apiKeys) {
        state.apiKeys = data.apiKeys;
      } else if (!hasSecrets) {
        state.apiKeys = {};
        if (data.xaiApiKey) state.apiKeys.xai = data.xaiApiKey;
        if (data.deepseekApiKey) state.apiKeys.deepseek = data.deepseekApiKey;
      }

      var defaultModels = { xai: [], deepseek: [], openai: [], openrouter: [], groq: [], moonshot: [], zhipu: [], siliconflow: [] };
      if (!state.models || Object.keys(state.models).length === 0) {
        state.models = data.models || defaultModels;
      }
      if (!state.activeTheme && data.activeTheme) {
        state.activeTheme = data.activeTheme;
      }
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
      if (!state.themeOverrides || Object.keys(state.themeOverrides).length === 0) {
        if (data.themeOverrides) state.themeOverrides = data.themeOverrides;
      }
      mainOk = true;
    }
  } catch (e) {
    console.warn('[OmniChat] 主数据加载失败，已清除损坏数据并恢复密钥和设置。', e);
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { console.warn('[Storage] removeItem failed:', _); }
    mainOk = false;
  }

  var defaultActionPrompts = { regenerate: '', continue: '', summarize: '', elaborate: '' };
  if (state.actionPrompts) {
    for (var ak in defaultActionPrompts) {
      if (defaultActionPrompts.hasOwnProperty(ak) && !state.actionPrompts.hasOwnProperty(ak)) {
        state.actionPrompts[ak] = defaultActionPrompts[ak];
      }
    }
  }

  if (Object.keys(state.apiKeys).length > 0 && !mainOk) {
    setTimeout(function() { saveToStorage(); }, 0);
  }

  var hasMainData = raw && raw !== '{}';
  var hasSecrets = Object.keys(state.apiKeys).length > 0;
  window.__freshInstall = !hasMainData && !hasSecrets;

  var modelProviders = 0;
  if (state.models) {
    for (var mk in state.models) {
      if (state.models.hasOwnProperty(mk) && Array.isArray(state.models[mk]) && state.models[mk].length > 0) {
        modelProviders++;
      }
    }
  }
  console.log('[OmniChat] 存储加载完成:', {
    conversations: state.conversations.length,
    apiKeys: Object.keys(state.apiKeys).length + ' providers',
    models: modelProviders + ' providers with models',
    mainOk: mainOk,
    freshInstall: window.__freshInstall
  });

  return mainOk;
}
