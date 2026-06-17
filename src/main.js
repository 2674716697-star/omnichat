/* ============================================================
   OmniChat — Multi-Model AI Chat Client (Mira)
   Entry point for ES module build.
   ============================================================ */

import { state } from './state.js';
import { dom, cacheDom } from './dom.js';
import { saveToStorage, loadFromStorage, debouncedSave } from './03_storage.js';
import { showToast } from './13_ui.js';
import { getAuthState, setAuthSession, clearAuthSession, syncAuthUI, detectAuthCallbackParams, cleanAuthCallbackUrl } from './10_auth.js';
import { init } from './99_legacy_main.js';

// Export for debug console
window.__omnichat = {
  get state() { return state; },
  get dom() { return dom; },
  showToast,
  saveToStorage,
  loadFromStorage,
};

// Boot
document.addEventListener('DOMContentLoaded', init);
