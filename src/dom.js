// =========================================================================
// DOM REFS — cached once on init(), never changes.
// cacheDom() must be called once before any module reads dom.
// =========================================================================

const $ = (sel) => document.querySelector(sel);

export const dom = {};

export function cacheDom() {
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
  dom.chatBgOverlayNext = $('#chatBgOverlayNext');
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

  // 云备份 DOM 引用
  dom.cloudBackupCard = $('#cloudBackupCard');
  dom.cloudBackupLoginPrompt = $('#cloudBackupLoginPrompt');
  dom.cloudBackupStatus = $('#cloudBackupStatus');
  dom.lastBackupTime = $('#lastBackupTime');
  dom.cloudConvCount = $('#cloudConvCount');
  dom.storageUsageText = $('#storageUsageText');
  dom.storageUsageBar = $('#storageUsageBar');
  dom.btnBackupNow = $('#btnBackupNow');
  dom.btnRestoreFromCloud = $('#btnRestoreFromCloud');
  dom.cloudBackupError = $('#cloudBackupError');
}
