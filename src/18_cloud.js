// =========================================================================
// CLOUD BACKUP — Supabase cloud sync, restore, storage monitoring.
// Phase 3: Supabase is source of truth; localStorage is local cache.
// API keys are NEVER included in backup payloads.
// =========================================================================

import { state } from './state.js';
import { STORAGE_VERSION, SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY, getRuntimeConfigValue } from './01_constants.js';
import { debounce } from './02_utils.js';
import { saveToStorage, debouncedSave, overrideDebouncedSave, restoreDebouncedSave } from './03_storage.js';
import { getSupabaseAccessToken } from './99_legacy_main.js';
import { showToast } from './13_ui.js';

// ---- Internal state ----

var _backupTimer = null;
var _incrementalTimer = null;
var _cloudBackupMeta = null; // cached metadata from last checkCloudBackup
var _originalDebouncedSave = null;

// ---- Helpers ----

function _getBackupEndpoint() {
  var base = getRuntimeConfigValue('supabaseProjectUrl', SUPABASE_PROJECT_URL);
  return base + '/functions/v1/backup-sync';
}

async function _buildAuthHeaders() {
  var headers = { 'Content-Type': 'application/json' };
  try {
    var token = await getSupabaseAccessToken();
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
      var pk = getRuntimeConfigValue('supabasePublishableKey', SUPABASE_PUBLISHABLE_KEY);
      if (typeof pk === 'string' && pk) headers['apikey'] = pk;
    }
  } catch (e) { /* silent */ }
  return headers;
}

function _buildBackupPayload() {
  return {
    backupData: {
      version: STORAGE_VERSION,
      conversations: state.conversations,
      currentConversationId: state.currentConversationId,
      models: state.models,
      activeTheme: state.activeTheme || '',
      chatBackground: state.chatBackground,
      themeOverrides: state.themeOverrides,
      worldStarterEnabled: state.worldStarterEnabled,
      actionPrompts: state.actionPrompts,
      // apiKeys intentionally EXCLUDED
    },
    backupVersion: STORAGE_VERSION,
    conversationCount: state.conversations.length,
    messageCount: _countTotalMessages()
  };
}

function _countTotalMessages() {
  var total = 0;
  for (var i = 0; i < state.conversations.length; i++) {
    total += state.conversations[i].messages.length;
  }
  return total;
}

function _formatBackupTime(isoStr) {
  if (!isoStr) return '从未';
  var d = new Date(isoStr);
  var now = new Date();
  var diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  var m = d.getMonth() + 1;
  var day = d.getDate();
  var h = d.getHours();
  var min = String(d.getMinutes()).padStart(2, '0');
  return m + '/' + day + ' ' + h + ':' + min;
}

// ---- Core API ----

// POST full state backup to Supabase.
// Returns { ok, updatedAt } or null on failure.
export async function syncFullBackup() {
  try {
    var endpoint = _getBackupEndpoint();
    var headers = await _buildAuthHeaders();
    var payload = _buildBackupPayload();

    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 15000);

    try {
      var response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      console.warn('[Cloud] Backup sync failed: HTTP ' + response.status);
      return null;
    }

    var result = await response.json();
    if (result && result.ok) {
      _cloudBackupMeta = {
        backupVersion: payload.backupVersion,
        conversationCount: payload.conversationCount,
        messageCount: payload.messageCount,
        updatedAt: result.updatedAt || new Date().toISOString()
      };
      updateCloudBackupUI();
      return result;
    }
    console.warn('[Cloud] Backup sync: unexpected response', result);
    return null;
  } catch (e) {
    console.warn('[Cloud] Backup sync failed:', (e && e.message) || e);
    return null;
  }
}

