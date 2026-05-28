/* ============================================================
   OmniChat — Multi-Model AI Chat Client
   Pure JS, modular, production-grade
   ============================================================ */

(function () {
  'use strict';

  // =========================================================================
  // CONSTANTS
  // =========================================================================

  const STORAGE_KEY = 'omnichat_data';
  const STORAGE_VERSION = 1;

  const PROVIDERS = {
    openai: {
      name: 'OpenAI',
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      modelsUrl: 'https://api.openai.com/v1/models',
      keyHint: 'sk-...',
    },
    xai: {
      name: 'xAI / Grok',
      apiUrl: 'https://api.x.ai/v1/chat/completions',
      modelsUrl: 'https://api.x.ai/v1/models',
      keyHint: 'xai-...',
    },
    deepseek: {
      name: 'DeepSeek',
      apiUrl: 'https://api.deepseek.com/chat/completions',
      modelsUrl: 'https://api.deepseek.com/models',
      keyHint: 'sk-...',
    },
    openrouter: {
      name: 'OpenRouter',
      apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
      modelsUrl: 'https://openrouter.ai/api/v1/models',
      keyHint: 'sk-or-...',
    },
    groq: {
      name: 'Groq',
      apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
      modelsUrl: 'https://api.groq.com/openai/v1/models',
      keyHint: 'gsk_...',
    },
    moonshot: {
      name: 'Moonshot',
      apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
      modelsUrl: 'https://api.moonshot.cn/v1/models',
      keyHint: 'sk-...',
    },
    zhipu: {
      name: '智谱 GLM',
      apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      modelsUrl: 'https://open.bigmodel.cn/api/paas/v4/models',
      keyHint: 'xxx.xxx',
    },
    siliconflow: {
      name: 'SiliconFlow',
      apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
      modelsUrl: 'https://api.siliconflow.cn/v1/models',
      keyHint: 'sk-...',
    },
  };

  const DEFAULTS = {
    temperature: 0.7,
    topP: 1,
    maxTokens: 2000,
    stream: true,
    toolCallLimit: 0,
    toolCallLimitMode: 'disabled',
    systemPrompt: '',
    enableCaching: true,
    preciseMode: false,
  };

  const SYSTEM_PROMPT_PRECISE = 'You are a precise, factual AI assistant. Ground every answer in verifiable knowledge. If unsure, explicitly state your uncertainty and confidence level. Never fabricate data, citations, dates, URLs, or technical details. Prefer saying "I don\'t know" over speculation. Use clear, structured responses. Cite reasoning steps when helpful.';

  const SYSTEM_PROMPT_DEFAULT = 'You are a helpful, accurate AI assistant. Answer based on facts and knowledge. Use clear, concise language. Avoid speculation and hallucination. If unsure, say so honestly.';

  const ERR_MSGS = {
    noApiKey: '请先在设置中填写 API Key。',
    noModel: '请先选择或输入模型名称。',
    network: '网络请求失败，请检查网络连接。',
    unauthorized: 'API Key 无效或无权限 (401)。',
    insufficientBalance: '余额不足，请充值后重试。',
    rateLimited: '请求过于频繁，请稍后重试 (429)。',
    modelNotFound: '模型不存在，请检查模型名称。',
    cors: '浏览器跨域限制，无法直接请求 API。可尝试本地代理方式。',
    contextTooLong: '上下文过长，请手动清理部分历史消息后重试。',
    userAborted: '请求已被停止。',
    storageFailed: 'localStorage 保存失败，请导出数据备份。',
    importFailed: 'JSON 导入失败，请检查文件格式。',
    serverError: '服务商接口异常，请稍后重试。',
    streamParseError: '流式响应解析失败。',
    toolNotImplemented: '当前版本仅预留工具调用配置，尚未执行外部工具。',
  };

  // =========================================================================
  // STATE
  // =========================================================================

  const state = {
    conversations: [],
    currentConversationId: null,
    apiKeys: {},
    models: { xai: [], deepseek: [], openai: [], openrouter: [], groq: [], moonshot: [], zhipu: [], siliconflow: [] },
    chatBackground: { type: 'none', value: '', opacity: 35 },
    actionPrompts: { regenerate: '', continue: '', summarize: '', elaborate: '' },
    abortController: null,
    isStreaming: false,
    pendingRenameId: null,
    pendingConfirmAction: null,
    ui: {
      isHistoryOpen: false,
      isSettingsOpen: false,
    },
  };

  // =========================================================================
  // DOM REFS
  // =========================================================================

  const $ = (sel) => document.querySelector(sel);

  const dom = {};
  function cacheDom() {
    dom.splash = $('#splash');
    dom.appContainer = $('#appContainer');
    dom.topBar = $('#topBar');
    dom.btnToggleHistory = $('#btnToggleHistory');
    dom.btnToggleSettings = $('#btnToggleSettings');
    dom.btnToggleBg = $('#btnToggleBg');
    dom.securityPull = $('#securityPull');
    dom.securityPanel = $('#securityPanel');
    dom.topBarInfo = $('#topBarInfo');
    dom.convTitle = $('#convTitle');
    dom.badgeProvider = $('#badgeProvider');
    dom.badgeModel = $('#badgeModel');
    dom.contextStats = $('#contextStats');

    dom.historyOverlay = $('#historyOverlay');
    dom.historyDrawer = $('#historyDrawer');
    dom.btnCloseHistory = $('#btnCloseHistory');
    dom.btnToggleArchived = $('#btnToggleArchived');
    dom.archivedCount = $('#archivedCount');
    dom.searchInput = $('#searchInput');
    dom.convList = $('#convList');
    dom.btnExportAll = $('#btnExportAll');
    dom.btnImport = $('#btnImport');
    dom.btnClearAll = $('#btnClearAll');
    dom.btnClearArchived = $('#btnClearArchived');
    dom.importFileInput = $('#importFileInput');

    dom.settingsOverlay = $('#settingsOverlay');
    dom.settingsDrawer = $('#settingsDrawer');
    dom.btnCloseSettings = $('#btnCloseSettings');
    dom.selectProvider = $('#selectProvider');
    dom.inputApiKey = $('#inputApiKey');
    dom.labelApiKey = $('#labelApiKey');
    dom.apiKeyHint = $('#apiKeyHint');
    dom.selectModel = $('#selectModel');
    dom.modelHint = $('#modelHint');
    dom.btnRefreshModels = $('#btnRefreshModels');
    dom.inputCustomModel = $('#inputCustomModel');
    dom.inputSystemPrompt = $('#inputSystemPrompt');
    dom.inputTemperature = $('#inputTemperature');
    dom.tempVal = $('#tempVal');
    dom.inputTopP = $('#inputTopP');
    dom.topPVal = $('#topPVal');
    dom.inputMaxTokens = $('#inputMaxTokens');
    dom.inputStream = $('#inputStream');
    dom.inputCaching = $('#inputCaching');
    dom.inputPreciseMode = $('#inputPreciseMode');
    dom.selectToolCallLimit = $('#selectToolCallLimit');
    dom.chatBgOverlay = $('#chatBgOverlay');
    dom.bgPresets = $('#bgPresets');
    dom.inputBgOpacity = $('#inputBgOpacity');
    dom.btnPickBgImage = $('#btnPickBgImage');
    dom.btnRemoveBgImage = $('#btnRemoveBgImage');
    dom.inputBgFile = $('#inputBgFile');
    dom.inputActionRegenerate = $('#inputActionRegenerate');
    dom.inputActionContinue = $('#inputActionContinue');
    dom.inputActionSummarize = $('#inputActionSummarize');
    dom.inputActionElaborate = $('#inputActionElaborate');
    dom.inputSceneMode = $('#inputSceneMode');
    dom.inputAutoCompress = $('#inputAutoCompress');
    dom.scenePanel = $('#scenePanel');
    dom.scenePanelToggle = $('#scenePanelToggle');
    dom.scenePanelBody = $('#scenePanelBody');
    dom.sceneMental = $('#sceneMental');
    dom.scenePhysical = $('#scenePhysical');
    dom.scenePlot = $('#scenePlot');
    dom.toolWarning = $('#toolWarning');

    dom.mainContent = $('#mainContent');
    dom.messagesContainer = $('#messagesContainer');
    dom.welcomeScreen = $('#welcomeScreen');
    dom.welcomeStatus = $('#welcomeStatus');
    dom.welcomeApiStep = $('#welcomeApiStep');
    dom.welcomeModelStep = $('#welcomeModelStep');
    dom.welcomeHint = $('#welcomeHint');
    dom.btnWelcomeSetup = $('#btnWelcomeSetup');
    dom.btnWelcomeHistory = $('#btnWelcomeHistory');

    dom.bottomBar = $('#bottomBar');
    dom.inputMessage = $('#inputMessage');
    dom.btnSend = $('#btnSend');
    dom.btnStop = $('#btnStop');

    dom.toastContainer = $('#toastContainer');
    dom.dialogOverlay = $('#dialogOverlay');
    dom.dialogBody = $('#dialogBody');
    dom.dialogConfirm = $('#dialogConfirm');
    dom.dialogCancel = $('#dialogCancel');
    dom.renameDialogOverlay = $('#renameDialogOverlay');
    dom.renameInput = $('#renameInput');
    dom.renameConfirm = $('#renameConfirm');
    dom.renameCancel = $('#renameCancel');
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function escapeHtml(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(str).replace(/[&<>"']/g, (c) => map[c]);
  }

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // =========================================================================
  // STORAGE
  // =========================================================================

  function saveToStorage() {
    try {
      const data = {
        version: STORAGE_VERSION,
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
        apiKeys: state.apiKeys,
        models: state.models,
        chatBackground: state.chatBackground,
        actionPrompts: state.actionPrompts,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        showToast(ERR_MSGS.storageFailed, 'error');
      }
    }
  }

  const debouncedSave = debounce(saveToStorage, 500);

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      state.conversations = data.conversations || [];
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
      state.actionPrompts = data.actionPrompts || { regenerate: '', continue: '', summarize: '', elaborate: '' };
      return true;
    } catch (e) {
      showToast('数据加载失败，将使用全新状态。', 'warning');
      return false;
    }
  }

  // =========================================================================
  // TOAST
  // =========================================================================

  function showToast(msg, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 200ms ease';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  // =========================================================================
  // DIALOG
  // =========================================================================

  function showConfirm(msg, onConfirm) {
    // Reset button state to defaults
    dom.dialogConfirm.textContent = '确认';
    dom.dialogConfirm.className = 'btn btn-danger';
    dom.dialogCancel.textContent = '取消';
    state.pendingConfirmAction = onConfirm;
    dom.dialogBody.innerHTML = msg;
    dom.dialogOverlay.style.display = 'flex';
  }

  function hideConfirm() {
    state.pendingConfirmAction = null;
    dom.dialogOverlay.style.display = 'none';
  }

  function showRenameDialog(id, currentTitle) {
    state.pendingRenameId = id;
    dom.renameInput.value = currentTitle || '';
    dom.renameDialogOverlay.style.display = 'flex';
    setTimeout(() => dom.renameInput.focus(), 100);
  }

  function hideRenameDialog() {
    state.pendingRenameId = null;
    dom.renameDialogOverlay.style.display = 'none';
  }

  function showUpdateDialog() {
    dom.dialogBody.innerHTML = '发现新版本，已下载就绪。<br><br>是否立即重启应用？';
    dom.dialogConfirm.textContent = '重启更新';
    dom.dialogConfirm.className = 'btn btn-primary';
    dom.dialogCancel.textContent = '稍后';
    dom.dialogOverlay.style.display = 'flex';

    state.pendingConfirmAction = function () {
      hideConfirm();
      if (window.__pendingWorker) {
        window.__pendingWorker.postMessage({ type: 'SKIP_WAITING' });
      } else if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      }
      setTimeout(function () {
        window.location.reload();
      }, 1500);
    };
  }

  // =========================================================================
  // CONVERSATION HELPERS
  // =========================================================================

  function getCurrentConv() {
    return state.conversations.find((c) => c.id === state.currentConversationId) || null;
  }

  function createConversation(provider) {
    const p = provider || 'openai';
    return {
      id: generateId(),
      title: '新对话',
      createdAt: nowISO(),
      updatedAt: nowISO(),
      provider: p,
      model: '',
      customModel: '',
      systemPrompt: DEFAULTS.systemPrompt,
      temperature: DEFAULTS.temperature,
      topP: DEFAULTS.topP,
      maxTokens: DEFAULTS.maxTokens,
      stream: DEFAULTS.stream,
      toolCallLimit: DEFAULTS.toolCallLimit,
      toolCallLimitMode: DEFAULTS.toolCallLimitMode,
      enableCaching: DEFAULTS.enableCaching,
      preciseMode: DEFAULTS.preciseMode,
      archived: false,
      sceneMode: false,
      sceneState: { mental: '', physical: '', plot: '' },
      autoCompress: false,
      messages: [],
    };
  }

  function autoTitle(conv) {
    const firstUser = conv.messages.find((m) => m.role === 'user');
    if (firstUser) {
      const text = String(firstUser.content || '').replace(/\s+/g, ' ').trim();
      conv.title = text.length > 24 ? text.slice(0, 24) + '…' : text;
    }
  }

  function updateTimestamp(conv) {
    conv.updatedAt = nowISO();
  }

  function countApproxChars(conv) {
    let total = 0;
    if (conv.systemPrompt) total += conv.systemPrompt.length;
    for (const m of conv.messages) {
      total += String(m.content || '').length;
    }
    return total;
  }

  function getApiKey(provider) {
    return state.apiKeys[provider] || '';
  }

  function getProviderConfig(provider) {
    return PROVIDERS[provider] || PROVIDERS.xai;
  }

  function resolveModel(conv) {
    return conv.customModel || conv.model || '';
  }

  function isAnthropicModel(modelId) {
    if (!modelId) return false;
    const lower = modelId.toLowerCase();
    return lower.includes('claude') || lower.startsWith('anthropic/');
  }

  function autoArchiveCheck() {
    const now = Date.now();
    const threshold = 60 * 60 * 1000; // 1 hour idle
    const minMessages = 2; // ≤ 2 messages = barely used
    let archivedCount = 0;

    for (const conv of state.conversations) {
      if (conv.archived) continue;
      if (conv.messages.length > minMessages) continue;
      const updated = new Date(conv.updatedAt).getTime();
      if (now - updated < threshold) continue;
      // Only archive if it's not the currently active conversation
      if (conv.id === state.currentConversationId) continue;
      conv.archived = true;
      archivedCount++;
    }

    if (archivedCount > 0) {
      saveToStorage();
      renderConvList();
    }
  }

  function toggleConversationArchive(id) {
    const conv = state.conversations.find((c) => c.id === id);
    if (!conv) return;
    conv.archived = !conv.archived;
    updateTimestamp(conv);
    saveToStorage();
    renderConvList();
    const label = conv.archived ? '已归档' : '已取消归档';
    showToast(label, 'info');
  }

  function toggleShowArchived() {
    state.showArchived = !state.showArchived;
    renderConvList();
  }

  // =========================================================================
  // DRAWER MANAGEMENT
  // =========================================================================

  function openDrawer(side) {
    if (side === 'history') {
      dom.historyDrawer.classList.add('open');
      dom.historyOverlay.classList.add('open');
      state.ui.isHistoryOpen = true;
      renderConvList();
      setTimeout(() => dom.searchInput.focus(), 300);
    } else {
      dom.settingsDrawer.classList.add('open');
      dom.settingsOverlay.classList.add('open');
      state.ui.isSettingsOpen = true;
      syncSettingsToUI();
    }
  }

  function closeDrawer(side) {
    if (side === 'history') {
      dom.historyDrawer.classList.remove('open');
      dom.historyOverlay.classList.remove('open');
      state.ui.isHistoryOpen = false;
    } else {
      dom.settingsDrawer.classList.remove('open');
      dom.settingsOverlay.classList.remove('open');
      state.ui.isSettingsOpen = false;
    }
  }

  function closeAllDrawers() {
    if (state.ui.isHistoryOpen) closeDrawer('history');
    if (state.ui.isSettingsOpen) closeDrawer('settings');
  }

  // =========================================================================
  // RENDER: CONVERSATION LIST
  // =========================================================================

  function renderConvList() {
    const query = (dom.searchInput.value || '').toLowerCase().trim();
    const showArchived = state.showArchived || query;
    let list = state.conversations;

    // Filter by archive status (unless searching); always show active conv
    if (!query) {
      list = list.filter((c) => c.id === state.currentConversationId || showArchived || !c.archived);
    }

    // Search filter
    if (query) {
      list = list.filter((c) => {
        if (c.title.toLowerCase().includes(query)) return true;
        return c.messages.some((m) => String(m.content || '').toLowerCase().includes(query));
      });
    }

    list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (list.length === 0) {
      dom.convList.innerHTML = '<div class="empty-state">' + (query ? '无匹配会话' : '暂无历史会话') + '</div>';
      return;
    }

    // Split into active and archived for display
    const activeList = list.filter((c) => !c.archived);
    const archivedList = list.filter((c) => c.archived);

    function renderItem(c) {
      const isActive = c.id === state.currentConversationId;
      const msgCount = c.messages.length;
      const dateStr = formatDate(c.updatedAt);
      const providerName = (PROVIDERS[c.provider] || PROVIDERS.openai).name;
      const archiveAction = c.archived ? 'unarchive' : 'archive';
      const archiveIcon = c.archived
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>';
      return (
        '<div class="conv-item' + (isActive ? ' active' : '') + (c.archived ? ' archived' : '') + '" data-id="' + c.id + '">' +
        '<div class="conv-item-content">' +
        '<div class="conv-item-title">' + escapeHtml(c.title) + (c.archived ? ' <span class="archive-badge">归档</span>' : '') + '</div>' +
        '<div class="conv-item-meta">' +
        '<span>' + providerName + '</span>' +
        '<span>' + msgCount + ' 条</span>' +
        '<span>' + dateStr + '</span>' +
        '</div></div>' +
        '<div class="conv-item-actions">' +
        '<button class="conv-item-btn" data-action="archive" data-id="' + c.id + '" aria-label="归档">' + archiveIcon + '</button>' +
        '<button class="conv-item-btn" data-action="rename" data-id="' + c.id + '" aria-label="重命名">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>' +
        '</button>' +
        '<button class="conv-item-btn danger" data-action="delete" data-id="' + c.id + '" aria-label="删除">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
        '</button></div></div>'
      );
    }

    let html = '';
    for (const c of activeList) {
      html += renderItem(c);
    }

    if (archivedList.length > 0) {
      html += '<div class="archive-section-header">归档 · ' + archivedList.length + ' 个会话</div>';
      for (const c of archivedList) {
        html += renderItem(c);
      }
    }

    dom.convList.innerHTML = html;

    // Update archive toggle state
    const totalArchived = state.conversations.filter((c) => c.archived).length;
    dom.archivedCount.textContent = totalArchived > 0 ? totalArchived : '';
    dom.btnToggleArchived.classList.toggle('active', state.showArchived);
    if (totalArchived === 0) {
      dom.btnToggleArchived.style.opacity = '0.4';
    } else {
      dom.btnToggleArchived.style.opacity = '';
    }
  }

  function formatDate(isoStr) {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin} 分钟前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} 小时前`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay} 天前`;

    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${m}/${day}`;
  }

  // =========================================================================
  // RENDER: MESSAGES
  // =========================================================================

  function renderMessages() {
    const conv = getCurrentConv();
    if (!conv) {
      dom.messagesContainer.innerHTML = '';
      dom.welcomeScreen.classList.remove('hidden');
      dom.messagesContainer.appendChild(dom.welcomeScreen);
      return;
    }

    const messages = conv.messages;
    if (messages.length === 0) {
      dom.welcomeScreen.classList.remove('hidden');
      dom.messagesContainer.innerHTML = '';
      dom.messagesContainer.appendChild(dom.welcomeScreen);
      return;
    }

    dom.welcomeScreen.classList.add('hidden');

    // Diff-based update: compare existing DOM with needed messages
    const existingItems = dom.messagesContainer.querySelectorAll('.message');
    const existingCount = existingItems.length;

    // If counts differ dramatically, full render
    if (Math.abs(existingCount - messages.length) > 1) {
      fullRenderMessages(messages);
      return;
    }

    // If last message is/was streaming, update it (handles both adding and removing cursor)
    const lastMsg = messages[messages.length - 1];
    const lastExisting = dom.messagesContainer.querySelector('.message:last-child');
    const hasCursor = lastExisting && lastExisting.querySelector('.streaming-cursor');
    if (lastMsg && (lastMsg._streaming || hasCursor) && existingCount === messages.length) {
      updateLastBubble(lastMsg);
      return;
    }

    // Add new messages not yet rendered
    if (messages.length > existingCount) {
      dom.welcomeScreen.classList.add('hidden');
      for (let i = existingCount; i < messages.length; i++) {
        const el = createMessageElement(messages[i], i);
        dom.messagesContainer.appendChild(el);
      }
    }
  }

  function fullRenderMessages(messages) {
    // Remove only message elements, keep welcome screen
    dom.messagesContainer.querySelectorAll('.message').forEach((el) => el.remove());
    dom.welcomeScreen.classList.add('hidden');
    for (let i = 0; i < messages.length; i++) {
      const el = createMessageElement(messages[i], i);
      dom.messagesContainer.appendChild(el);
    }
  }

  function renderContentFast(text) {
    // Fast path for streaming: just escape + newlines, skip full markdown parse
    return escapeHtml(String(text || '')).replace(/\n/g, '<br>');
  }

  function renderBubbleHTML(msg) {
    // Build inner HTML for an assistant message bubble
    let html = '';

    // Thinking / reasoning section
    const reasoning = msg.reasoning || '';
    if (reasoning) {
      const isStreamingReasoning = msg._streaming && !msg.content;
      const openAttr = isStreamingReasoning ? ' open' : '';
      const reasonHTML = msg._streaming ? renderContentFast(reasoning) : renderMarkdown(reasoning);
      html += '<details class="thinking-section"' + openAttr + '>';
      html += '<summary class="thinking-header">思考过程</summary>';
      html += '<div class="thinking-content">' + reasonHTML + '</div>';
      html += '</details>';
    }

    // Main content - fast path during streaming, full markdown when done
    const contentHTML = msg._streaming
      ? renderContentFast(msg.content || '')
      : renderMarkdown(String(msg.content || ''));
    html += '<div class="message-content">' + contentHTML + '</div>';

    // Token usage
    if (msg.usage && !msg._streaming) {
      const u = msg.usage;
      html += '<div class="token-usage">';
      html += 'Tokens: ' + (u.prompt_tokens || 0).toLocaleString() + ' 入';
      html += ' + ' + (u.completion_tokens || 0).toLocaleString() + ' 出';
      if (u.total_tokens) {
        html += ' = ' + u.total_tokens.toLocaleString() + ' 总';
      }
      // Cache tokens (Anthropic)
      if (u.cache_read_input_tokens) {
        html += ' · <span class="cache-hit">缓存命中 ' + u.cache_read_input_tokens.toLocaleString() + '</span>';
      }
      if (u.cache_creation_input_tokens) {
        html += ' · <span class="cache-new">新建缓存 ' + u.cache_creation_input_tokens.toLocaleString() + '</span>';
      }
      if (u.completion_tokens_details && u.completion_tokens_details.reasoning_tokens) {
        html += ' (含 ' + u.completion_tokens_details.reasoning_tokens.toLocaleString() + ' 思考)';
      }
      html += '</div>';
    }

    // Post-response action buttons
    if (msg._showActions && !msg._streaming) {
      html += '<div class="msg-actions" data-msg-index="' + (msg._actionIndex || '') + '">';
      html += '<button class="btn-msg-action" data-action="regenerate" title="重新生成">';
      html += '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>';
      html += '重新生成</button>';
      html += '<button class="btn-msg-action" data-action="continue" title="继续生成">';
      html += '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
      html += '继续生成</button>';
      html += '<button class="btn-msg-action" data-action="summarize" title="生成摘要">';
      html += '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>';
      html += '生成摘要</button>';
      html += '<button class="btn-msg-action" data-action="elaborate" title="深入探讨">';
      html += '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>';
      html += '深入探讨</button>';
      html += '</div>';
    }

    return html;
  }

  function createMessageElement(msg, index) {
    const div = document.createElement('div');
    div.className = `message ${msg.role}`;
    div.setAttribute('data-index', index);

    if (msg.role === 'system-info') {
      div.innerHTML = '<div class="message-bubble">' + escapeHtml(msg.content) + '</div>';
    } else if (msg.role === 'assistant') {
      const roleLabel = 'AI';
      const bubbleClass = msg._streaming ? 'message-bubble streaming-cursor' : 'message-bubble';
      div.innerHTML = '<div class="message-role">' + roleLabel + '</div><div class="' + bubbleClass + '">' + renderBubbleHTML(msg) + '</div>';
    } else {
      const roleLabel = 'You';
      div.innerHTML = '<div class="message-role">' + roleLabel + '</div><div class="message-bubble">' + renderMarkdown(String(msg.content || '')) + '</div>';
    }

    return div;
  }

  function updateLastBubble(msg) {
    const items = dom.messagesContainer.querySelectorAll('.message');
    const lastItem = items[items.length - 1];
    if (!lastItem) return;
    const bubble = lastItem.querySelector('.message-bubble');
    if (!bubble) return;

    if (msg._streaming) {
      // Fast path: only update text content, skip full DOM rebuild
      let contentDiv = bubble.querySelector('.message-content');
      if (contentDiv) {
        contentDiv.innerHTML = renderContentFast(msg.content || '');
      }
      // Update thinking section if reasoning is streaming
      const reasoning = msg.reasoning || '';
      if (reasoning) {
        let thinkDiv = bubble.querySelector('.thinking-content');
        if (!thinkDiv) {
          // Thinking section doesn't exist yet, need full rebuild
          bubble.innerHTML = renderBubbleHTML(msg);
        } else {
          thinkDiv.innerHTML = renderContentFast(reasoning);
          // Ensure details is open during reasoning
          const details = bubble.querySelector('.thinking-section');
          if (details && !msg.content) details.open = true;
        }
      }
      bubble.classList.add('streaming-cursor');
    } else {
      // Full render when streaming ends — proper markdown everywhere
      bubble.innerHTML = renderBubbleHTML(msg);
      bubble.classList.remove('streaming-cursor');
    }
  }

  // =========================================================================
  // MARKDOWN RENDERER (no external libs)
  // =========================================================================

  function renderMarkdown(text) {
    let html = escapeHtml(text);

    // Code blocks: ```lang\ncode\n```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const langTag = lang ? `<div style="font-size:10px;color:var(--text-tertiary);padding:4px 14px 0;text-transform:uppercase;letter-spacing:0.5px">${escapeHtml(lang)}</div>` : '';
      return `${langTag}<pre><code>${code.trimEnd()}</code></pre>`;
    });

    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold: **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Images: ![alt](url)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:4px 0">');

    // Links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Auto-link bare URLs
    html = html.replace(/(?<!["'>])(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

    // Headers: ### text (at line start)
    html = html.replace(/^### (.+)$/gm, '<h4 style="font-size:15px;margin:10px 0 4px">$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3 style="font-size:16px;margin:12px 0 4px">$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2 style="font-size:17px;margin:14px 0 6px">$1</h2>');

    // Blockquote: > text
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // Horizontal rule: ---
    html = html.replace(/^---$/gm, '<hr>');

    // Unordered list items
    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    // Ordered list items
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Line breaks: preserve newlines as <br> except before block elements
    html = html.replace(/\n/g, '<br>');

    // Clean up: remove <br> before block elements
    html = html.replace(/<br>\s*(<(?:pre|ul|ol|blockquote|hr|h[2-4]|li))/g, '$1');
    html = html.replace(/(<\/(?:pre|ul|ol|blockquote|h[2-4])>)\s*<br>/g, '$1');

    return html;
  }

  // =========================================================================
  // RENDER: TOP BAR / CONTEXT
  // =========================================================================

  function updateTopBar() {
    const conv = getCurrentConv();
    if (!conv) {
      dom.convTitle.textContent = '新对话';
      dom.badgeProvider.textContent = '--';
      dom.badgeProvider.removeAttribute('data-provider');
      dom.badgeModel.textContent = '--';
      dom.contextStats.textContent = '';
      return;
    }

    dom.convTitle.textContent = conv.title;
    const pConf = getProviderConfig(conv.provider);
    dom.badgeProvider.textContent = pConf.name;
    dom.badgeProvider.setAttribute('data-provider', conv.provider);
    dom.badgeModel.textContent = resolveModel(conv) || '未选择';

    const charCount = countApproxChars(conv);
    const msgCount = conv.messages.length;
    dom.contextStats.textContent = `${msgCount} 条消息 · ~${charCount.toLocaleString()} 字符`;
  }

  function updateWelcomeUI() {
    const conv = getCurrentConv();
    if (!conv || !dom.welcomeStatus) return;

    const hasApiKey = !!getApiKey(conv.provider);
    const hasModel = !!resolveModel(conv);
    const pConf = getProviderConfig(conv.provider);

    dom.welcomeApiStep.classList.toggle('done', hasApiKey);
    dom.welcomeModelStep.classList.toggle('done', hasModel);
    dom.welcomeApiStep.textContent = hasApiKey
      ? `1. ${pConf.name} API Key 已就绪`
      : `1. 填写 ${pConf.name} API Key`;
    dom.welcomeModelStep.textContent = hasModel
      ? `2. 模型已选择：${resolveModel(conv)}`
      : '2. 选择或输入模型';

    if (hasApiKey && hasModel) {
      dom.welcomeHint.textContent = '配置已完成，直接在下方输入消息开始对话';
      dom.btnWelcomeSetup.textContent = '调整设置';
      dom.inputMessage.placeholder = '输入消息...';
    } else {
      dom.welcomeHint.textContent = '完成配置后就可以直接输入消息开始对话';
      dom.btnWelcomeSetup.textContent = hasApiKey ? '选择模型' : '开始配置';
      dom.inputMessage.placeholder = '先完成模型配置，再输入消息...';
    }
  }

  // =========================================================================
  // RENDER: SCROLL
  // =========================================================================

  let userScrolledUp = false;

  function scrollToBottom(force) {
    if (!force && userScrolledUp) return;
    dom.mainContent.scrollTop = dom.mainContent.scrollHeight;
  }

  function checkUserScroll() {
    const el = dom.mainContent;
    const threshold = 60;
    userScrolledUp = el.scrollHeight - el.scrollTop - el.clientHeight > threshold;
  }

  // =========================================================================
  // SETTINGS SYNC
  // =========================================================================

  function syncSettingsToUI() {
    const conv = getCurrentConv();
    if (!conv) return;

    dom.selectProvider.value = conv.provider;
    dom.inputCustomModel.value = conv.customModel || '';
    dom.inputSystemPrompt.value = conv.systemPrompt || '';
    dom.inputTemperature.value = conv.temperature;
    dom.tempVal.textContent = conv.temperature;
    dom.inputTopP.value = conv.topP;
    dom.topPVal.textContent = conv.topP;
    dom.inputMaxTokens.value = conv.maxTokens;
    dom.inputStream.checked = conv.stream;
    dom.inputCaching.checked = conv.enableCaching !== false;
    dom.inputPreciseMode.checked = !!conv.preciseMode;
    dom.inputSceneMode.checked = !!conv.sceneMode;
    dom.inputAutoCompress.checked = !!conv.autoCompress;
    dom.selectToolCallLimit.value = String(conv.toolCallLimit);
    updateToolWarning();
    updateApiKeyField();
    // Restore action prompts
    dom.inputActionRegenerate.value = state.actionPrompts.regenerate || '';
    dom.inputActionContinue.value = state.actionPrompts.continue || '';
    dom.inputActionSummarize.value = state.actionPrompts.summarize || '';
    dom.inputActionElaborate.value = state.actionPrompts.elaborate || '';

    populateModelSelect();
  }

  function syncSettingsFromUI() {
    const conv = getCurrentConv();
    if (!conv) return;

    const newProvider = dom.selectProvider.value;
    const providerChanged = newProvider !== conv.provider;

    conv.provider = newProvider;
    conv.customModel = dom.inputCustomModel.value.trim();
    conv.systemPrompt = dom.inputSystemPrompt.value;
    conv.temperature = parseFloat(dom.inputTemperature.value) || DEFAULTS.temperature;
    conv.topP = parseFloat(dom.inputTopP.value) || DEFAULTS.topP;
    conv.maxTokens = parseInt(dom.inputMaxTokens.value, 10) || DEFAULTS.maxTokens;
    conv.stream = dom.inputStream.checked;
    conv.enableCaching = dom.inputCaching.checked;
    conv.sceneMode = dom.inputSceneMode.checked;
    conv.autoCompress = dom.inputAutoCompress.checked;
    const prevPrecise = conv.preciseMode;
    conv.preciseMode = dom.inputPreciseMode.checked;
    if (conv.preciseMode && !prevPrecise) {
      conv._savedTemperature = conv.temperature;
      conv.temperature = 0.2;
    } else if (!conv.preciseMode && prevPrecise) {
      conv.temperature = conv._savedTemperature || DEFAULTS.temperature;
      conv._savedTemperature = undefined;
    }
    dom.inputTemperature.value = String(conv.temperature);
    dom.tempVal.textContent = conv.temperature;
    conv.toolCallLimit = parseInt(dom.selectToolCallLimit.value, 10);
    conv.toolCallLimitMode =
      conv.toolCallLimit === 0 ? 'disabled' : conv.toolCallLimit === -1 ? 'unlimited' : 'limited';

    state.apiKeys[conv.provider] = dom.inputApiKey.value.trim();

    if (providerChanged) {
      conv.model = '';
      conv.customModel = '';
      dom.selectModel.value = '';
      dom.inputCustomModel.value = '';
      updateApiKeyField();
    }

    updateTimestamp(conv);
    updateToolWarning();
    updateTopBar();
    updateWelcomeUI();
    debouncedSave();
  }

  function updateApiKeyField() {
    const provider = dom.selectProvider.value;
    const pConf = getProviderConfig(provider);
    dom.labelApiKey.textContent = pConf.name + ' API Key';
    dom.inputApiKey.placeholder = pConf.keyHint;
    dom.inputApiKey.value = state.apiKeys[provider] || '';
    dom.apiKeyHint.textContent = '在 ' + pConf.name + ' 平台获取，仅保存在本地浏览器';
  }

  function applyChatBackground() {
    const bg = state.chatBackground || { type: 'none', value: '', opacity: 35 };
    const overlay = dom.chatBgOverlay;

    document.documentElement.style.setProperty('--bg-opacity', (bg.opacity / 100));

    if (bg.type === 'none') {
      overlay.style.backgroundImage = '';
      overlay.style.display = 'none';
    } else if (bg.type === 'gradient') {
      overlay.style.backgroundImage = bg.value;
      overlay.style.display = '';
    } else if ((bg.type === 'url' || bg.type === 'image') && bg.value) {
      overlay.style.backgroundImage = 'url(' + bg.value + ')';
      overlay.style.display = '';
    }
  }

  function setChatBackground(type, value) {
    state.chatBackground.type = type;
    state.chatBackground.value = value || '';
    applyChatBackground();
    saveToStorage();
    updateBgPresetUI();
  }

  function updateBgPresetUI() {
    const bg = state.chatBackground;
    dom.inputBgOpacity.value = bg.opacity;
    // Update active preset button
    const presets = dom.bgPresets.querySelectorAll('.bg-preset');
    presets.forEach((btn) => {
      const btnBg = btn.dataset.bg;
      if (bg.type === 'none' && btnBg === 'none') {
        btn.classList.add('active');
      } else if (bg.type === 'gradient' && btnBg === bg.value) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    // Show/hide remove button for custom images
    const hasCustomImage = bg.type === 'image' && bg.value;
    dom.btnRemoveBgImage.style.display = hasCustomImage ? '' : 'none';
    dom.btnPickBgImage.textContent = hasCustomImage ? '更换图片' : '从相册选择';
    // Highlight top bar bg button when a background is active
    const hasBg = bg.type !== 'none';
    dom.btnToggleBg.classList.toggle('bg-active', hasBg);
    dom.btnToggleBg.style.color = hasBg ? 'var(--accent-bright)' : '';
  }

  function handleBgImagePick(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      // Resize and compress via canvas before storing
      const img = new Image();
      img.onload = function () {
        const maxW = 800;
        const maxH = 1200;
        let w = img.width;
        let h = img.height;

        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        setChatBackground('image', dataUrl);
        showToast('背景已更新', 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function removeBgImage() {
    setChatBackground('none', '');
    showToast('背景已移除', 'info');
  }

  function updateScenePanelUI() {
    const conv = getCurrentConv();
    if (!conv) {
      dom.scenePanel.style.display = 'none';
      return;
    }
    const show = conv.sceneMode;
    dom.scenePanel.style.display = show ? '' : 'none';
    if (show) {
      const ss = conv.sceneState || {};
      dom.sceneMental.value = ss.mental || '';
      dom.scenePhysical.value = ss.physical || '';
      dom.scenePlot.value = ss.plot || '';
    }
  }

  function handleMessageAction(action, msgIndex) {
    const conv = getCurrentConv();
    if (!conv || state.isStreaming) return;

    const prompts = {
      regenerate: state.actionPrompts.regenerate || '',
      continue: state.actionPrompts.continue || '请继续',
      summarize: state.actionPrompts.summarize || '请用简洁的语言总结以上对话的要点。',
      elaborate: state.actionPrompts.elaborate || '请对上一个回答进行更深入、更详细的探讨，补充更多背景和细节。',
    };

    // Hide actions on the current last message
    const lastMsg = conv.messages[conv.messages.length - 1];
    if (lastMsg) lastMsg._showActions = false;

    let sendText = '';

    switch (action) {
      case 'regenerate':
        // Remove last assistant response
        if (lastMsg && lastMsg.role === 'assistant') conv.messages.pop();
        if (prompts.regenerate) {
          sendText = prompts.regenerate;
        } else {
          // Default: resend last user message
          const lastUser = [...conv.messages].reverse().find((m) => m.role === 'user');
          if (!lastUser) return;
          sendText = lastUser.content;
        }
        break;

      case 'continue':
        sendText = prompts.continue;
        break;

      case 'summarize':
        sendText = prompts.summarize;
        break;

      case 'elaborate':
        sendText = prompts.elaborate;
        break;
    }

    updateTimestamp(conv);
    renderAll();
    // sendMessageContent -> sendMessage handles pushing the user message
    sendMessageContent(sendText);
  }

  // Shared send logic without clearing input (used by action buttons)
  async function sendMessageContent(text) {
    dom.inputMessage.value = text;
    await sendMessage();
    dom.inputMessage.value = '';
  }

  function updateToolWarning() {
    const val = parseInt(dom.selectToolCallLimit.value, 10);
    dom.toolWarning.style.display = val === -1 ? '' : 'none';
  }

  // =========================================================================
  // MODEL MANAGEMENT
  // =========================================================================

  function populateModelSelect() {
    const conv = getCurrentConv();
    const provider = conv ? conv.provider : 'xai';
    const models = state.models[provider] || [];

    dom.selectModel.innerHTML = '';

    if (models.length === 0) {
      dom.selectModel.innerHTML = '<option value="">-- 点击刷新获取模型 --</option>';
      dom.modelHint.textContent = '尚未获取模型列表';
      return;
    }

    dom.selectModel.innerHTML =
      '<option value="">-- 选择模型 --</option>' +
      models
        .map((m) => {
          const selected = conv && conv.model === m.id ? ' selected' : '';
          return `<option value="${escapeHtml(m.id)}"${selected}>${escapeHtml(m.id)}</option>`;
        })
        .join('');

    dom.modelHint.textContent = `共 ${models.length} 个可用模型，最后更新：${new Date().toLocaleTimeString()}`;
  }

  async function refreshModels() {
    const provider = dom.selectProvider.value;
    const apiKey = getApiKey(provider);

    if (!apiKey) {
      showToast('请先填写 API Key。', 'error');
      return;
    }

    const pConf = getProviderConfig(provider);
    dom.btnRefreshModels.textContent = '获取中…';
    dom.btnRefreshModels.disabled = true;

    try {
      const resp = await fetch(pConf.modelsUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!resp.ok) {
        if (resp.status === 401) throw new Error(ERR_MSGS.unauthorized);
        if (resp.status === 429) throw new Error(ERR_MSGS.rateLimited);
        throw new Error(`获取模型失败 (${resp.status})`);
      }

      const data = await resp.json();
      const rawModels = data.data || data.models || [];

      state.models[provider] = rawModels.map((m) => ({
        id: m.id || m.name || String(m),
        object: m.object || 'model',
      }));

      saveToStorage();
      populateModelSelect();
      showToast(`成功获取 ${state.models[provider].length} 个模型`, 'success');
    } catch (e) {
      showToast(e.message || '获取模型列表失败', 'error');
    } finally {
      dom.btnRefreshModels.textContent = '刷新模型列表';
      dom.btnRefreshModels.disabled = false;
    }
  }

  // =========================================================================
  // CHAT: SEND MESSAGE
  // =========================================================================

  async function sendMessage() {
    const text = dom.inputMessage.value.trim();
    if (!text) return;

    let conv = getCurrentConv();
    if (!conv) {
      conv = createConversation();
      state.conversations.push(conv);
      state.currentConversationId = conv.id;
    }

    // Validate
    const apiKey = getApiKey(conv.provider);
    if (!apiKey) {
      showToast(ERR_MSGS.noApiKey, 'error');
      openDrawer('settings');
      return;
    }

    const model = resolveModel(conv);
    if (!model) {
      showToast(ERR_MSGS.noModel, 'error');
      openDrawer('settings');
      return;
    }

    // Validate params
    if (conv.temperature < 0 || conv.temperature > 2) {
      showToast('Temperature 必须在 0 到 2 之间。', 'error');
      return;
    }
    if (conv.topP < 0 || conv.topP > 1) {
      showToast('Top P 必须在 0 到 1 之间。', 'error');
      return;
    }
    if (!Number.isInteger(conv.maxTokens) || conv.maxTokens <= 0) {
      showToast('Max Tokens 必须为正整数。', 'error');
      return;
    }

    // Tool call check
    if (conv.toolCallLimit > 0 || conv.toolCallLimit === -1) {
      showToast(ERR_MSGS.toolNotImplemented, 'warning');
    }

    // Add user message
    conv.messages.push({ role: 'user', content: text });
    updateTimestamp(conv);
    autoTitle(conv);

    dom.inputMessage.value = '';
    dom.inputMessage.style.height = 'auto';

    renderMessages();
    updateTopBar();
    scrollToBottom(true);
    updateSendUI();

    // Build messages array with caching support
    const supportsCaching = conv.enableCaching && isAnthropicModel(model);
    const messages = [];

    // System prompt
    let effectiveSystemPrompt = conv.systemPrompt;
    if (conv.preciseMode) {
      effectiveSystemPrompt = effectiveSystemPrompt
        ? SYSTEM_PROMPT_PRECISE + '\n\n' + effectiveSystemPrompt
        : SYSTEM_PROMPT_PRECISE;
    } else if (!effectiveSystemPrompt) {
      effectiveSystemPrompt = SYSTEM_PROMPT_DEFAULT;
    }

    // Build full system prompt with scene state if enabled
    let fullSystemPrompt = effectiveSystemPrompt;
    if (conv.sceneMode) {
      const ss = conv.sceneState || {};
      const sceneBlock = [
        '\n\n[写作场景记忆 — 独立存储，不随上下文压缩]',
        ss.mental ? '当前精神状态：' + ss.mental : '',
        ss.physical ? '当前身体状态：' + ss.physical : '',
        ss.plot ? '当前故事情节：' + ss.plot : '',
        '\n请在每次回复末尾用以下格式更新场景状态（不展示给用户）：',
        '@@SCENE',
        '精神: <更新后的精神状态>',
        '身体: <更新后的身体状态>',
        '情节: <更新后的情节摘要>',
        '@@END',
      ].filter(Boolean).join('\n');
      fullSystemPrompt = (effectiveSystemPrompt || '') + sceneBlock;
    }

    if (fullSystemPrompt) {
      const sysMsg = { role: 'system', content: fullSystemPrompt };
      if (supportsCaching) sysMsg.cache_control = { type: 'ephemeral' };
      messages.push(sysMsg);
    }

    // Conversation messages - add cache breakpoint on the last assistant message before current turn
    for (let i = 0; i < conv.messages.length; i++) {
      const m = conv.messages[i];
      const msg = { role: m.role, content: m.content };
      // Cache the last assistant message to create a cache breakpoint for the prefix
      if (supportsCaching && m.role === 'assistant' && i === conv.messages.length - 1) {
        msg.cache_control = { type: 'ephemeral' };
      }
      messages.push(msg);
    }

    // Add placeholder assistant message for streaming
    const assistantMsg = { role: 'assistant', content: '', _streaming: true };
    conv.messages.push(assistantMsg);
    renderMessages();
    scrollToBottom(true);

    // Create abort controller
    state.abortController = new AbortController();
    state.isStreaming = true;
    updateSendUI();

    const pConf = getProviderConfig(conv.provider);

    try {
      const resp = await fetch(pConf.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: conv.temperature,
          top_p: conv.topP,
          max_tokens: conv.maxTokens,
          stream: conv.stream,
        }),
        signal: state.abortController.signal,
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        if (resp.status === 401) throw new Error(ERR_MSGS.unauthorized);
        if (resp.status === 429) throw new Error(ERR_MSGS.rateLimited);
        if (resp.status === 400 && errText.includes('model')) throw new Error(ERR_MSGS.modelNotFound);
        if (resp.status === 402) throw new Error(ERR_MSGS.insufficientBalance);
        if (resp.status === 413) throw new Error(ERR_MSGS.contextTooLong);
        throw new Error(`${ERR_MSGS.serverError} (${resp.status})`);
      }

      if (conv.stream) {
        await processStream(resp, assistantMsg, conv);
      } else {
        const data = await resp.json();
        const msg = data.choices?.[0]?.message || {};
        assistantMsg.content = msg.content || '';
        assistantMsg.reasoning = msg.reasoning_content || msg.thinking || '';
        if (data.usage) {
          assistantMsg.usage = data.usage;
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        assistantMsg.content += '\n\n[已停止]';
        showToast(ERR_MSGS.userAborted, 'info');
      } else if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
        conv.messages.pop();
        showToast(ERR_MSGS.cors, 'error', 6000);
      } else {
        conv.messages.pop();
        showToast(e.message || ERR_MSGS.network, 'error');
      }
      renderMessages();
    } finally {
      assistantMsg._streaming = false;
      state.isStreaming = false;
      state.abortController = null;
      updateSendUI();

      // Remove empty assistant messages (no content and no error appended)
      if (assistantMsg.content === '' && conv.messages.includes(assistantMsg)) {
        conv.messages.pop();
      }

      // Extract scene state from response
      if (conv.sceneMode && assistantMsg.content) {
        const sceneMatch = assistantMsg.content.match(/@@SCENE\s*([\s\S]*?)\s*@@END/);
        if (sceneMatch) {
          const block = sceneMatch[1];
          const mental = (block.match(/精神[:：]\s*(.+)/) || [])[1] || '';
          const physical = (block.match(/身体[:：]\s*(.+)/) || [])[1] || '';
          const plot = (block.match(/情节[:：]\s*(.+)/) || [])[1] || '';
          conv.sceneState = {
            mental: mental.trim(),
            physical: physical.trim(),
            plot: plot.trim(),
          };
          // Strip the scene block from displayed content
          assistantMsg.content = assistantMsg.content.replace(/@@SCENE\s*[\s\S]*?\s*@@END/, '').trim();
          updateScenePanelUI();
        }
      }

      // Show action buttons on completed response
      if (assistantMsg.content && conv.messages.includes(assistantMsg)) {
        assistantMsg._showActions = true;
        assistantMsg._actionIndex = conv.messages.indexOf(assistantMsg);
      }

      updateTimestamp(conv);
      updateTopBar();
      renderMessages();
      scrollToBottom(true);
      debouncedSave();
    }
  }

  // =========================================================================
  // STREAM PROCESSING
  // =========================================================================

  async function processStream(resp, assistantMsg, conv) {
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    let renderScheduled = false;
    const scheduleRender = () => {
      if (!renderScheduled) {
        renderScheduled = true;
        requestAnimationFrame(() => {
          renderMessages();
          scrollToBottom(false);
          renderScheduled = false;
        });
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') {
            assistantMsg._streaming = false;
            scheduleRender();
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta;

            if (delta) {
              // Capture reasoning/thinking content
              const reasoning = delta.reasoning_content || delta.thinking || '';
              if (reasoning) {
                assistantMsg.reasoning = (assistantMsg.reasoning || '') + reasoning;
              }

              // Capture main content
              const content = delta.content || '';
              if (content) {
                assistantMsg.content += content;
              }

              if (reasoning || content) {
                scheduleRender();
              }
            }

            // Capture usage from final chunk
            if (parsed.usage) {
              assistantMsg.usage = parsed.usage;
            }
          } catch (_) {
            // Skip unparseable chunks
          }
        }
      }

      // Process remaining buffer (may contain last chunk with usage)
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data:') && trimmed !== 'data:[DONE]') {
          try {
            const parsed = JSON.parse(trimmed.slice(5).trim());
            const delta = parsed.choices?.[0]?.delta;
            if (delta) {
              const reasoning = delta.reasoning_content || delta.thinking || '';
              if (reasoning) {
                assistantMsg.reasoning = (assistantMsg.reasoning || '') + reasoning;
              }
              const content = delta.content || '';
              if (content) assistantMsg.content += content;
            }
            if (parsed.usage) {
              assistantMsg.usage = parsed.usage;
            }
          } catch (_) { /* skip */ }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        throw new Error(ERR_MSGS.streamParseError);
      }
      throw e;
    } finally {
      reader.releaseLock();
      assistantMsg._streaming = false;
    }
  }

  // =========================================================================
  // STOP REQUEST
  // =========================================================================

  function stopCurrentRequest() {
    if (state.abortController) {
      state.abortController.abort();
      state.abortController = null;
      state.isStreaming = false;
      updateSendUI();
    }
  }

  function isAbortRequested() {
    return state.abortController ? state.abortController.signal.aborted : false;
  }

  // =========================================================================
  // TOOL CALL STUB
  // =========================================================================

  function getToolCallSettings() {
    const conv = getCurrentConv();
    if (!conv) return { limit: 0, mode: 'disabled' };
    return {
      limit: conv.toolCallLimit,
      mode: conv.toolCallLimitMode,
    };
  }

  async function runToolLoop(messages, assistantMsg) {
    // TODO: 实现工具调用循环
    // 1. 检查 assistant 消息中的 tool_calls
    // 2. 根据 toolCallLimitMode 和 toolCallLimit 控制循环次数
    // 3. 执行工具并将结果追加到消息数组
    // 4. 将工具结果发送回 API 并接收新回复
    // 5. 循环直到无更多 tool_calls 或达到上限
    throw new Error(ERR_MSGS.toolNotImplemented);
  }

  // =========================================================================
  // CONVERSATION ACTIONS
  // =========================================================================

  function newConversation() {
    const conv = createConversation();
    state.conversations.push(conv);
    state.currentConversationId = conv.id;
    renderAll();
    saveToStorage();
    dom.inputMessage.focus();
  }

  function switchConversation(id) {
    const conv = state.conversations.find((c) => c.id === id);
    if (!conv) return;
    state.currentConversationId = id;
    closeDrawer('history');
    renderAll();
    scrollToBottom(true);
    debouncedSave();
  }

  function clearCurrentConversation() {
    const conv = getCurrentConv();
    if (!conv) return;
    showConfirm('确认清空当前会话的所有消息？（会话参数保留）', () => {
      conv.messages = [];
      conv.title = '新对话';
      updateTimestamp(conv);
      hideConfirm();
      renderAll();
      saveToStorage();
      showToast('会话已清空', 'success');
    });
  }

  function deleteLastRound() {
    const conv = getCurrentConv();
    if (!conv || conv.messages.length === 0) return;

    // Find last user message and remove it + everything after
    let lastUserIdx = -1;
    for (let i = conv.messages.length - 1; i >= 0; i--) {
      if (conv.messages[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }

    if (lastUserIdx === -1) return;

    conv.messages.splice(lastUserIdx);
    if (conv.messages.length === 0) conv.title = '新对话';
    updateTimestamp(conv);
    renderAll();
    saveToStorage();
    showToast('已删除最后一轮问答', 'success');
  }

  function copyLastAssistantReply() {
    const conv = getCurrentConv();
    if (!conv) return;
    for (let i = conv.messages.length - 1; i >= 0; i--) {
      if (conv.messages[i].role === 'assistant') {
        const text = conv.messages[i].content;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => showToast('已复制到剪贴板', 'success'));
        }
        return;
      }
    }
    showToast('没有可复制的 AI 回复', 'warning');
  }

  function togglePreciseMode() {
    const conv = getCurrentConv();
    if (!conv) return;
    conv.preciseMode = !conv.preciseMode;
    if (conv.preciseMode) {
      conv._savedTemperature = conv.temperature;
      conv.temperature = 0.2;
      showToast('精确模式已开启：低温输出 + 防幻觉 Prompt', 'success');
    } else {
      conv.temperature = conv._savedTemperature || DEFAULTS.temperature;
      conv._savedTemperature = undefined;
      showToast('精确模式已关闭', 'info');
    }
    updateTimestamp(conv);
    debouncedSave();
    if (state.ui.isSettingsOpen) {
      dom.inputPreciseMode.checked = conv.preciseMode;
      dom.inputTemperature.value = conv.temperature;
      dom.tempVal.textContent = conv.temperature;
    }
    updateTopBar();
  }

  function deleteConversation(id) {
    showConfirm('确认删除该会话？此操作不可恢复。', () => {
      state.conversations = state.conversations.filter((c) => c.id !== id);
      if (state.currentConversationId === id) {
        state.currentConversationId = state.conversations.length > 0 ? state.conversations[0].id : null;
      }
      hideConfirm();
      renderAll();
      saveToStorage();
      showToast('会话已删除', 'success');
    });
  }

  function clearAllConversations() {
    if (state.conversations.length === 0) return;
    showConfirm(`确认删除全部 ${state.conversations.length} 个会话？<br><br>此操作不可恢复。建议先导出全部 JSON 备份。`, () => {
      state.conversations = [];
      state.currentConversationId = null;
      hideConfirm();
      renderAll();
      saveToStorage();
      showToast('全部会话已清空', 'success');
    });
  }

  function clearArchivedConversations() {
    const archived = state.conversations.filter((c) => c.archived);
    if (archived.length === 0) {
      showToast('没有已归档的会话', 'info');
      return;
    }
    showConfirm(`确认删除全部 ${archived.length} 个已归档会话？<br><br>此操作不可恢复。建议先导出全部 JSON 备份。`, () => {
      state.conversations = state.conversations.filter((c) => !c.archived);
      hideConfirm();
      renderAll();
      saveToStorage();
      showToast(`已删除 ${archived.length} 个归档会话`, 'success');
    });
  }

  function renameConversation(id) {
    const conv = state.conversations.find((c) => c.id === id);
    if (!conv) return;
    showRenameDialog(id, conv.title);
  }

  function doRename() {
    const id = state.pendingRenameId;
    const newTitle = dom.renameInput.value.trim();
    if (!id || !newTitle) {
      hideRenameDialog();
      return;
    }
    const conv = state.conversations.find((c) => c.id === id);
    if (conv) {
      conv.title = newTitle;
      updateTimestamp(conv);
      renderAll();
      saveToStorage();
    }
    hideRenameDialog();
  }

  // =========================================================================
  // IMPORT / EXPORT
  // =========================================================================

  function exportConversationMarkdown() {
    const conv = getCurrentConv();
    if (!conv) {
      showToast('无当前会话可导出', 'warning');
      return;
    }

    const pConf = getProviderConfig(conv.provider);
    const model = resolveModel(conv);
    let md = `# ${conv.title}\n\n`;
    md += `- 服务商：${pConf.name}\n`;
    md += `- 模型：${model || '未选择'}\n`;
    md += `- 时间：${conv.createdAt}\n`;
    if (conv.systemPrompt) {
      md += `- System Prompt：${conv.systemPrompt}\n`;
    }
    md += `\n---\n\n`;

    for (const m of conv.messages) {
      const role = m.role === 'user' ? '**You**' : '**AI**';
      md += `### ${role}\n\n${m.content}\n\n`;
    }

    downloadFile(`${conv.title}.md`, md, 'text/markdown');
    showToast('Markdown 导出成功', 'success');
  }

  function exportAllJSON() {
    if (state.conversations.length === 0) {
      showToast('无会话可导出', 'warning');
      return;
    }

    // Strip API keys from export
    const data = {
      version: STORAGE_VERSION,
      exportedAt: nowISO(),
      conversations: state.conversations.map((c) => ({ ...c })),
    };

    downloadFile(`omnichat-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
    showToast('全部会话 JSON 导出成功', 'success');
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);

        if (!data.conversations || !Array.isArray(data.conversations)) {
          throw new Error('格式无效：缺少 conversations 数组');
        }

        let imported = 0;
        const existingIds = new Set(state.conversations.map((c) => c.id));

        for (const c of data.conversations) {
          if (!c.id || !c.messages || !Array.isArray(c.messages)) continue;

          // Avoid overwriting existing IDs
          if (existingIds.has(c.id)) {
            c.id = generateId();
          }
          existingIds.add(c.id);

          // Ensure all fields exist
          c.title = c.title || '导入的对话';
          c.createdAt = c.createdAt || nowISO();
          c.updatedAt = c.updatedAt || nowISO();
          c.provider = c.provider || 'xai';
          c.model = c.model || '';
          c.customModel = c.customModel || '';
          c.systemPrompt = c.systemPrompt || '';
          c.temperature = c.temperature ?? DEFAULTS.temperature;
          c.topP = c.topP ?? DEFAULTS.topP;
          c.maxTokens = c.maxTokens ?? DEFAULTS.maxTokens;
          c.stream = c.stream ?? DEFAULTS.stream;
          c.toolCallLimit = c.toolCallLimit ?? DEFAULTS.toolCallLimit;
          c.toolCallLimitMode = c.toolCallLimitMode || 'disabled';
          c.enableCaching = c.enableCaching !== undefined ? c.enableCaching : DEFAULTS.enableCaching;
          c.preciseMode = c.preciseMode || false;
          c.archived = c.archived || false;
          c.sceneMode = c.sceneMode || false;
          c.sceneState = c.sceneState || { mental: '', physical: '', plot: '' };
          c.autoCompress = c.autoCompress || false;
          c.messages = c.messages.filter((m) => m.role && m.content !== undefined);

          state.conversations.push(c);
          imported++;
        }

        if (imported === 0) {
          throw new Error('未找到有效会话数据');
        }

        saveToStorage();
        renderAll();
        showToast(`成功导入 ${imported} 个会话`, 'success');
      } catch (e) {
        showToast(e.message || ERR_MSGS.importFailed, 'error');
      }
    };
    reader.onerror = function () {
      showToast(ERR_MSGS.importFailed, 'error');
    };
    reader.readAsText(file);
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // =========================================================================
  // UPDATE UI
  // =========================================================================

  function updateSendUI() {
    if (state.isStreaming) {
      dom.btnSend.style.display = 'none';
      dom.btnStop.style.display = 'flex';
      dom.inputMessage.disabled = true;
    } else {
      dom.btnSend.style.display = 'flex';
      dom.btnStop.style.display = 'none';
      dom.inputMessage.disabled = false;
    }
  }

  function renderAll() {
    renderMessages();
    updateTopBar();
    updateWelcomeUI();
    renderConvList();
    updateScenePanelUI();
    if (state.ui.isSettingsOpen) {
      syncSettingsToUI();
    }
  }

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================

  function setupEvents() {
    // History drawer
    dom.btnToggleHistory.addEventListener('click', () => openDrawer('history'));
    dom.btnCloseHistory.addEventListener('click', () => closeDrawer('history'));
    dom.historyOverlay.addEventListener('click', () => closeDrawer('history'));
    dom.btnToggleArchived.addEventListener('click', () => toggleShowArchived());

    // Settings drawer
    dom.btnToggleSettings.addEventListener('click', () => openDrawer('settings'));
    dom.btnToggleBg.addEventListener('click', () => {
      openDrawer('settings');
      setTimeout(() => {
        const bgSection = dom.bgPresets;
        if (bgSection) bgSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    });
    dom.btnCloseSettings.addEventListener('click', () => closeDrawer('settings'));
    dom.settingsOverlay.addEventListener('click', () => closeDrawer('settings'));

    // Welcome actions
    if (dom.btnWelcomeSetup) {
      dom.btnWelcomeSetup.addEventListener('click', () => openDrawer('settings'));
    }
    if (dom.btnWelcomeHistory) {
      dom.btnWelcomeHistory.addEventListener('click', () => openDrawer('history'));
    }

    // Top bar title click → rename
    dom.topBarInfo.addEventListener('click', () => {
      const conv = getCurrentConv();
      if (conv) renameConversation(conv.id);
    });

    // Conversation list clicks
    dom.convList.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      const item = e.target.closest('.conv-item');

      if (btn) {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'rename') renameConversation(id);
        if (action === 'delete') deleteConversation(id);
        if (action === 'archive') toggleConversationArchive(id);
        return;
      }

      if (item) {
        switchConversation(item.dataset.id);
      }
    });

    // Search
    dom.searchInput.addEventListener('input', () => renderConvList());

    // Settings changes - auto save
    dom.selectProvider.addEventListener('change', () => syncSettingsFromUI());
    dom.inputApiKey.addEventListener('input', () => {
      const provider = dom.selectProvider.value;
      state.apiKeys[provider] = dom.inputApiKey.value.trim();
      updateWelcomeUI();
      debouncedSave();
    });
    dom.selectModel.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.model = dom.selectModel.value;
        updateTimestamp(conv);
        updateTopBar();
        updateWelcomeUI();
        debouncedSave();
      }
    });
    dom.inputCustomModel.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.customModel = dom.inputCustomModel.value.trim();
        updateTimestamp(conv);
        updateTopBar();
        updateWelcomeUI();
        debouncedSave();
      }
    });
    dom.inputSystemPrompt.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.systemPrompt = dom.inputSystemPrompt.value;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    dom.inputTemperature.addEventListener('input', () => {
      dom.tempVal.textContent = dom.inputTemperature.value;
      const conv = getCurrentConv();
      if (conv) {
        conv.temperature = parseFloat(dom.inputTemperature.value);
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    dom.inputTopP.addEventListener('input', () => {
      dom.topPVal.textContent = dom.inputTopP.value;
      const conv = getCurrentConv();
      if (conv) {
        conv.topP = parseFloat(dom.inputTopP.value);
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    dom.inputMaxTokens.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.maxTokens = parseInt(dom.inputMaxTokens.value, 10) || DEFAULTS.maxTokens;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    dom.inputStream.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.stream = dom.inputStream.checked;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    dom.inputCaching.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.enableCaching = dom.inputCaching.checked;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    dom.inputSceneMode.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.sceneMode = dom.inputSceneMode.checked;
        updateTimestamp(conv);
        updateScenePanelUI();
        renderMessages();
        debouncedSave();
      }
    });
    dom.inputAutoCompress.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.autoCompress = dom.inputAutoCompress.checked;
        updateTimestamp(conv);
        debouncedSave();
      }
    });

    dom.inputPreciseMode.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.preciseMode = dom.inputPreciseMode.checked;
        if (conv.preciseMode) {
          conv._savedTemperature = conv.temperature;
          conv.temperature = 0.2;
        } else {
          conv.temperature = conv._savedTemperature || DEFAULTS.temperature;
          conv._savedTemperature = undefined;
        }
        dom.inputTemperature.value = String(conv.temperature);
        dom.tempVal.textContent = conv.temperature;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    dom.selectToolCallLimit.addEventListener('change', () => {
      updateToolWarning();
      const conv = getCurrentConv();
      if (conv) {
        conv.toolCallLimit = parseInt(dom.selectToolCallLimit.value, 10);
        conv.toolCallLimitMode =
          conv.toolCallLimit === 0 ? 'disabled' : conv.toolCallLimit === -1 ? 'unlimited' : 'limited';
        updateTimestamp(conv);
        debouncedSave();
      }
    });

    dom.btnRefreshModels.addEventListener('click', () => refreshModels());

    // Background presets
    dom.bgPresets.addEventListener('click', (e) => {
      const btn = e.target.closest('.bg-preset');
      if (!btn) return;
      const bg = btn.dataset.bg;
      if (bg === 'none') {
        setChatBackground('none', '');
      } else if (bg.startsWith('gradient-')) {
        const style = getComputedStyle(btn);
        setChatBackground('gradient', style.backgroundImage || style.background);
      }
    });
    dom.btnPickBgImage.addEventListener('click', () => dom.inputBgFile.click());
    dom.btnRemoveBgImage.addEventListener('click', () => removeBgImage());

    // Scene panel
    dom.scenePanelToggle.addEventListener('click', () => {
      dom.scenePanel.classList.toggle('collapsed');
    });
    dom.sceneMental.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv && conv.sceneState) {
        conv.sceneState.mental = dom.sceneMental.value;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    dom.scenePhysical.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv && conv.sceneState) {
        conv.sceneState.physical = dom.scenePhysical.value;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    dom.scenePlot.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv && conv.sceneState) {
        conv.sceneState.plot = dom.scenePlot.value;
        updateTimestamp(conv);
        debouncedSave();
      }
    });

    // Message action buttons (event delegation)
    dom.messagesContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-msg-action');
      if (!btn || state.isStreaming) return;
      const action = btn.dataset.action;
      // Find the message index from the parent
      const msgEl = btn.closest('.message');
      const msgIndex = msgEl ? parseInt(msgEl.dataset.index, 10) : -1;
      if (action && msgIndex >= 0) {
        handleMessageAction(action, msgIndex);
      }
    });
    dom.inputBgFile.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleBgImagePick(e.target.files[0]);
        e.target.value = '';
      }
    });
    // Custom action prompts
    dom.inputActionRegenerate.addEventListener('input', () => {
      state.actionPrompts.regenerate = dom.inputActionRegenerate.value.trim();
      debouncedSave();
    });
    dom.inputActionContinue.addEventListener('input', () => {
      state.actionPrompts.continue = dom.inputActionContinue.value.trim();
      debouncedSave();
    });
    dom.inputActionSummarize.addEventListener('input', () => {
      state.actionPrompts.summarize = dom.inputActionSummarize.value.trim();
      debouncedSave();
    });
    dom.inputActionElaborate.addEventListener('input', () => {
      state.actionPrompts.elaborate = dom.inputActionElaborate.value.trim();
      debouncedSave();
    });

    dom.inputBgOpacity.addEventListener('input', () => {
      const val = parseInt(dom.inputBgOpacity.value, 10);
      state.chatBackground.opacity = val;
      applyChatBackground();
      saveToStorage();
    });

    // Send / Stop
    dom.btnSend.addEventListener('click', () => sendMessage());
    dom.btnStop.addEventListener('click', () => stopCurrentRequest());
    dom.inputMessage.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!state.isStreaming) sendMessage();
      }
    });

    // Auto-resize textarea
    dom.inputMessage.addEventListener('input', () => {
      dom.inputMessage.style.height = 'auto';
      dom.inputMessage.style.height = Math.min(dom.inputMessage.scrollHeight, 120) + 'px';
    });

    // Scroll tracking (rAF-throttled)
    let scrollTick = false;
    dom.mainContent.addEventListener('scroll', () => {
      if (!scrollTick) {
        scrollTick = true;
        requestAnimationFrame(() => {
          checkUserScroll();
          scrollTick = false;
        });
      }
    }, { passive: true });

    // Quick actions
    $('#btnQuickNew').addEventListener('click', () => newConversation());
    $('#btnQuickClear').addEventListener('click', () => clearCurrentConversation());
    $('#btnQuickDeleteLast').addEventListener('click', () => deleteLastRound());
    $('#btnQuickCopy').addEventListener('click', () => copyLastAssistantReply());
    $('#btnQuickPrecise').addEventListener('click', () => togglePreciseMode());
    $('#btnQuickExport').addEventListener('click', () => exportConversationMarkdown());

    // Export / Import / Clear all
    dom.btnExportAll.addEventListener('click', () => exportAllJSON());
    dom.btnImport.addEventListener('click', () => dom.importFileInput.click());
    dom.btnClearAll.addEventListener('click', () => clearAllConversations());
    dom.btnClearArchived.addEventListener('click', () => clearArchivedConversations());
    dom.importFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        importJSON(e.target.files[0]);
        e.target.value = '';
      }
    });

    // Dialog
    dom.dialogConfirm.addEventListener('click', () => {
      if (state.pendingConfirmAction) state.pendingConfirmAction();
    });
    dom.dialogCancel.addEventListener('click', () => hideConfirm());

    // Rename dialog
    dom.renameConfirm.addEventListener('click', () => doRename());
    dom.renameCancel.addEventListener('click', () => hideRenameDialog());
    dom.renameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doRename();
      }
    });

    // Password visibility toggle
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-toggle-vis');
      if (!btn) return;
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    // Security panel swipe / tap
    let securityTimer = null;
    let touchStartY = 0;
    let touchMoved = false;

    function showSecurityPanel() {
      dom.securityPanel.classList.add('visible');
      clearTimeout(securityTimer);
      securityTimer = setTimeout(() => {
        dom.securityPanel.classList.remove('visible');
      }, 4000);
    }

    function hideSecurityPanel() {
      dom.securityPanel.classList.remove('visible');
      clearTimeout(securityTimer);
    }

    dom.securityPull.addEventListener('click', () => {
      if (!touchMoved) {
        dom.securityPanel.classList.contains('visible') ? hideSecurityPanel() : showSecurityPanel();
      }
    });

    dom.bottomBar.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      touchMoved = false;
    }, { passive: true });

    dom.bottomBar.addEventListener('touchmove', (e) => {
      const dy = touchStartY - e.touches[0].clientY;
      if (dy > 15) touchMoved = true;
    }, { passive: true });

    dom.bottomBar.addEventListener('touchend', (e) => {
      const endY = e.changedTouches[0].clientY;
      const dy = touchStartY - endY;
      if (dy > 35) {
        showSecurityPanel();
      }
    });

    // Close drawers on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllDrawers();
    });
  }

  // =========================================================================
  // INIT
  // =========================================================================

  function init() {
    cacheDom();
    loadFromStorage();

    // Ensure at least one conversation exists
    if (state.conversations.length === 0) {
      const conv = createConversation();
      state.conversations.push(conv);
      state.currentConversationId = conv.id;
    } else if (!state.currentConversationId || !state.conversations.find((c) => c.id === state.currentConversationId)) {
      state.currentConversationId = state.conversations[0].id;
    }

    setupEvents();
    renderAll();
    updateSendUI();

    // Self-healing: if ?update param, force clean reset
    if (window.location.search.includes('update')) {
      (async function() {
        try {
          var regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(function(r) { return r.unregister(); }));
        } catch(e) {}
        try {
          var keys = await caches.keys();
          await Promise.all(keys.map(function(k) { return caches.delete(k); }));
        } catch(e) {}
        try { sessionStorage.clear(); } catch(e) {}
        window.location.href = window.location.origin + window.location.pathname;
      })();
      return; // Stop further init until redirect
    }

    // Check for pending PWA update
    if (window.__updateReady) {
      setTimeout(() => {
        showUpdateDialog();
      }, 2500); // After splash
    }

    // Focus input after splash
    setTimeout(() => dom.inputMessage.focus(), 2000);

    // Splash screen - dismiss after animation
    const splashDismissed = sessionStorage.getItem('omnichat_splash');
    if (splashDismissed) {
      // Quick dismiss on revisit
      dom.splash.style.transition = 'opacity 150ms ease, visibility 150ms ease';
      setTimeout(() => dom.splash.classList.add('dismissed'), 50);
    } else {
      // Full splash on first visit
      setTimeout(() => dom.splash.classList.add('dismissed'), 2200);
      sessionStorage.setItem('omnichat_splash', '1');
    }

    // Apply chat background
    applyChatBackground();
    updateBgPresetUI();

    // Auto-archive stale barely-used conversations
    setTimeout(() => autoArchiveCheck(), 3000);

    saveToStorage();
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging / external use
  window.__omnichat = {
    state,
    getToolCallSettings,
    runToolLoop,
    stopCurrentRequest,
    isAbortRequested,
    showToast,
    refreshModels,
    newConversation,
    exportConversationMarkdown,
    exportAllJSON,
    importJSON,
  };
})();
