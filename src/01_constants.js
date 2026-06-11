  // =========================================================================
  // CONSTANTS
  // =========================================================================

  const STORAGE_KEY = 'omnichat_data';
  // Stable independent keys so API keys & user prefs survive build-version
  // changes, PWA updates, cache clearing, and main-data migration failures.
  const SECRETS_STORAGE_KEY = 'omnichat_secrets_v1';
  const PREFS_STORAGE_KEY = 'omnichat_prefs_v1';
  // =========================================================================
  // MIGRATION POLICY (read before changing any data structure)
  //
  // STORAGE_SCHEMA_VERSION tracks per-conversation data format.
  // Bump it whenever you add/rename/restructure fields on conversations
  // or messages.  Then add a migration step in normalizeConversation or
  // normalizeMessage so old data is upgraded on next load.
  //
  // Rules:
  // 1. Migration must be IDEMPOTENT – running it twice must give the same result.
  // 2. Migration must NOT delete user content or clear history.
  // 3. Render layer MUST use defensive fallbacks (e.g. displayContent || content).
  // 4. API layer MUST use defensive fallbacks (e.g. _requestContent || content).
  // 5. New code MUST handle messages/convos that lack the new fields.
  // 6. loadFromStorage / switchConversation / import JSON all call normalize.
  //
  // Use _check_stability.mjs to confirm migration integrity after changes.
  // =========================================================================
  const STORAGE_SCHEMA_VERSION = 3;
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

  // Per-provider maximum output token caps.
  // Used to validate user input before sending requests.
  const PROVIDER_CAPS = {
    openai:     { maxOutputTokens: 32000 },
    xai:        { maxOutputTokens: 32000 },
    deepseek:   { maxOutputTokens: 384000 },
    openrouter: { maxOutputTokens: 32000 },
    groq:       { maxOutputTokens: 32000 },
    moonshot:   { maxOutputTokens: 32000 },
    zhipu:      { maxOutputTokens: 32000 },
    siliconflow:{ maxOutputTokens: 32000 },
  };

  const DEFAULTS = {
    temperature: 0.7,
    topP: 1,
    maxTokens: 5000,
    replyCharLimit: 500,
    stream: true,
    toolCallLimit: 0,
    toolCallLimitMode: 'disabled',
    systemPrompt: '',
    enableCaching: true,
    preciseMode: false,
    keepThinkingOpen: true,
    sceneDetailLevel: 'medium',
    worldMode: false,
    storyAuxProvider: '',
    storyAuxModel: '',
    storyAuxMaxTokens: 5000,
    storyAuxApiKey: '',
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