// GET backup metadata from Supabase (no backup_data to save bandwidth).
// Returns { hasBackup, backupVersion, conversationCount, messageCount, updatedAt } or null.
export async function checkCloudBackup() {
  try {
    var endpoint = _getBackupEndpoint();
    var headers = await _buildAuthHeaders();

    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 8000);

    try {
      var response = await fetch(endpoint, {
        method: 'GET',
        headers: headers,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) return null;

    var result = await response.json();
    if (result) {
      _cloudBackupMeta = result;
      updateCloudBackupUI();
      return result;
    }
    return null;
  } catch (e) {
    console.warn('[Cloud] Check backup failed:', (e && e.message) || e);
    return null;
  }
}

// GET full backup data (including backup_data) for restore flow.
export async function fetchCloudBackupData() {
  try {
    var endpoint = _getBackupEndpoint() + '?full=true';
    var headers = await _buildAuthHeaders();

    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 15000);

    try {
      var response = await fetch(endpoint, {
        method: 'GET',
        headers: headers,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      console.warn('[Cloud] Fetch backup data failed: HTTP ' + response.status);
      return null;
    }

    var result = await response.json();
    return result && result.backupData ? result : null;
  } catch (e) {
    console.warn('[Cloud] Fetch backup data failed:', (e && e.message) || e);
    return null;
  }
}

// Restore from cloud: preview → confirm → merge → save.
// This is async and shows UI dialogs; called from button click.
export async function restoreFromCloud() {
  // Step 1: fetch metadata first (lightweight)
  var meta = await checkCloudBackup();
  if (!meta || !meta.hasBackup) {
    showToast('云端暂无备份数据', 'info');
    return;
  }

  // Step 2: show preview and confirm
  var convCount = meta.conversationCount || 0;
  var msgCount = meta.messageCount || 0;
  var timeStr = _formatBackupTime(meta.updatedAt);

  // Dynamically import showConfirm — avoids circular dependency at module level
  var confirmResult = await new Promise(function(resolve) {
    // Use a simple confirm pattern inline to avoid import complexity
    var msg = '云端备份包含 ' + convCount + ' 个会话、约 ' + msgCount + ' 条消息（' + timeStr + '）。\n\n恢复将合并云端数据到本地（云端会话覆盖本地同 ID 会话，本地独有会话保留）。\n\n是否继续？';
    if (typeof window !== 'undefined' && window.confirm) {
      resolve(window.confirm(msg));
    } else {
      resolve(false);
    }
  });

  if (!confirmResult) return;

  // Step 3: fetch full data
  showToast('正在从云端拉取数据…', 'info', 2000);
  var fullData = await fetchCloudBackupData();
  if (!fullData || !fullData.backupData) {
    showToast('云端数据拉取失败，请稍后重试', 'error');
    return;
  }

  try {
    var backupData = fullData.backupData;
    var cloudConvs = backupData.conversations || [];

    // Step 4: merge — cloud convs overwrite local by id, local-only convs kept
    var cloudIdMap = {};
    for (var ci = 0; ci < cloudConvs.length; ci++) {
      cloudIdMap[cloudConvs[ci].id] = true;
    }

    // Merge: replace local conv with cloud version if same id, keep local-only
    var merged = [];
    var localOnly = [];

    // First pass: add cloud convs + track which local convs are also in cloud
    var localIdsSeen = {};
    for (var i = 0; i < state.conversations.length; i++) {
      localIdsSeen[state.conversations[i].id] = true;
      if (!cloudIdMap[state.conversations[i].id]) {
        localOnly.push(state.conversations[i]);
      }
    }

    // Start with cloud conversations (source of truth for shared convs)
    merged = cloudConvs.slice();

    // Append local-only conversations
    for (var li = 0; li < localOnly.length; li++) {
      merged.push(localOnly[li]);
    }
    state.conversations = merged;

    // Restore settings (non-sensitive only)
    if (backupData.models) state.models = backupData.models;
    if (backupData.activeTheme) state.activeTheme = backupData.activeTheme;
    if (backupData.chatBackground !== undefined) state.chatBackground = backupData.chatBackground;
    if (backupData.themeOverrides) state.themeOverrides = backupData.themeOverrides;
    if (backupData.actionPrompts) state.actionPrompts = backupData.actionPrompts;

    // Ensure currentConversationId is valid
    if (backupData.currentConversationId) {
      var stillExists = state.conversations.some(function(c) { return c.id === backupData.currentConversationId; });
      state.currentConversationId = stillExists ? backupData.currentConversationId : (state.conversations.length > 0 ? state.conversations[0].id : null);
    }

    saveToStorage();

    // Refresh UI — use dynamic import to avoid circular deps
    var mainModule = await import('./99_legacy_main.js');
    if (mainModule.renderAll) mainModule.renderAll();

    showToast('已从云端恢复 ' + cloudConvs.length + ' 个会话', 'success');
  } catch (e) {
    console.error('[Cloud] Restore failed:', e);
    showToast('恢复失败：' + ((e && e.message) || '未知错误'), 'error');
  }
}

// ---- Scheduler ----

var _incrementalPending = false;
function _scheduleIncrementalSync() {
  if (_incrementalPending) return;
  _incrementalPending = true;
  if (_incrementalTimer) clearTimeout(_incrementalTimer);
  _incrementalTimer = setTimeout(function() {
    _incrementalPending = false;
    syncFullBackup();
  }, 2000);
}

// Start periodic full backup (30 min) + incremental sync (2s debounce after changes).
export function startCloudBackupScheduler() {
  // Guard: don't double-start
  if (_backupTimer) return;

  // Incremental sync: override debouncedSave to also push to cloud
  if (!_originalDebouncedSave) {
    _originalDebouncedSave = debouncedSave;
    overrideDebouncedSave(function() {
      _originalDebouncedSave();          // normal localStorage save
      _scheduleIncrementalSync();        // cloud sync (2s debounce)
    });
  }

  // Full periodic backup every 30 minutes
  _backupTimer = setInterval(function() {
    syncFullBackup();
  }, 30 * 60 * 1000);

  // Do an immediate check for existing cloud backup metadata
  checkCloudBackup();
}

// Stop all scheduled cloud activity (called on logout).
export function stopCloudBackupScheduler() {
  if (_backupTimer) {
    clearInterval(_backupTimer);
    _backupTimer = null;
  }
  if (_incrementalTimer) {
    clearTimeout(_incrementalTimer);
    _incrementalTimer = null;
  }
  _incrementalPending = false;

  // Restore original debouncedSave (local-only)
  if (_originalDebouncedSave) {
    restoreDebouncedSave();
    _originalDebouncedSave = null;
  }

  // Clear cached metadata
  _cloudBackupMeta = null;
  updateCloudBackupUI();
}

// ---- Storage monitoring ----

export async function getStorageUsage() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      var estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        percent: estimate.quota ? Math.round((estimate.usage / estimate.quota) * 1000) / 10 : 0
      };
    }
  } catch (e) { /* silent */ }

  // Fallback: estimate localStorage usage
  try {
    var total = 0;
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf('omnichat') === 0) {
        total += (localStorage.getItem(key) || '').length * 2; // UTF-16 approx
      }
    }
    return { usage: total, quota: 0, percent: 0, estimated: true };
  } catch (e) {
    return { usage: 0, quota: 0, percent: 0, error: true };
  }
}

