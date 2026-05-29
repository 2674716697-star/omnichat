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
    keepThinkingOpen: true,
    sceneDetailLevel: 'medium',
    sceneStatus: {
      health: '', stamina: '', composure: '', focus: '',
      currentObjective: '', constraints: ''
    },
  };

  const SCENE_MOODS = ['悬疑', '温柔', '冒险', '日常', '紧张', '奇幻', '科幻'];
  const SCENE_SPECIES = ['人类', '精灵', '机械体', '兽人', '龙裔', 'AI', '其他'];

  const REQUEST_CHAR_SOFT_LIMIT = 52000;
  const REQUEST_RECENT_MSG_LIMIT = 18;
  const REQUEST_RECENT_CHAR_LIMIT = 28000;
  const REQUEST_DIGEST_CHAR_LIMIT = 9000;
  const REQUEST_DIGEST_LINE_LIMIT = 720;

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
    dom.inputKeepThinking = $('#inputKeepThinking');
    dom.inputSceneDetail = $('#inputSceneDetail');
    dom.scenePanel = $('#scenePanel');
    dom.scenePanelToggle = $('#scenePanelToggle');
    dom.scenePanelBody = $('#scenePanelBody');
    dom.sceneMental = $('#sceneMental');
    dom.sceneMentalScore = $('#sceneMentalScore');
    dom.scenePhysical = $('#scenePhysical');
    dom.scenePlot = $('#scenePlot');
    dom.sceneDirections = $('#sceneDirections');
    dom.sceneCapsule = $('#sceneCapsule');
    // World opening card
    dom.sceneWorldCard = $('#sceneWorldCard');
    dom.sceneWorldToggle = $('#sceneWorldToggle');
    dom.sceneWorldBody = $('#sceneWorldBody');
    dom.sceneOpeningName = $('#sceneOpeningName');
    dom.sceneSetting = $('#sceneSetting');
    dom.sceneLocations = $('#sceneLocations');
    dom.sceneRules = $('#sceneRules');
    dom.sceneMood = $('#sceneMood');
    dom.sceneWorldNotes = $('#sceneWorldNotes');
    // Character card
    dom.sceneCharCard = $('#sceneCharCard');
    dom.sceneCharToggle = $('#sceneCharToggle');
    dom.sceneCharBody = $('#sceneCharBody');
    dom.sceneCharName = $('#sceneCharName');
    dom.sceneCharAge = $('#sceneCharAge');
    dom.sceneCharRole = $('#sceneCharRole');
    dom.sceneCharSpecies = $('#sceneCharSpecies');
    dom.sceneCharAppearance = $('#sceneCharAppearance');
    dom.sceneCharTraits = $('#sceneCharTraits');
    dom.sceneCharStats = $('#sceneCharStats');
    dom.sceneCharGoal = $('#sceneCharGoal');
    dom.btnCopyCharCard = $('#btnCopyCharCard');
    dom.btnGenOpeningPrompt = $('#btnGenOpeningPrompt');
    dom.sceneTabs = $('#sceneTabs');
    dom.sceneNpcGrid = $('#sceneNpcGrid');
    dom.moodChips = $('#moodChips');
    dom.speciesChips = $('#speciesChips');
    dom.btnGenHints = $('#btnGenHints');
    dom.btnFinishSetup = $('#btnFinishSetup');
    dom.npcImageInput = $('#npcImageInput');
    // Status bar card
    dom.sceneStatusCard = $('#sceneStatusCard');
    dom.sceneStatusToggle = $('#sceneStatusToggle');
    dom.sceneStatusBody = $('#sceneStatusBody');
    dom.sceneHealth = $('#sceneHealth');
    dom.sceneStamina = $('#sceneStamina');
    dom.sceneComposure = $('#sceneComposure');
    dom.sceneFocus = $('#sceneFocus');
    dom.sceneObjective = $('#sceneObjective');
    dom.sceneConstraints = $('#sceneConstraints');
    // NPC card
    dom.sceneNpcCard = $('#sceneNpcCard');
    dom.sceneNpcToggle = $('#sceneNpcToggle');
    dom.sceneNpcBody = $('#sceneNpcBody');
    dom.sceneNpcList = $('#sceneNpcList');
    dom.btnAddNpc = $('#btnAddNpc');
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
      state.conversations.forEach((conv) => {
        conv.sceneState = createSceneState(conv.sceneState);
        conv.sceneWorld = createSceneWorld(conv.sceneWorld);
        conv.sceneCharacter = createSceneCharacter(conv.sceneCharacter);
        conv.sceneStatus = createSceneStatus(conv.sceneStatus);
        conv.sceneNpcs = normalizeSceneNpcs(conv.sceneNpcs);
      });
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
    dom.dialogCancel.style.display = '';
    state.pendingConfirmAction = onConfirm;
    dom.dialogBody.innerHTML = msg;
    dom.dialogOverlay.style.display = 'flex';
  }

  function hideConfirm() {
    state.pendingConfirmAction = null;
    dom.dialogCancel.style.display = '';
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

  function buildSceneWorldRef(conv) {
    var w = conv.sceneWorld;
    if (!w) return '';
    var lines = [];
    if (w.openingName) lines.push('开局名称：' + w.openingName);
    if (w.setting) lines.push('世界设定：' + w.setting);
    if (w.locations) lines.push('地点清单：' + w.locations.replace(/\n/g, '、'));
    if (w.rules) lines.push('规则限制：' + w.rules);
    if (w.mood) lines.push('故事基调：' + w.mood);
    if (w.notes) lines.push('备注：' + w.notes);
    if (!lines.length) return '';
    return '[世界设定 — 稳定参考，不逐字复述]\n' + lines.join('\n');
  }

  function buildSceneCharacterRef(conv) {
    var ch = conv.sceneCharacter;
    if (!ch) return '';
    var lines = [];
    if (ch.name) {
      var label = '主角：' + ch.name;
      if (ch.age) label += '，' + ch.age + '岁';
      if (ch.role) label += '，' + ch.role;
      if (ch.species && ch.species !== '人类') label += '，' + ch.species;
      lines.push(label);
    }
    if (ch.appearance) lines.push('外貌：' + ch.appearance);
    if (ch.traits) lines.push('性格/习惯：' + ch.traits);
    if (ch.stats) lines.push('状态属性：' + ch.stats);
    if (ch.currentGoal) lines.push('当前目标：' + ch.currentGoal);
    if (!lines.length) return '';
    return '[角色设定 — 稳定参考，不逐字复述]\n' + lines.join('\n');
  }

  function buildSceneStatusRef(conv) {
    var st = conv.sceneStatus;
    if (!st) return '';
    var parts = [];
    if (st.health) parts.push('体力/生命：' + st.health);
    if (st.stamina) parts.push('精力：' + st.stamina);
    if (st.composure) parts.push('冷静/精神：' + st.composure);
    if (st.focus) parts.push('专注：' + st.focus);
    if (st.currentObjective) parts.push('当前目标：' + st.currentObjective);
    if (st.constraints) parts.push('限制/提醒：' + st.constraints);
    if (!parts.length) return '';
    return '[主角状态 — 稳定参考，不逐字复述]\n' + parts.join('\n');
  }

  function buildSceneNpcsRef(conv) {
    var npcs = conv.sceneNpcs;
    if (!npcs || !npcs.length) return '';
    var lines = [];
    for (var i = 0; i < npcs.length; i++) {
      var n = npcs[i];
      if (!n.name) continue;
      var desc = n.name;
      if (n.role) desc += '（' + n.role + '）';
      if (n.status) desc += ' — ' + n.status;
      if (n.notes) desc += ' [' + n.notes + ']';
      lines.push(desc);
    }
    if (!lines.length) return '';
    return '[NPC 列表 — 稳定参考，不逐字复述]\n' + lines.join('\n');
  }

  function getSceneLine(block, label) {
    const match = block.match(new RegExp('^' + label + '[:：]\\s*(.*)$', 'm'));
    return match ? match[1].trim() : '';
  }

  function getSceneLineAny(block, labels) {
    for (const label of labels) {
      const value = getSceneLine(block, label);
      if (value) return value;
    }
    return '';
  }

  function getSceneDirections(block) {
    // Supported direction labels (priority order)
    var dirLabels = [
      '后续剧情走向', '后续走向', '剧情走向', '走向',
      '发展方向', '下一步剧情', '下一步', '接下来'
    ];
    // Labels that should stop direction capture (subsequent fields)
    var stopLabels = ['内心', '风险', '情节', '剧情', '剧情总结', '身体', '身体细节', '精神', '精神评分', '评分', '目标', '当前目标', '姿势', '角色', '当前角色', '@@END'];

    var labelGroup = dirLabels.join('|');
    var multiLineRe = new RegExp('^(?:' + labelGroup + ')[:：]?\\s*([\\s\\S]*)$', 'm');
    var match = block.match(multiLineRe);

    if (match) {
      var raw = match[1];
      var allLines = raw.split('\n');

      // Truncate at first stop label
      var stopRe = new RegExp('^(' + stopLabels.join('|') + ')[:：]', 'i');
      var stopIdx = allLines.length;
      for (var si = 0; si < allLines.length; si++) {
        if (stopRe.test(allLines[si].trim())) { stopIdx = si; break; }
      }

      var lines = allLines.slice(0, stopIdx)
        .map(function(line) { return line.trim(); })
        .filter(function(line) { return line && line !== '@@END'; });

      var parsed = [];
      var letters = ['A', 'B', 'C', 'D'];
      var autoLetterIdx = 0;

      for (var i = 0; i < lines.length && parsed.length < 4; i++) {
        var line = lines[i];

        // Stop if this line looks like a field label
        if (stopRe.test(line)) break;

        var letterMatch = line.match(/^([A-Da-d])[\.\)、：:\s]\s*(.+)/);
        if (letterMatch) {
          var letter = letterMatch[1].toUpperCase();
          var content = letterMatch[2].trim();
          if (content) { parsed.push(letter + '. ' + content); autoLetterIdx = Math.max(autoLetterIdx, letters.indexOf(letter) + 1); }
          continue;
        }
        var parenMatch = line.match(/^[\(（]([A-Da-d])[\)）]\s*(.+)/);
        if (parenMatch) {
          var pLetter = parenMatch[1].toUpperCase();
          var pContent = parenMatch[2].trim();
          if (pContent) { parsed.push(pLetter + '. ' + pContent); autoLetterIdx = Math.max(autoLetterIdx, letters.indexOf(pLetter) + 1); }
          continue;
        }
        var numMatch = line.match(/^(\d{1,2})[\.\)、：:\s]\s*(.+)/);
        if (numMatch) {
          var num = parseInt(numMatch[1], 10);
          var nContent = numMatch[2].trim();
          if (nContent && num >= 1 && num <= 4) {
            parsed.push(letters[num - 1] + '. ' + nContent);
            autoLetterIdx = Math.max(autoLetterIdx, num);
          }
          continue;
        }
        var bulletMatch = line.match(/^[-·•*]\s*(.+)/);
        if (bulletMatch) {
          var bContent = bulletMatch[1].trim();
          if (bContent && autoLetterIdx < 4) {
            parsed.push(letters[autoLetterIdx] + '. ' + bContent);
            autoLetterIdx++;
          }
          continue;
        }
        if (line && autoLetterIdx < 4) {
          parsed.push(letters[autoLetterIdx] + '. ' + line);
          autoLetterIdx++;
        }
      }
      if (parsed.length) return parsed.join('\n');
    }

    var singleLineMatch = getSceneLineAny(block, dirLabels);
    if (singleLineMatch) return 'A. ' + singleLineMatch;
    return '';
  }

  function parseDirectionOptions(directions) {
    if (!directions) return [];
    var lines = directions.split('\n');
    var options = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      // Match "A. xxx", "A、xxx", "A) xxx", "A: xxx", "A：xxx", "(A) xxx"
      var m = line.match(/^([A-Da-d])[\.\)、：:\s]\s*(.+)/) || line.match(/^[\(（]([A-Da-d])[\)）]\s*(.+)/);
      if (m) {
        options.push({ letter: m[1].toUpperCase(), content: m[2].trim() });
      }
    }
    return options;
  }


  function parseCharacterStatuses(block) {
    var results = [];
    // Try new multi-character format: lines starting with [角色] or [人物]
    var charBlocks = block.split(/\n(?=\[(?:角色|人物)\])/);
    if (charBlocks.length <= 1) {
      // Fallback: single character from old fields
      var single = {
        name: getSceneLineAny(block, ['角色','当前角色','POV']) || '主角',
        relation: '主角',
        isMain: true,
        mental: getSceneLineAny(block, ['精神','精神状态']),
        mentalScore: normalizeMentalScore(getSceneLineAny(block, ['精神评分','评分'])),
        physical: getSceneLineAny(block, ['身体','身体状态']),
        bodyDetails: getSceneBodyDetails(block),
        goal: getSceneLineAny(block, ['目标','当前目标']),
        posture: getSceneLineAny(block, ['姿势','当前姿势']),
        innerVoice: getSceneLineAny(block, ['内心','内心回声']),
      };
      if (single.mental || single.physical || single.bodyDetails) results.push(single);
      return results;
    }
    for (var bi = 0; bi < charBlocks.length; bi++) {
      var cb = charBlocks[bi];
      var isMain = /\[(?:角色|人物)\](?:.*主角)/.test(cb) || bi === 0;
      var c = {
        name: getSceneLineAny(cb, ['名[称字]?','角色']) || (isMain ? '主角' : '人物' + (bi+1)),
        relation: getSceneLineAny(cb, ['关系','定位']) || (isMain ? '主角' : ''),
        isMain: isMain,
        mental: getSceneLineAny(cb, ['精神','精神状态']),
        mentalScore: normalizeMentalScore(getSceneLineAny(cb, ['精神评分','评分'])),
        physical: getSceneLineAny(cb, ['身体','身体状态']),
        bodyDetails: getSceneBodyDetails(cb),
        goal: getSceneLineAny(cb, ['目标','当前目标']),
        posture: getSceneLineAny(cb, ['姿势','当前姿势']),
        innerVoice: getSceneLineAny(cb, ['内心','内心回声']),
      };
      if (c.mental || c.physical || c.bodyDetails || c.goal) results.push(c);
    }
    if (!results.length) return [];
    return results;
  }
