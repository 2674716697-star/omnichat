// =========================================================================
// UTILS — id generation, escaping, debounce, provider/model resolution
// =========================================================================

import { PROVIDERS } from './01_constants.js';
import { resolveModel, getApiKey } from './05_providers.js';

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function nowISO() {
  return new Date().toISOString();
}

export function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// Auto-detect aux provider from model name.
export function resolveStoryAuxProviderAndModel(conv) {
  var modelId = (conv.storyAuxModel || '').trim();
  var lower = modelId.toLowerCase();
  var provider = '';

  if (lower.indexOf('deepseek') !== -1) {
    provider = 'deepseek';
  } else if (/^gpt-/.test(lower) || /^o\d/.test(lower) || /^chatgpt/.test(lower)) {
    provider = 'openai';
  } else if (/^qwen/.test(lower)) {
    if (PROVIDERS.siliconflow) provider = 'siliconflow';
  }

  if (!provider || !PROVIDERS[provider]) {
    provider = conv.storyAuxProvider || conv.provider;
  }

  var auxModel = conv.storyAuxModel;
  if (!auxModel) {
    if (provider === 'deepseek') {
      auxModel = 'deepseek-v4-flash';
    } else {
      auxModel = resolveModel(conv);
    }
  }

  var auxKey = (conv.storyAuxApiKey || '').trim() || getApiKey(provider);
  if (!auxKey) {
    provider = conv.provider;
    auxModel = resolveModel(conv);
  }

  return { provider: provider, model: auxModel, apiKey: auxKey };
}
