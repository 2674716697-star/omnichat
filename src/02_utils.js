  // =========================================================================
  // UTILS — id generation, escaping, debounce, clipboard
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
  // resolveStoryAuxProviderAndModel — auto-detect aux provider from model name
  //
  // Uses conv.storyAuxModel to infer the correct provider.  Falls back to
  // conv.storyAuxProvider || conv.provider when the model name doesn't map
  // to a known provider.  If the resolved provider has no API key, falls
  // back to conv.provider + resolveModel(conv) so model/provider stay in sync.
  //
  // Provider inference rules:
  //   deepseek* / deepseek-* / contains "deepseek" → deepseek
  //   gpt-* / o<digit>* / chatgpt-*                → openai
  //   claude-*  → (no anthropic provider — falls through)
  //   gemini-*  → (no google/gemini provider — falls through)
  //   qwen*     → siliconflow (if available)
  //
  // Default aux model: deepseek-v4-flash for deepseek, resolveModel(conv) otherwise.
  // =========================================================================
  function resolveStoryAuxProviderAndModel(conv) {
    var modelId = (conv.storyAuxModel || '').trim();
    var lower = modelId.toLowerCase();
    var provider = '';

    // 1. Auto-detect provider from model name
    if (lower.indexOf('deepseek') !== -1) {
      provider = 'deepseek';
    } else if (/^gpt-/.test(lower) || /^o\d/.test(lower) || /^chatgpt/.test(lower)) {
      provider = 'openai';
    } else if (/^qwen/.test(lower)) {
      if (PROVIDERS.siliconflow) provider = 'siliconflow';
    }
    // claude-* / gemini-* — no matching provider in this project; fall through

    // 2. Fall back to explicit setting or main provider
    if (!provider || !PROVIDERS[provider]) {
      provider = conv.storyAuxProvider || conv.provider;
    }

    // 3. Determine default model
    var auxModel = conv.storyAuxModel;
    if (!auxModel) {
      if (provider === 'deepseek') {
        auxModel = 'deepseek-v4-flash';
      } else {
        auxModel = resolveModel(conv);
      }
    }

    // 4. API key resolution — aux key > global key > main provider fallback
    var auxKey = (conv.storyAuxApiKey || '').trim() || getApiKey(provider);
    if (!auxKey) {
      // No key for aux provider — fall back to main provider+model
      provider = conv.provider;
      auxModel = resolveModel(conv);
    }

    return { provider: provider, model: auxModel, apiKey: auxKey };
  }
