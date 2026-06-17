// =========================================================================
// STATE — runtime application state (persisted to localStorage)
// Single source of truth for the entire application.
// Imported by every module that reads or writes application state.
// =========================================================================

export const state = {
  conversations: [],
  currentConversationId: null,
  apiKeys: {},
  models: { xai: [], deepseek: [], openai: [], openrouter: [], groq: [], moonshot: [], zhipu: [], siliconflow: [] },
  chatBackground: { type: 'none', value: '', opacity: 35 },
  themeOverrides: {},
  activeTheme: '',
  actionPrompts: { regenerate: '', continue: '', summarize: '', elaborate: '' },
  worldStarterEnabled: false,
  schemaVersion: 0,
  abortController: null,
  isStreaming: false,
  pendingRenameId: null,
  pendingConfirmAction: null,
  pendingHiddenRequest: null,
  ui: {
    isHistoryOpen: false,
    isSettingsOpen: false,
    isThemeOpen: false,
    autoFollowStreaming: true,
    userScrolling: false,
    lastUserScrollAt: 0,
    programmaticScroll: false,
    detachedDuringStreaming: false,
    pendingStreamRender: false,
    detachedContentDirty: false,
    detachedMessageCount: 0,
  },
  _remoteMemoryPrefetchLocks: {},
};