// ---- UI sync ----

// Update the cloud backup settings card with current state.
// Call this after auth state changes or backup operations complete.
export function updateCloudBackupUI() {
  try {
    var isLoggedIn = !!(state._authState && state._authState.user);
    var loginPrompt = document.getElementById('cloudBackupLoginPrompt');
    var statusPanel = document.getElementById('cloudBackupStatus');

    if (loginPrompt) loginPrompt.style.display = isLoggedIn ? 'none' : '';
    if (statusPanel) statusPanel.style.display = isLoggedIn ? '' : 'none';

    if (!isLoggedIn) return;

    // Update backup time
    var timeEl = document.getElementById('lastBackupTime');
    if (timeEl) {
      timeEl.textContent = _cloudBackupMeta && _cloudBackupMeta.updatedAt
        ? _formatBackupTime(_cloudBackupMeta.updatedAt)
        : '从未';
    }

    // Update conversation count
    var countEl = document.getElementById('cloudConvCount');
    if (countEl) {
      countEl.textContent = _cloudBackupMeta && _cloudBackupMeta.hasBackup
        ? (_cloudBackupMeta.conversationCount || 0) + ' 个会话'
        : '--';
    }

    // Update storage usage
    getStorageUsage().then(function(s) {
      var textEl = document.getElementById('storageUsageText');
      var barEl = document.getElementById('storageUsageBar');
      if (textEl) {
        if (s.quota > 0) {
          textEl.textContent = _formatBytes(s.usage) + ' / ' + _formatBytes(s.quota) + ' (' + s.percent + '%)';
        } else if (s.estimated) {
          textEl.textContent = '~' + _formatBytes(s.usage) + '（仅 omnichat 数据）';
        } else {
          textEl.textContent = '无法获取';
        }
      }
      if (barEl) {
        var pct = Math.min(s.percent || 0, 100);
        barEl.style.width = pct + '%';
        barEl.classList.remove('warning', 'danger');
        if (pct > 80) barEl.classList.add('danger');
        else if (pct > 50) barEl.classList.add('warning');
      }
    }).catch(function() {});
  } catch (e) { /* UI sync should never throw */ }
}

function _formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
