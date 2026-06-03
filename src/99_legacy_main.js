  // =========================================================================
  // STATE — runtime application state (persisted to localStorage)
  // =========================================================================

  const state = {
    conversations: [],
    currentConversationId: null,
    apiKeys: {},
    models: { xai: [], deepseek: [], openai: [], openrouter: [], groq: [], moonshot: [], zhipu: [], siliconflow: [] },
    chatBackground: { type: 'none', value: '', opacity: 35 },
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
      autoFollowStreaming: true,
      userScrolling: false,
      lastUserScrollAt: 0,
      programmaticScroll: false,
      detachedDuringStreaming: false,
      pendingStreamRender: false,
      detachedContentDirty: false,
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
    dom.inputStoryMode = $('#inputStoryMode');
    dom.inputAutoCompress = $('#inputAutoCompress');
    dom.inputKeepThinking = $('#inputKeepThinking');
    dom.btnStartWorld = $('#btnStartWorld');
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

  function buildSceneWorldRef(conv) {
    var sm = conv.storyMode;
    var w = (sm && sm.world) ? sm.world : conv.sceneWorld;
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
    var sm = conv.storyMode;
    var ch = (sm && sm.character) ? sm.character : conv.sceneCharacter;
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
    var sm = conv.storyMode;
    var st = (sm && sm.status) ? sm.status : conv.sceneStatus;
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
    var sm = conv.storyMode;
    var npcs = (sm && sm.npcs) ? sm.npcs : conv.sceneNpcs;
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

  function isLatestInteractiveDirectionMessage(conv, msgIndex) {
    if (!conv || !Array.isArray(conv.messages)) return false;
    var msg = conv.messages[msgIndex];
    if (!msg || msg.role !== 'assistant') return false;
    if (!msg.sceneSnapshot || !msg.sceneSnapshot.directions) return false;

    // Must be the LAST assistant message in the conversation
    for (var j = conv.messages.length - 1; j > msgIndex; j--) {
      if (conv.messages[j].role === 'assistant') return false;
    }

    // No user message must appear after this assistant (it hasn't been answered yet)
    for (var i = msgIndex + 1; i < conv.messages.length; i++) {
      if (conv.messages[i].role === 'user') return false;
    }

    return true;
  }

  function renderSceneStatusTable(msg, msgIndex) {
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
    if (!characters.length && !ss.directions && !(msg.sceneSnapshot && msg.sceneSnapshot.directions) && !hasLegacy) return '';
    var html = '';
    // Fallback: use sceneSnapshot directions if ss lost them
    var directions = ss.directions || (msg.sceneSnapshot && msg.sceneSnapshot.directions) || '';
    // Render per-character cards
    for (var ci = 0; ci < characters.length; ci++) {
      var c = characters[ci];
      html += renderCharacterCard(c, st, ch, maxBd, !!(ci===0));
    }
    // Directions section
    if (directions) {
      var dirOpts = parseDirectionOptions(directions);
      if (dirOpts.length) {
        var conv = getCurrentConv();
        var interactive = (msgIndex != null && msgIndex >= 0) ? isLatestInteractiveDirectionMessage(conv, msgIndex) : false;
        var listClass = 'dir-choices-list' + (interactive ? '' : ' locked');
        var listLocked = interactive ? '' : ' data-locked="1"';
        var chips = [];
        for (var di = 0; di < dirOpts.length; di++) {
          var d = dirOpts[di];
          var chipDisabled = interactive ? '' : ' disabled';
          var chipAriaDisabled = interactive ? '' : ' aria-disabled="true"';
          chips.push('<button class="dir-choice-chip' + chipDisabled + '" data-choice="' + d.letter + '" data-content="' + escapeHtml(d.content) + '"' + chipAriaDisabled + '><span class="dir-chip-badge">' + d.letter + '</span><span class="dir-chip-text">' + escapeHtml(d.content) + '</span></button>');
        }
        html += '<div class="scene-directions-section"><div class="scene-directions-title">剧情走向</div><div class="' + listClass + '"' + listLocked + '>' + chips.join('') + '</div></div>';
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
      storyMode: createStoryMode(),
      // Legacy fields — kept in sync with storyMode for backward compat
      sceneMode: false,
      sceneState: createSceneState(),
      sceneWorld: createSceneWorld(),
      sceneCharacter: createSceneCharacter(),
      sceneStatus: createSceneStatus(),
      sceneNpcs: [],
      autoCompress: false,
      keepThinkingOpen: DEFAULTS.keepThinkingOpen,
      worldMode: DEFAULTS.worldMode,
      sceneDetailLevel: DEFAULTS.sceneDetailLevel,
      schemaVersion: STORAGE_SCHEMA_VERSION,
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
      content: String(m._requestContent || m.content || ''),
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
    const shouldCompact = !!conv.autoCompress;

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

  // =========================================================================
  // DRAWERS — settings panel, history panel, conversation list
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
  // STORY EDITOR — true draft isolation via reference swap
  //
  // Strategy: on open, deep-clone conv story fields and REPLACE conv's
  // references with the clones. All existing event handlers (settings page,
  // NPC grid, chips) automatically write to the draft because the draft
  // IS conv's current property reference. On save, the draft is already
  // in conv — just persist. On cancel, restore original references.
  // =========================================================================

  function isStoryEditorOpen() {
    return !!state.ui.storyEditorOpen && !!state.ui._storyOriginals;
  }

  function openStoryEditor() {
    var overlay = document.getElementById('storyEditorOverlay');
    var editorBody = document.getElementById('storyEditorBody');
    var sourceBody = document.getElementById('scenePanelBody');
    if (!overlay || !editorBody || !sourceBody) return;
    var conv = getCurrentConv();
    if (!conv) return;

    // Save original references so we can restore on cancel
    state.ui._storyOriginals = {
      updatedAt: conv.updatedAt,
      sceneWorld: conv.sceneWorld,
      sceneCharacter: conv.sceneCharacter,
      sceneNpcs: conv.sceneNpcs,
      sceneStatus: conv.sceneStatus,
      sceneState: conv.sceneState,
      storyModeWorld: conv.storyMode && conv.storyMode.world,
      storyModeChar: conv.storyMode && conv.storyMode.character,
      storyModeNpcs: conv.storyMode && conv.storyMode.npcs,
      storyModeStatus: conv.storyMode && conv.storyMode.status,
      storyModeSceneState: conv.storyMode && conv.storyMode.sceneState,
    };

    // Block all persistence during editing
    state.ui._originalDebouncedSave = debouncedSave;
    debouncedSave = function() { /* no-op during story editing */ };

    // Replace conv references with deep clones (→ all handlers write to draft)
    conv.sceneWorld = JSON.parse(JSON.stringify(conv.sceneWorld || {}));
    conv.sceneCharacter = JSON.parse(JSON.stringify(conv.sceneCharacter || {}));
    conv.sceneNpcs = JSON.parse(JSON.stringify(conv.sceneNpcs || []));
    conv.sceneStatus = JSON.parse(JSON.stringify(conv.sceneStatus || {}));
    conv.sceneState = JSON.parse(JSON.stringify(conv.sceneState || {}));
    if (conv.storyMode) {
      conv.storyMode.world = JSON.parse(JSON.stringify(conv.storyMode.world || {}));
      conv.storyMode.character = JSON.parse(JSON.stringify(conv.storyMode.character || {}));
      conv.storyMode.npcs = JSON.parse(JSON.stringify(conv.storyMode.npcs || []));
      conv.storyMode.status = JSON.parse(JSON.stringify(conv.storyMode.status || {}));
      conv.storyMode.sceneState = JSON.parse(JSON.stringify(conv.storyMode.sceneState || {}));
    }

    // Move scenePanelBody into editor
    editorBody.appendChild(sourceBody);
    sourceBody.style.display = '';

    // Re-render chips and NPCs inside editor
    if (typeof renderMoodChips === 'function') renderMoodChips();
    if (typeof renderSpeciesChips === 'function') renderSpeciesChips();
    if (typeof renderRoleChips === 'function') renderRoleChips();
    if (typeof renderTraitChips === 'function') renderTraitChips();
    if (typeof renderGenreChips === 'function') renderGenreChips();
    if (typeof renderNpcGrid === 'function') renderNpcGrid();

    // Hook input events for dirty tracking + summary updates
    _wireEditorListeners(editorBody);

    // Header
    _refreshEditorHeader();
    _setEditorDirty(false);
    _updateEditorSummary();

    // Show overlay
    overlay.style.display = 'flex';
    state.ui.storyEditorOpen = true;
    document.documentElement.classList.add('story-editor-open');
    document.body.style.overflow = 'hidden';
    updateBottomBarHeight();
  }

  function closeStoryEditor(saveChanges) {
    var overlay = document.getElementById('storyEditorOverlay');
    var editorBody = document.getElementById('storyEditorBody');
    var sourceBody = document.getElementById('scenePanelBody');
    var scenePanel = document.getElementById('scenePanel');
    var conv = getCurrentConv();
    if (!overlay) return;

    // Unwire listeners FIRST (sourceBody is still inside editorBody)
    _unwireEditorListeners(sourceBody || editorBody);

    if (conv && state.ui._storyOriginals) {
      if (saveChanges === true) {
        // Save: draft is already conv's data → sync legacy + persist
        syncStoryModeToLegacy(conv);
        updateTimestamp(conv);
        var realSave = state.ui._originalDebouncedSave || debouncedSave;
        if (typeof realSave === 'function') realSave();
      } else if (saveChanges === false) {
        // Cancel: restore original references → undoes all edits
        var orig = state.ui._storyOriginals;
        conv.updatedAt = orig.updatedAt;
        conv.sceneWorld = orig.sceneWorld;
        conv.sceneCharacter = orig.sceneCharacter;
        conv.sceneNpcs = orig.sceneNpcs;
        conv.sceneStatus = orig.sceneStatus;
        conv.sceneState = orig.sceneState;
        if (conv.storyMode) {
          if (orig.storyModeWorld) conv.storyMode.world = orig.storyModeWorld;
          if (orig.storyModeChar) conv.storyMode.character = orig.storyModeChar;
          if (orig.storyModeNpcs) conv.storyMode.npcs = orig.storyModeNpcs;
          if (orig.storyModeStatus) conv.storyMode.status = orig.storyModeStatus;
          if (orig.storyModeSceneState) conv.storyMode.sceneState = orig.storyModeSceneState;
        }
      }
      // null: clean close — just restore persistence, don't touch conv data
    }

    // Move body back AFTER unwiring
    if (sourceBody && scenePanel && sourceBody.parentNode === editorBody) {
      scenePanel.insertBefore(sourceBody, scenePanel.querySelector('.scene-panel-header').nextSibling);
      scenePanel.classList.add('collapsed');
    }

    // Restore persistence
    if (state.ui._originalDebouncedSave) {
      debouncedSave = state.ui._originalDebouncedSave;
      state.ui._originalDebouncedSave = null;
    }

    state.ui._storyOriginals = null;
    overlay.style.display = 'none';
    state.ui.storyEditorOpen = false;
    document.documentElement.classList.remove('story-editor-open');
    document.body.style.overflow = '';
    updateBottomBarHeight();
    updateScenePanelUI();
  }

  function _setEditorDirty(dirty) {
    state.ui._editorDirty = dirty;
    var statusEl = document.getElementById('storyEditorStatus');
    if (statusEl) {
      statusEl.textContent = dirty ? '● 有未保存修改' : '已保存';
      statusEl.style.color = dirty ? 'var(--warning, #FFD60A)' : 'var(--text-tertiary)';
    }
  }

  function _refreshEditorHeader() {
    var titleEl = document.getElementById('storyEditorTitle');
    if (!titleEl) return;
    var conv = getCurrentConv();
    var name = (conv && conv.sceneWorld && conv.sceneWorld.openingName) || '';
    titleEl.textContent = name ? '世界故事 · ' + name : '世界故事 · 未命名开局';
  }

  function _updateEditorSummary() {
    var summaryEl = document.getElementById('storyEditorSummary');
    if (!summaryEl) return;
    var conv = getCurrentConv();
    if (!conv) return;
    var w = conv.sceneWorld || {};
    var ch = conv.sceneCharacter || {};
    var rules = (w.rules || (conv.sceneStatus && conv.sceneStatus.constraints) || '');
    summaryEl.textContent =
      '世界观：' + (w.openingName || w.setting ? '已填' : '未填') +
      ' · 主角：' + (ch.name ? '已填' : '未填') +
      ' · NPC：' + ((conv.sceneNpcs && conv.sceneNpcs.length) || 0) +
      ' · 规则：' + (rules ? '已填' : '未填');
  }

  function _storyEditorDirtyHandler() {
    _setEditorDirty(true);
    _refreshEditorHeader();
    _updateEditorSummary();
  }

  function _storyEditorFocusHandler(e) {
    var el = e.target;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      setTimeout(function() { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 300);
    }
  }

  function _wireEditorListeners(body) {
    if (!body) return;
    var inputs = body.querySelectorAll('input, textarea, select');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener('input', _storyEditorDirtyHandler);
      inputs[i].addEventListener('change', _storyEditorDirtyHandler);
      inputs[i].addEventListener('focus', _storyEditorFocusHandler);
    }
  }

  function _unwireEditorListeners(body) {
    if (!body) return;
    var inputs = body.querySelectorAll('input, textarea, select');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].removeEventListener('input', _storyEditorDirtyHandler);
      inputs[i].removeEventListener('change', _storyEditorDirtyHandler);
      inputs[i].removeEventListener('focus', _storyEditorFocusHandler);
    }
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
      ensureMessagesBottomSpacer();
    }
  }

  function fullRenderMessages(messages) {
    // Remove only message elements, keep welcome screen and spacer
    dom.messagesContainer.querySelectorAll('.message').forEach((el) => el.remove());
    dom.welcomeScreen.classList.add('hidden');
    for (let i = 0; i < messages.length; i++) {
      const el = createMessageElement(messages[i], i);
      dom.messagesContainer.appendChild(el);
    }
    ensureMessagesBottomSpacer();
  }

  function renderBubbleHTML(msg, msgIndex) {
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
      html += renderSceneStatusTable(msg, msgIndex);
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

    // Truncated by output limit warning — show regardless of usage presence
    if (!msg._streaming && msg.finishReason === 'length') {
      html += '<div class="token-usage" style="color:var(--scene-gold, #e0b060)">⚠️ 回复被 Max Tokens 截断。建议 Max Tokens ≥ 2000。</div>';
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
      div.innerHTML = '<div class="message-role">' + roleLabel + '</div><div class="' + bubbleClass + '">' + renderBubbleHTML(msg, index) + '</div>';
    } else {
      const roleLabel = 'You';
      div.innerHTML = '<div class="message-role">' + roleLabel + '</div><div class="message-bubble">' + renderMarkdown(String(msg.displayContent || msg.content || '')) + '</div>';
    }

    return div;
  }

  function updateLastBubble(msg) {
    const items = dom.messagesContainer.querySelectorAll('.message');
    const lastItem = items[items.length - 1];
    if (!lastItem) return;
    const bubble = lastItem.querySelector('.message-bubble');
    if (!bubble) return;

    const conv = getCurrentConv();
    const msgIndex = conv && Array.isArray(conv.messages)
      ? conv.messages.indexOf(msg)
      : parseInt(lastItem.dataset.index, 10);

    if (msg._streaming) {
      var newContentLen = (msg.content || '').length;
      var newReasonLen = (msg.reasoning || '').length;
      var lastCLen = msg._lastRenderedContentLength || 0;
      var lastRLen = msg._lastRenderedReasoningLength || 0;

      // Update content div only if content changed
      if (newContentLen !== lastCLen) {
        var contentDiv = bubble.querySelector('.message-content');
        if (!contentDiv) {
          // Content div doesn't exist yet — need full rebuild (first render)
          bubble.innerHTML = renderBubbleHTML(msg, msgIndex);
          msg._lastRenderedContentLength = newContentLen;
          msg._lastRenderedReasoningLength = newReasonLen;
        } else {
          contentDiv.innerHTML = renderContentFast(getVisibleAssistantContent(msg.content || '', true));
          msg._lastRenderedContentLength = newContentLen;
        }
      }

      // Update thinking section only if reasoning changed
      if (newReasonLen !== lastRLen) {
        var reasoning = msg.reasoning || '';
        if (reasoning) {
          var thinkDiv = bubble.querySelector('.thinking-content');
          if (!thinkDiv) {
            bubble.innerHTML = renderBubbleHTML(msg, msgIndex);
            msg._lastRenderedContentLength = newContentLen;
          } else {
            thinkDiv.innerHTML = renderContentFast(reasoning);
          }
          var details = bubble.querySelector('.thinking-section');
          if (details && !msg.content) details.open = true;
        }
        msg._lastRenderedReasoningLength = newReasonLen;
      }

      bubble.classList.add('streaming-cursor');
    } else {
      // Full render when streaming ends — proper markdown everywhere
      bubble.innerHTML = renderBubbleHTML(msg, msgIndex);
      var details = bubble.querySelector('.thinking-section');
      var keepOpen = msg._keepThinkingOpen !== undefined
        ? msg._keepThinkingOpen
        : conv && conv.keepThinkingOpen !== false;
      if (details) details.open = !!keepOpen;
      bubble.classList.remove('streaming-cursor');
    }
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
    // Short format: "8条 · 10k". Full data in title tooltip.
    var charLabel = charCount >= 1000 ? Math.round(charCount / 100) / 10 + 'k' : charCount;
    dom.contextStats.textContent = msgCount + '条 · ' + charLabel;
    dom.contextStats.title = msgCount + ' 条消息 · ~' + charCount.toLocaleString() + ' 字符';
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
    // Only track keyboard inset — let CSS 100dvh handle viewport height.
    // Do NOT override --app-height with visualViewport.height:
    // on devices with a home indicator, visualViewport.height excludes
    // the safe-area (~34px on iPhone), which shrinks the app container
    // and leaves a black bar at the bottom. CSS 100dvh correctly includes
    // the safe-area, so removing the JS override fixes the black bar.

    if (!window.visualViewport) return;
    var updateInsets = function() {
      var vv = window.visualViewport;
      var keyboardInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // Only apply when keyboard is clearly visible (> 50px gap); otherwise let CSS safe-bottom handle it alone
      if (keyboardInset < 50) keyboardInset = 0;
      document.documentElement.style.setProperty('--keyboard-inset', Math.round(keyboardInset) + 'px');
      updateBottomBarHeight();
    };
    window.visualViewport.addEventListener('resize', updateInsets);
    window.visualViewport.addEventListener('scroll', updateInsets);
    updateInsets();
  }

  // Measure actual bottom-bar height for accurate main-content reserve
  function updateBottomBarHeight() {
    var bar = document.querySelector('.bottom-bar');
    if (!bar) return;
    var h = Math.ceil(bar.getBoundingClientRect().height);
    var prev = document.documentElement.style.getPropertyValue('--bottom-bar-h');
    document.documentElement.style.setProperty('--bottom-bar-h', h + 'px');
    // Keep user at bottom if they were near it before height changed
    if (prev && prev !== h + 'px' && state.ui.autoFollowStreaming) {
      var sc = getScrollContainer();
      if (sc && isNearBottom(sc, 60)) {
        requestAnimationFrame(function() { sc.scrollTop = sc.scrollHeight; });
      }
    }
  }

  function ensureMessagesBottomSpacer() {
    var spacer = document.getElementById('messagesBottomSpacer');
    if (!spacer && dom.messagesContainer) {
      spacer = document.createElement('div');
      spacer.id = 'messagesBottomSpacer';
      spacer.className = 'messages-bottom-spacer';
      dom.messagesContainer.appendChild(spacer);
    }
    return spacer;
  }
  // Expose globally so other handlers can call it
  window._updateBottomBarHeight = updateBottomBarHeight;

  // =========================================================================
  // RENDER: SCROLL
  // =========================================================================

  // =========================================================================
  // SMART SCROLL — auto-follow bottom unless user manually scrolls away
  // =========================================================================

  function getScrollContainer() {
    return dom.mainContent;
  }

  function isNearBottom(el, threshold) {
    if (!el) return true;
    var t = threshold || 80;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= t;
  }

  function scrollToBottomIfNeeded(opts) {
    var el = getScrollContainer();
    if (!el) return;
    var smooth = opts && opts.smooth;
    var force = opts && opts.force;

    if (!force && !state.ui.autoFollowStreaming) return;
    if (!force && !isNearBottom(el, 120)) return;

    state.ui.programmaticScroll = true;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      // Reset programmatic flag after smooth scroll completes
      setTimeout(function() { state.ui.programmaticScroll = false; }, 400);
    } else {
      el.scrollTop = el.scrollHeight;
      requestAnimationFrame(function() { state.ui.programmaticScroll = false; });
    }
  }

  function scrollToBottom(force) {
    scrollToBottomIfNeeded({ force: !!force });
  }

  function preserveScrollPosition(fn) {
    var el = getScrollContainer();
    if (!el) { fn(); return; }
    var beforeTop = el.scrollTop;
    fn();
    el.scrollTop = beforeTop;
    requestAnimationFrame(function() { el.scrollTop = beforeTop; });
  }

  function checkUserScroll() {
    // Handled by the scroll/wheel/touch listeners below
  }

  // User scroll detection: pause auto-follow when user scrolls away,
  // resume when they scroll back near bottom.
  function onUserScrollIntent() {
    if (state.ui.programmaticScroll) return;
    var el = getScrollContainer();
    if (!el) return;
    var nearBottom = isNearBottom(el, 80);

    if (!nearBottom) {
      state.ui.autoFollowStreaming = false;
      state.ui.userScrolling = true;
      state.ui.lastUserScrollAt = Date.now();
      // Enter detached mode: stop DOM updates during streaming
      if (state.isStreaming) {
        state.ui.detachedDuringStreaming = true;
      }
      updateScrollToBottomButton(true);
    } else {
      state.ui.autoFollowStreaming = true;
      state.ui.userScrolling = false;
      // Exit detached mode: sync accumulated content to DOM
      if (state.ui.detachedDuringStreaming) {
        state.ui.detachedDuringStreaming = false;
        if (state.ui.detachedContentDirty) {
          state.ui.detachedContentDirty = false;
          renderMessages();
          el.scrollTop = el.scrollHeight;
        }
      }
      updateScrollToBottomButton(false);
    }
  }

  function updateScrollToBottomButton(show) {
    var btn = document.getElementById('scrollToBottomBtn');
    var active = show && (state.isStreaming || state.ui.detachedContentDirty);
    // Also show when streaming ended but user is detached
    if (!active && !state.isStreaming && state.ui.detachedContentDirty) active = true;

    if (active) {
      if (!btn) {
        btn = document.createElement('button');
        btn.id = 'scrollToBottomBtn';
        btn.title = '回到底部查看最新内容';
        btn.addEventListener('click', function() {
          // Exit detached mode
          state.ui.detachedDuringStreaming = false;
          state.ui.autoFollowStreaming = true;
          state.ui.userScrolling = false;
          state.ui.programmaticScroll = true;

          if (state.ui.detachedContentDirty) {
            state.ui.detachedContentDirty = false;
            // Full render to pick up sceneSnapshot, chips, token usage, action buttons
            var conv = getCurrentConv();
            if (conv && conv.messages.length) {
              fullRenderMessages(conv.messages);
            }
          }

          var sc = getScrollContainer();
          if (sc) sc.scrollTop = sc.scrollHeight;
          requestAnimationFrame(function() {
            state.ui.programmaticScroll = false;
          });
          updateScrollToBottomButton(false);
        });
        document.body.appendChild(btn);
      }
      // Update button text
      btn.textContent = state.isStreaming ? 'AI 正在生成' : '查看最新回复';
      btn.classList.add('show');
    } else if (btn) {
      btn.classList.remove('show');
    }
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
    if (dom.inputStoryMode) dom.inputStoryMode.checked = isStoryEnabled(conv);
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
    conv.storyMode = conv.storyMode || createStoryMode();
    conv.storyMode.enabled = dom.inputStoryMode.checked;
    syncStoryModeToLegacy(conv);
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
    updateMaxTokensCap();
  }

  function validateMaxTokensForProvider(provider, value) {
    var cap = getProviderCap(provider);
    var n = parseInt(value, 10);
    if (!Number.isFinite(n) || n <= 0) return { valid: false, cap: cap, message: 'Max Tokens 必须为正整数。' };
    if (n > cap) return { valid: false, cap: cap, message: '超过当前服务商最大输出限制 (' + cap.toLocaleString() + ')，请调低。' };
    return { valid: true, cap: cap, message: '' };
  }

  function updateMaxTokensCap() {
    if (!dom.inputMaxTokens || !dom.selectProvider) return;
    var provider = dom.selectProvider.value;
    var cap = getProviderCap(provider);
    var currentVal = parseInt(dom.inputMaxTokens.value, 10) || 0;
    var isOver = currentVal > cap;

    // Show/hide cap hint
    var capHint = document.getElementById('maxTokensCapHint');
    if (!capHint) {
      capHint = document.createElement('div');
      capHint.id = 'maxTokensCapHint';
      capHint.style.cssText = 'font-size:10.5px;margin-top:2px;';
      dom.inputMaxTokens.parentNode.appendChild(capHint);
    }
    capHint.textContent = '最大输出限制：' + cap.toLocaleString();
    capHint.style.color = isOver ? 'var(--danger, #e04060)' : 'var(--text-tertiary, rgba(255,255,255,0.45))';

    // Mark input red when over cap
    dom.inputMaxTokens.style.borderColor = isOver ? 'var(--danger, #e04060)' : '';
    dom.inputMaxTokens.style.boxShadow = isOver ? '0 0 0 1px var(--danger, #e04060)' : '';

    if (isOver) {
      var errEl = document.getElementById('maxTokensError');
      if (!errEl) {
        errEl = document.createElement('div');
        errEl.id = 'maxTokensError';
        errEl.style.cssText = 'font-size:10.5px;color:var(--danger,#e04060);margin-top:2px;';
        dom.inputMaxTokens.parentNode.appendChild(errEl);
      }
      errEl.textContent = '⛔ 超过限制，无法发送。请调低。';
    } else {
      var errEl2 = document.getElementById('maxTokensError');
      if (errEl2) errEl2.remove();
    }
  }

  function applyChatBackground() {
    const bg = state.chatBackground || { type: 'none', value: '', opacity: 35 };
    const overlay = dom.chatBgOverlay;

    document.documentElement.style.setProperty('--bg-opacity', (bg.opacity / 100));

    if (bg.type === 'none') {
      overlay.style.backgroundImage = '';
      overlay.style.display = 'none';
      overlay.style.backgroundSize = '';
      overlay.style.backgroundPosition = '';
      document.documentElement.classList.remove('has-custom-bg');
    } else if (bg.type === 'gradient') {
      overlay.style.backgroundImage = bg.value;
      overlay.style.display = '';
      overlay.style.backgroundSize = '';
      overlay.style.backgroundPosition = '';
      document.documentElement.classList.remove('has-custom-bg');
    } else if ((bg.type === 'url' || bg.type === 'image') && bg.value) {
      overlay.style.backgroundImage = 'url(' + bg.value + ')';
      overlay.style.backgroundSize = 'cover';
      overlay.style.backgroundPosition = 'center';
      overlay.style.display = '';
      document.documentElement.classList.add('has-custom-bg');
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
    var sm = conv.storyMode;
    var show = !!(sm && sm.enabled);
    // COMPAT: also check legacy per-conversation fields during transition
    if (!show) show = !!(conv.sceneMode || conv.worldMode);
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
    var ss = (conv.storyMode && conv.storyMode.sceneState) ? conv.storyMode.sceneState : conv.sceneState;
    if (ss && ss.directions) {
      var dirs = parseDirectionOptions(ss.directions);
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
    dom.dialogBody.innerHTML = '世界故事设置已完成？';
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

    function buildCharacterCard(conv) {
    if (!conv) return '';
    var sm = conv.storyMode;
    var w = (sm && sm.world) ? sm.world : (conv.sceneWorld || {});
    var ch = (sm && sm.character) ? sm.character : (conv.sceneCharacter || {});
    var npcs = (sm && sm.npcs) ? sm.npcs : (conv.sceneNpcs || []);
    var lines=[];
    lines.push('【角色卡】');
    if(ch.name) lines.push('姓名：'+ch.name);
    if(ch.age) lines.push('年龄：'+ch.age);
    if(ch.role) lines.push('身份：'+ch.role);
    if(ch.species) lines.push('类型/形态：'+ch.species);
    if(ch.appearance) lines.push('外貌：'+ch.appearance);
    if(ch.traits) lines.push('性格/习惯：'+ch.traits);
    if(ch.stats) lines.push('状态属性：'+ch.stats);
    if(ch.currentGoal) lines.push('当前目标：'+ch.currentGoal);
    lines.push('');
    lines.push('【世界设定】');
    if(w.openingName) lines.push('开局名称：'+w.openingName);
    if(w.setting) lines.push('世界背景：'+w.setting);
    if(w.locations) lines.push('地点清单：'+w.locations);
    if(w.mood) lines.push('故事基调：'+w.mood);
    if(w.rules) lines.push('规则限制：'+w.rules);
    if(w.notes) lines.push('备注：'+w.notes);
    if(npcs.length){
      lines.push('');
      lines.push('【NPC】');
      for(var i=0;i<npcs.length;i++){
        var n=npcs[i];
        if(!n.name) continue;
        var nl=(i+1)+'. '+n.name;
        if(n.role) nl+=' / '+n.role;
        if(n.status) nl+=' / '+n.status;
        if(n.notes) nl+=' ['+n.notes+']';
        lines.push(nl);
      }
    }
    return lines.join('\n');
  }
  function checkAge18Plus() {
    var conv=getCurrentConv();
    if(!conv) return true;
    var sm = conv.storyMode;
    var ch = (sm && sm.character) ? sm.character : conv.sceneCharacter;
    if(!ch) return true;
    var age=ch.age;
    if(!age||age===''||isNaN(parseInt(age,10))) return true;
    var n=parseInt(age,10);
    if(n<18){ showToast('角色年龄必须为 18+','warning'); return false; }
    return true;
  }
  function startWorldMode() {
    if(!checkAge18Plus()) return;
    var current=getCurrentConv();
    // Build card from CURRENT conv first, to validate before creating new
    var card=current?buildCharacterCard(current):'';
    if(!card){ showToast('请先填写角色卡','warning'); return; }
    // Capture scene data from current conv (storyMode primary, legacy fallback)
    var sm = current && current.storyMode;
    var savedWorld = sm ? createSceneWorld(sm.world) : (current && current.sceneWorld ? createSceneWorld(current.sceneWorld) : null);
    var savedChar = sm ? createSceneCharacter(sm.character) : (current && current.sceneCharacter ? createSceneCharacter(current.sceneCharacter) : null);
    var savedNpcs = sm ? normalizeSceneNpcs(sm.npcs) : (current && current.sceneNpcs ? normalizeSceneNpcs(current.sceneNpcs) : []);
    var savedStatus = sm ? createSceneStatus(sm.status) : (current && current.sceneStatus ? createSceneStatus(current.sceneStatus) : null);
    // Create new conversation
    newConversation();
    var conv=getCurrentConv();
    if(!conv) return;
    // Set storyMode as primary
    conv.storyMode = createStoryMode({
      enabled: true,
      started: true,
      world: savedWorld,
      character: savedChar,
      npcs: savedNpcs,
      status: savedStatus,
      sceneState: createSceneState(),
    });
    syncStoryModeToLegacy(conv);
    conv.title=savedWorld&&savedWorld.openingName?savedWorld.openingName:'世界开局';
    updateTimestamp(conv);
    saveToStorage();
    renderAll();
    // Build hidden request (full character card + world setup for AI)
    var requestText = card + '\n\n请确认以上世界设定与角色卡。根据设定给出开场，描写当前地点、氛围和 NPC 状态，并在回复末尾输出 @@SCENE 状态块与 A/B/C/D 剧情分支。';
    // Visible text: natural start phrase only (no character card spam)
    var visibleText = '世界故事已开启。你的设定已发送给 AI，接下来将生成第一幕。';
    // Send via hidden request: visible is shown in chat, requestText is sent to AI
    state.pendingHiddenRequest = requestText;
    dom.inputMessage.value = visibleText;
    dom.inputMessage.style.height = 'auto';
    dom.inputMessage.style.height = Math.min(dom.inputMessage.scrollHeight, 120) + 'px';
    dom.inputMessage.focus();
    sendMessage();
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

    switch (action) {
      case 'regenerate': {
        // True regenerate: remove target assistant, reuse existing user message.
        // Do NOT push a duplicate user message into conv.messages.

        // Only support regenerating the LAST assistant message for safety
        var lastUserIdx = -1;
        var lastAssistantIdx = -1;
        for (var li = conv.messages.length - 1; li >= 0; li--) {
          if (conv.messages[li].role === 'assistant' && lastAssistantIdx < 0) lastAssistantIdx = li;
          if (conv.messages[li].role === 'user' && lastUserIdx < 0) lastUserIdx = li;
          if (lastAssistantIdx >= 0 && lastUserIdx >= 0) break;
        }
        if (lastAssistantIdx < 0 || lastUserIdx < 0) return;

        // Guard: only support regenerating the last assistant
        if (msgIndex != null && msgIndex !== lastAssistantIdx) {
          showToast('当前仅支持重新生成最后一条回复。', 'warning');
          return;
        }

        var lastAssistant = conv.messages[lastAssistantIdx];
        var lastUser = conv.messages[lastUserIdx];
        if (lastAssistant) lastAssistant._showActions = false;

        // Remove the last assistant (will be replaced by new response)
        conv.messages.pop();

        // Preserve hidden request content so world-story card is re-sent
        if (lastUser._requestContent) {
          state.pendingHiddenRequest = lastUser._requestContent;
        }

        // Build temporary system reminders for API request only (NOT persisted)
        var extraSys = [];
        if (isStoryEnabled(conv)) {
          extraSys.push('[系统提示] 这是重新生成。必须输出完整 @@SCENE ... @@END，必须包含 [角色: 主角] 状态块和 A/B/C/D 走向。');
        }

        var sendText = prompts.regenerate || lastUser.content;

        state._regenerateFlags = {
          appendUserMessage: false,
          userText: sendText,
          extraSystemMessages: extraSys,
        };

        updateTimestamp(conv);
        renderAll();
        dom.inputMessage.value = sendText;
        sendMessage();
        dom.inputMessage.value = '';
        break;
      }

      case 'continue':
      case 'summarize':
      case 'elaborate': {
        var lastMsg = conv.messages[conv.messages.length - 1];
        if (lastMsg) lastMsg._showActions = false;
        var actText = prompts[action];
        updateTimestamp(conv);
        renderAll();
        sendMessageContent(actText);
        break;
      }
    }
  }

  // =========================================================================
  // DEBUG BUDGET DIAGNOSTICS — enable with ?debugBudget=1 or
  // localStorage 'omnichat_debug_budget' = '1'
  // =========================================================================

  function isDebugBudget() {
    if (window._OMNICHAT_DEBUG_BUDGET !== undefined) return window._OMNICHAT_DEBUG_BUDGET;
    try {
      if (window.localStorage.getItem('omnichat_debug_budget') === '1') { window._OMNICHAT_DEBUG_BUDGET = true; return true; }
    } catch (_) {}
    if (window.location.search.indexOf('debugBudget=1') !== -1) { window._OMNICHAT_DEBUG_BUDGET = true; return true; }
    window._OMNICHAT_DEBUG_BUDGET = false;
    return false;
  }

  function diagnoseRequestBudget(conv, messages, requestBody) {
    var storyEnabled = isStoryEnabled(conv);
    var storyStarted = isStoryStarted(conv);
    var model = resolveModel(conv);

    // Character counts
    var systemChars = 0;
    var historyChars = 0;
    var hiddenChars = 0;
    var hasWorldCard = false;
    for (var mi = 0; mi < messages.length; mi++) {
      var mc = String(messages[mi].content || '').length;
      if (messages[mi].role === 'system') {
        systemChars += mc;
        if (messages[mi].content.indexOf('[世界模式') !== -1) hasWorldCard = true;
      } else {
        historyChars += mc;
      }
      if (messages[mi]._requestContent) hiddenChars += String(messages[mi]._requestContent).length;
    }
    var totalRequestChars = systemChars + historyChars + hiddenChars;

    var fullContextChars = countApproxChars(conv);
    var overSoftLimit = fullContextChars > REQUEST_CHAR_SOFT_LIMIT;
    var wouldCompact = !!conv.autoCompress && conv.messages.length > REQUEST_RECENT_MSG_LIMIT;
    var compactTriggered = wouldCompact;
    var recentCount = messages.filter(function(m) { return m.role !== 'system'; }).length;

    return {
      provider: conv.provider,
      model: model,
      stream: conv.stream,
      sceneDetailLevel: conv.sceneDetailLevel || 'medium',
      storyEnabled: storyEnabled,
      storyStarted: storyStarted,
      userMaxTokens: conv.maxTokens,
      actualRequestMaxTokens: requestBody.max_tokens,
      messageCount: conv.messages.length,
      requestMessageCount: messages.length,
      systemMessageChars: systemChars,
      historyChars: historyChars,
      hiddenRequestChars: hiddenChars,
      totalRequestChars: totalRequestChars,
      estimatedInputTokens: Math.ceil(totalRequestChars / 3),
      estimatedTotalTokens: Math.ceil(totalRequestChars / 3) + (requestBody.max_tokens || 0),
      bodyJsonBytes: JSON.stringify(requestBody).length,
      hasScenePrompt: storyEnabled,
      hasWorldCard: hasWorldCard,
      hasHiddenRequestContent: hiddenChars > 0,
      autoCompressEnabled: !!conv.autoCompress,
      wouldCompact: wouldCompact,
      compactTriggered: compactTriggered,
      overSoftLimit: overSoftLimit,
      fullContextChars: fullContextChars,
      recentMessageCountAfterBuild: recentCount,
    };
  }

  function _debugSnippet(text, maxLen) {
    if (!text) return '';
    var s = String(text);
    if (s.length <= (maxLen || 120)) return s;
    return s.slice(0, (maxLen || 120)) + '…';
  }

  function _logBudgetDebug(diag) {
    console.group('%c[OmniChat Budget Debug]', 'color:#f0a;font-weight:bold');
    console.log('Provider:', diag.provider, '| Model:', diag.model, '| Stream:', diag.stream);
    console.log('Story:', (diag.storyEnabled ? 'enabled' : 'off'), (diag.storyStarted ? 'started' : ''), '| Detail:', diag.sceneDetailLevel);
    console.log('MaxTokens (user):', diag.userMaxTokens, '| (request):', diag.actualRequestMaxTokens);
    console.log('Messages (conv/request):', diag.messageCount, '/', diag.requestMessageCount);
    console.log('Chars — sys:', diag.systemMessageChars, 'hist:', diag.historyChars, 'hidden:', diag.hiddenRequestChars, 'total:', diag.totalRequestChars);
    console.log('Est tokens — input:', diag.estimatedInputTokens, 'total:', diag.estimatedTotalTokens);
    console.log('Body JSON:', diag.bodyJsonBytes, 'bytes');
    console.log('ScenePrompt:', diag.hasScenePrompt, 'WorldCard:', diag.hasWorldCard, 'HiddenContent:', diag.hasHiddenRequestContent);
    console.log('AutoCompress:', diag.autoCompressEnabled, '| WouldCompact:', diag.wouldCompact, '| OverSoftLimit:', diag.overSoftLimit, '| FullCtxChars:', diag.fullContextChars, '| CompactTriggered:', diag.compactTriggered, '| RecentMsgs:', diag.recentMessageCountAfterBuild);
    console.groupEnd();
    window.__OMNICHAT_LAST_BUDGET_DEBUG = diag;
  }

  // Shared send logic without clearing input (used by action buttons)
  async function sendMessageContent(text) {
    dom.inputMessage.value = text;
    await sendMessage();
    dom.inputMessage.value = '';
  }

  // =========================================================================
  // STORY SCENE REPAIR — ask model to output missing @@SCENE block
  // =========================================================================

  async function repairSceneBlock(conv, narrativeText) {
    if (!narrativeText || narrativeText.trim().length < 20) return null;
    try {
      var pConf = getProviderConfig(conv.provider);
      var apiKey = getApiKey(conv.provider);
      var model = resolveModel(conv);
      if (!apiKey || !model || !pConf.apiUrl) return null;

      var repairPrompt = [
        '以下是一段已生成的剧情正文。请基于这段正文输出完整的 @@SCENE 状态块。',
        '只输出 @@SCENE ... @@END，不要输出任何其他文字。',
        '',
        '剧情正文：',
        narrativeText.slice(-2000),
        '',
        '要求：',
        '- 必须包含 [角色: 主角名] 状态块',
        '- 必须包含：精神、精神评分(1-10)、身体、身体细节(≥2条)、情节、走向',
        '- 走向必须 A/B/C/D 四个选项，每个16-32字，基于正文生成具体行动+后果',
        '- 禁止"暂无明确""尚未显露""暂未明确"等占位符',
        '- 禁止"继续深入调查""暂时退一步观察"等泛化模板',
        '',
        '@@SCENE',
      ].join('\n');

      var repairMessages = [{ role: "user", content: repairPrompt }];
      // Force non-streaming for repair — resp.json() cannot parse a stream.
      var repairConv = Object.assign({}, conv, { stream: false });
      var headers = buildRequestHeaders(conv.provider, apiKey, repairConv);
      var body = buildRequestBody(repairConv, model, repairMessages);

      var resp = await fetch(pConf.apiUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body),
        signal: state.abortController ? state.abortController.signal : undefined,
      });

      if (!resp.ok) return null;
      var data = await resp.json();
      var choice = data.choices && data.choices[0] ? data.choices[0] : null;
      if (!choice || !choice.message || !choice.message.content) return null;
      var repairContent = choice.message.content;

      var sceneMatch = repairContent.match(/@@SCENE\s*([\s\S]*?)\s*@@END/);
      if (!sceneMatch) return null;
      var block = sceneMatch[1];

      var dirs = parseDirectionOptions(block);
      if (!dirs || dirs.length < 4) return null;

      var statuses = parseCharacterStatuses(block);
      if (!statuses || !statuses.length) return null;

      return {
        directions: dirs.map(function(d) { return d.content; }).join("\n"),
        characterStatuses: statuses
      };
    } catch (e) {
      console.warn("[OmniChat] Scene repair failed:", e.message || e);
      return null;
    }
  }

  // =========================================================================
  // STORY META STRIPPER — remove @@SCENE / 状态卡 / A/B/C/D from visible content
  // =========================================================================

  // Called AFTER sceneSnapshot/fallback is resolved, BEFORE rendering.
  // Ensures visible message content does not duplicate the UI status card.
  function stripStoryMetaFromVisibleContent(content) {
    if (!content) return content;
    var text = content;

    // A. Standard @@SCENE ... @@END block
    text = text.replace(/@@SCENE[\s\S]*?@@END/g, '');

    // B. @@SCENE without @@END — strip from last @@SCENE to end
    var lastSceneIdx = text.lastIndexOf('@@SCENE');
    if (lastSceneIdx >= 0) {
      text = text.slice(0, lastSceneIdx);
    }

    // C. Chinese status-block headers — strip from the LAST occurrence
    // (only within trailing ~2000 chars to avoid false positives)
    var scanStart = Math.max(0, text.length - 2000);
    var scanZone = text.slice(scanStart);
    var cnHeaders = [
      '角色状态卡', '状态卡', '当前状态', '场景状态', '剧情状态', '角色状态',
      '后续剧情走向', '剧情走向', '走向',
    ];
    var earliestMatch = scanZone.length;
    for (var hi = 0; hi < cnHeaders.length; hi++) {
      var hdr = cnHeaders[hi];
      // Match header at line start, optionally preceded by separator or bracket
      var re = new RegExp('(?:^|\\n)(?:[-—#*]{0,3}\\s*)?(?:【|\\[)?' + hdr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:】|\\])?[:：]?\\s*$', 'm');
      var m = scanZone.match(re);
      if (m && m.index < earliestMatch) {
        earliestMatch = m.index;
        // Also strip preceding separator line if present
        var preLines = scanZone.slice(Math.max(0, m.index - 30), m.index);
        var sepMatch = preLines.match(/\n(?:[-—]{2,}|[#*]{2,})\s*$/);
        if (sepMatch) {
          earliestMatch = m.index - (preLines.length - sepMatch.index - 1);
        }
      }
    }
    if (earliestMatch < scanZone.length) {
      text = text.slice(0, scanStart + earliestMatch);
    }

    // D. Trailing A/B/C/D option blocks
    // Only strip from near the END of text (last ~2000 chars).
    // Match 3-4 consecutive A/B/C/D marker lines at the very tail.
    var tailStart = Math.max(0, text.length - 2000);
    var tail = text.slice(tailStart);
    var abcdRe = /^([A-Da-d])[\.\)、：:\s]+\s*(.+)\s*$/gm;
    var allLines = tail.split('\n');
    // Find the LAST run of 3-4 consecutive ABCD lines
    var bestRunStart = -1;
    var bestRunLen = 0;
    var i = allLines.length - 1;
    while (i >= 0) {
      var line = allLines[i].trim();
      if (abcdRe.test(line)) {
        // re-test with reset lastIndex
        abcdRe.lastIndex = 0;
        var runStart = i;
        while (runStart > 0 && abcdRe.test(allLines[runStart - 1].trim())) {
          abcdRe.lastIndex = 0;
          runStart--;
        }
        var runLen = i - runStart + 1;
        if (runLen >= 3 && runLen <= 4 && runLen > bestRunLen) {
          bestRunStart = runStart;
          bestRunLen = runLen;
        }
        i = runStart - 1;
      } else {
        i--;
      }
    }
    if (bestRunStart >= 0 && bestRunLen >= 3) {
      // Remove from the bestRunStart to end (or just the run lines)
      var linesBefore = allLines.slice(0, bestRunStart);
      // Strip trailing blank lines after the ABCD block
      while (linesBefore.length > 0 && !linesBefore[linesBefore.length - 1].trim()) {
        linesBefore.pop();
      }
      text = text.slice(0, tailStart) + linesBefore.join('\n');
    }

    // Final cleanup
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();

    // E. If everything was stripped, provide a fallback sentence
    if (!text) {
      text = '（本轮回复主要为状态更新，已整理到下方状态卡。）';
    }

    return text;
  }

  // =========================================================================
  // SEND MESSAGE — core send flow, scene extraction, completeness checks
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
    // Validate maxTokens against provider cap
    var maxTokValid = validateMaxTokensForProvider(conv.provider, conv.maxTokens);
    if (!maxTokValid.valid) {
      showToast(maxTokValid.message, 'error');
      if (maxTokValid.cap && conv.maxTokens > maxTokValid.cap) {
        openDrawer('settings');
      }
      return;
    }

    // Regenerate flag: when true, reuse existing last user message;
    // do NOT push a duplicate user message into conv.messages.
    var regenFlags = state._regenerateFlags || null;
    state._regenerateFlags = null;
    var isRegenerate = regenFlags && regenFlags.appendUserMessage === false;
    var extraSystemMessages = (regenFlags && regenFlags.extraSystemMessages) || [];

    // Add user message (with optional hidden request content)
    if (!isRegenerate) {
      var userMsg = { role: 'user', content: text };
      if (state.pendingHiddenRequest) {
        userMsg._requestContent = state.pendingHiddenRequest;
        state.pendingHiddenRequest = null;
      }
      conv.messages.push(userMsg);
      updateTimestamp(conv);
      autoTitle(conv);
    } else {
      // Regenerate: use pendingHiddenRequest from the original user message
      state.pendingHiddenRequest = state.pendingHiddenRequest || null;
    }

    dom.inputMessage.value = '';
    dom.inputMessage.style.height = 'auto';

    preserveScrollPosition(renderMessages);
    updateTopBar();
    updateSendUI();

    // Sync legacy scene fields → storyMode before prompt injection
    syncLegacyToStoryMode(conv);
    // Re-evaluate story flags from message history and legacy data
    repairStoryModeFlags(conv);

    // Story mode: warn if maxTokens too low for reliable @@SCENE output
    if (isStoryEnabled(conv) && conv.maxTokens < 1200) {
      showToast('世界故事模式建议 Max Tokens ≥ 2000（当前 ' + conv.maxTokens + '），否则状态卡和选项可能被截断。', 'warning');
    }

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
    var storyEnabled = isStoryEnabled(conv);
    var storyStarted = isStoryStarted(conv);

    if (storyStarted) {
      var worldCard = buildCharacterCard(conv);
      fullSystemPrompt = (effectiveSystemPrompt || '') + '\n[世界模式 — 当前角色卡与设定]\n' + worldCard + '\n\n请根据以上角色卡与世界设定进行互动。每次回复末尾必须输出 @@SCENE 块，包含当前状态和 A/B/C/D 下一步选项。';
    }
    if (storyEnabled) {
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
        '1. 每次回复末尾必须输出完整的 @@SCENE 块，且 @@SCENE 块内必须包含”走向:”标签。走向: 后必须给出 4 个剧情选项，使用 A/B/C/D 选项标号。不得使用 1/2/3/4 数字编号。每个选项基于本次刚写出的正文、用户最新要求、最近上下文和当前场景记忆生成，选项之间必须有明显差异，不能泛泛而谈，不能脱离当前剧情，不能重复上一次已给出的走向。每条控制在 16–32 字，必须包含"行动 + 可能收益/风险/情绪变化"。不允许只在正文里写后续可能而不写入 @@SCENE。',
        '2. 剧情走向必须以 A/B/C/D 选项形式输出。用户下一轮如果只输入 A、B、C 或 D（或其变体如”选A””选择B”），应视为用户选择了对应剧情分支，并沿该分支继续创作，不得忽略或自行发挥；如果用户自由输入其他内容，则按用户新要求继续，不要强行套用已有选项。',
        '3. 每次回复后必须维护剧情人物的精神状态、身体细节、当前剧情总结和剧情走向，不得省略 @@SCENE 状态块。',
        '4. 精神评分使用 1-10 的整数，评价剧情人物的心理稳定/压力/清醒程度。评分要跟剧情变化一致，但不要无理由持续降低。',
        '5. 身体细节要具体到剧情人物的姿态、感官、疲劳、伤痛、动作变化或衣着状态，避免只写空泛形容词。',
        '6. 每次 @@SCENE 中的状态与走向必须基于本次回复刚刚写出的剧情片段更新。禁止直接复用上一轮状态卡或上一轮 A/B/C/D。即使剧情推进较小，也必须根据当前片段结尾生成新的 4 个可行动分支。',
        '7. 防止绝望循环：除非用户明确要求悲剧，不要让所有走向都通向崩溃、死亡或无解；至少保留一个可修复、可喘息或可转机的路径。',
        '8. 如果剧情停滞，主动加入温和变量、外部线索、角色选择或可行动机会，减少重复。',
        '9. 应用会自动把场景记忆渲染到本次回答框里；正文里不要重复输出状态表。',
        '10. 必须按人物分别输出状态：先输出主角完整状态块，再输出与主角当前强相关的1-3个NPC状态块。每个状态块用[角色: 名称]开头。每块包含精神、精神评分、身体、身体细节（bullet列表）、目标、姿势、内心。描述要贴剧情、贴人物，不要像AI总结自己。剧情走向4条，每条16-32字，含行动+可能收益/风险/情绪变化。',
        '11. 精神状态要写具体触发原因，如"因听见脚步声而警觉升高"，不要只写"紧张"。身体细节要写可感知的具体细节：呼吸、肌肉、视线、手指、步伐、伤口、衣物/装备、环境接触等，必须和刚生成的剧情正文一致，不要套模板。',
        '12. 剧情走向每条必须包含行动 + 可能后果/情绪变化/风险，不能只是泛泛标题。至少包含一个主动推进、一个观察/试探、一个关系互动或外部事件；避免全是逃跑/崩溃/死亡。每个走向要明显不同。文案中自然体现可能…/但…/因此…等故事感。',
        '13. 状态字段必须来自刚刚正文中已出现或合理可承接的细节。禁止凭空编造正文未涉及的伤口、道具、关系、人物、地点。禁止使用"暂无明确""尚未显露""暂未明确"等占位符——如果正文确实没涉及某个字段，也要基于上下文合理推断一个具体描述，哪怕只有一句话。例如没写身体细节，至少写"呼吸平稳，站姿放松"。没写目标，至少写"继续前行"。不得让任何字段留空或填占位符。',
        '14. 当前剧情状态详细度：' + (conv.sceneDetailLevel || 'medium') + '。' + (conv.sceneDetailLevel === 'low' ? '状态字段更短，身体细节1-2条，但 A/B/C/D 走向仍然必须 4 条。' : conv.sceneDetailLevel === 'high' ? '更详细：身体细节3-4条，剧情总结2句，A/B/C/D 走向仍然必须 4 条。' : conv.sceneDetailLevel === 'ultra' ? '极致详细：身体细节4-6条，剧情总结2-3句，A/B/C/D 走向仍然必须 4 条并含后果/代价/机会。角色心理和风险更深入。禁止凭空编造，信息不足就合理推断。' : '每项1-2句，身体细节2-3条，A/B/C/D 走向仍然必须 4 条。'),
        '15. 详细度只影响状态卡文字长度和身体细节条数，不影响协议完整性。无论任何详细度，@@SCENE、@@END、[角色]、精神、身体、情节、走向、A/B/C/D 四项都必须完整输出。',
        '16. A/B/C/D 走向必须基于本轮剧情正文和当前场景生成，禁止使用"继续深入调查""暂时退一步观察"等泛化模板。每个走向要具体到当前剧情场景，体现当前人物关系和冲突。',
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
        'A. <行动 + 可能后果/风险，16-32字>',
        'B. <明显不同的行动 + 后果/风险>',
        'C. <行动 + 可能后果/风险，16-32字>',
        'D. <行动 + 可能后果/风险，16-32字>',
        '@@END',
      ]).filter(Boolean).join('\n');
      var sceneBlockFinal = (effectiveSystemPrompt || '') + sceneBlock;
      fullSystemPrompt = storyStarted ? fullSystemPrompt + '\n\n' + sceneBlockFinal : sceneBlockFinal;
    }

    if (fullSystemPrompt) {
      const sysMsg = { role: 'system', content: fullSystemPrompt };
      if (supportsCaching) sysMsg.cache_control = { type: 'ephemeral' };
      messages.push(sysMsg);
    }

    messages.push(...buildConversationRequestMessages(conv, supportsCaching));

    // Story mode A/B/C/D choice detection
    if (storyEnabled && conv.sceneState && conv.sceneState.directions) {
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

    // World story mode: inject lightweight format reminder near request end
    // Ensures model doesn't forget @@SCENE / mental / body / NPC / A/B/C/D in long convos
    if (storyEnabled) {
      var reminder = '\n[本轮世界故事硬性格式要求]';
      reminder += '\n正文末尾必须输出完整的 @@SCENE ... @@END 块。';
      reminder += '\n@@SCENE 内必须包含：精神、精神评分、身体、身体细节（至少2条可感知细节）、情节、走向（A/B/C/D 各一条，16-32字）。';
      if (conv.sceneNpcs && conv.sceneNpcs.length) {
        reminder += '\n必须给出至少1个与当前剧情相关的 NPC 状态块（格式：[角色: NPC名]）。';
      }
      reminder += '\n不得省略 @@END。';
      if (conv.sceneDetailLevel === 'ultra') {
        reminder += '\n详细度高但不能牺牲完整性：优先保证精神/身体/NPC/A/B/C/D/@@END 完整。';
      }
      messages.push({ role: 'system', content: reminder });
    }

    // Inject extra system messages (API-only, e.g. regenerate reminder).
    // They go into the request but NOT conv.messages — never persisted.
    if (extraSystemMessages.length > 0) {
      for (var esi = 0; esi < extraSystemMessages.length; esi++) {
        messages.push({ role: 'system', content: extraSystemMessages[esi] });
      }
    }

    // Add placeholder assistant message for streaming
    const assistantMsg = { role: 'assistant', content: '', _streaming: true };
    conv.messages.push(assistantMsg);
    preserveScrollPosition(renderMessages);

    // Create abort controller
    state.abortController = new AbortController();
    state.isStreaming = true;
    state.ui.autoFollowStreaming = true;
    state.ui.userScrolling = false;
    updateScrollToBottomButton(false);
    updateSendUI();

    const pConf = getProviderConfig(conv.provider);

    // --- Non-blocking context-length hint when auto-compress is off ---
    if (!conv.autoCompress && countApproxChars(conv) > REQUEST_CHAR_SOFT_LIMIT) {
      showToast('上下文较长，可能被服务商拒绝。你可以手动开启自动压缩或清理历史。', 'warning', 4000);
    }

    // --- Debug budget diagnostics (before fetch) ---
    var _dbgBodyPreview = null;
    if (isDebugBudget()) {
      const headers = buildRequestHeaders(conv.provider, apiKey, conv);
      var body = buildRequestBody(conv, model, messages);
      _dbgBodyPreview = body;
      var diag = diagnoseRequestBudget(conv, messages, body);
      _logBudgetDebug(diag);
    }

    try {
      const headers = buildRequestHeaders(conv.provider, apiKey, conv);
      const body = buildRequestBody(conv, model, messages);

      const resp = await fetch(pConf.apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal: state.abortController.signal,
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        // Enhanced error diagnostics
        var errDetail = {
          status: resp.status,
          statusText: resp.statusText || '',
          errSnippet: (errText || '').slice(0, 1000),
          provider: conv.provider,
          model: model,
          maxTokens: body.max_tokens,
        };
        // Budget-aware error messages
        if (resp.status === 400 && /max_tokens|token|context|length|too long|maximum context/i.test(errText)) {
          var cap = getProviderCap(conv.provider);
          var budgetToast = '';
          if (conv.provider === 'deepseek' && /invalid.*max_tokens/i.test(errText)) {
            budgetToast = 'DeepSeek 拒绝了 max_tokens 参数。当前值过大，请调低到 ' + cap.toLocaleString() + ' 以下。';
          } else if (/context|length|too long/i.test(errText) && !conv.autoCompress) {
            budgetToast = '上下文过长，服务商拒绝了请求。你可以开启自动压缩、删除部分历史，或新建会话。';
          } else {
            budgetToast = '服务商拒绝了请求预算，可能是 Max Tokens 或上下文过大。';
          }
          if (isDebugBudget()) {
            console.warn('[OmniChat Budget Error]', errDetail);
            if (!budgetToast.includes('debug:')) {
              budgetToast += ' (debug: ' + body.max_tokens + ' max_tokens, ~' + Math.ceil(JSON.stringify(messages).length / 3) + ' est input tokens)';
            }
          }
          throw new Error(budgetToast);
        }
        if (resp.status === 413) {
          if (isDebugBudget()) {
            console.warn('[OmniChat Budget Error 413]', errDetail);
          }
          var compactHint = !conv.autoCompress ? ' 你可以开启自动压缩、删除部分历史，或新建会话。' : ' 请尝试删除部分历史或新建会话。';
          throw new Error('上下文过长，服务商拒绝了请求。' + compactHint);
        }
        if (isDebugBudget()) {
          console.warn('[OmniChat Request Error]', errDetail);
        }
        if (resp.status === 401) throw new Error(ERR_MSGS.unauthorized);
        if (resp.status === 429) throw new Error(ERR_MSGS.rateLimited);
        if (resp.status === 400 && errText.includes('model')) throw new Error(ERR_MSGS.modelNotFound);
        if (resp.status === 402) throw new Error(ERR_MSGS.insufficientBalance);
        throw new Error(`${ERR_MSGS.serverError} (${resp.status})`);
      }

      if (conv.stream) {
        await processStream(resp, assistantMsg, conv);
      } else {
        const data = await resp.json();
        const parsed = parseNonStreamResponse(conv.provider, data);
        assistantMsg.content = parsed.content;
        assistantMsg.reasoning = parsed.reasoning;
        if (parsed.usage) {
          assistantMsg.usage = parsed.usage;
        }
        if (parsed.finishReason) {
          assistantMsg.finishReason = parsed.finishReason;
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        assistantMsg.content += '\n\n[已停止]';
        showToast(ERR_MSGS.userAborted, 'info');
      } else if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
        conv.messages.pop();
        showToast(ERR_MSGS.cors, 'error', 6000);
        if (isDebugBudget()) {
          console.warn('[OmniChat CORS Error] Type: TypeError/Failed to fetch. Provider:', conv.provider, 'Model:', model);
          if (_dbgBodyPreview) console.warn('[OmniChat CORS Error] Body ~', JSON.stringify(_dbgBodyPreview).length, 'bytes');
        }
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
      if (storyEnabled && assistantMsg.content) {
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
          // parsedSceneFromThisReply: only fields ACTUALLY parsed from THIS reply
          var parsedSceneFromThisReply = {
            currentRole: currentRole,
            currentGoal: currentGoal,
            posture: posture,
            mental: mental,
            mentalScore: mentalScore,
            physical: physical,
            bodyDetails: bodyDetails,
            plot: plot,
            risk: risk,
            innerVoice: innerVoice,
            directions: directions,
            characterStatuses: characterStatuses && characterStatuses.length ? characterStatuses : [],
          };
          // mergedSceneState: long-term memory (new || old)
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
          // Sync to storyMode long-term memory
          if (conv.storyMode) conv.storyMode.sceneState = conv.sceneState;
          // assistantMsg shows only THIS reply's parsed fields
          assistantMsg.sceneSnapshot = createSceneState(parsedSceneFromThisReply);
          assistantMsg.sceneStatusSnapshot = createSceneStatus(conv.sceneStatus);
          assistantMsg.sceneCharacterSnapshot = createSceneCharacter(conv.sceneCharacter);
          // Note: comprehensive stripStoryMetaFromVisibleContent runs after
          // fallback block below — don't do partial strip here.
          updateScenePanelUI();
        } else {
          console.warn('[OmniChat] Scene mode reply has no @@SCENE block.');
          // Do NOT show old scene state as current message's snapshot
          assistantMsg.sceneSnapshot = null;
          assistantMsg.sceneStatusSnapshot = createSceneStatus(conv.sceneStatus);
          assistantMsg.sceneCharacterSnapshot = createSceneCharacter(conv.sceneCharacter);
        }
      }

      // Completeness warnings for story mode responses (non-blocking)
      // Checks visible text for mental/body/npc, and sceneSnapshot for directions.
      // Does NOT check visible text for @@SCENE/@@END (they are stripped from display).
      if (storyEnabled && assistantMsg.content) {
        var missing = [];
        // Visible text checks: mental, body, NPC presence in displayed text
        if (!/mental|精神|心理|内心|情绪|感受|觉得|感到/.test(assistantMsg.content)) missing.push('mental/心理');
        if (!/身体|physical|感官|姿态|姿势|呼吸|肌肉|指尖|视线|手足/.test(assistantMsg.content)) missing.push('body/身体');
        if (conv.sceneNpcs && conv.sceneNpcs.length) {
          var npcNames = conv.sceneNpcs.map(function (n) { return n.name; });
          var hasNpc = npcNames.some(function (name) { return assistantMsg.content.indexOf(name) >= 0; });
          if (!hasNpc) missing.push('NPC');
        }
        // Scene snapshot checks: directions extracted from @@SCENE block
        var scene = assistantMsg.sceneSnapshot || null;
        var snapshotDirs = scene && scene.directions ? scene.directions : '';
        var dirsParsed = snapshotDirs ? parseDirectionOptions(snapshotDirs) : [];
        if (!scene) missing.push('sceneSnapshot');
        if (!snapshotDirs) missing.push('directions');
        else if (dirsParsed.length < 4) missing.push('A/B/C/D<' + dirsParsed.length);
        if (missing.length) {
          console.warn('[OmniChat] Story response missing: ' + missing.join(', '));
        }

        // Scene repair: if model didn't output a valid @@SCENE block,
        // ask it to generate one based on the narrative it just wrote.
        if (!assistantMsg._sceneRepairAttempted && (dirsParsed.length < 4 || !scene)) {
          assistantMsg._sceneRepairAttempted = true;
          try {
            var narrativeForRepair = assistantMsg.content || '';
            if (narrativeForRepair.length > 20) {
              console.warn('[OmniChat] Scene data missing — attempting repair (dirs=' + dirsParsed.length + ', snapshot=' + !!scene + ').');
              var repairResult = await repairSceneBlock(conv, narrativeForRepair);
              if (repairResult) {
                if (!scene) {
                  assistantMsg.sceneSnapshot = createSceneState({
                    directions: repairResult.directions,
                    characterStatuses: repairResult.characterStatuses,
                  });
                } else {
                  if (!scene.directions || parseDirectionOptions(scene.directions).length < 4) {
                    scene.directions = repairResult.directions;
                  }
                  if (!scene.characterStatuses || !scene.characterStatuses.length) {
                    scene.characterStatuses = repairResult.characterStatuses;
                  }
                }
                scene = assistantMsg.sceneSnapshot;
                snapshotDirs = scene && scene.directions ? scene.directions : '';
                dirsParsed = snapshotDirs ? parseDirectionOptions(snapshotDirs) : [];
                console.warn('[OmniChat] Scene repair succeeded (dirs=' + dirsParsed.length + ').');
              } else {
                console.warn('[OmniChat] Scene repair failed — no status card or chips for this reply.');
              }
            }
          } catch (repairErr) {
            console.warn('[OmniChat] Scene repair error:', repairErr.message || repairErr);
          }
        }
      }

      // --- Truncation warning (visible to all users, not just debug) ---
      if (assistantMsg.finishReason === 'length') {
        showToast('回复被 Max Tokens 截断。建议 Max Tokens ≥ 2000。', 'warning');
      }

      // --- Story output completeness diagnostics (debug only) ---
      if (isDebugBudget() && storyEnabled) {
        var diagScene = {
          hasSceneBlock: /@@SCENE/.test(assistantMsg.content || ''),
          hasSceneSnapshot: !!assistantMsg.sceneSnapshot,
          directionsCount: (assistantMsg.sceneSnapshot && assistantMsg.sceneSnapshot.directions)
            ? parseDirectionOptions(assistantMsg.sceneSnapshot.directions).length : 0,
          contentLength: (assistantMsg.content || '').length,
          reasoningLength: (assistantMsg.reasoning || '').length,
          finishReason: assistantMsg.finishReason || null,
          truncated: assistantMsg.finishReason === 'length',
          repairAttempted: !!assistantMsg._sceneRepairAttempted,
        };
        console.group('%c[OmniChat Story Diagnostics]', 'color:#0af;font-weight:bold');
        console.table(diagScene);
        console.groupEnd();
      }

      // --- Strip story meta from visible content after scene parsing ---
      // Must run AFTER sceneSnapshot/fallback is fully resolved so the UI
      // status card + chips get correct data, but BEFORE rendering so the
      // plain text bubble doesn't duplicate the UI elements.
      if (storyEnabled && assistantMsg.content) {
        assistantMsg.content = stripStoryMetaFromVisibleContent(assistantMsg.content);
      }

      // Show action buttons on completed response
      if (assistantMsg.content && conv.messages.includes(assistantMsg)) {
        assistantMsg._showActions = true;
        assistantMsg._actionIndex = conv.messages.indexOf(assistantMsg);
      }

      updateTimestamp(conv);
      updateTopBar();

      // If user is detached (scrolled away during streaming), defer full render.
      // Don't force DOM rebuild that would interrupt their scrolling.
      // The "↓ 查看最新回复" button will trigger the final render on click.
      if (state.ui.detachedDuringStreaming && !state.ui.autoFollowStreaming) {
        state.ui.detachedContentDirty = true;
        updateScrollToBottomButton(true);
        debouncedSave();
        return;
      }

      // User is at bottom — normal full render
      fullRenderMessages(conv.messages);
      scrollToBottomIfNeeded({ smooth: false });
      updateScrollToBottomButton(false);
      debouncedSave();
    }
  }

  // =========================================================================
  // STREAM — SSE parsing, delta accumulation, render scheduling
  // =========================================================================

  async function processStream(resp, assistantMsg, conv) {
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    let renderScheduled = false;
    let lastRenderAt = 0;
    const minRenderGap = 80;
    const scheduleRender = () => {
      if (renderScheduled) return;

      // Detached mode: user scrolled away — accumulate content in memory only.
      // Do NOT touch the DOM to avoid reflow interrupting user scroll.
      if (state.ui.detachedDuringStreaming) {
        state.ui.detachedContentDirty = true;
        updateScrollToBottomButton(true);
        return;
      }

      renderScheduled = true;
      const delay = Math.max(0, minRenderGap - (performance.now() - lastRenderAt));
      setTimeout(() => {
        requestAnimationFrame(() => {
          // Only update DOM when user is at bottom (auto-follow)
          renderMessages();
          if (state.ui.autoFollowStreaming) {
            var sc = getScrollContainer();
            if (sc && isNearBottom(sc, 120)) {
              sc.scrollTop = sc.scrollHeight;
            }
          }
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
            const delta = parseStreamDelta(conv.provider, parsed);

            if (delta.content || delta.reasoning) {
              if (delta.reasoning) {
                assistantMsg.reasoning = (assistantMsg.reasoning || '') + delta.reasoning;
              }
              if (delta.content) {
                assistantMsg.content += delta.content;
              }
              scheduleRender();
            }

            if (delta.usage) {
              assistantMsg.usage = delta.usage;
            }

            // Capture finish_reason from streaming chunk (typically on last delta)
            if (delta.finishReason) {
              assistantMsg.finishReason = delta.finishReason;
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
            const delta = parseStreamDelta(conv.provider, parsed);
            if (delta.reasoning) {
              assistantMsg.reasoning = (assistantMsg.reasoning || '') + delta.reasoning;
            }
            if (delta.content) assistantMsg.content += delta.content;
            if (delta.usage) {
              assistantMsg.usage = delta.usage;
            }
            if (delta.finishReason) {
              assistantMsg.finishReason = delta.finishReason;
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
  // STOP — abort controller, streaming interruption
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
    var on = isStoryEnabled(conv);
    dom.inputMessage.placeholder = on ? '输入剧情行动或选择 A/B/C/D…' : '输入消息…';
  }

  function updateSceneModeClass() {
    var conv = getCurrentConv();
    var on = isStoryEnabled(conv);
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
  // EVENTS — user interaction bindings, click delegation, keyboard
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
    dom.selectProvider.addEventListener('change', () => { syncSettingsFromUI(); updateMaxTokensCap(); });
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
      updateMaxTokensCap();
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
    if (dom.inputStoryMode) dom.inputStoryMode.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.storyMode = conv.storyMode || createStoryMode();
        conv.storyMode.enabled = dom.inputStoryMode.checked;
        syncStoryModeToLegacy(conv);
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
    if (dom.btnCopyCharCard) dom.btnCopyCharCard.addEventListener('click', function() { if(!checkAge18Plus()) return;
      var conv = getCurrentConv();
      if (!conv) return;
      var card = buildCharacterCard(conv);
      if (!card) { showToast('角色卡为空，请先填写', 'warning'); return; }
      copyTextToClipboard(card, '角色卡已复制到剪贴板');
    });

    // Generate opening prompt button (hidden from UI, guarded)
    if (dom.btnGenOpeningPrompt) dom.btnGenOpeningPrompt.addEventListener('click', function() { if(!checkAge18Plus()) return;
      var conv = getCurrentConv();
      if (!conv) return;
      var sm = conv.storyMode;
      var w = (sm && sm.world) ? sm.world : (conv.sceneWorld || {});
      var ch = (sm && sm.character) ? sm.character : (conv.sceneCharacter || {});
      var ss = (sm && sm.sceneState) ? sm.sceneState : (conv.sceneState || {});
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
      var st = (sm && sm.status) ? sm.status : conv.sceneStatus;
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
      var npcs = (sm && sm.npcs) ? sm.npcs : conv.sceneNpcs;
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
        // Prevent double-click on same choice group
        var list = chip.closest('.dir-choices-list');
        if (list && list.dataset.locked === '1') return;

        // Secondary validation: only latest interactive direction message is clickable
        var chipMsgEl = chip.closest('.message');
        var chipMsgIndex = chipMsgEl ? parseInt(chipMsgEl.dataset.index, 10) : -1;
        var conv = getCurrentConv();
        if (!isLatestInteractiveDirectionMessage(conv, chipMsgIndex)) {
          showToast('这是历史分支选项，请选择最新回复下方的 A/B/C/D。', 'info');
          return;
        }

        var letter = chip.dataset.choice;

        // Click feedback: selected + loading
        chip.classList.add('selected', 'loading');
        chip.setAttribute('aria-disabled', 'true');

        // Disable all chips in this group
        if (list) {
          list.dataset.locked = '1';
          var allChips = list.querySelectorAll('.dir-choice-chip');
          allChips.forEach(function(c) {
            if (c !== chip) c.classList.add('disabled');
            c.setAttribute('aria-disabled', 'true');
          });
        }

        sendMessageContent('选' + letter).catch(function (err) {
          console.error('[OmniChat] Failed to send scene choice:', err);
          if (list) list.dataset.locked = '';
          chip.classList.remove('loading');
          chip.removeAttribute('aria-disabled');
          if (list) {
            list.querySelectorAll('.dir-choice-chip').forEach(function (btn) {
              btn.classList.remove('disabled');
              btn.removeAttribute('aria-disabled');
            });
          }
          showToast('发送选项失败，请重试', 'error');
        });
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
      requestAnimationFrame(updateBottomBarHeight);
    });

    // Smart scroll tracking — auto-follow unless user manually scrolls away
    var scrollTick = false;
    var onScrollEvent = function() {
      if (!scrollTick) {
        scrollTick = true;
        requestAnimationFrame(function() {
          onUserScrollIntent();
          scrollTick = false;
        });
      }
    };
    dom.mainContent.addEventListener('scroll', onScrollEvent, { passive: true });
    dom.mainContent.addEventListener('wheel', onScrollEvent, { passive: true });
    dom.mainContent.addEventListener('touchstart', function() { state.ui.programmaticScroll = false; }, { passive: true });
    dom.mainContent.addEventListener('touchmove', onScrollEvent, { passive: true });
    dom.mainContent.addEventListener('pointerdown', function() { state.ui.programmaticScroll = false; }, { passive: true });

    // Quick actions
    // Story editor toggle: click "世界故事 · ON" pill → open overlay editor
    if (dom.sceneCapsule) {
      dom.sceneCapsule.addEventListener('click', function(e) {
        e.stopPropagation();
        openStoryEditor();
      });
      dom.sceneCapsule.style.cursor = 'pointer';
    }

    // Story editor buttons: close=prompt if dirty, cancel=discard, save=persist, start=save+startWorld
    var storyEditorClose = document.getElementById('storyEditorClose');
    var storyEditorCancel = document.getElementById('storyEditorCancel');
    var storyEditorSave = document.getElementById('storyEditorSave');
    var storyEditorStart = document.getElementById('storyEditorStart');
    var storyEditorOverlay = document.getElementById('storyEditorOverlay');

    if (storyEditorClose) {
      storyEditorClose.addEventListener('click', function() {
        if (state.ui._editorDirty) {
          showConfirm('有未保存修改。<br><br>确定放弃修改并关闭？', function() {
            hideConfirm();
            closeStoryEditor(false);
          });
          setTimeout(function() {
            dom.dialogConfirm.textContent = '放弃修改';
            dom.dialogCancel.textContent = '返回编辑';
          }, 50);
        } else {
          closeStoryEditor(null);
        }
      });
    }
    if (storyEditorCancel) storyEditorCancel.addEventListener('click', function() { closeStoryEditor(false); });
    if (storyEditorSave) storyEditorSave.addEventListener('click', function() { closeStoryEditor(true); });
    if (storyEditorStart) {
      storyEditorStart.addEventListener('click', function() {
        closeStoryEditor(true);
        if (typeof startWorldMode === 'function') startWorldMode();
      });
    }
    // Overlay background: do NOT close (prevent accidental data loss)
    if (storyEditorOverlay) {
      storyEditorOverlay.addEventListener('click', function(e) {
        if (e.target === storyEditorOverlay) {
          // No action on background click — user must use explicit buttons
        }
      });
    }

    // "更多" toggle for secondary quick actions
    var moreBtn = $('#btnQuickMore');
    if (moreBtn) {
      moreBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var qa = document.getElementById('quickActions');
        if (qa) { qa.classList.toggle('expanded'); }
        var expanded = qa && qa.classList.contains('expanded');
        moreBtn.setAttribute('aria-expanded', expanded);
        moreBtn.innerHTML = expanded ? '▾ 收起' : '▸ 更多';
        requestAnimationFrame(function() {
          updateBottomBarHeight();
          // Keep at bottom if user was near it
          if (state.ui.autoFollowStreaming) {
            var sc = getScrollContainer();
            if (sc && isNearBottom(sc, 60)) sc.scrollTop = sc.scrollHeight;
          }
        });
      });
    }

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
          var maxSide = 600;
          var w=img.width, h=img.height;
          if (w>h && w>maxSide) { h=h*maxSide/w; w=maxSide; }
          else if (h>maxSide) { w=w*maxSide/h; h=maxSide; }
          canvas.width=w; canvas.height=h;
          canvas.getContext('2d').drawImage(img,0,0,w,h);
          var dataUrl = canvas.toDataURL('image/jpeg', 0.65);
          var c = getCurrentConv();
          if (!c || !c.sceneNpcs) return;
          for (var ni=0; ni<c.sceneNpcs.length; ni++) {
            if (c.sceneNpcs[ni].id === npcId) { var imgCount=0; for(var nci=0;nci<c.sceneNpcs.length;nci++){if(c.sceneNpcs[nci].image)imgCount++;}
              var hasExisting = c.sceneNpcs[ni].image ? true : false;
              var newCount = hasExisting ? imgCount : imgCount + 1;
              if (newCount > 6){showToast('最多保存6张NPC图片，请先移除旧图片','warning');return;}
              c.sceneNpcs[ni].image = dataUrl; break; }
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
    if (dom.btnStartWorld) dom.btnStartWorld.addEventListener('click', () => startWorldMode());

    // Export / Import / Clear all
    // Clear cache button in settings
    var btnClearCache = $('#btnClearCache');
    if (btnClearCache) {
      btnClearCache.addEventListener('click', function() {
        window.localStorage.setItem('omnichat_clear_cache', '1');
        window.location.reload();
      });
    }

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

    // ResizeObserver: keep --bottom-bar-h in sync with actual bottom bar height
    var bottomBar = document.querySelector('.bottom-bar');
    if (bottomBar && window.ResizeObserver) {
      new ResizeObserver(function() {
        updateBottomBarHeight();
      }).observe(bottomBar);
    }

    // Detect standalone / PWA / "Add to Home Screen" mode
    var isStandalone = window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches;
    if (isStandalone) {
      document.documentElement.classList.add('is-standalone');
    }

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

    // Mark page as splashing so bottom-bar is hidden during animation
    document.documentElement.classList.add('is-splashing');

    // Focus input after splash
    setTimeout(() => dom.inputMessage.focus(), 2000);

    // Splash screen - dismiss after animation
    const splashDismissed = sessionStorage.getItem('omnichat_splash');
    const onSplashDone = () => {
      document.documentElement.classList.remove('is-splashing');
      updateBottomBarHeight();
    };
    if (splashDismissed) {
      dom.splash.style.transition = 'opacity 150ms ease, visibility 150ms ease';
      setTimeout(() => {
        dom.splash.classList.add('dismissed');
        // Wait until splash fade-out transition finishes before revealing bottom-bar
        window.setTimeout(onSplashDone, 220);
      }, 50);
    } else {
      setTimeout(() => {
        dom.splash.classList.add('dismissed');
        // Wait until splash fade-out transition finishes before revealing bottom-bar
        window.setTimeout(onSplashDone, 480);
      }, 2200);
      sessionStorage.setItem('omnichat_splash', '1');
    }

    // Expose build version for debug (from meta tag injected by _build.js)
    var buildMeta = document.querySelector('meta[name="build-version"]');
    var commitMeta = document.querySelector('meta[name="build-commit"]');
    window.__BUILD_VERSION__ = buildMeta ? buildMeta.content : 'dev';
    window.__BUILD_COMMIT__ = commitMeta ? commitMeta.content : 'unknown';
    console.log('[OmniChat] Build:', window.__BUILD_VERSION__, 'Commit:', window.__BUILD_COMMIT__);

    // Debug version float (debugVersion=1 or debugBudget=1)
    if (window.location.search.indexOf('debugVersion=1') !== -1 || isDebugBudget()) {
      var versionFloat = document.createElement('div');
      versionFloat.id = 'debugVersionFloat';
      versionFloat.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:9999;font-size:9px;color:rgba(255,255,255,0.3);font-family:monospace;pointer-events:none;';
      versionFloat.textContent = 'build: ' + window.__BUILD_COMMIT__.slice(0,7) + ' / ' + window.__BUILD_VERSION__;
      document.body.appendChild(versionFloat);
    }

    // Reload guard: prevent infinite refresh loops
    var now = Date.now();
    var lastReload = parseInt(sessionStorage.getItem('omnichat_reload_ts') || '0', 10);
    var reloadCount = parseInt(sessionStorage.getItem('omnichat_reload_cnt') || '0', 10);
    if (lastReload && (now - lastReload) < 5000) {
      reloadCount++;
      if (reloadCount >= 3) {
        sessionStorage.removeItem('omnichat_reload_ts');
        sessionStorage.removeItem('omnichat_reload_cnt');
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#fff;font-family:sans-serif;text-align:center;padding:20px"><div><h2>应用更新失败</h2><p>请手动清理缓存后刷新。</p><p style="font-size:12px;opacity:0.5">设置 → Safari → 清除历史记录与网站数据<br>或 Chrome → 设置 → 隐私 → 清除浏览数据</p></div></div>';
        return; // Stop execution — prevent further reloads
      }
    } else {
      reloadCount = 0;
    }
    sessionStorage.setItem('omnichat_reload_ts', now);
    sessionStorage.setItem('omnichat_reload_cnt', reloadCount);

    // Clear cache mechanism (?clearCache=1 or localStorage flag)
    if (window.location.search.indexOf('clearCache=1') !== -1 || window.localStorage.getItem('omnichat_clear_cache') === '1') {
      window.localStorage.removeItem('omnichat_clear_cache');
      // Reset reload guard for this intentional reload
      sessionStorage.removeItem('omnichat_reload_ts');
      sessionStorage.removeItem('omnichat_reload_cnt');
      Promise.resolve().then(function() {
        if (navigator.serviceWorker) {
          return navigator.serviceWorker.getRegistrations().then(function(regs) {
            return Promise.all(regs.map(function(r) { return r.unregister(); }));
          });
        }
      }).then(function() {
        if (window.caches) {
          return caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(k) { return caches.delete(k); }));
          });
        }
      }).then(function() {
        var cleanUrl = window.location.href.replace(/[?&]clearCache=1/g, '').replace(/[?&]$/, '');
        window.location.replace(cleanUrl);
      });
    }

    // Debug: inspect all conversation schemas / message migration state
    window.__debugConversationSchemas = function () {
      return state.conversations.map(function (c) {
        var first = c.messages && c.messages.find(function (m) { return m.role === 'user'; });
        return {
          id: c.id,
          title: c.title,
          worldMode: c.worldMode,
          storyStarted: !!(c.storyMode && c.storyMode.started),
          schemaVersion: c.schemaVersion,
          msgCount: c.messages ? c.messages.length : 0,
          firstUser: first ? {
            contentPreview: String(first.content || '').slice(0, 80),
            displayContent: first.displayContent,
            hasRequestContent: !!first._requestContent,
          } : null,
        };
      });
    };

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
    getToolCallSettings: typeof getToolCallSettings !== 'undefined' ? getToolCallSettings : null,
    runToolLoop: typeof runToolLoop !== 'undefined' ? runToolLoop : null,
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
