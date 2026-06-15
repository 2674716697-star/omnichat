  // =========================================================================
  // STATE — runtime application state (persisted to localStorage)
  // =========================================================================

  const state = {
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
    },
    _remoteMemoryPrefetchLocks: {},
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
    dom.themeDrawer = $('#themeDrawer');
    dom.themeOverlay = $('#themeOverlay');
    dom.btnCloseTheme = $('#btnCloseTheme');
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
    dom.inputReplyCharLimit = $('#inputReplyCharLimit');
    dom.inputStream = $('#inputStream');
    dom.inputCaching = $('#inputCaching');
    dom.inputPreciseMode = $('#inputPreciseMode');
    dom.selectToolCallLimit = $('#selectToolCallLimit');
    dom.chatBgOverlay = $('#chatBgOverlay');
    dom.bgPresets = $('#bgPresets');
    dom.inputBgOpacity = $('#inputBgOpacity');
    dom.inputBgBrightness = $('#inputBgBrightness');
    dom.inputUIOpacity = $('#inputUIOpacity');
    dom.inputBubbleOpacity = $('#inputBubbleOpacity');
    dom.btnAdjustBg = $('#btnAdjustBg');
    dom.btnResetBg = $('#btnResetBg');
    dom.bgAdjustOverlay = $('#bgAdjustOverlay');
    dom.bgAdjustImage = $('#bgAdjustImage');
    dom.bgAdjustViewport = $('#bgAdjustViewport');
    dom.btnBgAdjustSave = $('#btnBgAdjustSave');
    dom.btnBgAdjustClose = $('#btnBgAdjustClose');
    dom.btnPickBgImage = $('#btnPickBgImage');
    dom.btnRemoveBgImage = $('#btnRemoveBgImage');
    dom.inputBgFile = $('#inputBgFile');
    dom.inputBgUrl = $('#inputBgUrl');
    dom.btnApplyBgUrl = $('#btnApplyBgUrl');
    dom.inputActionRegenerate = $('#inputActionRegenerate');
    dom.inputActionContinue = $('#inputActionContinue');
    dom.inputActionSummarize = $('#inputActionSummarize');
    dom.inputActionElaborate = $('#inputActionElaborate');
    dom.inputStoryMode = $('#inputStoryMode');
    dom.inputAutoCompress = $('#inputAutoCompress');
    dom.inputKeepThinking = $('#inputKeepThinking');
    dom.btnStartWorld = $('#btnStartWorld');
    dom.inputSceneDetail = $('#inputSceneDetail');
    dom.selectStoryAuxProvider = $('#selectStoryAuxProvider');
    dom.selectStoryAuxModel = $('#selectStoryAuxModel');
    dom.inputStoryAuxModel = $('#inputStoryAuxModel');
    dom.inputStoryAuxMaxTokens = $('#inputStoryAuxMaxTokens');
    dom.inputStoryAuxApiKey = $('#inputStoryAuxApiKey');
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
    dom.btnQuickMemory = $('#btnQuickMemory');
    dom.memoryPanel = $('#memoryPanel');
    dom.memoryInput = $('#memoryInput');
    dom.btnMemorySave = $('#btnMemorySave');
    dom.btnMemoryClear = $('#btnMemoryClear');

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
    // Remove existing toasts — only the latest message should be visible
    while (dom.toastContainer.firstChild) {
      dom.toastContainer.firstChild.remove();
    }
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = msg;
    dom.toastContainer.appendChild(toast);
    // Force reflow so enter animation fires after append
    toast.offsetHeight;
    setTimeout(function() {
      toast.classList.add('toast-exit');
      toast.addEventListener('transitionend', function() { toast.remove(); }, { once: true });
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
    if (dom.dialogOverlay.style.display === 'none') return;
    dom.dialogOverlay.classList.add('dialog-overlay-exit', 'dialog-exit');
    dom.dialogOverlay.querySelector('.dialog').addEventListener('animationend', function() {
      dom.dialogOverlay.style.display = 'none';
      dom.dialogOverlay.classList.remove('dialog-overlay-exit', 'dialog-exit');
    }, { once: true });
  }

  function showRenameDialog(id, currentTitle) {
    state.pendingRenameId = id;
    dom.renameInput.value = currentTitle || '';
    dom.renameDialogOverlay.style.display = 'flex';
    setTimeout(() => dom.renameInput.focus(), 100);
  }

  function hideRenameDialog() {
    state.pendingRenameId = null;
    if (dom.renameDialogOverlay.style.display === 'none') return;
    dom.renameDialogOverlay.classList.add('dialog-overlay-exit', 'dialog-exit');
    var dialog = dom.renameDialogOverlay.querySelector('.dialog');
    if (dialog) {
      dialog.addEventListener('animationend', function() {
        dom.renameDialogOverlay.style.display = 'none';
        dom.renameDialogOverlay.classList.remove('dialog-overlay-exit', 'dialog-exit');
      }, { once: true });
    } else {
      dom.renameDialogOverlay.style.display = 'none';
    }
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

  // =========================================================================
  // findPreviousSceneSnapshotForRender — fallback directions for broken msgs
  // Searches backwards from msgIndex for a valid sceneSnapshot with ≥4 directions.
  // Falls back to conv.sceneState if no message-level snapshot found.
  // =========================================================================

  function findPreviousSceneSnapshotForRender(msgIndex) {
    var conv = getCurrentConv();
    if (!conv || !Array.isArray(conv.messages)) return null;
    // Search backwards for a valid assistant sceneSnapshot
    for (var i = msgIndex - 1; i >= 0; i--) {
      var m = conv.messages[i];
      if (m.role !== 'assistant' || !m.sceneSnapshot) continue;
      var dirs = m.sceneSnapshot.directions || '';
      if (typeof parseDirectionOptions === 'function' && parseDirectionOptions(dirs).length >= 4) {
        return m.sceneSnapshot;
      }
    }
    // Fallback: use conv-level sceneState
    var cs = conv.sceneState;
    if (cs && cs.directions && typeof parseDirectionOptions === 'function' && parseDirectionOptions(cs.directions).length >= 4) {
      return cs;
    }
    return null;
  }

  function renderSceneStatusTable(msg, msgIndex) {
    // Repair broken assistant messages that have _showActions but no valid directions
    if (msg.role === 'assistant' && msg._showActions && !msg._streaming) {
      var hasDirs = msg.sceneSnapshot && msg.sceneSnapshot.directions && parseDirectionOptions(msg.sceneSnapshot.directions).length >= 4;
      if (!hasDirs) {
        var fallbackSS = findPreviousSceneSnapshotForRender(msgIndex);
        if (fallbackSS && fallbackSS.directions) {
          msg.sceneSnapshot = msg.sceneSnapshot
            ? Object.assign({}, msg.sceneSnapshot, { directions: fallbackSS.directions, characterStatuses: fallbackSS.characterStatuses || [] })
            : createSceneState(fallbackSS);
        }
      }
    }
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
      replyCharLimit: DEFAULTS.replyCharLimit,
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
      storyAuxProvider: DEFAULTS.storyAuxProvider,
      storyAuxModel: DEFAULTS.storyAuxModel,
      storyAuxMaxTokens: DEFAULTS.storyAuxMaxTokens,
      storyAuxApiKey: DEFAULTS.storyAuxApiKey,
      storyMemory: createStoryMemory(),
      memoryMode: DEFAULTS.memoryMode,
      // Phase 1.2: allow runtime override for remote endpoint on new convos.
      // Existing conversations are NOT rewritten — their stored endpoint is
      // preserved to avoid contaminating user data.
      memoryRemoteEndpoint: getRuntimeConfigValue('memoryRemoteEndpoint', DEFAULTS.memoryRemoteEndpoint),
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
        var digestContent = '[较早对话压缩摘要]\n' + olderDigest;
        // Attach story memory to the digest so it survives compression
        if (isStoryStarted(conv)) {
          var smText = retrieveStoryMemoryText(conv, '', 4000);
          if (smText) {
            digestContent += '\n\n[长期章节记忆 — 请在压缩时优先保留]\n' + smText;
          }
        }
        digestContent += '\n\n请把这段摘要当作背景，不要逐字复述；优先保持最近原文消息、写作场景记忆和用户最新要求。';
        requestMessages.unshift({
          role: 'system',
          content: digestContent,
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
    } else if (side === 'theme') {
      if (dom.themeDrawer) dom.themeDrawer.classList.add('open');
      if (dom.themeOverlay) dom.themeOverlay.classList.add('open');
      state.ui.isThemeOpen = true;
      document.documentElement.classList.add('is-theme-open');
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
    } else if (side === 'theme') {
      dom.themeDrawer.classList.remove('open');
      dom.themeOverlay.classList.remove('open');
      state.ui.isThemeOpen = false;
      document.documentElement.classList.remove('is-theme-open');
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
    editorBody.scrollTop = 0;
    sourceBody.scrollTop = 0;

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
    requestAnimationFrame(function() {
      editorBody.scrollTop = 0;
      sourceBody.scrollTop = 0;
    });
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

    // Smooth exit animation before hiding
    overlay.classList.add('story-editor-overlay-exit');
    overlay.addEventListener('transitionend', function handler() {
      overlay.removeEventListener('transitionend', handler);
      overlay.style.display = 'none';
      overlay.classList.remove('story-editor-overlay-exit');
    }, { once: true });
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

  function getRenderableMessageEntries(messages) {
    const entries = [];
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role !== 'system') {
        entries.push({ msg: messages[i], index: i });
      }
    }
    return entries;
  }

  function renderMessages() {
    const conv = getCurrentConv();
    if (!conv) {
      document.documentElement.classList.add('welcome-visible');
      dom.messagesContainer.innerHTML = '';
      dom.welcomeScreen.classList.remove('hidden');
      dom.messagesContainer.appendChild(dom.welcomeScreen);
      return;
    }

    const messages = conv.messages;
    const renderable = getRenderableMessageEntries(messages);
    if (renderable.length === 0) {
      document.documentElement.classList.add('welcome-visible');
      dom.welcomeScreen.classList.remove('hidden');
      dom.messagesContainer.innerHTML = '';
      dom.messagesContainer.appendChild(dom.welcomeScreen);
      return;
    }

    document.documentElement.classList.remove('welcome-visible');
    dom.welcomeScreen.classList.add('hidden');

    // Diff-based update: compare existing DOM with needed messages
    const existingItems = dom.messagesContainer.querySelectorAll('.message');
    const existingCount = existingItems.length;

    // If counts differ dramatically, full render
    if (Math.abs(existingCount - renderable.length) > 1) {
      fullRenderMessages(messages);
      return;
    }

    // If last message is/was streaming, update it (handles both adding and removing cursor)
    const lastEntry = renderable[renderable.length - 1];
    const lastMsg = lastEntry.msg;
    const lastExisting = existingItems[existingItems.length - 1] || null;
    const hasCursor = lastExisting && lastExisting.querySelector('.streaming-cursor');
    if (lastMsg && (lastMsg._streaming || hasCursor) && existingCount === renderable.length) {
      updateLastBubble(lastMsg);
      return;
    }

    // Add new messages not yet rendered
    if (renderable.length > existingCount) {
      dom.welcomeScreen.classList.add('hidden');
      for (let i = existingCount; i < renderable.length; i++) {
        const entry = renderable[i];
        const el = createMessageElement(entry.msg, entry.index);
        dom.messagesContainer.appendChild(el);
        animateBubbleIn(el);
      }
      ensureMessagesBottomSpacer();
    }
  }

  function fullRenderMessages(messages) {
    // Remove only message elements, keep welcome screen and spacer
    dom.messagesContainer.querySelectorAll('.message').forEach((el) => el.remove());
    dom.welcomeScreen.classList.add('hidden');
    const renderable = getRenderableMessageEntries(messages);
    for (let i = 0; i < renderable.length; i++) {
      const entry = renderable[i];
      const el = createMessageElement(entry.msg, entry.index);
      dom.messagesContainer.appendChild(el);
      animateBubbleIn(el);
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
      const isStreamingReasoning = msg._streaming && !!reasoning;
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

    // Main content — displayParts for dual-part story, otherwise single content block
    if (msg.displayParts && msg.displayParts.length > 0 && !msg._streaming) {
      for (var pi = 0; pi < msg.displayParts.length; pi++) {
        var part = msg.displayParts[pi];
        if (part.content) {
          html += '<div class="story-part' + (pi > 0 ? ' story-part-continuation' : '') + '">';
          html += '<div class="message-content">' + renderMarkdown(part.content) + '</div>';
          html += '</div>';
        }
      }
    } else {
      // Original single-content path (streaming or non-displayParts messages)
      const visibleContent = getVisibleAssistantContent(msg.content || '', msg._streaming);
      const contentHTML = msg._streaming
        ? renderContentFast(visibleContent)
        : renderMarkdown(visibleContent);
      html += '<div class="message-content">' + contentHTML + '</div>';
    }

    if (msg._sceneFinalizing) {
      html += '<div class="scene-finalizing-hint">整理剧情走向…</div>';
    }

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

    // Post-response action buttons — always show for completed assistant messages
    if (!msg._streaming) {
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
      // Repair broken assistant messages that have _showActions but no valid directions
      if (msg._showActions && !msg._streaming && (!msg.sceneSnapshot || !msg.sceneSnapshot.directions || parseDirectionOptions(msg.sceneSnapshot.directions).length < 4)) {
        var fallbackSS = findPreviousSceneSnapshotForRender(index);
        if (fallbackSS && fallbackSS.directions && parseDirectionOptions(fallbackSS.directions).length >= 4) {
          msg.sceneSnapshot = createSceneState(fallbackSS);
        }
      }
      const roleLabel = 'AI';
      const bubbleClass = msg._streaming ? 'message-bubble streaming-cursor' : 'message-bubble';
      div.innerHTML = '<div class="message-role">' + roleLabel + '</div><div class="' + bubbleClass + '">' + renderBubbleHTML(msg, index) + '</div>';
    } else {
      const roleLabel = 'You';
      div.innerHTML = '<div class="message-role">' + roleLabel + '</div><div class="message-bubble">' + renderMarkdown(String(msg.displayContent || msg.content || '')) + '</div>';
    }

    return div;
  }

  function animateBubbleIn(el) {
    // GSAP entrance for new message bubbles — single source of truth.
    // Degrades gracefully if GSAP isn't loaded.
    // Respects user's reduced-motion preference.
    if (typeof gsap === 'undefined' || !el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var bubble = el.querySelector('.message-bubble');
    if (!bubble) return;
    var isUser = el.classList.contains('user');
    gsap.from(bubble, {
      opacity: 0,
      y: isUser ? 8 : 12,
      scale: 0.97,
      duration: 0.28,
      ease: 'expo.out',
      overwrite: 'auto',
      clearProps: 'transform,opacity'
    });
  }

  function updateLastBubble(msg) {
    // Walk backwards from last child to find the nearest .message element — O(1) near
    var lastItem = dom.messagesContainer.lastElementChild;
    while (lastItem && !lastItem.classList.contains('message')) {
      lastItem = lastItem.previousElementSibling;
    }
    if (!lastItem) return;
    var bubble = lastItem.querySelector('.message-bubble');
    if (!bubble) return;

    var conv = getCurrentConv();
    var msgIndex = conv && Array.isArray(conv.messages)
      ? conv.messages.indexOf(msg)
      : parseInt(lastItem.dataset.index, 10);

    if (msg._streaming) {
      // ---- Content incremental render ----
      var visibleText = getVisibleAssistantContent(msg.content || '', true);
      var prevVisible = msg._lastRenderedVisibleText || '';

      var contentDiv = bubble.querySelector('.message-content');
      if (!contentDiv && visibleText) {
        // First time content appears — need full rebuild
        bubble.innerHTML = renderBubbleHTML(msg, msgIndex);
        msg._lastRenderedVisibleText = visibleText;
        msg._lastRenderedReasoningText = msg.reasoning || '';
      } else if (contentDiv && visibleText !== prevVisible) {
        if (visibleText.indexOf(prevVisible) === 0) {
          // Normal streaming: append only the delta
          appendFastText(contentDiv, visibleText.slice(prevVisible.length));
        } else {
          // Fallback: visible text diverged (e.g. SCENE tag stripped mid-stream)
          contentDiv.innerHTML = renderContentFast(visibleText);
        }
        msg._lastRenderedVisibleText = visibleText;
      }

      // ---- Reasoning incremental render ----
      var reasoning = msg.reasoning || '';
      var prevReasoning = msg._lastRenderedReasoningText || '';

      if (reasoning !== prevReasoning) {
        var thinkDiv = bubble.querySelector('.thinking-content');
        var details = bubble.querySelector('.thinking-section');

        if (!thinkDiv && reasoning) {
          // First reasoning chunk — need full rebuild to create thinking section
          bubble.innerHTML = renderBubbleHTML(msg, msgIndex);
          msg._lastRenderedVisibleText = visibleText;
        } else if (thinkDiv && reasoning.indexOf(prevReasoning) === 0) {
          // Normal streaming: append only the delta
          appendFastText(thinkDiv, reasoning.slice(prevReasoning.length));
        } else if (thinkDiv) {
          // Fallback: reasoning diverged
          thinkDiv.innerHTML = renderContentFast(reasoning);
        }

        if (details) details.open = true;
        msg._lastRenderedReasoningText = reasoning;
      }

      bubble.classList.add('streaming-cursor');

      // Scene finalizing hint — show/hide as needed
      var hintDiv = bubble.querySelector('.scene-finalizing-hint');
      if (msg._sceneFinalizing) {
        if (!hintDiv) {
          hintDiv = document.createElement('div');
          hintDiv.className = 'scene-finalizing-hint';
          hintDiv.textContent = '整理剧情走向…';
          bubble.appendChild(hintDiv);
        }
      } else if (hintDiv) {
        hintDiv.remove();
      }
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

  // Measure actual bottom-bar height for accurate main-content reserve.
  // Coalesced via rAF so ResizeObserver / visualViewport bursts produce at most one
  // getBoundingClientRect + setProperty per frame, avoiding layout thrash.
  var _bbhPending = false;
  var _followScrollPending = false;
  function _updateBottomBarHeightImpl() {
    _bbhPending = false;
    var bar = document.querySelector('.bottom-bar');
    if (!bar) return;
    var h = Math.ceil(bar.getBoundingClientRect().height);
    var prev = document.documentElement.style.getPropertyValue('--bottom-bar-h');
    if (prev === h + 'px') return;
    document.documentElement.style.setProperty('--bottom-bar-h', h + 'px');
    // Keep user at bottom if they were near it before height changed
    if (prev && prev !== h + 'px' && state.ui.autoFollowStreaming) {
      ensureMessagesBottomSpacer();
      var sc = getScrollContainer();
      if (sc && isNearBottom(sc, 60)) {
        scheduleFollowScroll(60);
      }
    }
  }
  function updateBottomBarHeight() {
    if (_bbhPending) return;
    _bbhPending = true;
    requestAnimationFrame(_updateBottomBarHeightImpl);
  }

  function ensureMessagesBottomSpacer() {
    var spacer = document.getElementById('messagesBottomSpacer');
    if (!spacer && dom.messagesContainer) {
      spacer = document.createElement('div');
      spacer.id = 'messagesBottomSpacer';
      spacer.className = 'messages-bottom-spacer';
      dom.messagesContainer.appendChild(spacer);
    }
    // Always ensure spacer is the last child of messagesContainer
    if (spacer && dom.messagesContainer && spacer.parentNode === dom.messagesContainer) {
      if (dom.messagesContainer.lastElementChild !== spacer) {
        dom.messagesContainer.appendChild(spacer);
      }
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
    ensureMessagesBottomSpacer();
    var el = getScrollContainer();
    if (!el) return;
    var smooth = opts && opts.smooth;
    var force = opts && opts.force;

    if (!force && !state.ui.autoFollowStreaming) return;
    if (!force && !isNearBottom(el, 120)) return;

    state.ui.programmaticScroll = true;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      // Use native scrollend event, with 500ms fallback for older browsers
      var scrollEnded = false;
      var clearFlag = function() {
        if (scrollEnded) return;
        scrollEnded = true;
        state.ui.programmaticScroll = false;
      };
      if ('onscrollend' in el) {
        el.addEventListener('scrollend', clearFlag, { once: true });
      }
      setTimeout(clearFlag, 500);
    } else {
      scheduleFollowScroll(force ? 0 : 120);
    }
  }

  function scheduleFollowScroll(threshold) {
    if (_followScrollPending) return;
    _followScrollPending = true;
    requestAnimationFrame(function() {
      _followScrollPending = false;
      var el = getScrollContainer();
      if (!el) return;
      if (threshold && !isNearBottom(el, threshold)) {
        state.ui.programmaticScroll = false;
        return;
      }
      el.scrollTop = el.scrollHeight;
      requestAnimationFrame(function() { state.ui.programmaticScroll = false; });
    });
  }

  function scrollToBottom(force) {
    scrollToBottomIfNeeded({ force: !!force });
  }

  function preserveScrollPosition(fn) {
    var el = getScrollContainer();
    if (!el) { fn(); return; }
    var beforeTop = el.scrollTop;
    // Detect whether the user was following the bottom before we mutate the DOM.
    // If they were, we keep them at the new bottom after the mutation so that
    // the scroll event handler (onUserScrollIntent) does not falsely flag them
    // as detached — which would suppress all streaming renders.
    var wasNearBottom = isNearBottom(el, 80);
    fn();
    // Mark scroll as programmatic so onUserScrollIntent ignores scroll events
    // triggered by our own scrollTop restoration. Without this, the preserved
    // position may be far enough from the new bottom that the detector falsely
    // enters detachedDuringStreaming mode, suppressing all streaming renders
    // until the response completes.
    state.ui.programmaticScroll = true;
    if (wasNearBottom) {
      // User was following the bottom — keep them at the new bottom so they
      // don't get falsely flagged as detached when streaming begins.
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTop = beforeTop;
    }
    requestAnimationFrame(function() {
      if (wasNearBottom) {
        el.scrollTop = el.scrollHeight;
      } else {
        el.scrollTop = beforeTop;
      }
      // Clear the flag after the rAF-delayed restoration has also fired —
      // the scroll event it triggers will be handled before the next rAF.
      requestAnimationFrame(function() { state.ui.programmaticScroll = false; });
    });
  }

  function checkUserScroll() {
    // Handled by the scroll/wheel/touch listeners below
  }

  // User scroll detection: pause auto-follow when user scrolls away.
  // Auto-follow is ONLY restored via explicit button click or new message send.
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
      // User scrolled back near bottom — clear detached state so streaming
      // resumes normal rendering with auto-follow.
      if (state.isStreaming && state.ui.detachedDuringStreaming) {
        state.ui.detachedDuringStreaming = false;
        state.ui.autoFollowStreaming = true;
      }
      updateScrollToBottomButton(false);
    }
  }

  function updateScrollToBottomButton(showIntent) {
    var btn = document.getElementById('scrollToBottomBtn');
    var el = getScrollContainer();

    // Button is visible when explicit showIntent or user scrolled away
    var shouldShow = showIntent ||
      (!state.ui.autoFollowStreaming && !isNearBottom(el, 80));

    if (!shouldShow) {
      if (btn) {
        btn.classList.remove('show');
        btn.setAttribute('aria-hidden', 'true');
      }
      return;
    }

    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'scrollToBottomBtn';
      btn.setAttribute('aria-label', '到达最新正文');
      btn.setAttribute('title', '到达最新正文');
      btn.setAttribute('aria-hidden', 'true');
      btn.addEventListener('click', function() {
        state.ui.detachedDuringStreaming = false;
        state.ui.detachedContentDirty = false;
        state.ui.autoFollowStreaming = true;
        state.ui.userScrolling = false;
        state.ui.programmaticScroll = true;

        try {
          var sc = getScrollContainer();
          if (sc) {
            // Use instant scrollTop instead of smooth scrollTo to avoid
            // intermediate scroll events racing with programmaticScroll cleanup
            sc.scrollTop = sc.scrollHeight;
          }
        } finally {
          // Double-rAF lets scroll events from scrollTop settle before
          // we clear programmaticScroll, preventing the flag from being
          // prematurely cleared by the smooth-scroll race
          requestAnimationFrame(function() {
            requestAnimationFrame(function() {
              state.ui.programmaticScroll = false;
            });
          });
          updateScrollToBottomButton(false);
        }
      });
      document.body.appendChild(btn);
    }

    btn.classList.add('show');
    btn.removeAttribute('aria-hidden');
  }

  // Reset all scroll-follow / detached-streaming flags at the start of a new request.
  // Prevents state leakage from a previous turn where the user scrolled away
  // during streaming — without this reset, the next stream silently skips all
  // updateLastBubble calls and the user sees nothing.
  function resetStreamFollowState() {
    state.ui.autoFollowStreaming = true;
    state.ui.userScrolling = false;
    state.ui.detachedDuringStreaming = false;
    state.ui.detachedContentDirty = false;
    updateScrollToBottomButton(false);
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
    if (dom.inputReplyCharLimit) dom.inputReplyCharLimit.value = conv.replyCharLimit || DEFAULTS.replyCharLimit;
    dom.inputStream.checked = conv.stream;
    dom.inputCaching.checked = conv.enableCaching !== false;
    dom.inputPreciseMode.checked = !!conv.preciseMode;
    if (dom.inputStoryMode) dom.inputStoryMode.checked = isStoryEnabled(conv);
    dom.inputAutoCompress.checked = !!conv.autoCompress;
    dom.inputKeepThinking.checked = conv.keepThinkingOpen !== false;
    if (dom.inputSceneDetail) dom.inputSceneDetail.value = conv.sceneDetailLevel || 'medium';
    if (dom.selectStoryAuxProvider) dom.selectStoryAuxProvider.value = conv.storyAuxProvider || DEFAULTS.storyAuxProvider;
    if (dom.inputStoryAuxApiKey) dom.inputStoryAuxApiKey.value = conv.storyAuxApiKey || '';
    if (dom.selectStoryAuxModel && dom.inputStoryAuxModel) {
      var auxModel = conv.storyAuxModel || '';
      var presetOpts = dom.selectStoryAuxModel.querySelectorAll('option');
      var found = false;
      var customRow = document.getElementById('storyAuxCustomRow');
      for (var oi = 0; oi < presetOpts.length; oi++) {
        if (presetOpts[oi].value === auxModel && presetOpts[oi].value !== '__custom__') {
          dom.selectStoryAuxModel.value = auxModel;
          dom.inputStoryAuxModel.value = '';
          if (customRow) customRow.hidden = true;
          found = true;
          break;
        }
      }
      if (!found) {
        dom.selectStoryAuxModel.value = auxModel ? '__custom__' : '';
        dom.inputStoryAuxModel.value = auxModel;
        if (customRow) customRow.hidden = !auxModel;
      }
    }
    if (dom.inputStoryAuxMaxTokens) dom.inputStoryAuxMaxTokens.value = conv.storyAuxMaxTokens || DEFAULTS.storyAuxMaxTokens;
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

    // Sync auth UI when settings opens
    syncAuthUI();
  }

  function syncSettingsFromUI() {
    const conv = getCurrentConv();
    if (!conv) return;

    const newProvider = dom.selectProvider.value;
    const providerChanged = newProvider !== conv.provider;
    const previousProvider = conv.provider;

    // When provider changes, save current input ONLY to the OLD provider
    // before switching — but only if the input is non-empty, to prevent
    // empty inputs during panel init from overwriting a saved key.
    // (Intentional clears are handled by the input event, not this branch.)
    if (providerChanged && dom.inputApiKey.value.trim()) {
      state.apiKeys[previousProvider] = dom.inputApiKey.value.trim();
    }

    conv.provider = newProvider;
    conv.customModel = dom.inputCustomModel.value.trim();
    conv.systemPrompt = dom.inputSystemPrompt.value;
    conv.temperature = parseFloat(dom.inputTemperature.value) || DEFAULTS.temperature;
    conv.topP = parseFloat(dom.inputTopP.value) || DEFAULTS.topP;
    conv.maxTokens = parseInt(dom.inputMaxTokens.value, 10) || DEFAULTS.maxTokens;
    conv.replyCharLimit = parseInt(dom.inputReplyCharLimit.value, 10) || DEFAULTS.replyCharLimit;
    conv.stream = dom.inputStream.checked;
    conv.enableCaching = dom.inputCaching.checked;
    conv.storyMode = conv.storyMode || createStoryMode();
    conv.storyMode.enabled = dom.inputStoryMode.checked;
    syncStoryModeToLegacy(conv);
    conv.autoCompress = dom.inputAutoCompress.checked;
    conv.keepThinkingOpen = dom.inputKeepThinking.checked;
    if (dom.inputSceneDetail) conv.sceneDetailLevel = dom.inputSceneDetail.value;
    if (dom.selectStoryAuxProvider) conv.storyAuxProvider = dom.selectStoryAuxProvider.value;
    if (dom.inputStoryAuxApiKey) conv.storyAuxApiKey = dom.inputStoryAuxApiKey.value.trim();
    if (dom.selectStoryAuxModel) {
      var selVal = dom.selectStoryAuxModel.value;
      if (selVal === '__custom__' && dom.inputStoryAuxModel) {
        conv.storyAuxModel = dom.inputStoryAuxModel.value.trim();
      } else {
        conv.storyAuxModel = selVal;
      }
    }
    if (dom.inputStoryAuxMaxTokens) conv.storyAuxMaxTokens = parseInt(dom.inputStoryAuxMaxTokens.value, 10) || DEFAULTS.storyAuxMaxTokens;
    const prevPrecise = conv.preciseMode;
    conv.preciseMode = dom.inputPreciseMode.checked;
    if (conv.preciseMode && !prevPrecise) {
      conv._savedTemperature = conv.temperature;
      conv.temperature = 0.2;
    } else if (!conv.preciseMode && prevPrecise) {
      conv.temperature = conv._savedTemperature !== undefined && conv._savedTemperature !== null ? conv._savedTemperature : DEFAULTS.temperature;
      conv._savedTemperature = undefined;
    }
    dom.inputTemperature.value = String(conv.temperature);
    dom.tempVal.textContent = conv.temperature;
    conv.toolCallLimit = 0;
    conv.toolCallLimitMode = 'disabled';

    // API key: save to current provider only when provider hasn't changed.
    // When provider changed, load the new provider's saved key instead.
    if (providerChanged) {
      updateApiKeyField();
    } else {
      state.apiKeys[conv.provider] = dom.inputApiKey.value.trim();
    }

    if (providerChanged) {
      conv.model = '';
      conv.customModel = '';
      dom.selectModel.value = '';
      dom.inputCustomModel.value = '';
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
    dom.apiKeyHint.textContent = '在 ' + pConf.name + ' 平台获取，仅保存在当前浏览器/设备；GitHub 同步不会同步密钥，手机端首次使用需填写一次';
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

  /* ===== Theme System ===== */

  function themeColors(accentHex) {
    const r = parseInt(accentHex.slice(1,3), 16), g = parseInt(accentHex.slice(3,5), 16), b = parseInt(accentHex.slice(5,7), 16);
    const br = Math.min(255, r + 45).toString(16).padStart(2,'0');
    const bgc = Math.min(255, g + 45).toString(16).padStart(2,'0');
    const bb2 = Math.min(255, b + 45).toString(16).padStart(2,'0');
    return {
      accent: accentHex,
      accentBright: '#' + br + bgc + bb2,
      accentSoft: 'rgba(' + r + ',' + g + ',' + b + ',0.16)',
      accentGlow: 'rgba(' + r + ',' + g + ',' + b + ',0.12)',
      hairline: 'rgba(' + Math.floor(r*0.15+24) + ',' + Math.floor(g*0.15+24) + ',' + Math.floor(b*0.15+24) + ',0.10)',
      borderField: 'rgba(' + Math.floor(r*0.2+24) + ',' + Math.floor(g*0.2+24) + ',' + Math.floor(b*0.2+24) + ',0.14)',
      surfaceGlass: 'rgba(' + Math.floor(r*0.06+22) + ',' + Math.floor(g*0.06+22) + ',' + Math.floor(b*0.06+22) + ',0.72)',
      surfaceGlassStrong: 'rgba(' + Math.floor(r*0.08+22) + ',' + Math.floor(g*0.08+22) + ',' + Math.floor(b*0.08+22) + ',0.88)',
      topBarGlass: 'rgba(' + Math.floor(r*0.05+20) + ',' + Math.floor(g*0.05+20) + ',' + Math.floor(b*0.05+20) + ',0.48)',
      topBarGlassStrong: 'rgba(' + Math.floor(r*0.07+20) + ',' + Math.floor(g*0.07+20) + ',' + Math.floor(b*0.07+20) + ',0.76)',
      userBubble: '#' + Math.floor(r*0.18+15).toString(16).padStart(2,'0') + Math.floor(g*0.18+15).toString(16).padStart(2,'0') + Math.floor(b*0.18+15).toString(16).padStart(2,'0'),
      splashTint: 'rgba(' + r + ',' + g + ',' + b + ',0.06)',
    };
  }

  const CHARACTER_THEMES = {
    // 原神
    'raiden': { name:'雷电将军', game:'原神', wallpaper:'bg/raiden.jpg', gradient:'', ...themeColors('#b870f0') },
    'eula': { name:'优菈', game:'原神', wallpaper:'bg/eula.gif', gradient:'', ...themeColors('#88c0e8') },
    // 星穹铁道
    'firefly': { name:'流萤', game:'星穹铁道', wallpaper:'bg/firefly.jpg', gradient:'', ...themeColors('#70d0a8') },
    'acheron': { name:'黄泉', game:'星穹铁道', wallpaper:'bg/acheron.gif', gradient:'', ...themeColors('#c87080') },
    'jingliu': { name:'镜流', game:'星穹铁道', wallpaper:'bg/jingliu.jpg', gradient:'', ...themeColors('#a0c8f0') },
    'yaoguang': { name:'爻光', game:'星穹铁道', wallpaper:'bg/yaoguang.jpg', gradient:'', ...themeColors('#e0b860') },
    'xilian': { name:'昔涟', game:'星穹铁道', wallpaper:'bg/xilian.jpg', gradient:'', ...themeColors('#80c0e0') },
    'dahlia': { name:'大丽花', game:'星穹铁道', wallpaper:'bg/dahlia.jpg', gradient:'linear-gradient(150deg,#3a1018 0%,#5a1828 25%,#802040 50%,#2a1020 75%,#150d18 100%)', ...themeColors('#e85070') },
    'kafka': { name:'卡芙卡', game:'星穹铁道', wallpaper:'bg/kafka.jpg', gradient:'', ...themeColors('#e068a0') },
    // 绝区零
    'yixuan': { name:'仪玄', game:'绝区零', wallpaper:'bg/yixuan.jpg', gradient:'linear-gradient(150deg,#0a1820 0%,#102838 25%,#184860 55%,#0d2835 80%,#081520 100%)', ...themeColors('#40b8c8') },
    'miyabi': { name:'星见雅', game:'绝区零', wallpaper:'bg/miyabi.jpg', gradient:'linear-gradient(150deg,#0f1028 0%,#181840 25%,#202060 50%,#181838 75%,#0d0d20 100%)', ...themeColors('#8890d8') },
    'yeshunguang': { name:'叶舜光', game:'绝区零', wallpaper:'bg/yeshunguang.gif', gradient:'linear-gradient(150deg,#201810 0%,#382818 25%,#504828 50%,#1a1510 75%,#0d0a08 100%)', ...themeColors('#c8a850') },
    // 崩坏3
    'elysia': { name:'爱莉希雅', game:'崩坏3', wallpaper:'bg/elysia.jpg', gradient:'', ...themeColors('#f0a0b8') },
    'rita': { name:'丽塔', game:'崩坏3', wallpaper:'bg/rita.jpg', gradient:'', ...themeColors('#e84868') },
    'fuhua': { name:'符华', game:'崩坏3', wallpaper:'bg/fuhua.jpg', gradient:'linear-gradient(150deg,#f0d8c0 0%,#e0a868 25%,#c87040 50%,#503028 80%,#281820 100%)', ...themeColors('#f0a060') },
    'sakura-b3': { name:'八重樱', game:'崩坏3', wallpaper:'bg/sakura-b3.jpg', gradient:'', ...themeColors('#f0a8b8') },
    'hot': { name:'雷之律者', game:'崩坏3', wallpaper:'bg/hot.gif', gradient:'', ...themeColors('#a060e0') },
    'hov': { name:'空之律者', game:'崩坏3', wallpaper:'bg/hov.jpg', gradient:'', ...themeColors('#d8b8e8') },
    'sushang': { name:'李素裳', game:'崩坏3', wallpaper:'bg/sushang.jpg', gradient:'', ...themeColors('#80b8d8') },


  };

  function applyTheme(themeKey) {
    const t = CHARACTER_THEMES[themeKey];
    if (!t) return;
    state.activeTheme = themeKey;
    const html = document.documentElement;
    html.dataset.theme = themeKey;
    const s = html.style;
    s.setProperty('--theme-accent', t.accent);
    s.setProperty('--theme-accent-bright', t.accentBright);
    s.setProperty('--theme-accent-soft', t.accentSoft);
    s.setProperty('--theme-accent-glow', t.accentGlow);
    s.setProperty('--theme-hairline', t.hairline);
    s.setProperty('--theme-border-field', t.borderField);
    s.setProperty('--theme-surface-glass', t.surfaceGlass);
    s.setProperty('--theme-surface-glass-strong', t.surfaceGlassStrong);
    s.setProperty('--theme-top-bar-glass', t.topBarGlass);
    s.setProperty('--theme-top-bar-glass-strong', t.topBarGlassStrong);
    s.setProperty('--theme-user-bubble', t.userBubble);
    s.setProperty('--splash-accent', t.accent);
    s.setProperty('--splash-accent2', t.accentBright);
    s.setProperty('--splash-tint', t.splashTint);
    if (t.wallpaper) {
      s.setProperty('--splash-wallpaper', 'url(' + t.wallpaper + ')');
      setChatBackground('url', t.wallpaper, t.accent, t.accentBright);
    } else if (t.gradient) {
      s.removeProperty('--splash-wallpaper');
      setChatBackground('gradient', t.gradient, t.accent, t.accentBright);
    }
  }

  function clearTheme() {
    state.activeTheme = '';
    const html = document.documentElement;
    delete html.dataset.theme;
    const s = html.style;
    s.removeProperty('--theme-accent'); s.removeProperty('--theme-accent-bright');
    s.removeProperty('--theme-accent-soft'); s.removeProperty('--theme-accent-glow');
    s.removeProperty('--theme-hairline'); s.removeProperty('--theme-border-field');
    s.removeProperty('--theme-surface-glass'); s.removeProperty('--theme-surface-glass-strong');
    s.removeProperty('--theme-top-bar-glass'); s.removeProperty('--theme-top-bar-glass-strong');
    s.removeProperty('--theme-user-bubble');
    s.removeProperty('--splash-accent'); s.removeProperty('--splash-accent2');
    s.removeProperty('--splash-tint'); s.removeProperty('--splash-wallpaper');
    setChatBackground('none', '');
  }

  /* ===== End Theme System ===== */

  function applyChatBackground() {
    const bg = state.chatBackground || { type: 'none', value: '', opacity: 35 };
    const overlay = dom.chatBgOverlay;

    document.documentElement.style.setProperty('--bg-opacity', (bg.opacity / 100));

    // Crossfade: fade out → swap background → fade in
    overlay.style.opacity = '0';
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        if (bg.type === 'none') {
          overlay.style.backgroundImage = '';
          overlay.style.display = 'none';
          overlay.style.backgroundSize = '';
          overlay.style.backgroundPosition = '';
          document.documentElement.classList.remove('has-custom-bg');
          document.documentElement.style.removeProperty('--splash-accent');
          document.documentElement.style.removeProperty('--splash-accent2');
        } else if (bg.type === 'gradient') {
          overlay.style.backgroundImage = bg.value;
          overlay.style.display = '';
          overlay.style.backgroundSize = '';
          overlay.style.backgroundPosition = '';
          document.documentElement.classList.remove('has-custom-bg');
          applyBgSplashTheme(bg);
          applyBgControls();
        } else if ((bg.type === 'url' || bg.type === 'image') && bg.value) {
          overlay.style.backgroundImage = 'url(' + bg.value + ')';
          overlay.style.backgroundSize = 'cover';
          overlay.style.display = '';
          document.documentElement.classList.add('has-custom-bg');
          applyBgSplashTheme(bg);
          applyBgControls();
        }
        overlay.style.opacity = '';
      });
    });
  }

  function applyBgSplashTheme(bg) {
    var accent = bg.accent || '';
    var accent2 = bg.accent2 || '';
    if (accent) document.documentElement.style.setProperty('--splash-accent', accent);
    else document.documentElement.style.removeProperty('--splash-accent');
    if (accent2) document.documentElement.style.setProperty('--splash-accent2', accent2);
    else document.documentElement.style.removeProperty('--splash-accent2');
  }

  function bgOverride(key, def) {
    return state.themeOverrides[state.activeTheme] && state.themeOverrides[state.activeTheme][key] != null
      ? state.themeOverrides[state.activeTheme][key] : def;
  }

  function applyBgControls() {
    var s = document.documentElement.style;
    var scale = state.activeTheme ? bgOverride('scale', 100) : (state.chatBackground.scale || 100);
    var posX = state.activeTheme ? bgOverride('posX', 50) : (state.chatBackground.posX || 50);
    var posY = state.activeTheme ? bgOverride('posY', 50) : (state.chatBackground.posY || 50);
    var brightness = state.activeTheme ? bgOverride('brightness', 100) : (state.chatBackground.brightness || 100);
    s.setProperty('--bg-scale', scale / 100);
    s.setProperty('--bg-pos-x', posX + '%');
    s.setProperty('--bg-pos-y', posY + '%');
    s.setProperty('--bg-brightness', brightness / 100);
    s.setProperty('--input-opacity', (state.chatBackground.inputOpacity || 100) / 100);
    s.setProperty('--bubble-opacity', (state.chatBackground.bubbleOpacity || 100) / 100);
  }

  function setChatBackground(type, value, accent, accent2) {
    state.chatBackground.type = type;
    state.chatBackground.value = value || '';
    state.chatBackground.accent = accent || '';
    state.chatBackground.accent2 = accent2 || '';
    applyChatBackground();
    saveToStorage();
    updateBgPresetUI();
  }

  function setupBgPresetLabels() {
    // Run once: wrap each bg-preset button with a label container + swap to thumbnails
    if (document.getElementById('bg-presets-labeled')) return;
    var presets = dom.bgPresets.querySelectorAll('.bg-preset');
    presets.forEach(function(btn) {
      var wrap = document.createElement('div');
      wrap.className = 'bg-preset-wrap';
      btn.parentNode.insertBefore(wrap, btn);
      wrap.appendChild(btn);
      var label = document.createElement('span');
      label.className = 'bg-preset-label';
      label.textContent = btn.getAttribute('aria-label') || '';
      wrap.appendChild(label);
    });
    dom.bgPresets.id = 'bg-presets-labeled';
  }

  function updateBgPresetUI() {
    const bg = state.chatBackground;
    dom.inputBgOpacity.value = bg.opacity || 35;
    if (dom.inputBgScale) dom.inputBgScale.value = bg.scale || 100;
    if (dom.inputBgPosX) dom.inputBgPosX.value = bg.posX || 50;
    if (dom.inputBgPosY) dom.inputBgPosY.value = bg.posY || 50;
    dom.inputBgBrightness.value = state.activeTheme ? bgOverride('brightness', 100) : (bg.brightness || 100);
    dom.inputUIOpacity.value = bg.inputOpacity || 100;
    dom.inputBubbleOpacity.value = bg.bubbleOpacity || 100;
    // Update active preset button
    const activeTheme = document.documentElement.dataset.theme || '';
    const presets = dom.bgPresets.querySelectorAll('.bg-preset');
    presets.forEach((btn) => {
      const btnTheme = btn.dataset.theme || '';
      if (activeTheme && btnTheme === activeTheme) {
        btn.classList.add('active');
      } else if (!activeTheme && btnTheme === 'none') {
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
  // callChatModel — reusable Chat Completions API call
  // =========================================================================

  async function callChatModel(conv, model, messages, opts) {
    opts = opts || {};
    var provider = opts.provider || conv.provider;
    var stream = opts.stream !== undefined ? opts.stream : (conv.stream !== false);
    var maxTokens = opts.maxTokens || conv.maxTokens;
    var signal = opts.signal || (state.abortController ? state.abortController.signal : null);

    var pConf = getProviderConfig(provider);
    var apiKey = opts.apiKey || getApiKey(provider);
    if (!apiKey) throw new Error(ERR_MSGS.noApiKey + ' (' + provider + ')');
    if (!pConf.apiUrl) throw new Error('Provider ' + provider + ' has no API URL');

    var reqConv = Object.assign({}, conv, { stream: stream, maxTokens: maxTokens });
    if (opts.temperature !== undefined) reqConv.temperature = opts.temperature;
    var headers = buildRequestHeaders(provider, apiKey, reqConv);
    var body = buildRequestBody(reqConv, model, messages, opts.responseFormat);

    var resp = await fetch(pConf.apiUrl, {
      method: 'POST', headers: headers, body: JSON.stringify(body), signal: signal,
    });

    if (!resp.ok) {
      var errText = ''; try { errText = await resp.text(); } catch (_) {}
      if (resp.status === 401) throw new Error(ERR_MSGS.unauthorized);
      if (resp.status === 429) throw new Error(ERR_MSGS.rateLimited);
      if (resp.status === 402) throw new Error(ERR_MSGS.insufficientBalance);
      if (resp.status === 400 && /model/i.test(errText)) throw new Error(ERR_MSGS.modelNotFound);
      if (resp.status === 400 && /max_tokens|context|length|too long/i.test(errText)) throw new Error('上下文或 Max Tokens 超出限制。');
      throw new Error(ERR_MSGS.serverError + ' (' + provider + ' ' + resp.status + ')');
    }

    if (stream) return resp; // Caller must handle processStream

    var data = await resp.json();
    return parseNonStreamResponse(provider, data);
  }

  // =========================================================================
  // STORY AUX MODEL — build messages and parse JSON response
  // =========================================================================

  function buildAuxMessages(conv, storyContent) {
    var prev = conv.sceneState || {};
    var prevState = {
      currentRole: prev.currentRole || '',
      currentGoal: prev.currentGoal || '',
      posture: prev.posture || '',
      mental: prev.mental || '',
      mentalScore: prev.mentalScore || '',
      physical: prev.physical || '',
      bodyDetails: prev.bodyDetails || '',
      plot: prev.plot || '',
      risk: prev.risk || '',
      innerVoice: prev.innerVoice || '',
      previousDirections: prev.directions || '',
    };
    var auxSystemPrompt = [
      '你是一个剧情状态解析器。根据用户输入的剧情正文以及之前的剧情状态，输出更新后的 JSON 状态。',
      '',
      '输出格式为严格的 JSON（不要包含```json或任何其他markdown标记）：',
      '{',
      '  "currentRole": "当前主视角角色名",',
      '  "currentGoal": "当前目标（一句话）",',
      '  "posture": "当前姿势/位置",',
      '  "mental": "精神状态描述，含具体触发原因",',
      '  "mentalScore": "1-10整数评分",',
      '  "physical": "身体状态一句话",',
      '  "bodyDetails": "身体细节（可用\\n分隔多条，每条有具体可感知的细节）",',
      '  "plot": "1-2句剧情总结",',
      '  "risk": "隐藏风险或伏笔（1句）",',
      '  "innerVoice": "内心独白（1句，可空）",',
      '  "directions": "A. 行动+可能后果，16-32字\\nB. 行动+可能后果，16-32字\\nC. 行动+可能后果，16-32字\\nD. 行动+可能后果，16-32字",',
      '  "characterStatuses": [{',
      '    "name": "角色名",',
      '    "relation": "主角/NPC等",',
      '    "isMain": true,',
      '    "mental": "精神状态",',
      '    "mentalScore": "1-10",',
      '    "physical": "身体状态",',
      '    "bodyDetails": "身体细节",',
      '    "goal": "当前目标",',
      '    "posture": "姿势",',
      '    "innerVoice": "内心独白"',
      '  }]',
      '}',
      '',
      '要求：',
      '- 4 个剧情走向都必须输出，每条用 A./B./C./D. 开头，16-32字',
      '- 每条走向必须包含行动+可能后果/风险/情绪变化',
      '- 禁止"继续深入调查""暂时退一步观察"等泛化模板',
      '- characterStatuses 至少包含主角',
      '- 精神状态要有具体触发原因，如"因听见脚步声而警觉升高"',
      '- 身体细节要具体可感知：呼吸、肌肉、视线等',
      '\n请严格按照上述 JSON 格式输出。',
    ].join('\n');

    return [
      { role: 'system', content: auxSystemPrompt },
      { role: 'user', content: JSON.stringify({ story: storyContent, previousState: prevState }) },
    ];
  }

  // Stricter variant for retry: emphasise full JSON with ≥4 A/B/C/D directions + ≥1 characterStatuses
  function buildAuxMessagesStrict(conv, storyContent) {
    var msgs = buildAuxMessages(conv, storyContent);
    var strictPrefix = [
      '【重要】你必须输出完整 JSON，禁止省略任何字段。',
      '必须包含 4 条 A./B./C./D. 剧情走向（每条 16-32 字，含行动+后果）。',
      '必须包含至少 1 个 characterStatuses 条目。',
      '只输出纯 JSON，不要任何解释、markdown、或额外文本。',
      '',
    ].join('\n');
    msgs[0].content = strictPrefix + msgs[0].content;
    return msgs;
  }

  function normalizeAuxDirections(raw) {
    if (!raw) return '';
    var result = '';
    if (typeof raw === 'string') {
      result = raw;
    } else if (Array.isArray(raw)) {
      result = raw.map(function(item, idx) {
        if (item == null) return '';
        if (typeof item === 'object') {
          return (item.letter || ['A', 'B', 'C', 'D'][idx] || '') + '. ' + (item.content || item.text || item.label || item.action || item.value || item.title || item.name || '');
        }
        return (['A', 'B', 'C', 'D'][idx] || '') + '. ' + String(item);
      }).filter(Boolean).join('\n');
    } else if (typeof raw === 'object') {
      result = ['A', 'B', 'C', 'D'].map(function(letter) {
        var item = raw[letter] || raw[letter.toLowerCase()];
        if (!item) return '';
        if (typeof item === 'object') item = item.content || item.text || item.label || item.action || item.value || item.title || item.name || '';
        return letter + '. ' + item;
      }).filter(Boolean).join('\n');
    } else {
      result = String(raw);
    }
    // Normalize fullwidth letters and other Unicode variants
    result = result
      .replace(/\r/g, '\n')
      .replace(/[Ａａ]/g, 'A')
      .replace(/[Ｂｂ]/g, 'B')
      .replace(/[Ｃｃ]/g, 'C')
      .replace(/[Ｄｄ]/g, 'D')
      .replace(/、/g, '. ');
    return result;
  }

  function normalizeAuxCharacterStatuses(data) {
    var raw = data.characterStatuses || data.characters || data.characterStatus || data.roles || data.statuses || [];
    // Convert object-valued map (e.g. {"主角": {...}, "NPC": {...}}) to array
    if (raw && !Array.isArray(raw) && typeof raw === 'object') {
      var mapKeys = Object.keys(raw);
      var mapped = [];
      for (var mk = 0; mk < mapKeys.length; mk++) {
        var val = raw[mapKeys[mk]];
        if (val && typeof val === 'object') {
          val.name = val.name || mapKeys[mk];
          mapped.push(val);
        } else if (typeof val === 'string') {
          mapped.push({ name: mapKeys[mk], content: val });
        }
      }
      if (mapped.length) raw = mapped; else raw = [raw];
    }
    if (raw && !Array.isArray(raw)) raw = [raw];
    // Convert string elements to {name} objects, filter to objects only
    var statuses = [];
    if (Array.isArray(raw)) {
      for (var ri = 0; ri < raw.length; ri++) {
        var item = raw[ri];
        if (!item) continue;
        if (typeof item === 'string') {
          statuses.push({ name: item, relation: '', isMain: false });
        } else if (typeof item === 'object') {
          statuses.push(item);
        }
      }
    }
    if (!statuses.length && (data.currentRole || data.mental || data.physical || data.bodyDetails || data.currentGoal || data.posture || data.innerVoice)) {
      statuses = [{
        name: data.currentRole || '主角',
        relation: '主角',
        isMain: true,
        mental: data.mental || '',
        mentalScore: data.mentalScore || '',
        physical: data.physical || '',
        bodyDetails: data.bodyDetails || '',
        goal: data.currentGoal || '',
        posture: data.posture || '',
        innerVoice: data.innerVoice || '',
      }];
    }
    return statuses;
  }

  function tryParseAuxResponse(text) {
    if (!text || typeof text !== 'string') return null;
    var jsonMatch = text.match(/\{[\s\S]*\}/);
    var jsonStr = jsonMatch ? jsonMatch[0] : text.trim();
    try {
      var data = JSON.parse(jsonStr);
      // Accept even if directions are missing — ensureStoryDirections fills them in.
      // Only require at least one meaningful field to consider it valid.
      var normalizedDirections = normalizeAuxDirections(data.directions);
      var normalizedCharacters = normalizeAuxCharacterStatuses(data);
      var dirs = normalizedDirections ? parseDirectionOptions(normalizedDirections) : [];
      var hasChars = normalizedCharacters.length > 0;
      var hasState = data.currentRole || data.mental || data.physical || data.plot;
      if (dirs.length < 4 && !hasChars && !hasState) return null;
      return {
        currentRole: data.currentRole || '',
        currentGoal: data.currentGoal || '',
        posture: data.posture || '',
        mental: data.mental || '',
        mentalScore: normalizeMentalScore(data.mentalScore),
        physical: data.physical || '',
        bodyDetails: data.bodyDetails || '',
        plot: data.plot || '',
        risk: data.risk || '',
        innerVoice: data.innerVoice || '',
        directions: normalizedDirections,
        characterStatuses: normalizedCharacters,
      };
    } catch (_) { return null; }
  }

  // validateAuxSceneState — require both ≥4 parseable directions AND ≥1 characterStatuses
  function validateAuxSceneState(parsed) {
    if (!parsed) return false;
    var dirLen = typeof parseDirectionOptions === 'function'
      ? parseDirectionOptions(parsed.directions).length
      : 0;
    var charLen = Array.isArray(parsed.characterStatuses) ? parsed.characterStatuses.length : 0;
    return dirLen >= 4 && charLen >= 1;
  }

  // =========================================================================
  // STORY MEMORY — background chapter memory updates
  // =========================================================================

  // Initialize per-conversation locks for story memory updates
  if (!state._storyMemoryLocks) state._storyMemoryLocks = {};

  function buildStoryMemoryAuxPrompt(conv, storyContent) {
    // Build a compact summary of existing storyMemory for the aux model
    var existingSummary = '';
    if (conv.storyMemory) {
      var sm = conv.storyMemory;
      if (sm.chapters && sm.chapters.length > 0) {
        var lastCh = sm.chapters[sm.chapters.length - 1];
        existingSummary += '已有章节数：' + sm.chapters.length;
        if (lastCh.title) existingSummary += '，上一章：' + lastCh.title;
        if (lastCh.summary) existingSummary += '，摘要：' + lastCh.summary.slice(0, 200);
        existingSummary += '\n';
      }
      if (sm.pinnedFacts && sm.pinnedFacts.length > 0) {
        existingSummary += '已有长期事实：\n' + sm.pinnedFacts.map(function(f) { return '- ' + f; }).join('\n') + '\n';
      }
      if (sm.unresolvedThreads && sm.unresolvedThreads.length > 0) {
        existingSummary += '已有未解决线索：\n' + sm.unresolvedThreads.map(function(t) { return '- ' + t; }).join('\n') + '\n';
      }
    }

    // Current scene state
    var ss = conv.sceneState || {};
    var sceneInfo = [
      '当前角色：' + (ss.currentRole || '未记录'),
      '当前目标：' + (ss.currentGoal || '未记录'),
      '精神：' + (ss.mental || '') + (ss.mentalScore ? ' (' + ss.mentalScore + '/10)' : ''),
      '剧情：' + (ss.plot || ''),
      '走向：' + (ss.directions || ''),
    ].join('\n');

    // Recent messages (last few user/assistant exchanges, truncated)
    var recentMsgs = '';
    if (conv.messages && conv.messages.length > 0) {
      var msgSlice = conv.messages.slice(Math.max(0, conv.messages.length - 8));
      for (var mi = 0; mi < msgSlice.length; mi++) {
        var m = msgSlice[mi];
        if (m.role === 'user' || m.role === 'assistant') {
          var label = m.role === 'user' ? '用户' : 'AI';
          recentMsgs += label + '：' + clipStr(m.content || '', 300) + '\n';
        }
      }
    }

    var prompt = [
      '你是一个剧情章节记忆管理器。根据已有记忆、当前场景状态、最近对话和刚生成的AI正文，输出更新后的章节记忆 JSON。',
      '',
      '输出格式为严格的 JSON（不要包含```json或任何markdown标记）：',
      '{',
      '  "chapter": {',
      '    "title": "本章标题（≤40字，概括本章主题）",',
      '    "summary": "本章摘要（≤600字，概括主要情节进展）",',
      '    "keyEvents": ["关键事件1", "关键事件2"],',
      '    "characterChanges": ["角色A的心态/状态变化"],',
      '    "relationshipChanges": ["角色A和B的关系变化"],',
      '    "unresolvedThreads": ["本章新产生/延续的未解决线索"]',
      '  },',
      '  "pinnedFacts": ["长期事实1", "长期事实2"],',
      '  "unresolvedThreads": ["当前所有未解决线索（合并去重）"]',
      '}',
      '',
      '要求：',
      '- 只总结稳定、长期有效的记忆，不要逐字复述正文。',
      '- 不要改写角色卡或世界观设定。',
      '- chapter.summary 要有实质情节进展，不能只有「继续冒险」「对话推进」。',
      '- keyEvents 每条 16-120 字，具体可回忆的事件。',
      '- characterChanges/relationshipChanges 只记录有意义的变化，没有就留空数组。',
      '- pinnedFacts 记录跨章节的重要事实（如「角色X的真实身份是Y」），不要记临时状态。',
      '- unresolvedThreads 记录尚未解决的主线/支线线索，已解决的不保留。',
      '- 如果本轮没有形成新章节（剧情进展不足），chapter 可以设 title/summary 为空字符串。',
      '',
      '已有记忆：',
      existingSummary || '（无已有记忆）',
      '',
      '当前场景状态：',
      sceneInfo,
      '',
      '最近对话：',
      recentMsgs,
      '',
      '刚生成的AI正文（最后2000字）：',
      (storyContent || '').slice(-2000),
      '',
      '请严格按照上述 JSON 格式输出。',
    ].join('\n');

    return [
      { role: 'user', content: prompt },
    ];
  }

  function tryParseStoryMemoryResponse(text) {
    if (!text || typeof text !== 'string') return null;
    var jsonMatch = text.match(/\{[\s\S]*\}/);
    var jsonStr = jsonMatch ? jsonMatch[0] : text.trim();
    try {
      var data = JSON.parse(jsonStr);
      // Require at least a chapter or some facts/threads
      var hasChapter = data.chapter && (data.chapter.title || data.chapter.summary || (data.chapter.keyEvents && data.chapter.keyEvents.length > 0));
      var hasFacts = data.pinnedFacts && data.pinnedFacts.length > 0;
      var hasThreads = data.unresolvedThreads && data.unresolvedThreads.length > 0;
      if (!hasChapter && !hasFacts && !hasThreads) return null;
      return data;
    } catch (_) { return null; }
  }

  function applyStoryMemoryUpdate(conv, result) {
    if (!conv || !result) return;
    if (!conv.storyMemory) conv.storyMemory = createStoryMemory();
    var sm = conv.storyMemory;

    // Append new chapter if it has meaningful content
    var ch = result.chapter;
    if (ch && (ch.title || ch.summary || (ch.keyEvents && ch.keyEvents.length > 0))) {
      var msgCount = conv.messages ? conv.messages.length : 0;
      var newChapter = createStoryChapter({
        id: generateId(),
        turnStart: (sm.lastMessageCount || 0),
        turnEnd: msgCount,
        title: ch.title || '',
        summary: ch.summary || '',
        keyEvents: ch.keyEvents || [],
        characterChanges: ch.characterChanges || [],
        relationshipChanges: ch.relationshipChanges || [],
        unresolvedThreads: ch.unresolvedThreads || [],
        createdAt: nowISO(),
      });
      sm.chapters.push(newChapter);
      // Keep last 12 chapters
      if (sm.chapters.length > 12) {
        sm.chapters = sm.chapters.slice(sm.chapters.length - 12);
      }
    }

    // Merge pinnedFacts — dedup by content similarity (simple prefix match)
    if (result.pinnedFacts && Array.isArray(result.pinnedFacts)) {
      var existingFacts = sm.pinnedFacts || [];
      for (var fi = 0; fi < result.pinnedFacts.length; fi++) {
        var fact = clipStr(result.pinnedFacts[fi], 120);
        if (!fact) continue;
        var isDuplicate = false;
        for (var ei = 0; ei < existingFacts.length; ei++) {
          if (existingFacts[ei].slice(0, 20) === fact.slice(0, 20)) { isDuplicate = true; break; }
        }
        if (!isDuplicate) {
          existingFacts.push(fact);
        }
      }
      // Keep max 12
      if (existingFacts.length > 12) existingFacts = existingFacts.slice(existingFacts.length - 12);
      sm.pinnedFacts = existingFacts;
    }

    // Replace unresolvedThreads with new merged list
    if (result.unresolvedThreads && Array.isArray(result.unresolvedThreads)) {
      var merged = clipStringArray(result.unresolvedThreads, 12, 160);
      // Also keep any old threads not in the new list (simple prefix dedup)
      var oldThreads = sm.unresolvedThreads || [];
      for (var oi = 0; oi < oldThreads.length && merged.length < 12; oi++) {
        var ot = oldThreads[oi];
        var otDup = false;
        for (var ni = 0; ni < merged.length; ni++) {
          if (merged[ni].slice(0, 20) === ot.slice(0, 20)) { otDup = true; break; }
        }
        if (!otDup) merged.push(clipStr(ot, 160));
      }
      sm.unresolvedThreads = merged.slice(0, 12);
    }

    sm.lastUpdatedAt = nowISO();
    sm.lastMessageCount = conv.messages ? conv.messages.length : 0;
    sm = normalizeStoryMemory(sm);
    conv.storyMemory = sm;
  }

  function scheduleLocalStoryMemoryUpdate(convId, fullContent) {
    if (!convId || !fullContent) return;
    var conv = null;
    for (var ci = 0; ci < state.conversations.length; ci++) {
      if (state.conversations[ci].id === convId) { conv = state.conversations[ci]; break; }
    }
    if (!conv) return;
    if (!isStoryStarted(conv)) return;

    // Frequency check: at least 10 messages since last update
    var msgCount = conv.messages ? conv.messages.length : 0;
    var lastCount = (conv.storyMemory && conv.storyMemory.lastMessageCount) || 0;
    var shouldUpdate = (msgCount - lastCount >= 10);
    // Also trigger if autoCompress is approaching
    if (conv.autoCompress && msgCount > REQUEST_RECENT_MSG_LIMIT + 5) shouldUpdate = true;
    if (!shouldUpdate) return;

    // Concurrency guard: one update at a time per conversation
    if (state._storyMemoryLocks[convId]) return;
    state._storyMemoryLocks[convId] = true;

    // Snapshot what we need before the async work
    var snapshotConvId = conv.id;
    var storyContent = fullContent;

    // Retry config: if user starts a new generation while we're waiting,
    // defer to avoid CPU/network contention with the main reply stream
    var maxRetries = 3;
    var retryDelayMs = 2000;
    var retries = 0;

    function attemptSchedule() {
      if (state.isStreaming) {
        retries++;
        if (retries > maxRetries) {
          // Give up: release lock so the next reply can try again
          state._storyMemoryLocks[snapshotConvId] = false;
          return;
        }
        setTimeout(attemptSchedule, retryDelayMs);
        return;
      }

      // Schedule on browser idle if available, falling back to setTimeout.
      // This keeps the aux request from competing with UI paints.
      var scheduleFn = (typeof requestIdleCallback !== 'undefined')
        ? requestIdleCallback
        : function(fn) { setTimeout(fn, 0); };

      scheduleFn(function() {
        if (state.isStreaming) {
          retries++;
          if (retries > maxRetries) {
            state._storyMemoryLocks[snapshotConvId] = false;
            return;
          }
          setTimeout(attemptSchedule, retryDelayMs);
          return;
        }
        _runStoryMemoryUpdate(snapshotConvId, storyContent).finally(function() {
          state._storyMemoryLocks[snapshotConvId] = false;
        });
      });
    }

    // Initial delay 1200-2000ms — give UI rendering, scrolling, and transition
    // effects time to settle before we even check whether to schedule.
    var initialDelay = 1200 + Math.floor(Math.random() * 800);
    setTimeout(attemptSchedule, initialDelay);
  }

  async function _runStoryMemoryUpdate(convId, fullContent) {
    var conv = null;
    for (var ci = 0; ci < state.conversations.length; ci++) {
      if (state.conversations[ci].id === convId) { conv = state.conversations[ci]; break; }
    }
    if (!conv) return;

    var timeoutId;
    try {
      var auxResolved = resolveStoryAuxProviderAndModel(conv);
      var auxProvider = auxResolved.provider;
      var auxModel = auxResolved.model;
      var auxApiKey = auxResolved.apiKey;
      // story memory uses a separate aux request and does not consume the main generation budget
      var auxMaxTokens = Math.min(conv.storyAuxMaxTokens || DEFAULTS.storyAuxMaxTokens, 3000);
      var auxMsgs = buildStoryMemoryAuxPrompt(conv, fullContent);

      var controller = new AbortController();
      timeoutId = setTimeout(function() { controller.abort(); }, 20000);

      var auxResp = await callChatModel(conv, auxModel, auxMsgs, {
        provider: auxProvider,
        apiKey: auxApiKey,
        maxTokens: auxMaxTokens,
        stream: false,
        temperature: 0.2,
        signal: controller.signal,
        responseFormat: 'json_object',
      });

      var auxContent = auxResp.content || '';
      if (!auxContent) return;

      var parsed = tryParseStoryMemoryResponse(auxContent);
      if (!parsed) {
        console.warn('[OmniChat] Story memory update parse failed');
        return;
      }

      // Re-fetch conv in case it changed (user switched conversations)
      var currentConv = null;
      for (var ci2 = 0; ci2 < state.conversations.length; ci2++) {
        if (state.conversations[ci2].id === convId) { currentConv = state.conversations[ci2]; break; }
      }
      if (!currentConv) return;

      applyStoryMemoryUpdate(currentConv, parsed);
      debouncedSave();
    } catch (e) {
      if (e.name === 'AbortError') {
        console.warn('[OmniChat] Story memory update timed out');
      } else {
        console.warn('[OmniChat] Story memory update failed:', e.message || e);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  // =========================================================================
  // MemoryAdapter — abstraction layer for story memory (local/remote)
  // =========================================================================

  // hasRemoteMemoryConfig — true when conv has a remote endpoint AND memoryMode is 'remote'.
  function hasRemoteMemoryConfig(conv) {
    if (!conv) return false;
    if (conv.memoryMode !== 'remote') return false;
    return normalizeMemoryEndpoint(conv.memoryRemoteEndpoint).length > 0;
  }

  // LocalMemoryAdapter — wraps existing local storyMemory logic.
  // Provides the same interface a future RemoteMemoryAdapter would implement.
  var LocalMemoryAdapter = {
    retrieveText: function(conv, userText, budget) {
      if (!conv) return '';
      budget = typeof budget === 'number' && budget > 0 ? budget : 4000;
      var text = buildStoryMemorySystemText(conv);
      if (text && text.length > budget) {
        text = text.slice(0, Math.max(0, budget - 3)) + '...';
      }
      return text;
    },
    scheduleUpdate: function(convId, fullContent) {
      scheduleLocalStoryMemoryUpdate(convId, fullContent);
    }
  };

  // MockRemoteMemoryAdapter — placeholder for future Supabase/remote backend.
  // Delegates everything to LocalMemoryAdapter so behavior is identical.
  // No network requests are made. This exists purely so the memoryMode
  // switching infrastructure can be built and tested without a real backend.
  var MockRemoteMemoryAdapter = {
    retrieveText: function(conv, userText, budget) {
      // Build payload to validate shape (not sent over network).
      buildMemoryRetrievePayload(conv, userText, budget);
      // Get local memory text, then normalize as if remote returned it.
      var localText = LocalMemoryAdapter.retrieveText(conv, userText, budget);
      var normalized = normalizeMemoryRetrieveResult({ memoryText: localText }, budget);
      return normalized.memoryText;
    },
    scheduleUpdate: function(convId, fullContent) {
      // Find conversation to build update payload for validation (not saved, no network request).
      var conv = null;
      for (var ci = 0; ci < state.conversations.length; ci++) {
        if (state.conversations[ci].id === convId) { conv = state.conversations[ci]; break; }
      }
      if (conv) {
        buildMemoryUpdatePayload(conv, fullContent);
      }
      // Delegate to local adapter.
      LocalMemoryAdapter.scheduleUpdate(convId, fullContent);
    }
  };

  // RemoteMemoryAdapter — wraps local memory with background remote POST.
  // LocalMemoryAdapter always runs first (safe, synchronous entry path).
  // Remote update is deferred via setTimeout to avoid impacting UI or generation.
  // Failures are logged via console.warn only; never shown to the user.
  var RemoteMemoryAdapter = {
    retrieveText: function(conv, userText, budget) {
      // Fallback to local if no remote config is set — no error, no popup.
      if (!hasRemoteMemoryConfig(conv)) {
        return LocalMemoryAdapter.retrieveText(conv, userText, budget);
      }
      budget = typeof budget === 'number' && budget > 0 ? budget : 4000;
      // Cache-first: check if we have valid cached remote memory (30-min TTL).
      var cache = conv.remoteMemoryCache;
      var cacheValid = cache && typeof cache.memoryText === 'string' && cache.memoryText.length > 0 &&
        typeof cache.updatedAt === 'number' &&
        (Date.now() - cache.updatedAt < 30 * 60 * 1000);
      // Fire background prefetch — never blocks the synchronous return.
      prefetchRemoteMemory(conv, userText, budget);
      if (cacheValid) {
        // Combine local memory + cached remote memory, clip to budget.
        return getRemoteMemoryCacheText(conv, budget);
      }
      // No valid cache — return local only. Background prefetch will populate
      // the cache for the next turn.
      return LocalMemoryAdapter.retrieveText(conv, userText, budget);
    },
    scheduleUpdate: function(convId, fullContent) {
      if (!convId || !fullContent) return;
      var conv = null;
      for (var ci = 0; ci < state.conversations.length; ci++) {
        if (state.conversations[ci].id === convId) { conv = state.conversations[ci]; break; }
      }
      if (!conv) return;
      // Always run local update first — never block on remote.
      LocalMemoryAdapter.scheduleUpdate(convId, fullContent);
      // Without remote config, nothing else to do.
      if (!hasRemoteMemoryConfig(conv)) return;
      // Background remote POST: deferred, low-priority, non-blocking.
      var maxRetries = 3;
      var retries = 0;
      function tryPost() {
        if (state.isStreaming) {
          retries++;
          if (retries > maxRetries) {
            console.warn('[OmniChat] Remote memory update skipped: streaming for too long');
            return;
          }
          setTimeout(tryPost, 2000);
          return;
        }
        postRemoteMemoryUpdate(conv, fullContent).then(function(ok) {
          if (ok) {
            // After a successful remote update, refresh the retrieve cache
            // so the next turn picks up the new remote memory.
            prefetchRemoteMemory(conv, '', 4000);
          }
        }).catch(function(e) {
          // Never throw to UI — postRemoteMemoryUpdate already console.warns internally.
          // This catch is a safety net for unexpected synchronous throws.
          console.warn('[OmniChat] Remote memory update error:', (e && e.message) || e);
        });
      }
      setTimeout(tryPost, 1500);
    }
  };

  function getMemoryAdapter(conv) {
    // Select adapter based on conv.memoryMode.
    // 'remote' -> RemoteMemoryAdapter (falls back to local if unconfigured)
    // 'mock-remote' -> MockRemoteMemoryAdapter
    // All other values (including 'local', undefined, unknown) -> LocalMemoryAdapter
    if (conv && conv.memoryMode === 'remote') {
      return RemoteMemoryAdapter;
    }
    if (conv && conv.memoryMode === 'mock-remote') {
      return MockRemoteMemoryAdapter;
    }
    return LocalMemoryAdapter;
  }

  function retrieveStoryMemoryText(conv, userText, budget) {
    return getMemoryAdapter(conv).retrieveText(conv, userText, budget);
  }

  // getRemoteMemoryCacheText — combine local memory text with cached remote memory.
  // Returns the combined text clipped to budget. Falls back to local-only if the
  // cache is missing or too small to fit.
  function getRemoteMemoryCacheText(conv, budget) {
    budget = typeof budget === 'number' && budget > 0 ? budget : 4000;
    var localText = LocalMemoryAdapter.retrieveText(conv, '', budget);
    var cache = conv && conv.remoteMemoryCache;
    var remoteText = (cache && typeof cache.memoryText === 'string') ? cache.memoryText : '';
    if (!remoteText) return localText;
    var header = '\n\n[远端长期记忆]\n';
    var headerLen = header.length;

    // Remote gets at least 1200 chars (if enough text exists), at most 60% of budget.
    var remoteMax = Math.floor(budget * 0.6);
    var remoteTarget = remoteMax;
    if (remoteText.length >= 1200 && remoteTarget < 1200) {
      remoteTarget = 1200;
    }
    if (remoteTarget > remoteText.length) {
      remoteTarget = remoteText.length;
    }

    // Clip remote text to its target budget.
    var clippedRemote = remoteText;
    if (clippedRemote.length > remoteTarget) {
      clippedRemote = clippedRemote.slice(0, Math.max(0, remoteTarget - 3)) + '...';
    }

    // Local gets whatever budget remains after the header + remote text.
    var localBudget = Math.max(0, budget - headerLen - clippedRemote.length);
    var clippedLocal = localText || '';
    if (clippedLocal.length > localBudget) {
      clippedLocal = clippedLocal.slice(0, Math.max(0, localBudget - 3)) + '...';
    }

    // Remote first so the model sees backend memory before local story context.
    var combined = header + clippedRemote;
    if (clippedLocal) {
      combined += '\n\n' + clippedLocal;
    }

    // Final safety clip to budget.
    if (combined.length > budget) {
      combined = combined.slice(0, Math.max(0, budget - 3)) + '...';
    }
    return combined;
  }

  // scheduleStoryMemoryUpdate — public entry point, delegates to the active adapter.
  // Replaces the old direct implementation (now renamed to scheduleLocalStoryMemoryUpdate).
  function scheduleStoryMemoryUpdate(convId, fullContent) {
    if (!convId || !fullContent) return;
    var conv = null;
    for (var ci = 0; ci < state.conversations.length; ci++) {
      if (state.conversations[ci].id === convId) { conv = state.conversations[ci]; break; }
    }
    if (!conv) return;
    getMemoryAdapter(conv).scheduleUpdate(convId, fullContent);
  }

  // =========================================================================
  // Memory API Payload Helpers — build/normalize payloads for future /api/memory/* endpoints.
  // No network calls; purely payload shape validation.
  // =========================================================================

  // buildMemoryRetrievePayload — construct the request body for POST /api/memory/retrieve.
  // Returns a plain JSON object. No API keys or provider secrets included.
  function buildMemoryRetrievePayload(conv, userText, budget) {
    budget = typeof budget === 'number' && budget > 0 ? budget : 4000;
    var recentMessages = [];
    if (conv && conv.messages && conv.messages.length > 0) {
      var slice = conv.messages.slice(Math.max(0, conv.messages.length - 8));
      for (var i = 0; i < slice.length; i++) {
        var m = slice[i];
        if (m.role === 'user' || m.role === 'assistant') {
          recentMessages.push({
            role: m.role,
            content: clipStr(m.content || '', 500)
          });
        }
      }
    }
    return {
      conversationId: conv ? conv.id || '' : '',
      userText: userText || '',
      budget: budget,
      sceneState: createSceneState(conv ? conv.sceneState : undefined),
      storyMemory: normalizeStoryMemory(conv && conv.storyMemory ? conv.storyMemory : undefined),
      recentMessages: recentMessages,
      memoryMode: conv ? (conv.memoryMode || 'local') : 'local'
    };
  }

  // buildMemoryUpdatePayload — construct the request body for POST /api/memory/update.
  // Returns a plain JSON object. No API keys included.
  function buildMemoryUpdatePayload(conv, storyContent) {
    var recentMessages = [];
    if (conv && conv.messages && conv.messages.length > 0) {
      var slice = conv.messages.slice(Math.max(0, conv.messages.length - 8));
      for (var i = 0; i < slice.length; i++) {
        var m = slice[i];
        if (m.role === 'user' || m.role === 'assistant') {
          recentMessages.push({
            role: m.role,
            content: clipStr(m.content || '', 500)
          });
        }
      }
    }
    // Take last 3000 characters of storyContent
    var content = storyContent || '';
    if (content.length > 3000) {
      content = content.slice(content.length - 3000);
    }
    return {
      conversationId: conv ? conv.id || '' : '',
      storyContent: content,
      sceneState: createSceneState(conv ? conv.sceneState : undefined),
      storyMemory: normalizeStoryMemory(conv && conv.storyMemory ? conv.storyMemory : undefined),
      recentMessages: recentMessages,
      memoryMode: conv ? (conv.memoryMode || 'local') : 'local'
    };
  }

  // normalizeMemoryRetrieveResult — defensive normalize of a remote /api/memory/retrieve response.
  // Ensures memoryText is a string truncated to budget, and ID arrays are arrays.
  function normalizeMemoryRetrieveResult(result, budget) {
    budget = typeof budget === 'number' && budget > 0 ? budget : 4000;
    var memoryText = typeof (result && result.memoryText) === 'string' ? result.memoryText : '';
    if (memoryText.length > budget) {
      memoryText = memoryText.slice(0, Math.max(0, budget - 3)) + '...';
    }
    return {
      memoryText: memoryText,
      selectedChapterIds: Array.isArray(result && result.selectedChapterIds) ? result.selectedChapterIds : [],
      selectedFactIds: Array.isArray(result && result.selectedFactIds) ? result.selectedFactIds : []
    };
  }

  // normalizeMemoryUpdateResult — defensive normalize of a remote /api/memory/update response.
  // Returns a clean object with chapters/pinnedFacts/unresolvedThreads. Does not mutate input.
  function normalizeMemoryUpdateResult(result) {
    result = result || {};
    return {
      chapters: normalizeStoryChapters(result.chapters),
      pinnedFacts: clipStringArray(result.pinnedFacts, 12, 120),
      unresolvedThreads: clipStringArray(result.unresolvedThreads, 12, 160)
    };
  }

  // =========================================================================
  // Remote Memory Endpoint Helpers — URL normalization and construction
  // =========================================================================

  // normalizeMemoryEndpoint — validate and normalize a remote memory endpoint URL.
  // Only allows http:// or https:// URLs; rejects all other schemes (including empty).
  // Strips trailing slashes for clean concatenation.
  function normalizeMemoryEndpoint(endpoint) {
    if (typeof endpoint !== 'string') return '';
    var url = endpoint.trim();
    if (!url) return '';
    // Strip trailing slashes
    while (url.length > 0 && url.charAt(url.length - 1) === '/') {
      url = url.slice(0, -1);
    }
    // Only allow http:// or https://
    if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
      return '';
    }
    return url;
  }

  // buildMemoryEndpointUrl — construct a full API URL from a normalized endpoint base.
  // Three patterns are supported:
  //   1. Local/mock base (e.g. http://localhost:8000) → appends /api/memory/{update,retrieve}
  //   2. Any /functions/v1 base (hosted Supabase or local CLI 127.0.0.1:54321) → appends /memory-{update,retrieve}
  //   3. Exact function URL ending in /memory-update or /memory-retrieve → returns as-is (no append)
  // Returns '' on invalid input.
  function buildMemoryEndpointUrl(endpoint, path) {
    var base = normalizeMemoryEndpoint(endpoint);
    if (!base) return '';
    path = typeof path === 'string' && path.length > 0 ? path : '/api/memory/update';
    // Avoid double-append: check if base already ends with the target path
    if (base.length >= path.length &&
        base.slice(base.length - path.length) === path) {
      return base;
    }
    // Supabase Edge Function detection — any base whose path contains /functions/v1
    // (hosted: https://<ref>.supabase.co/functions/v1, local CLI: http://127.0.0.1:54321/functions/v1)
    // Map /api/memory/update → /memory-update, /api/memory/retrieve → /memory-retrieve
    var FUNCTION_V1_PATH = '/functions/v1';
    if (base.indexOf(FUNCTION_V1_PATH) !== -1) {
      // If base already ends with a known function name, it's an exact URL → return as-is
      var knownFunctions = ['/memory-update', '/memory-retrieve'];
      for (var i = 0; i < knownFunctions.length; i++) {
        if (base.length >= knownFunctions[i].length &&
            base.slice(base.length - knownFunctions[i].length) === knownFunctions[i]) {
          return base;
        }
      }
      // Map internal path names to Supabase Edge Function names
      var mapped = path;
      if (path === '/api/memory/update') mapped = '/memory-update';
      else if (path === '/api/memory/retrieve') mapped = '/memory-retrieve';
      return base + mapped;
    }
    // Default: local/mock server — append path as-is
    return base + path;
  }

  // =========================================================================
  // SUPABASE AUTH SCAFFOLD — Phase 1
  // Lazy optional auth: no forced login, no JWT enforcement, no UI.
  // If Supabase CDN loaded and user is signed in, attaches Authorization + apikey headers.
  // =========================================================================

  // Lazy Supabase browser client singleton. Returns null if SDK not available.
  // Phase 1.2: reads supabaseProjectUrl / supabasePublishableKey from runtime
  // config first (window.__MIRA_CONFIG__ or meta tags), falls back to constants.
  let _supabaseClient = undefined;     // undefined = not yet attempted
  function getSupabaseClient() {
    if (_supabaseClient !== undefined) return _supabaseClient;
    try {
      var projectUrl = getRuntimeConfigValue('supabaseProjectUrl', SUPABASE_PROJECT_URL);
      var publishableKey = getRuntimeConfigValue('supabasePublishableKey', SUPABASE_PUBLISHABLE_KEY);
      if (!projectUrl || !publishableKey) {
        _supabaseClient = null;
        return null;
      }
      if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
        _supabaseClient = window.supabase.createClient(projectUrl, publishableKey);
      } else {
        _supabaseClient = null;
      }
    } catch (e) {
      console.warn('[OmniChat] Supabase client init failed:', (e && e.message) || e);
      _supabaseClient = null;
    }
    return _supabaseClient;
  }

  // Get Supabase session access token, or null if not signed in.
  async function getSupabaseAccessToken() {
    try {
      var client = getSupabaseClient();
      if (!client) return null;
      var sessionResult = await client.auth.getSession();
      var session = sessionResult && sessionResult.data && sessionResult.data.session;
      return session && session.access_token ? session.access_token : null;
    } catch (e) {
      console.warn('[OmniChat] Failed to get Supabase session:', (e && e.message) || e);
      return null;
    }
  }

  // buildRemoteMemoryHeaders — construct headers for remote memory requests.
  // Personal mode (no auth session): returns only { 'Content-Type': 'application/json' }
  // to avoid triggering CORS preflight against prototype functions whose
  // Access-Control-Allow-Headers only lists Content-Type.
  // Authenticated mode (valid access_token from Supabase Auth session):
  // additionally attaches Authorization: Bearer <token> and apikey.
  async function buildRemoteMemoryHeaders() {
    var headers = { 'Content-Type': 'application/json' };
    try {
      var token = await getSupabaseAccessToken();
      if (token) {
        headers['Authorization'] = 'Bearer ' + token;
        // Phase 1.2: resolve publishable key via runtime config first,
        // fall back to hardcoded constant.  Both are safe for client-side.
        var pk = getRuntimeConfigValue('supabasePublishableKey', SUPABASE_PUBLISHABLE_KEY);
        if (typeof pk === 'string' && pk) {
          headers['apikey'] = pk;
        }
      }
      // No token → stay with { 'Content-Type': 'application/json' } only.
      // This is equivalent to the pre-auth behavior and avoids preflight.
    } catch (e) {
      // Silent fallback — never block on auth failure
    }
    return headers;
  }

  // =========================================================================
  // AUTH HANDLERS — Phase 2.1
  // Called from init() and event listeners.  Uses getSupabaseClient (above)
  // and the auth state helpers from 10_auth.js.
  // =========================================================================

  // initAuthState() — async, non-blocking. Called once after app load.
  // Checks for existing Supabase session and listens for changes.
  function initAuthState() {
    if (_authState.initialised) return;

    setAuthLoading(true);

    // Defer to next microtask so init() returns immediately.
    // Auth is never on the critical path for chat.
    Promise.resolve().then(async function() {
      try {
        var client = getSupabaseClient();
        if (!client) {
          markAuthInitialised();
          return;
        }

        // 1. Restore existing session (survives refresh via Supabase cookies)
        var sessionResult = await client.auth.getSession();
        var session = sessionResult && sessionResult.data && sessionResult.data.session;
        if (session && session.user) {
          setAuthSession(session);
        }

        // 2. Listen for future auth changes (login, logout, token refresh)
        client.auth.onAuthStateChange(function(event, newSession) {
          if (event === 'SIGNED_IN' && newSession && newSession.user) {
            setAuthSession(newSession);
          } else if (event === 'SIGNED_OUT') {
            clearAuthSession();
          } else if (event === 'TOKEN_REFRESHED' && newSession) {
            setAuthSession(newSession);
          } else if (event === 'USER_UPDATED' && newSession && newSession.user) {
            setAuthSession(newSession);
          }
        });

        markAuthInitialised();
      } catch (e) {
        console.warn('[OmniChat] Auth init failed:', (e && e.message) || e);
        markAuthInitialised();
      }
    });
  }

  // handleAuthLogin() — read email from input, validate, send OTP.
  async function handleAuthLogin() {
    var emailInput = document.getElementById('inputAuthEmail');
    var email = emailInput ? emailInput.value.trim() : '';

    if (!isValidEmail(email)) {
      setAuthError('请输入有效的邮箱地址');
      return;
    }

    setAuthError(null);

    var statusEl = document.getElementById('authStatus');
    if (statusEl) {
      statusEl.textContent = '正在发送登录链接…';
      statusEl.className = 'auth-status';
    }

    try {
      var client = getSupabaseClient();
      if (!client) {
        setAuthError('Supabase 不可用（SDK 未加载或配置缺失）');
        return;
      }

      var result = await client.auth.signInWithOtp({
        email: email,
        options: {
          // Magic link: user clicks link → auto signed in via onAuthStateChange
        }
      });

      if (result && result.error) {
        setAuthError(result.error.message || '发送失败，请稍后重试');
        return;
      }

      // Success — user will receive email with magic link
      if (statusEl) {
        statusEl.textContent = '登录链接已发送，请查收邮件（检查垃圾箱）';
        statusEl.className = 'auth-status auth-status-success';
      }
      _authState.error = null;

      // Clear the email input for privacy
      if (emailInput) emailInput.value = '';

    } catch (e) {
      setAuthError((e && e.message) || '登录请求失败，请检查网络');
    }
  }

  // handleAuthLogout() — sign out, clear auth state, preserve local data.
  async function handleAuthLogout() {
    try {
      var client = getSupabaseClient();
      if (client) {
        await client.auth.signOut();
      }
    } catch (e) {
      console.warn('[OmniChat] Sign out error:', (e && e.message) || e);
    }

    // Always clear local auth state regardless of remote success.
    // local chats, settings, and API keys are NEVER touched.
    clearAuthSession();

    var statusEl = document.getElementById('authStatus');
    if (statusEl) {
      statusEl.textContent = '已退出登录';
      statusEl.className = 'auth-status';
    }
  }

  // postRemoteMemoryUpdate — POST memory update payload to the remote endpoint.
  // Fire-and-forget: failures are logged via console.warn only; never throw to UI.
  // Returns true on successful POST + JSON parse, false otherwise.
  async function postRemoteMemoryUpdate(conv, fullContent) {
    if (!hasRemoteMemoryConfig(conv)) return false;
    try {
      var payload = buildMemoryUpdatePayload(conv, fullContent);
      var url = buildMemoryEndpointUrl(conv.memoryRemoteEndpoint, '/api/memory/update');
      if (!url) return false;

      var controller = new AbortController();
      var timeoutId = setTimeout(function() { controller.abort(); }, 8000);

      var response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: await buildRemoteMemoryHeaders(),
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        console.warn('[OmniChat] Remote memory update failed: HTTP ' + response.status);
        return false;
      }

      try {
        var result = await response.json();
        normalizeMemoryUpdateResult(result);
        // Phase 1: do NOT write remote result back to conv — preserves local memory integrity.
        return true;
      } catch (parseErr) {
        console.warn('[OmniChat] Remote memory update: invalid JSON response');
        return false;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') {
        console.warn('[OmniChat] Remote memory update timed out');
      } else {
        console.warn('[OmniChat] Remote memory update error:', (e && e.message) || e);
      }
      return false;
    }
  }

  // =========================================================================
  // prefetchRemoteMemory — background fetch of remote memory retrieve.
  // Fire-and-forget via setTimeout(0): never blocks the main thread or generation.
  // On success, updates conv.remoteMemoryCache for the next turn.
  // On failure, console.warn only — never toast, never throw.
  // =========================================================================

  // Outer fire-and-forget wrapper — detaches fully from the call stack.
  function prefetchRemoteMemory(conv, userText, budget) {
    if (!conv || !hasRemoteMemoryConfig(conv)) return;
    budget = typeof budget === 'number' && budget > 0 ? budget : 4000;

    // --- in-flight guard: deduplicate concurrent prefetches for the same conv+budget ---
    if (!state._remoteMemoryPrefetchLocks) { state._remoteMemoryPrefetchLocks = {}; }
    var lockKey = conv.id + ':' + budget;
    if (state._remoteMemoryPrefetchLocks[lockKey]) return;

    // --- rate limiting: skip if cache was updated < 5 s ago and userText is empty or unchanged ---
    var cache = conv.remoteMemoryCache;
    if (cache && typeof cache.updatedAt === 'number' && (Date.now() - cache.updatedAt < 5000)) {
      if (!userText || userText === cache.userText) return;
    }

    state._remoteMemoryPrefetchLocks[lockKey] = true;
    setTimeout(function() {
      _prefetchRemoteMemoryImpl(conv, userText, budget);
    }, 0);
  }

  // Inner async implementation — does the actual fetch.
  async function _prefetchRemoteMemoryImpl(conv, userText, budget) {
    var lockKey = conv.id + ':' + budget;
    try {
      var payload = buildMemoryRetrievePayload(conv, userText, budget);
      var url = buildMemoryEndpointUrl(conv.memoryRemoteEndpoint, '/api/memory/retrieve');
      if (!url) return;

      var controller = new AbortController();
      var timeoutId = setTimeout(function() { controller.abort(); }, 3500);

      var response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: await buildRemoteMemoryHeaders(),
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        console.warn('[OmniChat] Remote memory retrieve failed: HTTP ' + response.status);
        return;
      }

      var result = await response.json();
      var normalized = normalizeMemoryRetrieveResult(result, budget);

      // Update cache — idempotent, safe for concurrent prefetches.
      conv.remoteMemoryCache = {
        memoryText: normalized.memoryText,
        selectedFactIds: normalized.selectedFactIds,
        updatedAt: Date.now(),
        budget: budget,
        userText: userText
      };

      // Persist the cache so it survives page reload.
      debouncedSave();
    } catch (e) {
      if (e && e.name === 'AbortError') {
        // Timed out — silent, normal for background prefetch on slow connections.
      } else {
        console.warn('[OmniChat] Remote memory prefetch error:', (e && e.message) || e);
      }
    } finally {
      // Release the in-flight lock so the next request can proceed.
      if (state._remoteMemoryPrefetchLocks) {
        delete state._remoteMemoryPrefetchLocks[lockKey];
      }
    }
  }

  // =========================================================================
  // withTimeout — race a promise against a timeout, cleanup on settle
  // =========================================================================

  function withTimeout(promise, ms) {
    var timeoutId;
    var timeoutPromise = new Promise(function(_, reject) {
      timeoutId = setTimeout(function() {
        reject(new Error('Timeout after ' + (ms / 1000) + 's'));
      }, ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(function() {
      clearTimeout(timeoutId);
    });
  }

  // withTimeoutAbort — combine a parent AbortSignal with a timeout into a derived
  // AbortController so aux/repair timeouts truly cancel the underlying fetch
  // without aborting the main request.  auxTO.timedOut distinguishes timeout
  // from a user-triggered stop (user stop propagates via parentSignal listener).
  function withTimeoutAbort(parentSignal, timeoutMs) {
    var controller = new AbortController();
    var _timedOut = false;
    var timeoutId;
    var onParentAbort;
    if (parentSignal && parentSignal.aborted) {
      controller.abort(parentSignal.reason);
      return { signal: controller.signal, get timedOut() { return _timedOut; }, cleanup: function() {} };
    }
    timeoutId = setTimeout(function() {
      _timedOut = true;
      controller.abort();
    }, timeoutMs);
    if (parentSignal) {
      onParentAbort = function() {
        clearTimeout(timeoutId);
        controller.abort(parentSignal.reason);
      };
      parentSignal.addEventListener('abort', onParentAbort, { once: true });
    }
    return {
      signal: controller.signal,
      get timedOut() { return _timedOut; },
      cleanup: function() {
        clearTimeout(timeoutId);
        if (parentSignal && onParentAbort) {
          parentSignal.removeEventListener('abort', onParentAbort);
        }
      }
    };
  }

  // =========================================================================
  // ensureStoryDirections — guarantee assistantMsg has 4 parseable A/B/C/D
  // Priority: A) existing sceneSnapshot directions B) parse visible content
  // C) repairSceneBlock D) inherit previousSceneState
  // =========================================================================

  async function ensureStoryDirections(assistantMsg, conv, fullContent, previousSceneState) {
    var existing = assistantMsg.sceneSnapshot && assistantMsg.sceneSnapshot.directions;
    if (existing && parseDirectionOptions(existing).length >= 4) return; // A: already good

    // B: try to parse directions from visible narrative
    var fromContent = parseDirectionOptions(fullContent);
    if (fromContent.length >= 4) {
      var dirsStr = fromContent.map(function(d) { return d.letter + '. ' + d.content; }).join('\n');
      assistantMsg.sceneSnapshot = createSceneState({ directions: dirsStr });
      conv.sceneState = conv.sceneState || {};
      conv.sceneState.directions = dirsStr;
      if (conv.storyMode) conv.storyMode.sceneState = conv.sceneState;
      return;
    }

    // C: repairSceneBlock (25s timeout)
    var repTO1 = withTimeoutAbort(state.abortController && state.abortController.signal, 25000);
    try {
      var repairResult = await repairSceneBlock(conv, fullContent, repTO1.signal);
      // repairSceneBlock already validates ≥4 parseable directions internally
      if (repairResult) {
        assistantMsg.sceneSnapshot = createSceneState({
          directions: repairResult.directions,
          characterStatuses: repairResult.characterStatuses,
        });
        conv.sceneState = conv.sceneState || {};
        conv.sceneState.directions = repairResult.directions;
        conv.sceneState.characterStatuses = repairResult.characterStatuses;
        if (conv.storyMode) conv.storyMode.sceneState = conv.sceneState;
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError' && !repTO1.timedOut) throw err;
      /* fall through */
    }
    finally { repTO1.cleanup(); }

    // D: inherit previous round's directions
    var prevDirs = previousSceneState && previousSceneState.directions;
    if (prevDirs && parseDirectionOptions(prevDirs).length >= 4) {
      assistantMsg.sceneSnapshot = createSceneState(previousSceneState);
      conv.sceneState = conv.sceneState || {};
      conv.sceneState.directions = previousSceneState.directions;
      conv.sceneState.characterStatuses = previousSceneState.characterStatuses || (conv.sceneState.characterStatuses || []);
      if (conv.storyMode) conv.storyMode.sceneState = conv.sceneState;
      showToast('本轮走向解析失败，暂用上一轮走向', 'warning', 4000);
      return;
    }

    // E: hard local fallback — guaranteed 4 clickable options when all model strategies fail.
    var fallbackContext = (fullContent || '').slice(-800);
    var fallbackDirs = _buildHardFallbackDirections(fallbackContext, conv);
    assistantMsg.sceneSnapshot = createSceneState({ directions: fallbackDirs });
    conv.sceneState = conv.sceneState || {};
    conv.sceneState.directions = fallbackDirs;
    if (conv.storyMode) conv.storyMode.sceneState = conv.sceneState;
    showToast('走向解析全部失败，已使用本地备选选项。建议重新生成或检查辅助模型。', 'warning', 5000);
  }

  // =========================================================================
  // streamStoryPart — stream a story generation call into assistantMsg.
  // Reads SSE chunks, uses parseStreamDelta to collect content/reasoning,
  // throttles rendering at ~65ms so the user sees continuous text growth.
  // Only real reasoning_content deltas populate the thinking section.
  // Returns the content generated by this part (delta from initial msg length).
  // =========================================================================

  async function streamStoryPart(conv, model, messages, assistantMsg, opts) {
    opts = opts || {};
    var startLen = (assistantMsg.content || '').length;
    var turnConvId = conv.id;
    var turnController = state.abortController;
    function isCurrentTurn() {
      return state.currentConversationId === turnConvId && state.abortController === turnController;
    }

    var resp = await callChatModel(conv, model, messages, {
      stream: true,
      signal: state.abortController.signal,
      maxTokens: opts.maxTokens,
    });

    var reader = resp.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';

    var lastRenderAt = 0;
    var minRenderGap = 28; // ~35fps throttle, balanced for mobile — smooth on high-refresh, safe on low-end

    var _renderPending = false;
    var scheduleRender = function () {
      if (!isCurrentTurn()) return;
      if (_renderPending) return;
      _renderPending = true;
      requestAnimationFrame(function () {
        _renderPending = false;
        if (!isCurrentTurn()) return;
        var now = performance.now();
        if (now - lastRenderAt < minRenderGap) {
          // Too soon — skip, next chunk will retry
          return;
        }
        updateLastBubble(assistantMsg);
        if (!state.ui.detachedDuringStreaming) {
          scrollToBottomIfNeeded({ smooth: false });
        } else {
          updateScrollToBottomButton(true);
        }
        lastRenderAt = performance.now();
      });
    };

    // Shared helper: process one SSE data line, returns true on [DONE]
    function processDataLine(dataStr) {
      if (dataStr === '[DONE]') return true;
      try {
        var parsed = JSON.parse(dataStr);
        var delta = parseStreamDelta(conv.provider, parsed);
        if (delta.reasoning) assistantMsg.reasoning = (assistantMsg.reasoning || '') + delta.reasoning;
        if (delta.content) assistantMsg.content += delta.content;
        if (delta.usage) assistantMsg.usage = delta.usage;
        if (delta.finishReason) assistantMsg.finishReason = delta.finishReason;
        if (delta.content || delta.reasoning) scheduleRender();
      } catch (_) { /* skip unparseable chunks */ }
      return false;
    }

    try {
      while (true) {
        var readResult;
        try {
          readResult = await reader.read();
        } catch (e) {
          if (e.name === 'AbortError') throw e;
          throw e;
        }
        var done = readResult.done;
        var value = readResult.value;
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (var li = 0; li < lines.length; li++) {
          var trimmed = lines[li].trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          if (processDataLine(trimmed.slice(5).trim())) break;
        }
      }

      // Process remaining buffer — split into lines, reuse same logic
      buffer += decoder.decode();
      if (buffer.trim()) {
        var finalLines = buffer.split('\n');
        for (var fli = 0; fli < finalLines.length; fli++) {
          var finalTrimmed = finalLines[fli].trim();
          if (!finalTrimmed || !finalTrimmed.startsWith('data:')) continue;
          processDataLine(finalTrimmed.slice(5).trim());
        }
      }
    } finally {
      _renderPending = false;
      reader.releaseLock();
    }

    // Final render for this part — caller keeps _streaming=true
    if (isCurrentTurn()) {
      updateLastBubble(assistantMsg);
      if (!state.ui.detachedDuringStreaming) {
        scrollToBottomIfNeeded({ smooth: false });
      } else {
        updateScrollToBottomButton(true);
      }
    }

    var partContent = (assistantMsg.content || '').slice(startLen);
    return partContent;
  }

  // =========================================================================
  // ADAPTIVE MAX TOKENS — self-calibrating token budget from replyCharLimit
  // =========================================================================

  function computeAdaptiveMaxTokens(conv, charLimit) {
    charLimit = charLimit || 500;
    var tokenRatio = 2.0; // default: conservative for Chinese
    var history = conv._tokenHistory;
    if (history && history.length > 0) {
      var weights = [0.5, 0.3, 0.2];
      var totalWeight = 0, weightedSum = 0;
      var n = Math.min(history.length, weights.length);
      for (var i = 0; i < n; i++) {
        weightedSum += history[history.length - 1 - i].ratio * weights[i];
        totalWeight += weights[i];
      }
      tokenRatio = totalWeight > 0 ? weightedSum / totalWeight : 2.0;
      if (tokenRatio < 1.2) tokenRatio = 1.2;
      if (tokenRatio > 3.0) tokenRatio = 3.0;
    }

    var baseTokens = Math.ceil(charLimit * tokenRatio);

    var modelId = resolveModel(conv);
    var isReasoning = /reasoner|r1|thinking|o1|o3/i.test(modelId);
    var overhead = isReasoning ? 1200 : 400;

    var streak = conv._escalateStreak || 0;
    var margin = streak >= 2 ? 2.0 : (streak >= 1 ? 1.5 : 1.25);

    var adaptive = Math.ceil((baseTokens + overhead) * margin);

    // Context window budget: prevent API rejection when input tokens grow large
    var estimatedInputTokens = Math.ceil(countApproxChars(conv) / 3);
    var contextWindow = 128000; // conservative default (DeepSeek V3/V4, GPT-4o class)
    var workingReserve = Math.ceil(contextWindow * 0.1); // 10% for model to breathe
    var maxSafeOutput = contextWindow - estimatedInputTokens - workingReserve;
    if (maxSafeOutput < adaptive) {
      adaptive = Math.max(maxSafeOutput, 500); // never below 500
    }

    var userCap = conv.maxTokens || 5000;
    var providerCap = getProviderCap(conv.provider);
    adaptive = Math.min(adaptive, userCap, providerCap);
    adaptive = Math.max(adaptive, 500);

    return adaptive;
  }

  function recordTokenUsage(conv, usage, contentLen, finishReason) {
    if (usage && usage.completion_tokens && contentLen > 0) {
      var ratio = usage.completion_tokens / contentLen;
      if (!conv._tokenHistory) conv._tokenHistory = [];
      conv._tokenHistory.push({ ratio: ratio, tokens: usage.completion_tokens, chars: contentLen });
      if (conv._tokenHistory.length > 5) conv._tokenHistory.shift();
    }
    if (finishReason === 'length') {
      conv._escalateStreak = (conv._escalateStreak || 0) + 1;
    } else {
      conv._escalateStreak = 0;
    }
  }

  // =========================================================================
  // sendStoryTurn — single-part story generation with aux model
  // Uses streamStoryPart for continuous streaming display.
  // =========================================================================

  async function sendStoryTurn(text, conv) {
    // --- Regenerate guard ---
    var regenFlags = state._regenerateFlags || null;
    state._regenerateFlags = null;
    var isRegenerate = regenFlags && regenFlags.appendUserMessage === false;

    if (!isRegenerate) {
      var userMsg = { role: 'user', content: text };
      if (state.pendingHiddenRequest) {
        userMsg._requestContent = state.pendingHiddenRequest;
        state.pendingHiddenRequest = null;
      }
      conv.messages.push(userMsg);
    } else {
      // Regenerate: inject extra system messages if provided
      if (regenFlags && regenFlags.extraSystemMessages && regenFlags.extraSystemMessages.length) {
        for (var ei2 = 0; ei2 < regenFlags.extraSystemMessages.length; ei2++) {
          conv.messages.push(regenFlags.extraSystemMessages[ei2]);
        }
      }
    }

    updateTimestamp(conv);
    autoTitle(conv);
    dom.inputMessage.value = '';
    dom.inputMessage.style.height = 'auto';
    preserveScrollPosition(renderMessages);
    updateTopBar(); updateSendUI();
    syncLegacyToStoryMode(conv); repairStoryModeFlags(conv);

    state.abortController = new AbortController();
    var requestController = state.abortController;
    var turnConvId = conv.id;
    state.isStreaming = true;
    resetStreamFollowState();

    // --- Insert placeholder — starts empty, streaming cursor shows activity ---
    var placeholderIdx = conv.messages.length;
    var placeholderMsg = {
      role: 'assistant',
      content: '',
      _streaming: true,
      _showActions: false,
    };
    conv.messages.push(placeholderMsg);
    renderMessages();
    scrollToBottomIfNeeded({ smooth: false });
    updateSendUI();

    var model = resolveModel(conv);
    var storyContent = '';
    var assistantMsg = placeholderMsg; // reused throughout
    var contentPromoted = false; // true once story content is visible to user

    try {
      // ===== Single story generation (streaming) =====
      var messages = _buildStoryMessages(conv, text);
      var adaptiveMax = computeAdaptiveMaxTokens(conv, conv.replyCharLimit);
      storyContent = await streamStoryPart(conv, model, messages, assistantMsg, { label: 'Story', maxTokens: adaptiveMax });
      if (!storyContent) throw new Error('故事生成失败：模型未返回正文。');

      // === Immediately promote content for user to read (don't wait for aux/directions) ===
      var fullContent = assistantMsg.content;
      assistantMsg.content = stripStoryMetaFromVisibleContent(fullContent);
      assistantMsg.displayParts = [{ content: assistantMsg.content, hideRole: false }];
      assistantMsg._streaming = false;
      assistantMsg._showActions = false;
      assistantMsg._keepThinkingOpen = conv.keepThinkingOpen !== false;
      assistantMsg.sceneStatusSnapshot = createSceneStatus(conv.sceneStatus);
      assistantMsg.sceneCharacterSnapshot = createSceneCharacter(conv.sceneCharacter);
      contentPromoted = true;
      if (state.currentConversationId === turnConvId) {
        renderMessages();
        if (!state.ui.detachedDuringStreaming) {
          scrollToBottomIfNeeded({ smooth: false });
        } else {
          updateScrollToBottomButton(true);
        }
      }

      if (requestController.signal.aborted) throw new DOMException('Aborted', 'AbortError');

      // ===== Scene finalizing: show light status while aux/repair runs =====
      assistantMsg._sceneFinalizing = true;
      if (state.currentConversationId === turnConvId) {
        updateLastBubble(assistantMsg);
        if (!state.ui.detachedDuringStreaming) {
          scrollToBottomIfNeeded({ smooth: false });
        } else {
          updateScrollToBottomButton(true);
        }
      }

      // ===== Aux model: JSON state extraction (non-streaming, two attempts) =====
      // Save a clean snapshot before aux/repair may mutate conv.sceneState
      var previousSceneState = createSceneState(conv.sceneState);
      var auxOk = false;
      var auxResolved = resolveStoryAuxProviderAndModel(conv);
      var auxProvider = auxResolved.provider;
      var auxModel = auxResolved.model;
      var auxApiKey = auxResolved.apiKey;
      var auxMaxTokens = conv.storyAuxMaxTokens || DEFAULTS.storyAuxMaxTokens;
      var auxMsgs = buildAuxMessages(conv, storyContent);

      // Helper: merge a validated aux result into conv.sceneState + assistantMsg.sceneSnapshot
      function applyAuxParsed(targetParsed) {
        auxOk = true;
        assistantMsg.sceneSnapshot = createSceneState(targetParsed);
        var p = conv.sceneState || {};
        conv.sceneState = {
          currentRole: targetParsed.currentRole || p.currentRole || '',
          currentGoal: targetParsed.currentGoal || p.currentGoal || '',
          posture: targetParsed.posture || p.posture || '',
          mental: targetParsed.mental || p.mental || '',
          mentalScore: targetParsed.mentalScore || p.mentalScore || '',
          physical: targetParsed.physical || p.physical || '',
          bodyDetails: targetParsed.bodyDetails || p.bodyDetails || '',
          plot: targetParsed.plot || p.plot || '',
          risk: targetParsed.risk || p.risk || '',
          innerVoice: targetParsed.innerVoice || p.innerVoice || '',
          directions: targetParsed.directions || p.directions || '',
          characterStatuses: targetParsed.characterStatuses && targetParsed.characterStatuses.length
            ? targetParsed.characterStatuses : (p.characterStatuses || []),
        };
        if (conv.storyMode) conv.storyMode.sceneState = conv.sceneState;
      }

      // Attempt 1: non-streaming, temperature 0.2, 20s timeout
      var auxTO1 = withTimeoutAbort(requestController.signal, 20000);
      try {
        var auxResp1 = await callChatModel(conv, auxModel, auxMsgs, {
          provider: auxProvider, apiKey: auxApiKey, maxTokens: auxMaxTokens, stream: false,
          temperature: 0.2,
          signal: auxTO1.signal,
          responseFormat: 'json_object',
        });
        var auxContent1 = auxResp1.content || '';
        if (auxContent1) {
          var parsed1 = tryParseAuxResponse(auxContent1);
          if (parsed1 && validateAuxSceneState(parsed1)) {
            applyAuxParsed(parsed1);
          } else if (parsed1) {
            console.warn('[OmniChat] Aux attempt 1 validation failed (insufficient dirs/chars), retrying...');
          } else {
            console.warn('[OmniChat] Aux attempt 1 parse failed, retrying...');
          }
        }
      } catch (auxErr1) {
        if (auxErr1.name === 'AbortError' && !auxTO1.timedOut) throw auxErr1;
        console.warn('[OmniChat] Aux attempt 1 failed:', auxErr1.message || auxErr1);
      } finally {
        auxTO1.cleanup();
      }

      // Attempt 2: stricter prompt, temperature 0.1, 20s timeout
      if (!auxOk) {
        if (requestController.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        var auxTO2 = withTimeoutAbort(requestController.signal, 20000);
        try {
          var auxMsgs2 = buildAuxMessagesStrict(conv, storyContent);
          var auxResp2 = await callChatModel(conv, auxModel, auxMsgs2, {
            provider: auxProvider, apiKey: auxApiKey, maxTokens: auxMaxTokens, stream: false,
            temperature: 0.1,
            signal: auxTO2.signal,
            responseFormat: 'json_object',
          });
          var auxContent2 = auxResp2.content || '';
          if (auxContent2) {
            var parsed2 = tryParseAuxResponse(auxContent2);
            if (parsed2 && validateAuxSceneState(parsed2)) {
              applyAuxParsed(parsed2);
            } else if (parsed2) {
              console.warn('[OmniChat] Aux attempt 2 validation failed (insufficient dirs/chars)');
            } else {
              console.warn('[OmniChat] Aux attempt 2 parse failed');
            }
          }
        } catch (auxErr2) {
          if (auxErr2.name === 'AbortError' && !auxTO2.timedOut) throw auxErr2;
          console.warn('[OmniChat] Aux attempt 2 failed:', auxErr2.message || auxErr2);
        } finally {
          auxTO2.cleanup();
        }
      }

      // ===== Fallback: both aux attempts failed → repair via model (with 25s timeout) =====
      if (!auxOk) {
        showToast('辅助模型提取失败，正在尝试修复...', 'warning', 3000);
        if (requestController.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        var repTO = withTimeoutAbort(requestController.signal, 25000);
        try {
          var repairResult = await repairSceneBlock(conv, fullContent, repTO.signal);
          if (repairResult) {
            auxOk = true;
            assistantMsg.sceneSnapshot = createSceneState({
              directions: repairResult.directions,
              characterStatuses: repairResult.characterStatuses,
            });
            conv.sceneState = conv.sceneState || {};
            conv.sceneState.directions = repairResult.directions;
            conv.sceneState.characterStatuses = repairResult.characterStatuses;
            if (conv.storyMode) conv.storyMode.sceneState = conv.sceneState;
          }
        } catch (repairErr) {
          if (repairErr && repairErr.name === 'AbortError' && !repTO.timedOut) throw repairErr;
          console.warn('[OmniChat] Scene repair failed:', repairErr.message || repairErr);
          showToast('剧情修复也失败了，尝试从正文提取...', 'warning', 3000);
        } finally {
          repTO.cleanup();
        }
      }

      // ===== ensureStoryDirections: guarantee 4 clickable A/B/C/D =====
      if (requestController.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      await ensureStoryDirections(assistantMsg, conv, fullContent, previousSceneState);

      // ===== Schedule background story memory update (non-blocking) =====
      if (isStoryStarted(conv)) {
        scheduleStoryMemoryUpdate(turnConvId, fullContent);
      }

      // ===== Update action buttons — directions now guaranteed =====
      delete assistantMsg._sceneFinalizing;
      var finalDirs = assistantMsg.sceneSnapshot && assistantMsg.sceneSnapshot.directions;
      assistantMsg._showActions = !!(finalDirs && parseDirectionOptions(finalDirs).length >= 4);
      assistantMsg._actionIndex = conv.messages.length;

      // Record token usage for adaptive calibration
      recordTokenUsage(conv, assistantMsg.usage,
        stripStoryMetaFromVisibleContent(fullContent).length,
        assistantMsg.finishReason);

      // Truncation warning for story mode
      if (assistantMsg.finishReason === 'length' && state.currentConversationId === turnConvId) {
        var nextBudget = computeAdaptiveMaxTokens(conv, conv.replyCharLimit);
        showToast('回复被截断。下轮 Token 预算自动增加到 ' + nextBudget, 'warning');
      }

      updateScenePanelUI();
      // Re-render to show action buttons
      if (state.currentConversationId === turnConvId) {
        renderMessages();
        if (!state.ui.detachedDuringStreaming) {
          scrollToBottomIfNeeded({ smooth: false });
        } else {
          updateScrollToBottomButton(true);
        }
      }

    } catch (e) {
      if (contentPromoted) {
        // Content is already visible — keep it, don't remove placeholder
        if (e.name === 'AbortError') {
          placeholderMsg.content += '\n\n[已停止]';
          placeholderMsg._showActions = false;
          if (state.currentConversationId === turnConvId) {
            renderMessages();
            showToast(ERR_MSGS.userAborted, 'info');
          }
        } else if (e.name === 'TypeError' && /fetch/i.test(e.message)) {
          if (state.currentConversationId === turnConvId) {
            showToast(ERR_MSGS.cors, 'error', 6000);
          }
        } else {
          if (state.currentConversationId === turnConvId) {
            showToast(e.message || ERR_MSGS.network, 'error');
          }
        }
      } else {
        // Content was never promoted — clean up (original behavior)
        if (e.name === 'AbortError') {
          var partialContent = (placeholderMsg.content || '').trim();
          if (partialContent) {
            placeholderMsg.content = partialContent + '\n\n[已停止]';
            placeholderMsg.displayParts = [{ content: partialContent, hideRole: false }];
            delete placeholderMsg._sceneFinalizing;
            placeholderMsg._streaming = false;
            placeholderMsg._showActions = false;
          } else {
            conv.messages.pop();
          }
          if (state.currentConversationId === turnConvId) {
            renderMessages();
            showToast(ERR_MSGS.userAborted, 'info');
          }
        } else if (e.name === 'TypeError' && /fetch/i.test(e.message)) {
          conv.messages.splice(placeholderIdx, 1);
          if (!isRegenerate) { var lui = conv.messages.length - 1; if (conv.messages[lui] && conv.messages[lui].role === 'user') conv.messages.pop(); }
          if (state.currentConversationId === turnConvId) {
            showToast(ERR_MSGS.cors, 'error', 6000);
            renderMessages();
          }
        } else {
          conv.messages.splice(placeholderIdx, 1);
          if (!isRegenerate) { var lui2 = conv.messages.length - 1; if (conv.messages[lui2] && conv.messages[lui2].role === 'user') conv.messages.pop(); }
          if (state.currentConversationId === turnConvId) {
            showToast(e.message || ERR_MSGS.network, 'error');
            renderMessages();
          }
        }
      }
    } finally {
      // Only clean up global state if this request is still the active one
      if (state.abortController === requestController) {
        state.isStreaming = false;
        state.abortController = null;
        updateScrollToBottomButton(false);
        updateSendUI();
      }
      if (placeholderMsg) {
        delete placeholderMsg._sceneFinalizing;
        placeholderMsg._streaming = false;
      }
      // Only render/scroll/toast if still on this conversation
      if (state.currentConversationId === turnConvId) {
        updateTimestamp(conv);
        updateTopBar();
        renderMessages();
        scrollToBottomIfNeeded({ smooth: false });
      }
      debouncedSave();
    }
  }

  // =========================================================================
  // buildStoryMemorySystemText — format storyMemory as short system text (~4000 chars max)
  // =========================================================================

  function buildStoryMemorySystemText(conv) {
    if (!conv || !conv.storyMemory) return '';
    var sm = conv.storyMemory;
    var hasChapters = sm.chapters && sm.chapters.length > 0;
    var hasFacts = sm.pinnedFacts && sm.pinnedFacts.length > 0;
    var hasThreads = sm.unresolvedThreads && sm.unresolvedThreads.length > 0;
    if (!hasChapters && !hasFacts && !hasThreads) return '';

    var lines = [];
    lines.push('[章节记忆]');

    // Chapters (most recent first for context relevance)
    if (hasChapters) {
      var chapters = sm.chapters;
      var startIdx = Math.max(0, chapters.length - 6); // last 6 chapters
      for (var ci = startIdx; ci < chapters.length; ci++) {
        var ch = chapters[ci];
        var chNum = ci + 1;
        var chLine = '- 第' + chNum + '章';
        if (ch.title) chLine += ' ' + ch.title;
        if (ch.summary) chLine += '：' + ch.summary;
        lines.push(clipStr(chLine, 300));
        if (ch.keyEvents && ch.keyEvents.length > 0) {
          lines.push('  关键事件：' + ch.keyEvents.slice(0, 3).join('；'));
        }
      }
    }

    // Pinned facts
    if (hasFacts) {
      lines.push('');
      lines.push('[长期事实]');
      for (var fi = 0; fi < sm.pinnedFacts.length; fi++) {
        lines.push('- ' + sm.pinnedFacts[fi]);
      }
    }

    // Unresolved threads
    if (hasThreads) {
      lines.push('');
      lines.push('[未解决线索]');
      for (var ti = 0; ti < sm.unresolvedThreads.length; ti++) {
        lines.push('- ' + sm.unresolvedThreads[ti]);
      }
    }

    var text = lines.join('\n');
    // Hard cap to avoid bloating system prompt
    if (text.length > 4000) {
      text = text.slice(0, 3997) + '...';
    }
    return text;
  }

  // =========================================================================
  // _buildStoryMessages — construct request messages for story turns
  // Single-pass generation: no Part1/Part2 split.
  // =========================================================================

  function _buildStoryMessages(conv, userText) {
    var messages = [];
    var supportsCaching = conv.enableCaching && isAnthropicModel(resolveModel(conv));

    // System prompt
    var systemPrompt = conv.systemPrompt || '';
    if (conv.preciseMode) {
      systemPrompt = systemPrompt ? SYSTEM_PROMPT_PRECISE + '\n\n' + systemPrompt : SYSTEM_PROMPT_PRECISE;
    }
    if (isStoryStarted(conv)) {
      var worldCard = buildCharacterCard(conv);
      systemPrompt = (systemPrompt || '') + '\n[世界模式 — 当前角色卡与设定]\n' + worldCard;
    }
    // Add scene state reference (already tracked by system, NOT @@SCENE format)
    if (isStoryEnabled(conv)) {
      var ss = createSceneState(conv.sceneState);
      var sceneStateRef = [
        '\n[当前已记录场景状态 — 仅作写作参考]',
        '当前角色：' + (ss.currentRole || '未记录'),
        '当前目标：' + (ss.currentGoal || '未记录'),
        '当前姿势：' + (ss.posture || '未记录'),
        '精神状态：' + (ss.mental || '未记录') + (ss.mentalScore ? ' (' + ss.mentalScore + '/10)' : ''),
        '身体状态：' + (ss.physical || '未记录'),
        '剧情：' + (ss.plot || '未记录'),
        '上次方向：' + (ss.directions ? ss.directions.replace(/\n/g, ' / ') : '未记录'),
      ].join('\n');
      systemPrompt = (systemPrompt || '') + '\n\n' + sceneStateRef;

      // Inject chapter memory if available
      var storyMemText = retrieveStoryMemoryText(conv, userText, 4000);
      if (storyMemText) {
        systemPrompt = (systemPrompt || '') + '\n\n' + storyMemText;
      }

      // Writing rules (NO @@SCENE)
      var writingRules = [
        '',
        '写作规则：',
        '1. 请生成纯剧情正文，用第二人称"你"叙述主角的行动和感受。',
        '2. 保持详细描写和人物互动，推进剧情发展。',
        '3. 不要输出 @@SCENE 状态卡、不要输出 A/B/C/D 选项、不要输出任何元数据。',
        '4. 状态卡和选项将由系统独立生成。',
        '5. 情绪基调保持克制、自然、平稳推进。除非用户明确要求高燃、崩溃、惊险、强冲突，否则不要主动升级紧张感、危险感、心跳、压迫、失控、崩溃等描写。',
      ];
      systemPrompt = (systemPrompt || '') + '\n' + writingRules.join('\n');
    }

    if (systemPrompt) {
      var sysMsg = { role: 'system', content: systemPrompt };
      if (supportsCaching) sysMsg.cache_control = { type: 'ephemeral' };
      messages.push(sysMsg);
    }

    // Conversation history
    messages.push.apply(messages, buildConversationRequestMessages(conv, supportsCaching));

    // Reply character count constraint for world story (single pass)
    // Append to last user message for stronger adherence (vs. system message)
    var stCharLimit = conv.replyCharLimit || DEFAULTS.replyCharLimit;
    if (stCharLimit) {
      var stCharMsg = '\n\n[回复字数约束] 本轮剧情正文目标约 ' + stCharLimit + ' 字，允许 ±50 字。优先自然完整，不要为了凑字数堆砌心理描写、气氛描写或情绪升级。';
      if (conv._escalateStreak > 0) {
        stCharMsg += '\n⚠️ 上一轮回复异常（超长截断或格式不完整），本轮务必严格遵守上述字数限制。';
      }
      // Append to last user message (stronger weight than system message)
      for (var smi = messages.length - 1; smi >= 0; smi--) {
        if (messages[smi].role === 'user') {
          messages[smi].content += stCharMsg;
          break;
        }
      }
    }

    return messages;
  }

  // =========================================================================
  // STORY SCENE REPAIR — ask model to output missing @@SCENE block
  // =========================================================================

  async function repairSceneBlock(conv, narrativeText, signal) {
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
        signal: signal || (state.abortController ? state.abortController.signal : undefined),
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
        directions: dirs.map(function(d) { return d.letter + '. ' + d.content; }).join("\n"),
        characterStatuses: statuses
      };
    } catch (e) {
      if (e.name === 'AbortError') throw e;
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

    // --- Route story mode to dual-part engine ---
    // Must happen BEFORE regenFlags consumption so sendStoryTurn sees them,
    // and BEFORE userMsg push to avoid duplicate messages.
    syncLegacyToStoryMode(conv);
    repairStoryModeFlags(conv);
    if (isStoryEnabled(conv)) {
      await sendStoryTurn(text, conv);
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

    // Reply character count target constraint (regular chat only; story mode has its own in _buildStoryMessages)
    // Append to last user message for stronger adherence (vs. system message)
    var charLimit = conv.replyCharLimit || DEFAULTS.replyCharLimit;
    if (charLimit) {
      var charLimitMsg = '\n\n[回复字数约束] 本轮回复目标约 ' + charLimit + ' 字，允许 ±50 字误差（' + (charLimit - 50) + '–' + (charLimit + 50) + ' 字）。不要参考历史回复的长度，每轮独立遵守此约束。除非用户明确要求更短或更长，请严格控制在范围内，不要超出 ' + (charLimit + 50) + ' 字。';
      if (conv._escalateStreak > 0) {
        charLimitMsg += '\n⚠️ 上一轮回复异常（超长截断或格式不完整），本轮务必严格遵守上述字数限制。';
      }
      // Append to last user message (stronger weight than system message)
      for (var umi = messages.length - 1; umi >= 0; umi--) {
        if (messages[umi].role === 'user') {
          messages[umi].content += charLimitMsg;
          break;
        }
      }
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
    var requestController = state.abortController;
    var sendConvId = conv.id;
    state.isStreaming = true;
    resetStreamFollowState();
    updateSendUI();

    const pConf = getProviderConfig(conv.provider);

    // --- Non-blocking context-length hint when auto-compress is off ---
    if (!conv.autoCompress && countApproxChars(conv) > REQUEST_CHAR_SOFT_LIMIT) {
      showToast('上下文较长，可能被服务商拒绝。你可以手动开启自动压缩或清理历史。', 'warning', 4000);
    }

    // --- Adaptive max tokens ---
    var adaptiveMaxBody = computeAdaptiveMaxTokens(conv, conv.replyCharLimit || DEFAULTS.replyCharLimit);
    var reqConv = Object.assign({}, conv, { maxTokens: adaptiveMaxBody, stream: conv.stream });

    // --- Debug budget diagnostics (before fetch) ---
    var _dbgBodyPreview = null;
    if (isDebugBudget()) {
      const headers = buildRequestHeaders(conv.provider, apiKey, conv);
      var body = buildRequestBody(reqConv, model, messages);
      _dbgBodyPreview = body;
      var diag = diagnoseRequestBudget(conv, messages, body);
      _logBudgetDebug(diag);
    }

    try {
      const headers = buildRequestHeaders(conv.provider, apiKey, conv);
      const body = buildRequestBody(reqConv, model, messages);

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
      // Data cleanup on old conv is always safe (conv is still stored).
      // Toast and render only if still on this conversation.
      if (e.name === 'AbortError') {
        assistantMsg._aborted = true;
        assistantMsg.content += '\n\n[已停止]';
        if (state.currentConversationId === sendConvId) {
          showToast(ERR_MSGS.userAborted, 'info');
        }
      } else if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
        conv.messages.pop();
        if (state.currentConversationId === sendConvId) {
          showToast(ERR_MSGS.cors, 'error', 6000);
        }
        if (isDebugBudget()) {
          console.warn('[OmniChat CORS Error] Type: TypeError/Failed to fetch. Provider:', conv.provider, 'Model:', model);
          if (_dbgBodyPreview) console.warn('[OmniChat CORS Error] Body ~', JSON.stringify(_dbgBodyPreview).length, 'bytes');
        }
      } else {
        conv.messages.pop();
        if (state.currentConversationId === sendConvId) {
          showToast(e.message || ERR_MSGS.network, 'error');
        }
      }
      if (state.currentConversationId === sendConvId) {
        preserveScrollPosition(renderMessages);
      }
    } finally {
      assistantMsg._streaming = false;
      assistantMsg._keepThinkingOpen = conv.keepThinkingOpen !== false;
      // Only clean up global state if this request is still the active one
      if (state.abortController === requestController) {
        state.isStreaming = false;
        state.abortController = null;
        updateSendUI();
      }

      // Remove empty assistant messages (no content and no error appended)
      if (assistantMsg.content === '' && conv.messages.includes(assistantMsg)) {
        conv.messages.pop();
      }

      // Extract scene state from response
      if (storyEnabled && assistantMsg.content && !assistantMsg._aborted) {
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
      if (storyEnabled && assistantMsg.content && !assistantMsg._aborted) {
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
                assistantMsg._sceneRepairFailed = true;
              }
            }
          } catch (repairErr) {
            console.warn('[OmniChat] Scene repair error:', repairErr.message || repairErr);
          }
        }
      }

      // --- Adaptive token tracking + truncation warning ---
      recordTokenUsage(conv, assistantMsg.usage,
        stripStoryMetaFromVisibleContent(assistantMsg.content || '').length,
        assistantMsg.finishReason);
      if (assistantMsg._sceneRepairFailed) {
        conv._escalateStreak = (conv._escalateStreak || 0) + 1;
      }
      if (assistantMsg.finishReason === 'length' && state.currentConversationId === sendConvId) {
        var nextBudget = computeAdaptiveMaxTokens(conv, conv.replyCharLimit || DEFAULTS.replyCharLimit);
        showToast('回复被截断。下轮 Token 预算自动增加到 ' + nextBudget, 'warning');
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

      // Only update UI if still on this conversation
      if (state.currentConversationId === sendConvId) {
        updateTimestamp(conv);
        updateTopBar();

        // Always do final render so markdown/actions are properly formatted,
        // even if user scrolled away during streaming. Skip auto-scroll when
        // detached so we don't yank the user away from what they're reading.
        fullRenderMessages(conv.messages);
        if (!state.ui.detachedDuringStreaming) {
          scrollToBottomIfNeeded({ smooth: false });
        }
        updateScrollToBottomButton(state.ui.detachedDuringStreaming);
      }
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
    var turnConvId = conv.id;
    var turnController = state.abortController;
    function isCurrentTurn() {
      return state.currentConversationId === turnConvId && state.abortController === turnController;
    }

    let renderScheduled = false;
    let lastRenderAt = 0;
    const minRenderGap = 28; // ~35fps throttle, balanced for mobile — smooth on high-refresh, safe on low-end

    // Flush final state: awaitable, cancels pending scheduleRender to avoid race
    const flushFinalRender = () => {
      return new Promise(function(resolve) {
        renderScheduled = false; // cancel any pending timer
        assistantMsg._streaming = false;
        if (!isCurrentTurn()) { resolve(); return; }
        requestAnimationFrame(function() {
          renderMessages();
          scrollToBottomIfNeeded({ smooth: false });
          updateScrollToBottomButton(false);
          resolve();
        });
      });
    };

    const scheduleRender = () => {
      if (!isCurrentTurn()) return;
      if (renderScheduled) return;

      renderScheduled = true;
      // Read phase: cache scroll state BEFORE any DOM writes
      var sc = getScrollContainer();
      var wasNearBottom = sc && isNearBottom(sc, 120);
      requestAnimationFrame(() => {
        // Re-check current turn inside the async callback
        if (!isCurrentTurn()) { renderScheduled = false; return; }
        var now = performance.now();
        if (now - lastRenderAt < minRenderGap) {
          // Too soon — skip this frame, next SSE chunk will retry
          renderScheduled = false;
          return;
        }
        // Write phase: update bubble, then decide scroll based on cached read
        updateLastBubble(assistantMsg);
        if (state.ui.detachedDuringStreaming) {
          updateScrollToBottomButton(true);
        } else if (state.ui.autoFollowStreaming) {
          if (wasNearBottom) { scheduleFollowScroll(120); }
        } else {
          updateScrollToBottomButton(false);
        }
        lastRenderAt = performance.now();
        renderScheduled = false;
      });
    };

    // Shared helper: process one SSE data line, returns true on [DONE]
    function processDataLine(dataStr) {
      if (dataStr === '[DONE]') return true;
      try {
        var parsed = JSON.parse(dataStr);
        var delta = parseStreamDelta(conv.provider, parsed);
        if (delta.reasoning) assistantMsg.reasoning = (assistantMsg.reasoning || '') + delta.reasoning;
        if (delta.content) assistantMsg.content += delta.content;
        if (delta.usage) assistantMsg.usage = delta.usage;
        if (delta.finishReason) assistantMsg.finishReason = delta.finishReason;
        if (delta.content || delta.reasoning) scheduleRender();
      } catch (_) { /* skip unparseable chunks */ }
      return false;
    }

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
          if (processDataLine(trimmed.slice(5).trim())) {
            await flushFinalRender();
            if (isCurrentTurn()) {
              state.ui.detachedDuringStreaming = false;
              state.ui.detachedContentDirty = false;
              updateScrollToBottomButton(false);
            }
            return;
          }
        }
      }

      // Process remaining buffer — split into lines, reuse same logic
      buffer += decoder.decode();
      if (buffer.trim()) {
        var finalLines = buffer.split('\n');
        for (var fli = 0; fli < finalLines.length; fli++) {
          var finalTrimmed = finalLines[fli].trim();
          if (!finalTrimmed || !finalTrimmed.startsWith('data:')) continue;
          processDataLine(finalTrimmed.slice(5).trim());
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
      state.ui.detachedDuringStreaming = false;
      state.ui.detachedContentDirty = false;
      updateScrollToBottomButton(false);
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
      dom.btnSend.classList.add('hidden-streaming');
      dom.btnStop.classList.remove('hidden-streaming');
      dom.inputMessage.disabled = true;
      dom.btnSend.classList.remove('has-text');
    } else {
      dom.btnSend.classList.remove('hidden-streaming');
      dom.btnStop.classList.add('hidden-streaming');
      dom.inputMessage.disabled = false;
      dom.btnSend.classList.toggle('has-text', dom.inputMessage.value.trim().length > 0);
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
    dom.btnToggleHistory?.addEventListener('click', () => openDrawer('history'));
    dom.btnCloseHistory?.addEventListener('click', () => closeDrawer('history'));
    dom.historyOverlay?.addEventListener('click', () => closeDrawer('history'));
    dom.btnToggleArchived?.addEventListener('click', () => toggleShowArchived());

    // Settings drawer
    dom.btnToggleSettings?.addEventListener('click', () => openDrawer('settings'));
    dom.btnToggleBg?.addEventListener('click', () => openDrawer('theme'));
    if (dom.btnCloseTheme) dom.btnCloseTheme?.addEventListener('click', () => closeDrawer('theme'));
    if (dom.themeOverlay) dom.themeOverlay?.addEventListener('click', () => closeDrawer('theme'));
    dom.btnCloseSettings?.addEventListener('click', () => closeDrawer('settings'));
    dom.settingsOverlay?.addEventListener('click', () => closeDrawer('settings'));

    // Welcome actions
    if (dom.btnWelcomeSetup) {
      dom.btnWelcomeSetup?.addEventListener('click', () => openDrawer('settings'));
    }
    if (dom.btnWelcomeHistory) {
      dom.btnWelcomeHistory?.addEventListener('click', () => openDrawer('history'));
    }

    // Top bar title click → rename
    dom.topBarInfo?.addEventListener('click', () => {
      const conv = getCurrentConv();
      if (conv) renameConversation(conv.id);
    });

    // Conversation list clicks
    dom.convList?.addEventListener('click', (e) => {
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
    dom.searchInput?.addEventListener('input', () => renderConvList());

    // Settings changes - auto save
    dom.selectProvider?.addEventListener('change', () => { syncSettingsFromUI(); updateMaxTokensCap(); });
    dom.inputApiKey?.addEventListener('input', () => {
      const provider = dom.selectProvider.value;
      state.apiKeys[provider] = dom.inputApiKey.value.trim();
      updateWelcomeUI();
      saveToStorage();
    });
    dom.selectModel?.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.model = dom.selectModel.value;
        updateTimestamp(conv);
        updateTopBar();
        updateWelcomeUI();
        debouncedSave();
      }
    });
    dom.inputCustomModel?.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.customModel = dom.inputCustomModel.value.trim();
        updateTimestamp(conv);
        updateTopBar();
        updateWelcomeUI();
        debouncedSave();
      }
    });
    dom.inputSystemPrompt?.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.systemPrompt = dom.inputSystemPrompt.value;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    dom.inputTemperature?.addEventListener('input', () => {
      dom.tempVal.textContent = dom.inputTemperature.value;
      const conv = getCurrentConv();
      if (conv) {
        conv.temperature = parseFloat(dom.inputTemperature.value);
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    dom.inputTopP?.addEventListener('input', () => {
      dom.topPVal.textContent = dom.inputTopP.value;
      const conv = getCurrentConv();
      if (conv) {
        conv.topP = parseFloat(dom.inputTopP.value);
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    dom.inputMaxTokens?.addEventListener('input', () => {
      updateMaxTokensCap();
      const conv = getCurrentConv();
      if (conv) {
        conv.maxTokens = parseInt(dom.inputMaxTokens.value, 10) || DEFAULTS.maxTokens;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    if (dom.inputReplyCharLimit) {
      var syncReplyCharLimit = function() {
        var conv = getCurrentConv();
        if (conv) {
          conv.replyCharLimit = parseInt(dom.inputReplyCharLimit.value, 10) || DEFAULTS.replyCharLimit;
          updateTimestamp(conv);
          debouncedSave();
        }
      };
      dom.inputReplyCharLimit?.addEventListener('input', syncReplyCharLimit);
      dom.inputReplyCharLimit?.addEventListener('change', syncReplyCharLimit);
    }
    dom.inputStream?.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.stream = dom.inputStream.checked;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    dom.inputCaching?.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.enableCaching = dom.inputCaching.checked;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    if (dom.inputStoryMode) dom.inputStoryMode?.addEventListener('change', () => {
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
    dom.inputAutoCompress?.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.autoCompress = dom.inputAutoCompress.checked;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    dom.inputKeepThinking?.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.keepThinkingOpen = dom.inputKeepThinking.checked;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    if (dom.inputSceneDetail) dom.inputSceneDetail?.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.sceneDetailLevel = dom.inputSceneDetail.value;
        updateTimestamp(conv);
        debouncedSave();
      }
    });

    // Story aux provider
    if (dom.selectStoryAuxProvider) dom.selectStoryAuxProvider?.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.storyAuxProvider = dom.selectStoryAuxProvider.value;
        updateTimestamp(conv);
        debouncedSave();
      }
      // Reflect stored aux key for the newly selected provider, if any
      if (dom.inputStoryAuxApiKey) {
        var auxProv = dom.selectStoryAuxProvider.value;
        var savedKey = (getCurrentConv() && getCurrentConv().storyAuxApiKey) || '';
        dom.inputStoryAuxApiKey.value = savedKey;
      }
    });

    // Story aux API key
    if (dom.inputStoryAuxApiKey) {
      dom.inputStoryAuxApiKey?.addEventListener('input', () => {
        var conv = getCurrentConv();
        if (conv) {
          conv.storyAuxApiKey = dom.inputStoryAuxApiKey.value.trim();
          updateTimestamp(conv);
          debouncedSave();
        }
      });
    }

    // Story aux model preset dropdown → toggle custom input
    if (dom.selectStoryAuxModel && dom.inputStoryAuxModel) {
      dom.selectStoryAuxModel?.addEventListener('change', () => {
        var isCustom = dom.selectStoryAuxModel.value === '__custom__';
        var customRow = document.getElementById('storyAuxCustomRow');
        if (customRow) customRow.hidden = !isCustom;
        if (!isCustom) dom.inputStoryAuxModel.value = '';
        syncSettingsFromUI();
      });
      dom.inputStoryAuxModel?.addEventListener('input', () => {
        syncSettingsFromUI();
      });
    }

    // Story aux max tokens
    if (dom.inputStoryAuxMaxTokens) {
      var syncStoryAuxMaxTokens = function() {
        var conv = getCurrentConv();
        if (conv) {
          conv.storyAuxMaxTokens = parseInt(dom.inputStoryAuxMaxTokens.value, 10) || DEFAULTS.storyAuxMaxTokens;
          updateTimestamp(conv);
          debouncedSave();
        }
      };
      dom.inputStoryAuxMaxTokens?.addEventListener('input', syncStoryAuxMaxTokens);
      dom.inputStoryAuxMaxTokens?.addEventListener('change', syncStoryAuxMaxTokens);
    }

    dom.inputPreciseMode?.addEventListener('change', () => {
      const conv = getCurrentConv();
      if (conv) {
        conv.preciseMode = dom.inputPreciseMode.checked;
        if (conv.preciseMode) {
          conv._savedTemperature = conv.temperature;
          conv.temperature = 0.2;
        } else {
          conv.temperature = conv._savedTemperature !== undefined && conv._savedTemperature !== null ? conv._savedTemperature : DEFAULTS.temperature;
          conv._savedTemperature = undefined;
        }
        dom.inputTemperature.value = String(conv.temperature);
        dom.tempVal.textContent = conv.temperature;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    dom.selectToolCallLimit?.addEventListener('change', () => {
      updateToolWarning();
      const conv = getCurrentConv();
      if (conv) {
        conv.toolCallLimit = 0;
        conv.toolCallLimitMode = 'disabled';
        updateTimestamp(conv);
        debouncedSave();
      }
    });

    dom.btnRefreshModels?.addEventListener('click', () => refreshModels());

    // Background presets
    dom.bgPresets?.addEventListener('click', (e) => {
      const btn = e.target.closest('.bg-preset');
      if (!btn) return;
      const themeKey = btn.dataset.theme;
      if (themeKey === 'none' || !themeKey) {
        clearTheme();
      } else {
        applyTheme(themeKey);
      }
    });
    // GitHub URL apply button
    dom.btnApplyBgUrl?.addEventListener('click', () => {
      const url = dom.inputBgUrl.value.trim();
      if (!url) { showToast('请输入图片 URL', 'warning'); return; }
      if (!url.startsWith('http://') && !url.startsWith('https://')) { showToast('URL 必须以 http:// 或 https:// 开头', 'warning'); return; }
      setChatBackground('url', url);
      dom.inputBgUrl.value = '';
      showToast('背景已应用', 'success');
    });
    dom.btnPickBgImage?.addEventListener('click', () => dom.inputBgFile.click());
    dom.btnRemoveBgImage?.addEventListener('click', () => removeBgImage());

    // Scene panel
    dom.scenePanelToggle?.addEventListener('click', () => {
      dom.scenePanel.classList.toggle('collapsed');
    });
    if (dom.sceneMental) dom.sceneMental?.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv && conv.sceneState) {
        conv.sceneState.mental = dom.sceneMental.value;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    if (dom.sceneMentalScore) dom.sceneMentalScore?.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv && conv.sceneState) {
        conv.sceneState.mentalScore = normalizeMentalScore(dom.sceneMentalScore.value);
        dom.sceneMentalScore.value = conv.sceneState.mentalScore;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    if (dom.scenePhysical) dom.scenePhysical?.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv && conv.sceneState) {
        conv.sceneState.physical = dom.scenePhysical.value;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    if (dom.scenePlot) dom.scenePlot?.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv && conv.sceneState) {
        conv.sceneState.plot = dom.scenePlot.value;
        updateTimestamp(conv);
        debouncedSave();
      }
    });
    if (dom.sceneDirections) dom.sceneDirections?.addEventListener('input', () => {
      const conv = getCurrentConv();
      if (conv && conv.sceneState) {
        conv.sceneState.directions = dom.sceneDirections.value;
        updateTimestamp(conv);
        debouncedSave();
      }
    });


    // Scene panel tab switching
    if (dom.sceneTabs) {
      dom.sceneTabs?.addEventListener('click', function(e) {
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
    dom.sceneOpeningName?.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneWorld) { conv.sceneWorld.openingName = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneSetting?.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneWorld) { conv.sceneWorld.setting = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneLocations?.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneWorld) { conv.sceneWorld.locations = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneRules?.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneWorld) { conv.sceneWorld.rules = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneMood?.addEventListener('change', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneWorld) { conv.sceneWorld.mood = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneWorldNotes?.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneWorld) { conv.sceneWorld.notes = this.value; updateTimestamp(conv); debouncedSave(); }
    });

    // Character card inputs
    dom.sceneCharName?.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneCharacter) { conv.sceneCharacter.name = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneCharAge?.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneCharacter) { conv.sceneCharacter.age = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneCharRole?.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneCharacter) { conv.sceneCharacter.role = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    if (dom.sceneCharSpecies) dom.sceneCharSpecies?.addEventListener('change', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneCharacter) { conv.sceneCharacter.species = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneCharAppearance?.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneCharacter) { conv.sceneCharacter.appearance = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneCharTraits?.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneCharacter) { conv.sceneCharacter.traits = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneCharStats?.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneCharacter) { conv.sceneCharacter.stats = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneCharGoal?.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneCharacter) { conv.sceneCharacter.currentGoal = this.value; updateTimestamp(conv); debouncedSave(); }
    });

    // Copy character card button
    if (dom.btnCopyCharCard) dom.btnCopyCharCard?.addEventListener('click', function() { if(!checkAge18Plus()) return;
      var conv = getCurrentConv();
      if (!conv) return;
      var card = buildCharacterCard(conv);
      if (!card) { showToast('角色卡为空，请先填写', 'warning'); return; }
      copyTextToClipboard(card, '角色卡已复制到剪贴板');
    });

    // Generate opening prompt button (hidden from UI, guarded)
    if (dom.btnGenOpeningPrompt) dom.btnGenOpeningPrompt?.addEventListener('click', function() { if(!checkAge18Plus()) return;
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
      dom.sceneStatusToggle?.addEventListener('click', function() {
        dom.sceneStatusCard.classList.toggle('collapsed');
      });
    }
    // NPC card toggle
    if (dom.sceneNpcToggle) {
      dom.sceneNpcToggle?.addEventListener('click', function() {
        dom.sceneNpcCard.classList.toggle('collapsed');
      });
    }
    // Add NPC button
    if (dom.btnAddNpc) {
      dom.btnAddNpc?.addEventListener('click', function() { addNpc(); });
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
        field.dom?.addEventListener('input', function() {
          var conv = getCurrentConv();
          if (conv && conv.sceneStatus) { conv.sceneStatus[field.key] = this.value; updateTimestamp(conv); debouncedSave(); }
        });
      })(statusFields[si]);
    }
    dom.sceneObjective?.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneStatus) { conv.sceneStatus.currentObjective = this.value; updateTimestamp(conv); debouncedSave(); }
    });
    dom.sceneConstraints?.addEventListener('input', function() {
      var conv = getCurrentConv();
      if (conv && conv.sceneStatus) { conv.sceneStatus.constraints = this.value; updateTimestamp(conv); debouncedSave(); }
    });

    // World/Character cards removed (now tabbed) — toggles handled by tab switching

    // Message action buttons (event delegation)
    dom.messagesContainer?.addEventListener('click', (e) => {
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

        var choiceText = '我选择 ' + letter + '：' + (chip.dataset.content || '') + '。请沿这个分支继续。';
        sendMessageContent(choiceText).catch(function (err) {
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
    dom.inputBgFile?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleBgImagePick(e.target.files[0]);
        e.target.value = '';
      }
    });
    // Custom action prompts
    dom.inputActionRegenerate?.addEventListener('input', () => {
      state.actionPrompts.regenerate = dom.inputActionRegenerate.value.trim();
      debouncedSave();
    });
    dom.inputActionContinue?.addEventListener('input', () => {
      state.actionPrompts.continue = dom.inputActionContinue.value.trim();
      debouncedSave();
    });
    dom.inputActionSummarize?.addEventListener('input', () => {
      state.actionPrompts.summarize = dom.inputActionSummarize.value.trim();
      debouncedSave();
    });
    dom.inputActionElaborate?.addEventListener('input', () => {
      state.actionPrompts.elaborate = dom.inputActionElaborate.value.trim();
      debouncedSave();
    });

    dom.inputBgOpacity?.addEventListener('input', () => {
      const val = parseInt(dom.inputBgOpacity.value, 10);
      state.chatBackground.opacity = val;
      applyChatBackground();
      saveToStorage();
    });
    // --- Background adjustment overlay ---
    let adjState = { scale: 1, x: 0, y: 0, dragging: false, startX: 0, startY: 0, imgX: 0, imgY: 0 };
    dom.btnAdjustBg && dom.btnAdjustBg?.addEventListener('click', () => {
      const t = CHARACTER_THEMES[state.activeTheme];
      const src = t ? t.wallpaper : (state.chatBackground.value || '');
      if (!src) { showToast('请先选择主题', 'warning'); return; }
      dom.bgAdjustImage.src = src;
      // Restore saved scale and position
      var savedScale = bgOverride('scale', 100);
      adjState.scale = savedScale / 100;
      var vpw = dom.bgAdjustViewport.clientWidth;
      var vph = dom.bgAdjustViewport.clientHeight;
      var posX = bgOverride('posX', 50);
      var posY = bgOverride('posY', 50);
      var iw = dom.bgAdjustImage.naturalWidth * adjState.scale;
      var ih = dom.bgAdjustImage.naturalHeight * adjState.scale;
      if (iw && ih) {
        adjState.x = vpw/2 - iw * (posX/100 - 0.5);
        adjState.y = vph/2 - ih * (posY/100 - 0.5);
      } else {
        adjState.x = 0; adjState.y = 0;
      }
      dom.bgAdjustImage.style.transform = 'translate(' + adjState.x + 'px,' + adjState.y + 'px) scale(' + adjState.scale + ')';
      dom.bgAdjustOverlay.classList.add('open');
    });
    dom.btnResetBg && dom.btnResetBg?.addEventListener('click', () => {
      const t = CHARACTER_THEMES[state.activeTheme];
      const src = t ? t.wallpaper : (state.chatBackground.value || '');
      if (!src) { showToast('没有可调整的背景图片', 'warning'); return; }
      if (state.activeTheme) {
        setBgOverride('scale', 100);
        setBgOverride('posX', 50);
        setBgOverride('posY', 50);
      } else {
        state.chatBackground.scale = 100;
        state.chatBackground.posX = 50;
        state.chatBackground.posY = 50;
      }
      applyBgControls(); saveToStorage();
      showToast('背景位置已还原', 'success');
    });
    dom.btnBgAdjustClose?.addEventListener('click', () => dom.bgAdjustOverlay.classList.remove('open'));
    dom.btnBgAdjustSave?.addEventListener('click', () => {
      setBgOverride('scale', Math.round(adjState.scale * 100));
      // Calculate position offset as percentage of image size vs viewport
      var vpw = dom.bgAdjustViewport.clientWidth;
      var vph = dom.bgAdjustViewport.clientHeight;
      var iw = dom.bgAdjustImage.naturalWidth * adjState.scale;
      var ih = dom.bgAdjustImage.naturalHeight * adjState.scale;
      setBgOverride('posX', Math.round(Math.max(0, Math.min(100, ((vpw/2 - adjState.x) / iw * 100 + 50)))));
      setBgOverride('posY', Math.round(Math.max(0, Math.min(100, ((vph/2 - adjState.y) / ih * 100 + 50)))));
      applyBgControls(); saveToStorage();
      dom.bgAdjustOverlay.classList.remove('open');
    });
    // Mouse wheel zoom
    dom.bgAdjustViewport && dom.bgAdjustViewport?.addEventListener('wheel', (e) => {
      e.preventDefault();
      var ds = e.deltaY < 0 ? 1.08 : 0.92;
      adjState.scale = Math.max(0.2, Math.min(5, adjState.scale * ds));
      dom.bgAdjustImage.style.transform = 'translate(' + adjState.x + 'px,' + adjState.y + 'px) scale(' + adjState.scale + ')';
    }, { passive: false });
    // Mouse drag
    dom.bgAdjustImage && dom.bgAdjustImage?.addEventListener('mousedown', (e) => {
      adjState.dragging = true; adjState.startX = e.clientX; adjState.startY = e.clientY;
      adjState.imgX = adjState.x; adjState.imgY = adjState.y;
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!adjState.dragging) return;
      adjState.x = adjState.imgX + (e.clientX - adjState.startX);
      adjState.y = adjState.imgY + (e.clientY - adjState.startY);
      dom.bgAdjustImage.style.transform = 'translate(' + adjState.x + 'px,' + adjState.y + 'px) scale(' + adjState.scale + ')';
    });
    window.addEventListener('mouseup', () => { adjState.dragging = false; });
    // Touch gestures
    let tStartDist = 0, tStartScale = 1;
    dom.bgAdjustImage?.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        adjState.dragging = true; adjState.startX = e.touches[0].clientX; adjState.startY = e.touches[0].clientY;
        adjState.imgX = adjState.x; adjState.imgY = adjState.y;
      } else if (e.touches.length === 2) {
        adjState.dragging = false;
        tStartDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        tStartScale = adjState.scale;
      }
    }, { passive: false });
    dom.bgAdjustImage?.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && adjState.dragging) {
        adjState.x = adjState.imgX + (e.touches[0].clientX - adjState.startX);
        adjState.y = adjState.imgY + (e.touches[0].clientY - adjState.startY);
      } else if (e.touches.length === 2) {
        var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        adjState.scale = Math.max(0.2, Math.min(5, tStartScale * d / tStartDist));
      }
      dom.bgAdjustImage.style.transform = 'translate(' + adjState.x + 'px,' + adjState.y + 'px) scale(' + adjState.scale + ')';
    }, { passive: false });
    dom.bgAdjustImage?.addEventListener('touchend', () => { adjState.dragging = false; tStartDist = 0; });

    // Gesture-based background scale + position (per-theme or custom bg)
    function bgOverride(key, def) {
      if (state.activeTheme) {
        return state.themeOverrides[state.activeTheme] && state.themeOverrides[state.activeTheme][key] != null
          ? state.themeOverrides[state.activeTheme][key] : def;
      }
      return state.chatBackground[key] != null ? state.chatBackground[key] : def;
    }
    function setBgOverride(key, val) {
      if (state.activeTheme) {
        if (!state.themeOverrides[state.activeTheme]) state.themeOverrides[state.activeTheme] = {};
        state.themeOverrides[state.activeTheme][key] = val;
      } else {
        state.chatBackground[key] = val;
      }
    }
    let bgGestureStart = null;
    dom.chatBgOverlay?.addEventListener('wheel', (e) => {
      if (!state.ui.isThemeOpen) return;
      e.preventDefault();
      const cur = bgOverride('scale', 100);
      const scale = cur + (e.deltaY < 0 ? 8 : -8);
      setBgOverride('scale', Math.max(50, Math.min(200, scale)));
      applyBgControls(); saveToStorage();
    }, { passive: false });
    dom.chatBgOverlay?.addEventListener('mousedown', (e) => {
      if (!state.ui.isThemeOpen) return;
      bgGestureStart = { x: e.clientX, y: e.clientY, posX: bgOverride('posX', 50), posY: bgOverride('posY', 50) };
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!bgGestureStart) return;
      const dx = (e.clientX - bgGestureStart.x) / window.innerWidth * 100;
      const dy = (e.clientY - bgGestureStart.y) / window.innerHeight * 100;
      setBgOverride('posX', Math.max(0, Math.min(100, bgGestureStart.posX + dx)));
      setBgOverride('posY', Math.max(0, Math.min(100, bgGestureStart.posY + dy)));
      applyBgControls();
    });
    window.addEventListener('mouseup', () => {
      if (bgGestureStart) { saveToStorage(); bgGestureStart = null; }
    });
    // Touch: pinch zoom + drag pan
    let touchStartDist = 0, touchStartScale = 100;
    dom.chatBgOverlay?.addEventListener('touchstart', (e) => {
      if (!state.ui.isThemeOpen) return;
      if (e.touches.length === 1) {
        bgGestureStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, posX: bgOverride('posX', 50), posY: bgOverride('posY', 50) };
      } else if (e.touches.length === 2) {
        bgGestureStart = null;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.hypot(dx, dy);
        touchStartScale = bgOverride('scale', 100);
      }
    }, { passive: false });
    dom.chatBgOverlay?.addEventListener('touchmove', (e) => {
      if (!state.ui.isThemeOpen) return;
      if (e.touches.length === 1 && bgGestureStart) {
        const dx = (e.touches[0].clientX - bgGestureStart.x) / window.innerWidth * 100;
        const dy = (e.touches[0].clientY - bgGestureStart.y) / window.innerHeight * 100;
        setBgOverride('posX', Math.max(0, Math.min(100, bgGestureStart.posX + dx)));
        setBgOverride('posY', Math.max(0, Math.min(100, bgGestureStart.posY + dy)));
        applyBgControls();
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (touchStartDist > 0) {
          setBgOverride('scale', Math.max(50, Math.min(200, Math.round(touchStartScale * dist / touchStartDist))));
          applyBgControls();
        }
      }
    }, { passive: false });
    dom.chatBgOverlay?.addEventListener('touchend', () => {
      if (bgGestureStart) { saveToStorage(); bgGestureStart = null; }
      touchStartDist = 0;
    });

    dom.inputBgBrightness?.addEventListener('input', () => {
      const val = parseInt(dom.inputBgBrightness.value, 10);
      if (state.activeTheme) setBgOverride('brightness', val);
      else state.chatBackground.brightness = val;
      applyBgControls(); saveToStorage();
    });
    dom.inputUIOpacity?.addEventListener('input', () => {
      state.chatBackground.inputOpacity = parseInt(dom.inputUIOpacity.value, 10);
      applyBgControls(); saveToStorage();
    });
    dom.inputBubbleOpacity?.addEventListener('input', () => {
      state.chatBackground.bubbleOpacity = parseInt(dom.inputBubbleOpacity.value, 10);
      applyBgControls(); saveToStorage();
    });

    // Send / Stop
    dom.btnSend?.addEventListener('click', () => sendMessage());
    dom.btnStop?.addEventListener('click', () => stopCurrentRequest());
    dom.inputMessage?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!state.isStreaming) sendMessage();
      }
    });

    // Auto-resize textarea
    dom.inputMessage?.addEventListener('input', () => {
      dom.inputMessage.style.height = 'auto';
      dom.inputMessage.style.height = Math.min(dom.inputMessage.scrollHeight, 120) + 'px';
      updateBottomBarHeight();
      // Toggle send button breathe glow when input has text
      var hasText = dom.inputMessage.value.trim().length > 0;
      dom.btnSend.classList.toggle('has-text', hasText && !state.isStreaming);
    });

    // --- Quick Memory Panel ---
    var _memoryTl = null;

    var memoryToggle = function(force) {
      var isOpen = dom.memoryPanel.classList.contains('open');
      var shouldOpen = typeof force === 'boolean' ? force : !isOpen;

      // Kill any in-progress animation to prevent overlap
      if (_memoryTl) { _memoryTl.kill(); _memoryTl = null; }

      // Reduced motion: instant toggle, skip all animation
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (shouldOpen) {
          dom.memoryPanel.classList.add('open');
          dom.memoryPanel.style.maxHeight = '200px';
          dom.memoryPanel.style.opacity = '1';
          dom.memoryPanel.style.marginBottom = '8px';
          dom.btnQuickMemory.setAttribute('aria-expanded', 'true');
          dom.memoryInput.focus();
        } else {
          dom.memoryPanel.classList.remove('open');
          dom.memoryPanel.style.maxHeight = '0px';
          dom.memoryPanel.style.opacity = '0';
          dom.memoryPanel.style.marginBottom = '0px';
          dom.btnQuickMemory.setAttribute('aria-expanded', 'false');
        }
        updateBottomBarHeight();
        return;
      }

      if (shouldOpen) {
        dom.memoryPanel.classList.add('open');
        dom.btnQuickMemory.setAttribute('aria-expanded', 'true');

        _memoryTl = gsap.timeline({ onComplete: function() {
          updateBottomBarHeight();
          dom.memoryInput.focus();
        }});

        // Panel expand
        _memoryTl.to(dom.memoryPanel, {
          maxHeight: 200,
          opacity: 1,
          marginBottom: 8,
          duration: 0.38,
          ease: 'power3.out'
        }, 0);

        // Inner content slides up with stagger
        _memoryTl.from('.memory-panel-inner', {
          y: 12,
          autoAlpha: 0,
          duration: 0.32,
          ease: 'power2.out'
        }, 0.06);
        _memoryTl.from('.memory-input', {
          y: 8,
          autoAlpha: 0,
          duration: 0.24,
          ease: 'power2.out'
        }, 0.12);
        _memoryTl.from('.memory-actions', {
          y: 6,
          autoAlpha: 0,
          duration: 0.22,
          ease: 'power2.out'
        }, 0.18);
      } else {
        // Collapse: reverse stagger — buttons disappear first, then input, then panel
        _memoryTl = gsap.timeline({ onComplete: function() {
          dom.memoryPanel.classList.remove('open');
          dom.btnQuickMemory.setAttribute('aria-expanded', 'false');
          gsap.set(dom.memoryPanel, { clearProps: 'all' });
          updateBottomBarHeight();
        }});

        _memoryTl.to('.memory-actions', {
          y: 4,
          autoAlpha: 0,
          duration: 0.16,
          ease: 'power2.in'
        }, 0);
        _memoryTl.to('.memory-input', {
          y: 6,
          autoAlpha: 0,
          duration: 0.18,
          ease: 'power2.in'
        }, 0.04);
        _memoryTl.to('.memory-panel-inner', {
          y: 8,
          autoAlpha: 0,
          duration: 0.22,
          ease: 'power2.in'
        }, 0.08);
        _memoryTl.to(dom.memoryPanel, {
          maxHeight: 0,
          opacity: 0,
          marginBottom: 0,
          duration: 0.32,
          ease: 'power3.in'
        }, 0.1);
      }
    };

    dom.btnQuickMemory?.addEventListener('click', function(e) {
      e.stopPropagation();
      memoryToggle();
    });

    // Escape closes memory panel
    dom.memoryInput?.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { memoryToggle(false); }
    });

    dom.btnMemorySave?.addEventListener('click', function() {
      var text = dom.memoryInput.value.trim();
      if (!text) return;
      var conv = getCurrentConv();
      if (!conv) return;
      var ts = '[' + new Date().toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', month: 'numeric', day: 'numeric' }) + '] ';
      var entry = ts + text;
      // Append to sceneWorld.notes
      if (!conv.sceneWorld) conv.sceneWorld = {};
      conv.sceneWorld.notes = conv.sceneWorld.notes ? conv.sceneWorld.notes + '\n' + entry : entry;
      // Sync to storyMode.world.notes if story mode is active
      if (conv.storyMode && conv.storyMode.world) {
        conv.storyMode.world.notes = conv.storyMode.world.notes ? conv.storyMode.world.notes + '\n' + entry : entry;
      }
      dom.memoryInput.value = '';
      memoryToggle(false);
      updateTimestamp(conv);
      saveToStorage();
      updateScenePanelUI();
    });

    dom.btnMemoryClear?.addEventListener('click', function() {
      dom.memoryInput.value = '';
    });
    // --- end Quick Memory Panel ---

    // Smart scroll tracking — auto-follow unless user manually scrolls away
    function updateTopBarScrollState() {
      var el = getScrollContainer();
      if (!el || !dom.topBar) return;
      dom.topBar.classList.toggle('scrolled', el.scrollTop > 20);
    }

    var scrollTick = false;
    var onScrollEvent = function() {
      if (!scrollTick) {
        scrollTick = true;
        requestAnimationFrame(function() {
          onUserScrollIntent();
          updateTopBarScrollState();
          scrollTick = false;
        });
      }
    };
    dom.mainContent?.addEventListener('scroll', onScrollEvent, { passive: true });
    dom.mainContent?.addEventListener('wheel', onScrollEvent, { passive: true });
    dom.mainContent?.addEventListener('touchstart', function() { state.ui.programmaticScroll = false; }, { passive: true });
    dom.mainContent?.addEventListener('touchmove', onScrollEvent, { passive: true });
    dom.mainContent?.addEventListener('pointerdown', function() { state.ui.programmaticScroll = false; }, { passive: true });

    // Quick actions
    // Story editor toggle: click "世界故事 · ON" pill → open overlay editor
    if (dom.sceneCapsule) {
      dom.sceneCapsule?.addEventListener('click', function(e) {
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

    // "更多" toggle for secondary quick actions — GSAP stagger animation
    var _moreTl = null;
    var moreBtn = $('#btnQuickMore');
    if (moreBtn) {
      moreBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var qa = document.getElementById('quickActions');
        if (!qa) return;
        var expanded = !qa.classList.contains('expanded');
        var btns = qa.querySelectorAll('.btn-quick-secondary');

        // Kill in-progress animation
        if (_moreTl) { _moreTl.kill(); _moreTl = null; }

        if (expanded) {
          // 1. Set initial invisible state BEFORE display change (prevents CSS opacity flash)
          if (typeof gsap !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            gsap.set(btns, { opacity: 0, y: 6 });
          }
          // 2. Add expanded class → CSS sets display:inline-flex (buttons enter layout)
          qa.classList.add('expanded');
          moreBtn.setAttribute('aria-expanded', 'true');
          moreBtn.innerHTML = '▾ 收起'; // ▾ 收起

          if (typeof gsap !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            // 3. Defer one frame so display change settles before animating
            requestAnimationFrame(function() {
              _moreTl = gsap.timeline({
                onComplete: function() {
                  updateBottomBarHeight();
                  if (state.ui.autoFollowStreaming) {
                    var sc = getScrollContainer();
                    if (sc && isNearBottom(sc, 60)) scheduleFollowScroll(60);
                  }
                }
              });
              // 4. Animate in: opacity 0→1, y 6→0 (initial state already set via gsap.set)
              _moreTl.to(btns, {
                opacity: 1, y: 0,
                duration: 0.22,
                stagger: 0.04,
                ease: 'power2.out'
              });
            });
          } else {
            requestAnimationFrame(function() {
              updateBottomBarHeight();
              if (state.ui.autoFollowStreaming) {
                var sc = getScrollContainer();
                if (sc && isNearBottom(sc, 60)) scheduleFollowScroll(60);
              }
            });
          }
        } else {
          moreBtn.setAttribute('aria-expanded', 'false');
          moreBtn.innerHTML = '▸ 更多'; // ▸ 更多

          if (typeof gsap !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            var revBtns = Array.from(btns).reverse();
            _moreTl = gsap.timeline({
              onComplete: function() {
                // Remove expanded class only after ALL tweens finish — not mid-animation
                qa.classList.remove('expanded');
                gsap.set(btns, { clearProps: 'all' });
                updateBottomBarHeight();
              }
            });
            _moreTl.to(revBtns, {
              opacity: 0, y: 6,
              duration: 0.18,
              stagger: 0.03,
              ease: 'power2.in'
            });
          } else {
            qa.classList.remove('expanded');
            requestAnimationFrame(function() { updateBottomBarHeight(); });
          }
        }
      });
    }

    $('#btnQuickNew')?.addEventListener('click', () => newConversation());
    $('#btnQuickClear')?.addEventListener('click', () => clearCurrentConversation());
    $('#btnQuickDeleteLast')?.addEventListener('click', () => deleteLastRound());
    $('#btnQuickCopy')?.addEventListener('click', () => copyLastAssistantReply());
    $('#btnQuickPrecise')?.addEventListener('click', () => togglePreciseMode());
    $('#btnQuickExport')?.addEventListener('click', () => exportConversationMarkdown());

    // NPC image upload
    if (dom.sceneNpcGrid) {
      dom.sceneNpcGrid?.addEventListener('click', function(e) {
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
    if (dom.npcImageInput) dom.npcImageInput?.addEventListener('change', function() {
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
if (dom.btnGenHints) dom.btnGenHints?.addEventListener('click', () => generateSceneHints());
    if (dom.btnFinishSetup) dom.btnFinishSetup?.addEventListener('click', () => showSetupConfirm());
    if (dom.btnStartWorld) dom.btnStartWorld?.addEventListener('click', () => startWorldMode());

    // Export / Import / Clear all
    // Clear cache button in settings
    var btnClearCache = $('#btnClearCache');
    if (btnClearCache) {
      btnClearCache.addEventListener('click', function() {
        window.localStorage.setItem('omnichat_clear_cache', '1');
        window.location.reload();
      });
    }

    // Auth login / logout buttons
    var btnAuthLogin = $('#btnAuthLogin');
    if (btnAuthLogin) {
      btnAuthLogin.addEventListener('click', function() { handleAuthLogin(); });
    }
    var btnAuthLogout = $('#btnAuthLogout');
    if (btnAuthLogout) {
      btnAuthLogout.addEventListener('click', function() { handleAuthLogout(); });
    }

    dom.btnExportAll?.addEventListener('click', () => exportAllJSON());
    dom.btnImport?.addEventListener('click', () => dom.importFileInput.click());
    dom.btnClearAll?.addEventListener('click', () => clearAllConversations());
    dom.btnClearArchived?.addEventListener('click', () => clearArchivedConversations());
    dom.importFileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        importJSON(e.target.files[0]);
        e.target.value = '';
      }
    });

    // Dialog
    dom.dialogConfirm?.addEventListener('click', () => {
      if (state.pendingConfirmAction) state.pendingConfirmAction();
    });
    dom.dialogCancel?.addEventListener('click', () => hideConfirm());

    // Rename dialog
    dom.renameConfirm?.addEventListener('click', () => doRename());
    dom.renameCancel?.addEventListener('click', () => hideRenameDialog());
    dom.renameInput?.addEventListener('keydown', (e) => {
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

  // Preload the active theme wallpaper so it is decoded before the splash
  // screen dismisses. Returns a Promise that resolves when the image is
  // ready (or on error / 5s timeout — never blocks splash indefinitely).
  function preloadThemeWallpaper() {
    var key = state.activeTheme;
    if (!key) return Promise.resolve();
    var t = CHARACTER_THEMES[key];
    if (!t || !t.wallpaper) return Promise.resolve();
    return new Promise(function(resolve) {
      var img = new Image();
      var done = false;
      var finish = function() {
        if (done) return;
        done = true;
        resolve();
      };
      img.onload = function() {
        if (img.decode) { img.decode().then(finish, finish); }
        else finish();
      };
      img.onerror = finish;
      img.src = t.wallpaper;
      // Safety timeout: never block splash longer than 5 s
      setTimeout(finish, 5000);
    });
  }

  // =========================================================================
  // INIT
  // =========================================================================

  function init() {
    cacheDom();
    loadFromStorage();

    // Preload current theme wallpaper so it's decoded before splash dismisses.
    // Splash dismissal is gated on this promise — see splash code below.
    var wallpaperReady = preloadThemeWallpaper();

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

    // Splash screen — dismiss after minimum timer + wallpaper decoded.
    // Gating on wallpaperReady prevents a black/white flash when the splash
    // fades out before the background image has finished decoding.
    const splashDismissed = sessionStorage.getItem('omnichat_splash');
    const onSplashDone = () => {
      document.documentElement.classList.remove('is-splashing');
      updateBottomBarHeight();
    };
    const scheduleSplashDismiss = (delay, fadeDelay) => {
      setTimeout(() => {
        wallpaperReady.then(() => {
          dom.splash.classList.add('dismissed');
          window.setTimeout(onSplashDone, fadeDelay);
        });
      }, delay);
    };
    if (splashDismissed) {
      dom.splash.style.transition = 'opacity 150ms ease, visibility 150ms ease';
      scheduleSplashDismiss(50, 220);
    } else {
      scheduleSplashDismiss(2200, 480);
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
      var isRealCommit = window.__BUILD_COMMIT__ && window.__BUILD_COMMIT__ !== 'precommit' && window.__BUILD_COMMIT__ !== 'unknown' && window.__BUILD_COMMIT__ !== 'dev';
      versionFloat.textContent = isRealCommit ? 'build: ' + window.__BUILD_COMMIT__.slice(0,7) + ' / ' + window.__BUILD_VERSION__ : 'build: ' + window.__BUILD_VERSION__;
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

    // Clean up stale activeTheme references to themes that no longer exist
    // (e.g. deleted gh-raiden/gh-jade/gh-hsr). Only clear the reference —
    // keep themeOverrides data so it's not lost if the theme is ever re-added.
    if (state.activeTheme && !CHARACTER_THEMES[state.activeTheme]) {
      state.activeTheme = '';
    }

    // Apply chat background
    applyChatBackground();
    updateBgPresetUI();
    // Add character name labels below preset buttons
    setupBgPresetLabels();
    // Restore theme if one was active
    if (state.activeTheme) {
      applyTheme(state.activeTheme);
    }

    // Warm up current active theme wallpaper only — never prefetch all wallpapers.
    // Defer to idle callback or setTimeout to avoid blocking interaction.
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => {
        const t2 = CHARACTER_THEMES[state.activeTheme];
        if (t2 && t2.wallpaper) {
          const link = document.createElement('link');
          link.rel = 'prefetch'; link.href = t2.wallpaper; link.as = 'image';
          document.head.appendChild(link);
        }
      }, { timeout: 3000 });
    } else {
      setTimeout(() => {
        const t2 = CHARACTER_THEMES[state.activeTheme];
        if (t2 && t2.wallpaper) {
          const link = document.createElement('link');
          link.rel = 'prefetch'; link.href = t2.wallpaper; link.as = 'image';
          document.head.appendChild(link);
        }
      }, 3000);
    }

    // Auto-archive stale barely-used conversations
    setTimeout(() => autoArchiveCheck(), 3000);

    // Init auth state — non-blocking, async, never delays chat
    initAuthState();

    saveToStorage();
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // Ensure API keys and state are saved even on sudden page close
  window.addEventListener('beforeunload', () => saveToStorage());

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