function getSceneBodyDetails(block) {
    // Extract multi-line body details under "身体细节:" label
    var labels = ['身体细节', '感官细节'];
    var labelGroup = labels.join('|');
    var re = new RegExp('^(?:' + labelGroup + ')[:：]?\\s*([\\s\\S]*?)(?:\\n(?:' + labelGroup + '|情节|剧情|剧情总结|风险|内心|走向|@@END)|$)', 'm');
    var match = block.match(re);
    if (!match) {
      // Fallback: single-line via getSceneLineAny
      var single = getSceneLineAny(block, labels);
      return single;
    }
    var raw = match[1];
    var lines = raw.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l && l !== '@@END'; });
    // Strip leading bullet markers
    lines = lines.map(function(l) { return l.replace(/^[-·•*\d{1,2}.\)、\s]+/, '').trim(); }).filter(Boolean);
    return lines.join('\n');
  }

  function parseSceneChoiceInput(text) {
    if (!text) return null;
    var t = text.replace(/\s+/g, '').trim();
    if (!t) return null;
    // Direct single letter: "A", "a", "B。", "C.", "D", "A." etc.
    var directMatch = t.match(/^([A-Da-d])[。.．、]*$/);
    if (directMatch) return directMatch[1].toUpperCase();
    // "选A", "选 A", "选择B", "我选C", "走D", "选A吧", "就B了", "要C", "想选D"
    var choiceMatch = t.match(/^(?:选[择]?|我选|走|就|要|想选|选择)\s*([A-Da-d])\s*(?:吧|了|的|啦|啊)?[。.．、]*$/);
    if (choiceMatch) return choiceMatch[1].toUpperCase();
    // "选项A", "路线B", "分支C", "方向D", "走向A"
    var labelMatch = t.match(/^(?:选项|路线|分支|方向|走向)\s*([A-Da-d])[。.．、]*$/);
    if (labelMatch) return labelMatch[1].toUpperCase();
    // "A路线", "B分支", "C选项"
    var suffixMatch = t.match(/^([A-Da-d])\s*(?:路线|分支|选项|方向)[。.．、]*$/);
    if (suffixMatch) return suffixMatch[1].toUpperCase();
    return null;
  }

  function renderSceneStatusTable(msg) {
    var ss = createSceneState(msg.sceneSnapshot);
    var st = msg.sceneStatusSnapshot;
    var ch = msg.sceneCharacterSnapshot;
    if (!st || !ch) { var cv = getCurrentConv(); if (!st) st = cv && cv.sceneStatus ? cv.sceneStatus : null; if (!ch) ch = cv && cv.sceneCharacter ? cv.sceneCharacter : null; }
    var characters = ss.characterStatuses || [];
    var dl = (getCurrentConv() && getCurrentConv().sceneDetailLevel) || 'medium';
    var maxPerDl = { low: 2, medium: 3, high: 4, ultra: 6 };
    var maxBd = maxPerDl[dl] || 3;
    var hasLegacy = ss.mental || ss.mentalScore || ss.physical || ss.plot;
    if (!characters.length && hasLegacy) {
      // Fallback: build single character from old fields
      characters = [{ name: ss.currentRole || ch?.name || '主角', relation: '主角', isMain: true, mental: ss.mental, mentalScore: ss.mentalScore, physical: ss.physical, bodyDetails: ss.bodyDetails, goal: ss.currentGoal, posture: ss.posture, innerVoice: ss.innerVoice }];
    }
    if (!characters.length && !ss.directions && !hasLegacy) return '';
    var html = '';
    // Render per-character cards
    for (var ci = 0; ci < characters.length; ci++) {
      var c = characters[ci];
      html += renderCharacterCard(c, st, ch, maxBd, !!(ci===0));
    }
    // Directions section
    if (ss.directions) {
      var dirOpts = parseDirectionOptions(ss.directions);
      if (dirOpts.length) {
        var chips = [];
        for (var di = 0; di < dirOpts.length; di++) {
          var d = dirOpts[di];
          chips.push('<button class="dir-choice-chip" data-choice="' + d.letter + '" data-content="' + escapeHtml(d.content) + '"><span class="dir-chip-badge">' + d.letter + '</span><span class="dir-chip-text">' + escapeHtml(d.content) + '</span></button>');
        }
        html += '<div class="scene-directions-section"><div class="scene-directions-title">剧情走向</div><div class="dir-choices-list">' + chips.join('') + '</div></div>';
      }
    }
    if (ss.plot) html += '<div class="scene-plot-footer">' + escapeHtml(ss.plot) + '</div>';
    return html;
  }

  function renderCharacterCard(c, st, ch, maxBd, isMain) {
    var html = '';
    html += '<div class="char-status-card' + (isMain ? ' char-main' : '') + '">';
    html += '<div class="char-card-header"><span class="char-card-name">' + escapeHtml(c.name || '?') + '</span>';
    html += '<span class="char-card-relation">' + escapeHtml(c.relation || '') + '</span>';
    if (c.mentalScore) html += '<span class="char-card-score">' + c.mentalScore + '/10</span>';
    html += '</div>';
    var rows = [];
    if (c.mental) rows.push({l:'精神',v:c.mental});
    if (c.physical) rows.push({l:'身体',v:c.physical});
    if (c.goal) rows.push({l:'目标',v:c.goal});
    if (c.posture) rows.push({l:'姿态',v:c.posture});
    if (rows.length) {
      html += '<div class="char-card-rows">';
      for (var ri=0;ri<rows.length;ri++) html += '<div class="char-row"><span class="char-row-l">'+rows[ri].l+'</span><span class="char-row-v">'+escapeHtml(rows[ri].v)+'</span></div>';
      html += '</div>';
    }
    if (c.bodyDetails) {
      var bdLines = c.bodyDetails.split('\n').filter(Boolean);
      if (bdLines.length) {
        var showBd = bdLines.slice(0, maxBd);
        html += '<div class="char-body-details">';
        for (var bi=0;bi<showBd.length;bi++) {
          var clean = showBd[bi].trim().replace(/^[-·•*\d{1,2}.\\)、\s]+/, '');
          if (clean) html += '<div class="char-body-item">' + escapeHtml(clean) + '</div>';
        }
        if (bdLines.length > maxBd) html += '<div class="char-body-more">…</div>';
        html += '</div>';
      }
    }
    if (c.innerVoice) html += '<div class="char-inner-voice">' + escapeHtml(c.innerVoice) + '</div>';
    html += '</div>';
    return html;
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
      sceneState: createSceneState(),
      sceneWorld: createSceneWorld(),
      sceneCharacter: createSceneCharacter(),
      sceneStatus: createSceneStatus(),
      sceneNpcs: [],
      autoCompress: false,
      keepThinkingOpen: DEFAULTS.keepThinkingOpen,
      sceneDetailLevel: DEFAULTS.sceneDetailLevel,
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

  function clipText(text, max) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    return clean.slice(0, max - 1).trimEnd() + '…';
  }

  function cloneRequestMessage(m) {
    return {
      role: m.role,
      content: String(m.content || ''),
    };
  }

  function createOlderContextDigest(messages) {
    if (!messages.length) return '';
    const head = messages.slice(0, 4);
    const tail = messages.slice(Math.max(4, messages.length - 12));
    const selected = head.concat(tail);
    const omitted = Math.max(0, messages.length - selected.length);
    const lines = selected.map((m) => {
      const role = m.role === 'user' ? '用户' : 'AI';
      return role + ': ' + clipText(m.content, REQUEST_DIGEST_LINE_LIMIT);
    });
    if (omitted > 0) {
      lines.splice(head.length, 0, `…中间 ${omitted} 条较早消息已省略，优先保留最近上下文和场景记忆。`);
    }
    return clipText(lines.join('\n'), REQUEST_DIGEST_CHAR_LIMIT);
  }

  function buildConversationRequestMessages(conv, supportsCaching) {
    const rawMessages = conv.messages
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim())
      .map(cloneRequestMessage);

    let requestMessages = rawMessages;
    const shouldCompact = conv.autoCompress || countApproxChars(conv) > REQUEST_CHAR_SOFT_LIMIT;

    if (shouldCompact && rawMessages.length > REQUEST_RECENT_MSG_LIMIT) {
      let recentStart = rawMessages.length;
      let recentChars = 0;
      while (recentStart > 0 && rawMessages.length - recentStart < REQUEST_RECENT_MSG_LIMIT) {
        const next = rawMessages[recentStart - 1];
        const nextChars = next.content.length;
        if (recentChars + nextChars > REQUEST_RECENT_CHAR_LIMIT && rawMessages.length - recentStart >= 8) break;
        recentChars += nextChars;
        recentStart--;
      }

      const olderDigest = createOlderContextDigest(rawMessages.slice(0, recentStart));
      requestMessages = rawMessages.slice(recentStart);
      if (olderDigest) {
        requestMessages.unshift({
          role: 'system',
          content: '[较早对话压缩摘要]\n' + olderDigest + '\n\n请把这段摘要当作背景，不要逐字复述；优先保持最近原文消息、写作场景记忆和用户最新要求。',
        });
      }
    }

    if (supportsCaching) {
      const lastAssistantIndex = requestMessages.map((m) => m.role).lastIndexOf('assistant');
      if (lastAssistantIndex >= 0) {
        requestMessages[lastAssistantIndex].cache_control = { type: 'ephemeral' };
      }
    }

    return requestMessages;
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

  function normalizeDrawerState() {
    dom.historyDrawer.classList.toggle('open', !!state.ui.isHistoryOpen);
    dom.historyOverlay.classList.toggle('open', !!state.ui.isHistoryOpen);
    dom.settingsDrawer.classList.toggle('open', !!state.ui.isSettingsOpen);
    dom.settingsOverlay.classList.toggle('open', !!state.ui.isSettingsOpen);
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
      updateArchiveToggleUI();
      return;
    }

    // Split into active and archived
    const activeList = list.filter((c) => !c.archived);
    const archivedList = list.filter((c) => c.archived);

    function getGroupKey(c) {
      return c.provider + '|' + (resolveModel(c) || '');
    }

    function getGroupLabel(c) {
      var pname = (PROVIDERS[c.provider] || PROVIDERS.openai).name;
      var model = resolveModel(c) || '(未选模型)';
      return pname + ' · ' + model;
    }

    function renderItem(c) {
      const isActive = c.id === state.currentConversationId;
      const msgCount = c.messages.length;
      const dateStr = formatDate(c.updatedAt);
      const archiveIcon = c.archived
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>';
      return (
        '<div class="conv-item' + (isActive ? ' active' : '') + (c.archived ? ' archived' : '') + '" data-id="' + c.id + '">' +
        '<div class="conv-item-content">' +
        '<div class="conv-item-title">' + escapeHtml(c.title) + (c.archived ? ' <span class="archive-badge">归档</span>' : '') + '</div>' +
        '<div class="conv-item-meta">' +
        '<span>' + msgCount + ' 条</span>' +
        '<span>' + dateStr + '</span>' +
        '</div></div>' +
        '<div class="conv-item-actions">' +
        '<button class="conv-item-btn" data-action="archive" data-id="' + c.id + '" aria-label="归档" title="归档/取消归档">' + archiveIcon + '</button>' +
        '<button class="conv-item-btn" data-action="rename" data-id="' + c.id + '" aria-label="重命名" title="重命名会话">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>' +
        '</button>' +
        '<button class="conv-item-btn danger" data-action="delete" data-id="' + c.id + '" aria-label="删除" title="删除会话">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
        '</button></div></div>'
      );
    }

    function renderGroupedList(convs) {
      var groups = new Map();
      for (var i = 0; i < convs.length; i++) {
        var c = convs[i];
        var key = getGroupKey(c);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(c);
      }

      // Sort groups by most recent conversation
      var sortedGroups = [];
      groups.forEach(function(convsInGroup, key) {
        var latest = 0;
        for (var j = 0; j < convsInGroup.length; j++) {
          var t = new Date(convsInGroup[j].updatedAt).getTime();
          if (t > latest) latest = t;
        }
        sortedGroups.push({ key: key, convs: convsInGroup, latest: latest });
      });
      sortedGroups.sort(function(a, b) { return b.latest - a.latest; });

      var html = '';
      for (var gi = 0; gi < sortedGroups.length; gi++) {
        var group = sortedGroups[gi];
        var first = group.convs[0];
        var label = getGroupLabel(first);

        // Sort convs within group by updatedAt desc
        group.convs.sort(function(a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); });

        html += '<div class="conv-group">';
        html += '<div class="conv-group-header">';
        html += '<span class="conv-group-label">' + escapeHtml(label) + '</span>';
        html += '<span class="conv-group-count">' + group.convs.length + '</span>';
        html += '<button class="conv-group-add" data-provider="' + escapeHtml(first.provider) + '" data-model="' + escapeHtml(first.model || '') + '" data-custom-model="' + escapeHtml(first.customModel || '') + '" aria-label="在此模型下新建对话" title="在此模型下新建对话">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
        html += '</button></div>';

        for (var ci = 0; ci < group.convs.length; ci++) {
          html += renderItem(group.convs[ci]);
        }
        html += '</div>';
      }
      return html;
    }

    var html = renderGroupedList(activeList);

    if (archivedList.length > 0) {
      html += '<div class="archive-section-header">归档 · ' + archivedList.length + ' 个会话</div>';
      for (var ai = 0; ai < archivedList.length; ai++) {
        html += renderItem(archivedList[ai]);
      }
    }

    dom.convList.innerHTML = html;

    updateArchiveToggleUI();
  }

  function updateArchiveToggleUI() {
    var totalArchived = 0;
    for (var i = 0; i < state.conversations.length; i++) {
      if (state.conversations[i].archived) totalArchived++;
    }
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

  function getVisibleAssistantContent(text, isStreaming) {
    const value = String(text || '');
    return isStreaming ? value.replace(/\n?@@SCENE[\s\S]*$/m, '').trimEnd() : value;
  }

  function renderBubbleHTML(msg) {
    // Build inner HTML for an assistant message bubble
    let html = '';

    // Thinking / reasoning section
    const reasoning = msg.reasoning || '';
    if (reasoning) {
      const conv = getCurrentConv();
      const isStreamingReasoning = msg._streaming && !msg.content;
      const keepOpen = msg._keepThinkingOpen !== undefined
        ? msg._keepThinkingOpen
        : conv && conv.keepThinkingOpen !== false;
      const stayOpen = isStreamingReasoning || (keepOpen && !msg._streaming);
      const openAttr = stayOpen ? ' open' : '';
      const reasonHTML = msg._streaming ? renderContentFast(reasoning) : renderMarkdown(reasoning);
      html += '<details class="thinking-section"' + openAttr + '>';
      html += '<summary class="thinking-header">思考过程</summary>';
      html += '<div class="thinking-content">' + reasonHTML + '</div>';
      html += '</details>';
    }

    // Main content - fast path during streaming, full markdown when done
    const visibleContent = getVisibleAssistantContent(msg.content || '', msg._streaming);
    const contentHTML = msg._streaming
      ? renderContentFast(visibleContent)
      : renderMarkdown(visibleContent);
    html += '<div class="message-content">' + contentHTML + '</div>';

    if (msg.sceneSnapshot && !msg._streaming) {
      html += renderSceneStatusTable(msg);
    }

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
        contentDiv.innerHTML = renderContentFast(getVisibleAssistantContent(msg.content || '', true));
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
      const details = bubble.querySelector('.thinking-section');
      const conv = getCurrentConv();
      const keepOpen = msg._keepThinkingOpen !== undefined
        ? msg._keepThinkingOpen
        : conv && conv.keepThinkingOpen !== false;
      if (details) details.open = !!keepOpen;
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

  function setupViewportInsets() {
    // Set app height to visual viewport (fixes iOS bottom black bar)
    var setAppHeight = function() {
      var h;
      if (window.visualViewport) {
        h = window.visualViewport.height;
      } else {
        h = window.innerHeight;
      }
      // Only update if keyboard isn't dominating (avoid layout jump)
      var keyboardGap = window.visualViewport ? Math.max(0, window.innerHeight - window.visualViewport.height) : 0;
      if (keyboardGap < 180) {
        document.documentElement.style.setProperty('--app-height', Math.round(h) + 'px');
      }
    };
    setAppHeight();
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', function() { setTimeout(setAppHeight, 350); });

    if (!window.visualViewport) return;
    var updateInsets = function() {
      var vv = window.visualViewport;
      var keyboardInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // Only apply when keyboard is clearly visible (> 50px gap); otherwise let CSS safe-bottom handle it alone
      if (keyboardInset < 50) keyboardInset = 0;
      document.documentElement.style.setProperty('--keyboard-inset', Math.round(keyboardInset) + 'px');
    };
    window.visualViewport.addEventListener('resize', updateInsets);
    window.visualViewport.addEventListener('scroll', updateInsets);
    updateInsets();
  }

  // =========================================================================
  // RENDER: SCROLL
  // =========================================================================

  let userScrolledUp = false;

  function scrollToBottom(force) {
    if (!force && userScrolledUp) return;
    dom.mainContent.scrollTop = dom.mainContent.scrollHeight;
  }

  function preserveScrollPosition(fn) {
    const el = dom.mainContent;
    const beforeTop = el.scrollTop;
    fn();
    el.scrollTop = beforeTop;
    requestAnimationFrame(() => {
      el.scrollTop = beforeTop;
    });
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
    dom.inputKeepThinking.checked = conv.keepThinkingOpen !== false;
    if (dom.inputSceneDetail) dom.inputSceneDetail.value = conv.sceneDetailLevel || 'medium';
    conv.toolCallLimit = 0;
    conv.toolCallLimitMode = 'disabled';
    dom.selectToolCallLimit.value = '0';
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
    conv.keepThinkingOpen = dom.inputKeepThinking.checked;
    if (dom.inputSceneDetail) conv.sceneDetailLevel = dom.inputSceneDetail.value;
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
    conv.toolCallLimit = 0;
    conv.toolCallLimitMode = 'disabled';

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


  function renderMoodChips() {
    if (!dom.moodChips) return;
    var moods = ['悬疑','温柔','冒险','日常','紧张','奇幻','科幻'];
    var conv = getCurrentConv();
    var current = conv && conv.sceneWorld ? conv.sceneWorld.mood : '';
    var html = '';
    for (var i = 0; i < moods.length; i++) {
      var m = moods[i];
      html += '<button class="scene-chip' + (current === m ? ' active' : '') + '" data-value="' + m + '">' + m + '</button>';
    }
    dom.moodChips.innerHTML = html;
    // Bind click
    var chips = dom.moodChips.querySelectorAll('.scene-chip');
    for (var ci = 0; ci < chips.length; ci++) {
      (function(chip) {
        chip.addEventListener('click', function() {
          var c = getCurrentConv();
          if (!c || !c.sceneWorld) return;
          var v = chip.dataset.value;
          c.sceneWorld.mood = c.sceneWorld.mood === v ? '' : v;
          updateTimestamp(c);
          debouncedSave();
          renderMoodChips();
        });
      })(chips[ci]);
    }
  }

  function renderSpeciesChips() {
    if (!dom.speciesChips) return;
    var species = ['人类','精灵','机械体','兽人','龙裔','AI'];
    var conv = getCurrentConv();
    var current = conv && conv.sceneCharacter ? conv.sceneCharacter.species : '';
    var html = '';
    for (var i = 0; i < species.length; i++) {
      var s = species[i];
      html += '<button class="scene-chip' + (current === s ? ' active' : '') + '" data-value="' + s + '">' + s + '</button>';
    }
    dom.speciesChips.innerHTML = html;
    var chips = dom.speciesChips.querySelectorAll('.scene-chip');
    for (var ci = 0; ci < chips.length; ci++) {
      (function(chip) {
        chip.addEventListener('click', function() {
          var c = getCurrentConv();
          if (!c || !c.sceneCharacter) return;
          var v = chip.dataset.value;
          c.sceneCharacter.species = c.sceneCharacter.species === v ? '' : v;
          updateTimestamp(c);
          debouncedSave();
          renderSpeciesChips();
        });
      })(chips[ci]);
    }
  }

  function renderNpcGrid() {
    if (!dom.sceneNpcGrid) return;
    var conv = getCurrentConv();
    if (!conv) { dom.sceneNpcGrid.innerHTML = ''; return; }
    var npcs = conv.sceneNpcs || [];
    if (!npcs.length) {
      dom.sceneNpcGrid.innerHTML = '<div class="scene-npc-empty">暂无 NPC，点击下方按钮添加</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < npcs.length; i++) {
      var n = npcs[i];
      if (!n.id) n.id = generateId();
      var initial = (n.name || '?').charAt(0);
      html += '<div class="npc-card" data-npc-id="' + n.id + '">';
      html += '<div class="npc-card-inner">';
      // Front
      html += '<div class="npc-card-front">';
      if (n.image) {
        html += '<div class="npc-card-img" style="background-image:url(' + n.image + ')"></div>';
      } else {
        html += '<div class="npc-card-avatar">' + initial + '</div>';
      }
      html += '<div class="npc-card-name">' + escapeHtml(n.name || '未命名') + '</div>';
      html += '<div class="npc-card-role">' + escapeHtml(n.role || '') + '</div>';
      html += '<div class="npc-card-status">' + escapeHtml(n.status || '') + '</div>';
      html += '</div>';
      // Back
      html += '<div class="npc-card-back">';
      html += '<button class="btn btn-sm npc-img-btn" data-npc-id="' + n.id + '" data-action="upload">上传图片</button>';
      if (n.image) html += '<button class="btn btn-sm btn-danger npc-img-btn" data-npc-id="' + n.id + '" data-action="removeImg">移除图片</button>';
      html += '<div class="npc-back-name">' + escapeHtml(n.name || '未命名') + '</div>';
      html += '<input class="input scene-input npc-edit-field" data-field="name" placeholder="姓名" value="' + escapeHtml(n.name || '') + '">';
      html += '<input class="input scene-input npc-edit-field" data-field="role" placeholder="身份/关系" value="' + escapeHtml(n.role || '') + '">';
      html += '<input class="input scene-input npc-edit-field" data-field="status" placeholder="状态" value="' + escapeHtml(n.status || '') + '">';
      html += '<textarea class="input scene-input npc-edit-field" data-field="notes" rows="2" placeholder="备注">' + escapeHtml(n.notes || '') + '</textarea>';
      html += '<button class="btn btn-danger btn-sm npc-delete-btn" data-npc-id="' + n.id + '">删除</button>';
      html += '</div>';
      html += '</div></div>';
    }
    dom.sceneNpcGrid.innerHTML = html;
    // Bind flip
    var cards = dom.sceneNpcGrid.querySelectorAll('.npc-card');
    for (var ci = 0; ci < cards.length; ci++) {
      (function(card) {
        card.addEventListener('click', function(e) {
          if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) return;
          card.classList.toggle('flipped');
        });
      })(cards[ci]);
    }
    // Bind edit fields
    var fields = dom.sceneNpcGrid.querySelectorAll('.npc-edit-field');
    for (var fi = 0; fi < fields.length; fi++) {
      (function(field) {
        field.addEventListener('input', function() {
          var npcId = field.closest('.npc-card').dataset.npcId;
          var f = field.dataset.field;
          var v = field.value;
          var c = getCurrentConv();
          if (!c || !c.sceneNpcs) return;
          for (var ni = 0; ni < c.sceneNpcs.length; ni++) {
            if (c.sceneNpcs[ni].id === npcId) {
              c.sceneNpcs[ni][f] = v;
              if (f === 'role') c.sceneNpcs[ni].relation = v;
              updateTimestamp(c);
              debouncedSave();
              break;
            }
          }
        });
      })(fields[fi]);
    }
    // Bind delete buttons
    var delBtns = dom.sceneNpcGrid.querySelectorAll('.npc-delete-btn');
    for (var di = 0; di < delBtns.length; di++) {
      (function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          deleteNpc(btn.dataset.npcId);
        });
      })(delBtns[di]);
    }
  }


  function renderRoleChips() {
    if (!dom.sceneCharRole) return;
    var roles = ['学生','教师','医生','调查员','旅人','守卫','机械师','研究员','商人','佣兵'];
    var conv = getCurrentConv();
    var current = conv && conv.sceneCharacter ? (conv.sceneCharacter.role || '') : '';
    var roleInput = dom.sceneCharRole;
    // Render chips as overlay near the role input
    var container = roleInput.parentNode;
    if (!container || !container.querySelector('.scene-chips')) {
      var chipDiv = document.createElement('div');
      chipDiv.className = 'scene-chips';
      chipDiv.id = 'roleChips';
      container.appendChild(chipDiv);
    }
    var chipDiv = container.querySelector('#roleChips');
    if (!chipDiv) return;
    var html = '';
    for (var i = 0; i < roles.length; i++) {
      var r = roles[i];
      html += '<button class="scene-chip' + (current === r ? ' active' : '') + '" data-value="' + r + '">' + r + '</button>';
    }
    chipDiv.innerHTML = html;
    var chips = chipDiv.querySelectorAll('.scene-chip');
    for (var ci = 0; ci < chips.length; ci++) {
      (function(chip) {
        chip.addEventListener('click', function() {
          var c = getCurrentConv();
          if (!c || !c.sceneCharacter) return;
          var v = chip.dataset.value;
          var newRole = c.sceneCharacter.role === v ? '' : v;
          c.sceneCharacter.role = newRole;
          if (dom.sceneCharRole) dom.sceneCharRole.value = newRole;
          updateTimestamp(c);
          debouncedSave();
          renderRoleChips();
        });
      })(chips[ci]);
    }
  }

  function renderTraitChips() {
    var traits = ['冷静','温柔','敏锐','谨慎','冲动','幽默','孤僻','坚韧','好奇','果断'];
    if (!dom.sceneCharTraits) return;
    var container = dom.sceneCharTraits.parentNode;
    if (!container || !container.querySelector('#traitChips')) {
      var chipDiv = document.createElement('div');
      chipDiv.className = 'scene-chips';
      chipDiv.id = 'traitChips';
      container.appendChild(chipDiv);
      container.insertBefore(chipDiv, dom.sceneCharTraits.nextSibling);
    }
    var chipDiv = container.querySelector('#traitChips');
    if (!chipDiv) return;
    var conv = getCurrentConv();
    var current = conv && conv.sceneCharacter ? (conv.sceneCharacter.traits || '') : '';
    var selected = current.split(/[,，、\s]+/).filter(Boolean);
    var html = '';
    for (var i = 0; i < traits.length; i++) {
      var t = traits[i];
      var isActive = selected.indexOf(t) !== -1;
      html += '<button class="scene-chip' + (isActive ? ' active' : '') + '" data-value="' + t + '">' + t + '</button>';
    }
    chipDiv.innerHTML = html;
    var chips = chipDiv.querySelectorAll('.scene-chip');
    for (var ci = 0; ci < chips.length; ci++) {
      (function(chip) {
        chip.addEventListener('click', function() {
          var c = getCurrentConv();
          if (!c || !c.sceneCharacter) return;
          var v = chip.dataset.value;
          var cur = c.sceneCharacter.traits || '';
          var sel = cur.split(/[,，、\s]+/).filter(Boolean);
          var idx = sel.indexOf(v);
          if (idx !== -1) sel.splice(idx, 1);
          else sel.push(v);
          c.sceneCharacter.traits = sel.join('，');
          if (dom.sceneCharTraits) dom.sceneCharTraits.value = c.sceneCharacter.traits;
          updateTimestamp(c);
          debouncedSave();
          renderTraitChips();
        });
      })(chips[ci]);
    }
  }

  function renderGenreChips() {
    var genres = ['低魔','科技','校园','都市','废土','悬疑','慢热','战斗','探索','群像'];
    if (!dom.sceneRules) return;
    var container = dom.sceneRules.parentNode;
    if (!container || !container.querySelector('#genreChips')) {
      var chipDiv = document.createElement('div');
      chipDiv.className = 'scene-chips';
      chipDiv.id = 'genreChips';
      container.appendChild(chipDiv);
      container.insertBefore(chipDiv, dom.sceneRules.nextSibling);
    }
    var chipDiv = container.querySelector('#genreChips');
    if (!chipDiv) return;
    var conv = getCurrentConv();
    var current = conv && conv.sceneWorld ? (conv.sceneWorld.rules || '') : '';
    var selected = current.split(/[,，、\s]+/).filter(Boolean);
    var html = '';
    for (var i = 0; i < genres.length; i++) {
      var g = genres[i];
      var isActive = selected.indexOf(g) !== -1;
      html += '<button class="scene-chip' + (isActive ? ' active' : '') + '" data-value="' + g + '">' + g + '</button>';
    }
    chipDiv.innerHTML = html;
    var chips = chipDiv.querySelectorAll('.scene-chip');
    for (var ci = 0; ci < chips.length; ci++) {
      (function(chip) {
        chip.addEventListener('click', function() {
          var c = getCurrentConv();
          if (!c || !c.sceneWorld) return;
          var v = chip.dataset.value;
          var cur = c.sceneWorld.rules || '';
          var sel = cur.split(/[,，、\s]+/).filter(Boolean);
          var idx = sel.indexOf(v);
          if (idx !== -1) sel.splice(idx, 1);
          else sel.push(v);
          c.sceneWorld.rules = sel.join('，');
          if (dom.sceneRules) dom.sceneRules.value = c.sceneWorld.rules;
          updateTimestamp(c);
          debouncedSave();
          renderGenreChips();
        });
      })(chips[ci]);
    }
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
      const ss = createSceneState(conv.sceneState);
      conv.sceneState = ss;
      if (dom.sceneMental) dom.sceneMental.value = ss.mental || '';
      if (dom.sceneMentalScore) dom.sceneMentalScore.value = ss.mentalScore || '';
      if (dom.scenePhysical) dom.scenePhysical.value = ss.physical || '';
      if (dom.scenePlot) dom.scenePlot.value = ss.plot || '';
      if (dom.sceneDirections) dom.sceneDirections.value = ss.directions || '';
      syncSceneWorldUI();
      syncSceneCharacterUI();
      syncSceneStatusUI();
      renderNpcGrid();
      renderMoodChips();
      renderSpeciesChips();
      renderRoleChips();
      renderTraitChips();
      renderGenreChips();
    }
  }

  function syncSceneWorldUI() {
    var conv = getCurrentConv();
    if (!conv || !conv.sceneWorld) return;
    var w = createSceneWorld(conv.sceneWorld);
    conv.sceneWorld = w;
    dom.sceneOpeningName.value = w.openingName || '';
    dom.sceneSetting.value = w.setting || '';
    dom.sceneLocations.value = w.locations || '';
    dom.sceneRules.value = w.rules || '';
    dom.sceneMood.value = w.mood || '';
    dom.sceneWorldNotes.value = w.notes || '';
  }

  function syncSceneCharacterUI() {
    var conv = getCurrentConv();
    if (!conv || !conv.sceneCharacter) return;
    var ch = createSceneCharacter(conv.sceneCharacter);
    conv.sceneCharacter = ch;
    dom.sceneCharName.value = ch.name || '';
    dom.sceneCharAge.value = ch.age || '';
    dom.sceneCharRole.value = ch.role || '';
    if (dom.sceneCharSpecies) dom.sceneCharSpecies.value = ch.species || '';
    dom.sceneCharAppearance.value = ch.appearance || '';
    dom.sceneCharTraits.value = ch.traits || '';
    dom.sceneCharStats.value = ch.stats || '';
    dom.sceneCharGoal.value = ch.currentGoal || '';
  }

  function syncSceneStatusUI() {
    var conv = getCurrentConv();
    if (!conv || !conv.sceneStatus) return;
    var st = createSceneStatus(conv.sceneStatus);
    conv.sceneStatus = st;
    dom.sceneHealth.value = st.health || '';
    dom.sceneStamina.value = st.stamina || '';
    dom.sceneComposure.value = st.composure || '';
    dom.sceneFocus.value = st.focus || '';
    dom.sceneObjective.value = st.currentObjective || '';
    dom.sceneConstraints.value = st.constraints || '';
  }

  function addNpc() {
    var conv = getCurrentConv();
    if (!conv) return;
    if (!conv.sceneNpcs) conv.sceneNpcs = [];
    conv.sceneNpcs.push({ id: generateId(), name: '', role: '', relation: '', status: '', notes: '' });
    updateTimestamp(conv);
    renderNpcGrid();
    debouncedSave();
  }

  function deleteNpc(id) {
    var conv = getCurrentConv();
    if (!conv || !conv.sceneNpcs) return;
    conv.sceneNpcs = conv.sceneNpcs.filter(function(n) { return n.id !== id; });
    updateTimestamp(conv);
    renderNpcGrid();
    debouncedSave();
  }

  function generateSceneHints() {
    var conv = getCurrentConv();
    if (!conv) { showToast('没有当前会话', 'warning'); return; }
    var hints = [];
    if (conv.sceneState && conv.sceneState.directions) {
      var dirs = parseDirectionOptions(conv.sceneState.directions);
      if (dirs.length) hints = dirs.map(function(d) { return d.content; });
    }
    if (!hints.length) {
      for (var i = conv.messages.length-1; i >= 0; i--) {
        if (conv.messages[i].role === 'assistant' && conv.messages[i].content) {
          var c = conv.messages[i].content;
          var lines = c.split('\n').filter(Boolean);
          for (var li = 0; li < Math.min(lines.length, 20); li++) {
            var m = lines[li].match(/^([A-D])[\.、：:)]\s*(.+)/);
            if (m) hints.push(m[2].trim());
          }
          if (hints.length) break;
          var sents = c.replace(/[。！？\n]/g, '。').split('。').filter(function(s){return s.trim().length>8&&s.trim().length<60;});
          hints = sents.slice(-4);
          break;
        }
      }
    }
    if (!hints.length && conv.sceneWorld && conv.sceneWorld.openingName) {
      hints = ['从' + conv.sceneWorld.openingName + '开始展开故事', '描写当前场景的氛围与细节', '引入新角色或外部事件'];
    }
    if (!hints.length) { showToast('当前暂无剧情可总结，先发送几条消息吧', 'info'); return; }
    showHintsPanel(hints.slice(0, 4));
  }

  function clearHintsPanel() {
    var p = document.querySelector('.hints-panel');
    if (p) p.remove();
  }

  function showHintsPanel(hints) {
    clearHintsPanel();
    if (!hints.length) return;
    var conv = getCurrentConv();
    var panel = document.createElement('div');
    panel.className = 'hints-panel';
    if (conv) panel.dataset.convId = conv.id;
    var closeBtn = document.createElement('button');
    closeBtn.className = 'hints-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', function() { panel.remove(); });
    panel.appendChild(closeBtn);
    for (var i = 0; i < hints.length; i++) {
      (function(hint) {
        var chip = document.createElement('button');
        chip.className = 'hints-chip';
        chip.textContent = hint;
        chip.addEventListener('click', function() {
          dom.inputMessage.value = hint;
          dom.inputMessage.style.height = 'auto';
          dom.inputMessage.style.height = Math.min(dom.inputMessage.scrollHeight, 120) + 'px';
          dom.inputMessage.focus();
          panel.remove();
        });
        panel.appendChild(chip);
      })(hints[i]);
    }
    var bottomBar = document.querySelector('.bottom-bar');
    if (bottomBar && bottomBar.parentNode) bottomBar.parentNode.insertBefore(panel, bottomBar);
    showToast('已生成 ' + hints.length + ' 条提示词，点击填入输入框', 'info');
  }

  function showSetupConfirm() {
    dom.dialogBody.innerHTML = '写文设置已完成？';
    dom.dialogConfirm.textContent = '继续';
    dom.dialogConfirm.className = 'btn btn-primary';
    dom.dialogCancel.textContent = '返回修改';
    state.pendingConfirmAction = function() {
      hideConfirm();
      showSetupCards();
    };
    dom.dialogOverlay.style.display = 'flex';
  }

  function showSetupCards() {
    dom.dialogBody.innerHTML = '<div style=\"display:flex;flex-direction:column;gap:8px\"><button class=\"btn btn-primary btn-full\" id=\"dialogCopyChar\">复制角色卡</button><p style=\"font-size:10.5px;color:var(--text-tertiary);text-align:center;margin:0\">把角色设定打包成纯文本，方便粘贴给模型参考</p><button class=\"btn btn-secondary btn-full\" id=\"dialogGenOpening\">生成开场提示词</button><p style=\"font-size:10.5px;color:var(--text-tertiary);text-align:center;margin:0\">根据当前世界/角色/状态设定自动生成开场灵感</p></div>';
    dom.dialogConfirm.textContent = '关闭';
    dom.dialogConfirm.className = 'btn btn-secondary';
    dom.dialogCancel.style.display = 'none';
    state.pendingConfirmAction = function() { hideConfirm(); };
    dom.dialogOverlay.style.display = 'flex';
    // Bind the card buttons after dialog is shown
    setTimeout(function() {
      var copyBtn = document.getElementById('dialogCopyChar');
      var genBtn = document.getElementById('dialogGenOpening');
      if (copyBtn) copyBtn.addEventListener('click', function() {
        if (dom.btnCopyCharCard) dom.btnCopyCharCard.click();
        hideConfirm();
      });
      if (genBtn) genBtn.addEventListener('click', function() {
        if (dom.btnGenOpeningPrompt) dom.btnGenOpeningPrompt.click();
        hideConfirm();
      });
    }, 50);
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
    dom.selectToolCallLimit.value = '0';
    dom.selectToolCallLimit.disabled = true;
    dom.toolWarning.style.display = '';
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

    // Add user message
    conv.messages.push({ role: 'user', content: text });
    updateTimestamp(conv);
    autoTitle(conv);

    dom.inputMessage.value = '';
    dom.inputMessage.style.height = 'auto';

    preserveScrollPosition(renderMessages);
    updateTopBar();
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
      const ss = createSceneState(conv.sceneState);
      conv.sceneState = ss;
      // Build current scene state reference block
      var sceneStateRef = [
        '\n[当前已记录场景状态 — 仅作参考，不要展示给用户]',
        '当前角色：' + (ss.currentRole || '未记录'),
        '当前目标：' + (ss.currentGoal || '未记录'),
        '当前姿势：' + (ss.posture || '未记录'),
        '精神状态：' + (ss.mental || '未记录'),
        '精神评分：' + (ss.mentalScore ? ss.mentalScore + '/10' : '未记录'),
        '身体状态：' + (ss.physical || '未记录'),
        '剧情总结：' + (ss.plot || '未记录'),
      ];
      if (ss.bodyDetails) {
        sceneStateRef.push('身体细节：');
        var bdLines = ss.bodyDetails.split('\n').filter(Boolean);
        for (var bdi = 0; bdi < bdLines.length; bdi++) {
          sceneStateRef.push('- ' + bdLines[bdi].trim());
        }
      }
      if (ss.risk) {
        sceneStateRef.push('风险/伏笔：' + ss.risk);
      }
      if (ss.directions) {
        sceneStateRef.push('上次剧情走向：');
        // directions are already stored in A/B/C/D format; preserve as-is
        var prevDirs = ss.directions.split('\n').filter(Boolean);
        for (var di = 0; di < prevDirs.length; di++) {
          sceneStateRef.push(prevDirs[di].trim());
        }
      } else {
        sceneStateRef.push('上次剧情走向：未记录');
      }
      sceneStateRef.push('');

      // Inject world and character settings as stable reference
      var worldRef = buildSceneWorldRef(conv);
      var charRef = buildSceneCharacterRef(conv);
      var statusRef = buildSceneStatusRef(conv);
      var npcsRef = buildSceneNpcsRef(conv);
      var settingRefs = [];
      if (worldRef) settingRefs.push(worldRef);
      if (charRef) settingRefs.push(charRef);
      if (statusRef) settingRefs.push(statusRef);
      if (npcsRef) settingRefs.push(npcsRef);
      if (settingRefs.length) {
        settingRefs.push('');
      }

      var sceneBlock = [
        '\n\n[写作场景记忆 — 独立存储，不随上下文压缩]',
      ].concat(sceneStateRef).concat(settingRefs).concat([
        '写文模式规则：',
        '0. 【角色视角强制】@@SCENE 中所有字段只描述”剧情内的人物/世界”，禁止描述 AI 自身、模型状态、用户操作、写作过程、生成过程、输出流畅度、叙事技巧、处理负载。精神状态是剧情人物（默认为主角）的心理/情绪/意志状态，不是 AI 或写作者的创作状态。身体细节是剧情人物的姿态、动作、感官、伤痛、疲劳、衣着随身状态，不是”打字、输出、模拟书写、键盘敲击”。剧情总结只总结剧情内发生的事件。剧情走向是剧情内人物可采取的行动或外部变化，不是”用户可以要求/调整/改写/让 AI 继续”。如果角色不明确，优先使用角色卡里的主角；没有角色卡则用最近剧情中的主视角人物。',
        '1. 每次回复末尾必须输出完整的 @@SCENE 块，且 @@SCENE 块内必须包含”走向:”标签。走向: 后必须给出 2–4 个剧情选项，使用 A/B/C/D 选项标号（如只有两个选项则只写 A/B，三个则只写 A/B/C）。不得使用 1/2/3/4 数字编号。每个选项基于本次刚写出的正文、用户最新要求、最近上下文和当前场景记忆生成，选项之间必须有明显差异，不能泛泛而谈，不能脱离当前剧情，不能重复上一次已给出的走向。每条控制在 24–50 字，必须包含"行动 + 可能收益/风险/情绪变化"。不允许只在正文里写后续可能而不写入 @@SCENE。',
        '2. 剧情走向必须以 A/B/C/D 选项形式输出。用户下一轮如果只输入 A、B、C 或 D（或其变体如”选A””选择B”），应视为用户选择了对应剧情分支，并沿该分支继续创作，不得忽略或自行发挥；如果用户自由输入其他内容，则按用户新要求继续，不要强行套用已有选项。',
        '3. 每次回复后必须维护剧情人物的精神状态、身体细节、当前剧情总结和剧情走向，不得省略 @@SCENE 状态块。',
        '4. 精神评分使用 1-10 的整数，评价剧情人物的心理稳定/压力/清醒程度。评分要跟剧情变化一致，但不要无理由持续降低。',
        '5. 身体细节要具体到剧情人物的姿态、感官、疲劳、伤痛、动作变化或衣着状态，避免只写空泛形容词。',
        '6. 剧情走向必须给 2-4 个，彼此要有实际差异，并尽量避开上次已经生成过的走向。',
        '7. 防止绝望循环：除非用户明确要求悲剧，不要让所有走向都通向崩溃、死亡或无解；至少保留一个可修复、可喘息或可转机的路径。',
        '8. 如果剧情停滞，主动加入温和变量、外部线索、角色选择或可行动机会，减少重复。',
        '9. 应用会自动把场景记忆渲染到本次回答框里；正文里不要重复输出状态表。',
        '10. 必须按人物分别输出状态：先输出主角完整状态块，再输出与主角当前强相关的1-3个NPC状态块。每个状态块用[角色: 名称]开头。每块包含精神、精神评分、身体、身体细节（bullet列表）、目标、姿势、内心。描述要贴剧情、贴人物，不要像AI总结自己。剧情走向2-4条，每条24-50字，含行动+可能收益/风险/情绪变化。',
        '11. 精神状态要写具体触发原因，如"因听见脚步声而警觉升高"，不要只写"紧张"。身体细节要写可感知的具体细节：呼吸、肌肉、视线、手指、步伐、伤口、衣物/装备、环境接触等，必须和刚生成的剧情正文一致，不要套模板。',
        '12. 剧情走向每条必须包含行动 + 可能后果/情绪变化/风险，不能只是泛泛标题。至少包含一个主动推进、一个观察/试探、一个关系互动或外部事件；避免全是逃跑/崩溃/死亡。每个走向要明显不同。文案中自然体现可能…/但…/因此…等故事感。',
        '13. 状态字段必须来自刚刚正文中已出现或合理可承接的细节。禁止凭空编造正文未涉及的伤口、道具、关系、人物、地点。如果正文信息不足以填写某个字段，写"尚未显露"或"暂未明确"，不得编造。',
        '14. 当前剧情状态详细度：' + (conv.sceneDetailLevel || 'medium') + '。' + (conv.sceneDetailLevel === 'low' ? '每项1短句，身体细节1-2条，走向2条。' : conv.sceneDetailLevel === 'high' ? '更详细：身体细节3-4条，剧情总结2句，走向3-4条。' : conv.sceneDetailLevel === 'ultra' ? '极致详细：身体细节4-6条，剧情总结2-3句，走向4条并含后果/代价/机会，角色心理和风险更深入。但仍禁止凭空编造，信息不足写尚未显露。' : '每项1-2句，身体细节2-3条，走向2-3条。'),
        '\n请在每次回复末尾用以下格式更新场景状态（内部记录，不要展示给用户）：',
        '@@SCENE',
        '[角色: 主角名]',
        '目标: <角色此刻想做什么>',
        '姿势: <角色位置、姿态、动作状态>',
        '精神: <精神状态 — 具体触发原因>',
        '精神评分: <1-10整数>',
        '身体: <身体状态一句话总结>',
        '身体细节:',
        '- <可感知细节1：呼吸/肌肉/视线等>',
        '- <可感知细节2>',
        '情节: <1-2句剧情总结>',
        '风险: <隐藏风险/未解决矛盾/伏笔，1句>',
        '内心: <角色内心独白，1句，可空>',
        '走向:',
        'A. <行动 + 可能后果/风险，24-50字>',
        'B. <明显不同的行动 + 后果/风险>',
        'C. <可选>',
        'D. <可选>',
        '@@END',
      ]).filter(Boolean).join('\n');
      fullSystemPrompt = (effectiveSystemPrompt || '') + sceneBlock;
    }

    if (fullSystemPrompt) {
      const sysMsg = { role: 'system', content: fullSystemPrompt };
      if (supportsCaching) sysMsg.cache_control = { type: 'ephemeral' };
      messages.push(sysMsg);
    }

    messages.push(...buildConversationRequestMessages(conv, supportsCaching));

    // Scene mode A/B/C/D choice detection
    if (conv.sceneMode && conv.sceneState && conv.sceneState.directions) {
      var choiceLetter = parseSceneChoiceInput(text);
      if (choiceLetter) {
        var options = parseDirectionOptions(conv.sceneState.directions);
        var matched = null;
        for (var oi = 0; oi < options.length; oi++) {
          if (options[oi].letter === choiceLetter) { matched = options[oi]; break; }
        }
        if (matched) {
          messages.push({
            role: 'system',
            content: '[用户选择了上次剧情走向 ' + matched.letter + '：' + matched.content + '。请沿此分支继续生成剧情，不要偏离该方向。]'
          });
        } else {
          messages.push({
            role: 'system',
            content: '[用户输入了 ' + choiceLetter + '，但未在上次剧情走向中找到对应选项。请按用户的简短指示继续，如果无法确定方向，可询问用户具体意图。]'
          });
        }
      }
    }

    // Add placeholder assistant message for streaming
    const assistantMsg = { role: 'assistant', content: '', _streaming: true };
    conv.messages.push(assistantMsg);
    preserveScrollPosition(renderMessages);

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
          Accept: conv.stream ? 'text/event-stream' : 'application/json',
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
      preserveScrollPosition(renderMessages);
    } finally {
      assistantMsg._streaming = false;
      assistantMsg._keepThinkingOpen = conv.keepThinkingOpen !== false;
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
          const previousScene = createSceneState(conv.sceneState);
          const currentRole = getSceneLineAny(block, ['角色', '当前角色', '主角', 'POV']);
          const currentGoal = getSceneLineAny(block, ['目标', '当前目标']);
          const posture = getSceneLineAny(block, ['姿势', '当前姿势', '动作']);
          const mental = getSceneLineAny(block, ['精神', '精神状态']);
          const mentalScore = normalizeMentalScore(getSceneLineAny(block, ['精神评分', '评分']));
          const physical = getSceneLineAny(block, ['身体', '身体状态']);
          const bodyDetails = getSceneBodyDetails(block);
          const plot = getSceneLineAny(block, ['情节', '剧情总结', '剧情']);
          const risk = getSceneLineAny(block, ['风险', '伏笔', '风险/伏笔']);
          const innerVoice = getSceneLineAny(block, ['内心', '内心回声', '内心独白', '心理']);
          const characterStatuses = parseCharacterStatuses(block);
          const directions = getSceneDirections(block);
          if (!directions) {
            console.warn('[OmniChat] Scene mode reply has @@SCENE but no directions. Model may have omitted 走向:. block:', block.substring(0, 200));
          }
          conv.sceneState = {
            currentRole: currentRole || previousScene.currentRole,
            currentGoal: currentGoal || previousScene.currentGoal,
            posture: posture || previousScene.posture,
            mental: mental || previousScene.mental,
            mentalScore: mentalScore || previousScene.mentalScore,
            physical: physical || previousScene.physical,
            bodyDetails: bodyDetails || previousScene.bodyDetails,
            plot: plot || previousScene.plot,
            risk: risk || previousScene.risk,
            innerVoice: innerVoice || previousScene.innerVoice,
            directions: directions || previousScene.directions,
            characterStatuses: characterStatuses && characterStatuses.length ? characterStatuses : (previousScene.characterStatuses || []),
          };
          assistantMsg.sceneSnapshot = createSceneState(conv.sceneState);
          assistantMsg.sceneStatusSnapshot = createSceneStatus(conv.sceneStatus);
          assistantMsg.sceneCharacterSnapshot = createSceneCharacter(conv.sceneCharacter);
          // Strip the scene block from displayed content
          assistantMsg.content = assistantMsg.content.replace(/@@SCENE\s*[\s\S]*?\s*@@END/, '').trim();
          updateScenePanelUI();
        } else {
          assistantMsg.sceneSnapshot = createSceneState(conv.sceneState);
          assistantMsg.sceneStatusSnapshot = createSceneStatus(conv.sceneStatus);
          assistantMsg.sceneCharacterSnapshot = createSceneCharacter(conv.sceneCharacter);
        }
      }

      // Show action buttons on completed response
      if (assistantMsg.content && conv.messages.includes(assistantMsg)) {
        assistantMsg._showActions = true;
        assistantMsg._actionIndex = conv.messages.indexOf(assistantMsg);
      }

      updateTimestamp(conv);
      updateTopBar();
      preserveScrollPosition(renderMessages);
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
    let lastRenderAt = 0;
    const minRenderGap = 45;
    const scheduleRender = () => {
      if (renderScheduled) return;
      renderScheduled = true;
      const delay = Math.max(0, minRenderGap - (performance.now() - lastRenderAt));
      setTimeout(() => {
        requestAnimationFrame(() => {
          preserveScrollPosition(renderMessages);
          lastRenderAt = performance.now();
          renderScheduled = false;
        });
      }, delay);
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
      buffer += decoder.decode();
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
  // CONVERSATION ACTIONS
  // =========================================================================

  function newConversation(overrides) {
    var current = getCurrentConv();
    var provider = (overrides && overrides.provider) || (current && current.provider) || 'openai';
    var conv = createConversation(provider);

    if (overrides) {
      // Targeted creation from group header — only set provider/model/customModel
      if (overrides.model !== undefined) conv.model = overrides.model;
      if (overrides.customModel !== undefined) conv.customModel = overrides.customModel;
    } else if (current) {
      // Inherit provider/model only; reset generation params and scene data to defaults
      conv.model = current.model;
      conv.customModel = current.customModel;
      // generation params stay at createConversation defaults
      // scene data stays at createConversation defaults (empty)
    }

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
    updatePreciseButton();
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
          c.sceneState = createSceneState(c.sceneState);
          c.autoCompress = c.autoCompress || false;
          c.keepThinkingOpen = c.keepThinkingOpen !== undefined ? c.keepThinkingOpen : DEFAULTS.keepThinkingOpen;
          c.sceneDetailLevel = c.sceneDetailLevel || DEFAULTS.sceneDetailLevel;
          c.sceneWorld = createSceneWorld(c.sceneWorld);
          c.sceneCharacter = createSceneCharacter(c.sceneCharacter);
          c.sceneStatus = createSceneStatus(c.sceneStatus);
          c.sceneNpcs = normalizeSceneNpcs(c.sceneNpcs);
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

  function copyTextToClipboard(text, successMessage) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(function () { showToast(successMessage, 'success'); })
        .catch(function () { showToast('复制失败，请手动选择文本复制', 'warning'); });
      return;
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(successMessage, 'success');
    } catch (_) {
      showToast('复制失败，请手动选择文本复制', 'warning');
    } finally {
      document.body.removeChild(ta);
    }
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

  function updatePreciseButton() {
    var conv = getCurrentConv();
    var on = conv && conv.preciseMode;
    var btn = dom.btnQuickPrecise;
    if (!btn) return;
    btn.textContent = on ? '精确 ON' : '精确';
    btn.classList.toggle('btn-quick-active', !!on);
    btn.title = on ? '精确模式已开启' : '精确模式：低温输出 + 防幻觉 Prompt';
  }

  function updateInputPlaceholder() {
    var conv = getCurrentConv();
    var on = conv && conv.sceneMode;
    dom.inputMessage.placeholder = on ? '输入剧情行动或选择 A/B/C/D…' : '输入消息…';
  }

  function updateSceneModeClass() {
    var conv = getCurrentConv();
    var on = conv && conv.sceneMode;
    dom.appContainer.classList.toggle('scene-immersive', !!on);
    if (dom.sceneCapsule) dom.sceneCapsule.style.display = on ? '' : 'none';
    if (dom.btnGenHints) dom.btnGenHints.style.display = on ? '' : 'none';
    // Remove hints panel when leaving scene mode
    if (!on) clearHintsPanel();
    updateInputPlaceholder();
  }

  function renderAll() {
    // If hints panel belongs to a different conversation, clear it
    var hp = document.querySelector('.hints-panel');
    if (hp && hp.dataset.convId) {
      var cur = getCurrentConv();
      if (!cur || hp.dataset.convId !== cur.id) hp.remove();
    }
    renderMessages();
    updateTopBar();
    updateWelcomeUI();
    renderConvList();
    updateScenePanelUI();
    updateSceneModeClass();
    updatePreciseButton();
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
        if (btn.classList.contains('conv-group-add')) {
          e.stopPropagation();
          const provider = btn.dataset.provider;
          const model = btn.dataset.model || '';
          const customModel = btn.dataset.customModel || '';
          newConversation({ provider: provider, model: model, customModel: customModel });
          closeDrawer('history');
        }
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
        updateSceneModeClass();
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
    dom.inputKeepThinking.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.keepThinkingOpen = dom.inputKeepThinking.checked;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    if (dom.inputSceneDetail) dom.inputSceneDetail.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.sceneDetailLevel = dom.inputSceneDetail.value;
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
        conv.toolCallLimit = 0;
        conv.toolCallLimitMode = 'disabled';
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
    if (dom.sceneMental) dom.sceneMental.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv && conv.sceneState) {
        conv.sceneState.mental = dom.sceneMental.value;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    if (dom.sceneMentalScore) dom.sceneMentalScore.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv && conv.sceneState) {
        conv.sceneState.mentalScore = normalizeMentalScore(dom.sceneMentalScore.value);
        dom.sceneMentalScore.value = conv.sceneState.mentalScore;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    if (dom.scenePhysical) dom.scenePhysical.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv && conv.sceneState) {
        conv.sceneState.physical = dom.scenePhysical.value;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    if (dom.scenePlot) dom.scenePlot.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv && conv.sceneState) {
        conv.sceneState.plot = dom.scenePlot.value;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    if (dom.sceneDirections) dom.sceneDirections.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv && conv.sceneState) {
        conv.sceneState.directions = dom.sceneDirections.value;
        updateTimestamp(conv);
        debouncedSave();
      }
    });


    // Scene panel tab switching
    if (dom.sceneTabs) {
      dom.sceneTabs.addEventListener('click', function(e) {
        var tab = e.target.closest('.scene-tab');
        if (!tab) return;
        var tabName = tab.dataset.tab;
        // Update active tab button
        var tabs = dom.sceneTabs.querySelectorAll('.scene-tab');
        for (var ti = 0; ti < tabs.length; ti++) tabs[ti].classList.remove('active');
        tab.classList.add('active');
        // Show matching content
        var contents = dom.scenePanelBody.querySelectorAll('.scene-tab-content');
        for (var ci = 0; ci < contents.length; ci++) {
          contents[ci].classList.toggle('active', contents[ci].id === 'tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
        }
      });
    }
// World opening card inputs
    dom.sceneOpeningName.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneWorld) { conv.sceneWorld.openingName = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneSetting.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneWorld) { conv.sceneWorld.setting = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneLocations.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneWorld) { conv.sceneWorld.locations = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneRules.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneWorld) { conv.sceneWorld.rules = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneMood.addEventListener('change', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneWorld) { conv.sceneWorld.mood = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneWorldNotes.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneWorld) { conv.sceneWorld.notes = this.value; updateTimestamp(conv); debouncedSave(); }
    });

    // Character card inputs
    dom.sceneCharName.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneCharacter) { conv.sceneCharacter.name = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneCharAge.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneCharacter) { conv.sceneCharacter.age = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneCharRole.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneCharacter) { conv.sceneCharacter.role = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    if (dom.sceneCharSpecies) dom.sceneCharSpecies.addEventListener('change', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneCharacter) { conv.sceneCharacter.species = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneCharAppearance.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneCharacter) { conv.sceneCharacter.appearance = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneCharTraits.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneCharacter) { conv.sceneCharacter.traits = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneCharStats.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneCharacter) { conv.sceneCharacter.stats = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneCharGoal.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneCharacter) { conv.sceneCharacter.currentGoal = this.value; updateTimestamp(conv); debouncedSave(); }
    });

    // Copy character card button
    dom.btnCopyCharCard.addEventListener('click', function() {
      var conv = getCurrentConv();
      if (!conv || !conv.sceneCharacter) return;
      var ch = conv.sceneCharacter;
      var card = [];
      if (ch.name) card.push('姓名：' + ch.name);
      if (ch.age) card.push('年龄：' + ch.age);
      if (ch.role) card.push('身份：' + ch.role);
      if (ch.species) card.push('种族：' + ch.species);
      if (ch.appearance) card.push('外貌：' + ch.appearance);
      if (ch.traits) card.push('性格/习惯：' + ch.traits);
      if (ch.stats) card.push('状态：' + ch.stats);
      if (ch.currentGoal) card.push('当前目标：' + ch.currentGoal);
      var text = card.join('\n');
      if (!text) { showToast('角色卡为空，请先填写', 'warning'); return; }
      copyTextToClipboard(text, '角色卡已复制到剪贴板');
    });

    // Generate opening prompt button
    dom.btnGenOpeningPrompt.addEventListener('click', function() {
      var conv = getCurrentConv();
      if (!conv) return;
      var w = conv.sceneWorld || {};
      var ch = conv.sceneCharacter || {};
      var ss = conv.sceneState || {};
      var parts = [];
      parts.push('请根据以下设定续写故事。');
      if (w.openingName) parts.push('开局：' + w.openingName);
      if (w.setting) parts.push('世界设定：' + w.setting);
      if (ch.name) {
        var charDesc = '主角：' + ch.name;
        if (ch.age) charDesc += '，' + ch.age + '岁';
        if (ch.role) charDesc += '，' + ch.role;
        if (ch.species && ch.species !== '人类') charDesc += '，' + ch.species;
        parts.push(charDesc);
      }
      if (ch.appearance) parts.push('外貌：' + ch.appearance);
      if (ch.traits) parts.push('性格：' + ch.traits);
      if (ch.stats) parts.push('状态属性：' + ch.stats);
      if (ch.currentGoal) parts.push('当前目标：' + ch.currentGoal);
      if (w.mood) parts.push('基调：' + w.mood);
      if (ss.mental) parts.push('精神状态：' + ss.mental);
      if (ss.physical) parts.push('身体细节：' + ss.physical);
      if (ss.plot) parts.push('当前剧情：' + ss.plot);
      // Phase 3: status bar
      var st = conv.sceneStatus;
      if (st) {
        var stParts = [];
        if (st.health) stParts.push('体力/生命：' + st.health);
        if (st.stamina) stParts.push('精力：' + st.stamina);
        if (st.composure) stParts.push('冷静/精神：' + st.composure);
        if (st.focus) stParts.push('专注：' + st.focus);
        if (st.currentObjective) stParts.push('当前目标：' + st.currentObjective);
        if (st.constraints) stParts.push('限制/提醒：' + st.constraints);
        if (stParts.length) parts.push('主角状态：\n' + stParts.join('\n'));
      }
      // Phase 3: NPCs
      var npcs = conv.sceneNpcs;
      if (npcs && npcs.length) {
        var npcLines = [];
        for (var ni = 0; ni < npcs.length; ni++) {
          var n = npcs[ni];
          if (!n.name) continue;
          var line = n.name;
          if (n.role) line += '（' + n.role + '）';
          if (n.status) line += ' — ' + n.status;
          if (n.notes) line += ' [' + n.notes + ']';
          npcLines.push(line);
        }
        if (npcLines.length) parts.push('NPC：\n' + npcLines.join('\n'));
      }
      parts.push('请用生动细致的文笔，基于以上设定开始续写。注意保持人物一致性，推进剧情发展。');
      dom.inputMessage.value = parts.join('\n');
      dom.inputMessage.style.height = 'auto';
      dom.inputMessage.style.height = Math.min(dom.inputMessage.scrollHeight, 120) + 'px';
      dom.inputMessage.focus();
      showToast('开场提示词已生成到输入框，可修改后发送', 'info');
    });

    // Status bar card toggle
    if (dom.sceneStatusToggle) {
      dom.sceneStatusToggle.addEventListener('click', function() {
        dom.sceneStatusCard.classList.toggle('collapsed');
      });
    }
    // NPC card toggle
    if (dom.sceneNpcToggle) {
      dom.sceneNpcToggle.addEventListener('click', function() {
        dom.sceneNpcCard.classList.toggle('collapsed');
      });
    }
    // Add NPC button
    if (dom.btnAddNpc) {
      dom.btnAddNpc.addEventListener('click', function() { addNpc(); });
    }

    // Status bar input events
    var statusFields = [
      { dom: dom.sceneHealth, key: 'health' },
      { dom: dom.sceneStamina, key: 'stamina' },
      { dom: dom.sceneComposure, key: 'composure' },
      { dom: dom.sceneFocus, key: 'focus' },
    ];
    for (var si = 0; si < statusFields.length; si++) {
      (function(field) {
        field.dom.addEventListener('input', function() {
          var conv = getCurrentConv();
          if (conv && conv.sceneStatus) { conv.sceneStatus[field.key] = this.value; updateTimestamp(conv); debouncedSave(); }
        });
      })(statusFields[si]);
    }
    dom.sceneObjective.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneStatus) { conv.sceneStatus.currentObjective = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneConstraints.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneStatus) { conv.sceneStatus.constraints = this.value; updateTimestamp(conv); debouncedSave(); }
    });

    // World/Character cards removed (now tabbed) — toggles handled by tab switching

    // Message action buttons (event delegation)
    dom.messagesContainer.addEventListener('click', (e) => {
      // Direction choice chip
      const chip = e.target.closest('.dir-choice-chip');
      if (chip && !state.isStreaming) {
        var letter = chip.dataset.choice;
        var content = chip.dataset.content;
        dom.inputMessage.value = '选择 ' + letter + '：' + content;
        dom.inputMessage.style.height = 'auto';
        dom.inputMessage.style.height = Math.min(dom.inputMessage.scrollHeight, 120) + 'px';
        dom.inputMessage.focus();
        return;
      }

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

    // NPC image upload
    if (dom.sceneNpcGrid) {
      dom.sceneNpcGrid.addEventListener('click', function(e) {
        var btn = e.target.closest('.npc-img-btn');
        if (!btn) return;
        e.stopPropagation();
        var npcId = btn.dataset.npcId;
        var action = btn.dataset.action;
        if (action === 'upload') {
          dom.npcImageInput._npcId = npcId;
          dom.npcImageInput.click();
        } else if (action === 'removeImg') {
          var c = getCurrentConv();
          if (!c || !c.sceneNpcs) return;
          for (var ni=0; ni<c.sceneNpcs.length; ni++) {
            if (c.sceneNpcs[ni].id === npcId) { c.sceneNpcs[ni].image = ''; break; }
          }
          updateTimestamp(c); debouncedSave(); renderNpcGrid();
        }
      });
    }
    if (dom.npcImageInput) dom.npcImageInput.addEventListener('change', function() {
      var file = this.files && this.files[0];
      if (!file) return;
      var npcId = this._npcId;
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var maxSide = 900;
          var w=img.width, h=img.height;
          if (w>h && w>maxSide) { h=h*maxSide/w; w=maxSide; }
          else if (h>maxSide) { w=w*maxSide/h; h=maxSide; }
          canvas.width=w; canvas.height=h;
          canvas.getContext('2d').drawImage(img,0,0,w,h);
          var dataUrl = canvas.toDataURL('image/jpeg', 0.72);
          var c = getCurrentConv();
          if (!c || !c.sceneNpcs) return;
          for (var ni=0; ni<c.sceneNpcs.length; ni++) {
            if (c.sceneNpcs[ni].id === npcId) { c.sceneNpcs[ni].image = dataUrl; break; }
          }
          updateTimestamp(c); debouncedSave(); renderNpcGrid();
        };
        img.src=e.target.result;
      };
      reader.readAsDataURL(file);
      this.value='';
    });
if (dom.btnGenHints) dom.btnGenHints.addEventListener('click', () => generateSceneHints());
    if (dom.btnFinishSetup) dom.btnFinishSetup.addEventListener('click', () => showSetupConfirm());

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
    setupViewportInsets();

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
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToBottom(true));
    });
    normalizeDrawerState();
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
