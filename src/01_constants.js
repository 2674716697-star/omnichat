// =========================================================================
// CONSTANTS — pure config, no dependencies on other src modules.
// =========================================================================

export const STORAGE_KEY = 'omnichat_data';
// Stable independent keys so API keys & user prefs survive build-version
// changes, PWA updates, cache clearing, and main-data migration failures.
export const SECRETS_STORAGE_KEY = 'omnichat_secrets_v1';
export const PREFS_STORAGE_KEY = 'omnichat_prefs_v1';

// =========================================================================
// MIGRATION POLICY
// =========================================================================
export const STORAGE_SCHEMA_VERSION = 7;
export const STORAGE_VERSION = 1;

export const PROVIDERS = {
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

export const PROVIDER_CAPS = {
  openai:     { maxOutputTokens: 32000 },
  xai:        { maxOutputTokens: 32000 },
  deepseek:   { maxOutputTokens: 384000 },
  openrouter: { maxOutputTokens: 32000 },
  groq:       { maxOutputTokens: 32000 },
  moonshot:   { maxOutputTokens: 32000 },
  zhipu:      { maxOutputTokens: 32000 },
  siliconflow:{ maxOutputTokens: 32000 },
};

export const DEFAULTS = {
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
  memoryMode: 'remote',
  memoryRemoteEndpoint: 'https://lazsvokcrbykzjgzegpq.supabase.co/functions/v1',
  sceneStatus: {
    health: '', stamina: '', composure: '', focus: '',
    currentObjective: '', constraints: ''
  },
};

export const SCENE_MOODS = ['悬疑', '温柔', '冒险', '日常', '紧张', '奇幻', '科幻'];
export const SCENE_SPECIES = ['人类', '精灵', '机械体', '兽人', '龙裔', 'AI', '其他'];

export const REQUEST_CHAR_SOFT_LIMIT = 52000;
export const REQUEST_RECENT_MSG_LIMIT = 18;
export const REQUEST_RECENT_CHAR_LIMIT = 28000;
export const REQUEST_DIGEST_CHAR_LIMIT = 9000;
export const REQUEST_DIGEST_LINE_LIMIT = 720;

export const SYSTEM_PROMPT_PRECISE = 'You are a precise, factual AI assistant. Ground every answer in verifiable knowledge. If unsure, explicitly state your uncertainty and confidence level. Never fabricate data, citations, dates, URLs, or technical details. Prefer saying "I don\'t know" over speculation. Use clear, structured responses. Cite reasoning steps when helpful.';

export const SYSTEM_PROMPT_DEFAULT = 'You are a helpful, accurate AI assistant. Answer based on facts and knowledge. Use clear, concise language. Avoid speculation and hallucination. If unsure, say so honestly.';

export const ERR_MSGS = {
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

export const SUPABASE_PROJECT_URL = 'https://lazsvokcrbykzjgzegpq.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_zQ_2YgDPNT5cX0S5eprOYg_inGgic1n';

export function getRuntimeConfigValue(name, fallback) {
  try {
    if (typeof window !== 'undefined' && window.__MIRA_CONFIG__) {
      var cfg = window.__MIRA_CONFIG__;
      if (typeof cfg === 'object' && cfg !== null) {
        var raw = cfg[name];
        if (typeof raw === 'string' && raw.length > 0) return raw;
      }
    }
    if (typeof document !== 'undefined' && typeof name === 'string' && name.length > 0) {
      var meta = document.querySelector('meta[name="mira:' + name + '"]');
      if (meta) {
        var content = meta.getAttribute('content');
        if (typeof content === 'string' && content.trim().length > 0) {
          return content.trim();
        }
      }
    }
  } catch (_) { /* never throw */ }
  return fallback;
}
