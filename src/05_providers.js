// =========================================================================
// PROVIDER ADAPTER LAYER
// All 8 providers use OpenAI-compatible Chat Completions format.
// Per-provider overrides are isolated here so sendMessage stays clean.
// =========================================================================

import { PROVIDERS, PROVIDER_CAPS } from './01_constants.js';
import { state } from './state.js';

export function getProviderConfig(provider) {
  return PROVIDERS[provider] || PROVIDERS.xai;
}

export function getProviderCap(provider) {
  return (PROVIDER_CAPS[provider] || PROVIDER_CAPS.openai).maxOutputTokens;
}

export function getApiKey(provider) {
  return state.apiKeys[provider] || '';
}

export function resolveModel(conv) {
  return conv.customModel || conv.model || '';
}

// -- Adapter helpers: headers, body, parsing -------------------------------

export function buildRequestHeaders(provider, apiKey, conv) {
  var headers = {
    Authorization: 'Bearer ' + apiKey,
    'Content-Type': 'application/json',
    Accept: conv.stream ? 'text/event-stream' : 'application/json',
  };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = location.origin || 'http://localhost';
    headers['X-Title'] = 'OmniChat';
  }
  return headers;
}

export function buildRequestBody(conv, model, messages, responseFormat) {
  var body = {
    model: model,
    messages: messages,
    temperature: conv.temperature,
    top_p: conv.topP,
    max_tokens: conv.maxTokens,
    stream: conv.stream,
  };
  if (responseFormat === 'json_object') {
    body.response_format = { type: 'json_object' };
  }
  return body;
}

export function parseModelList(provider, data) {
  var rawModels = data.data || data.models || [];
  return rawModels.map(function (m) {
    return { id: m.id || m.name || String(m), object: m.object || 'model' };
  });
}

export function parseStreamDelta(provider, parsed) {
  var choice = parsed.choices && parsed.choices[0] ? parsed.choices[0] : null;
  var delta = choice ? choice.delta : null;
  var finishReason = (choice && choice.finish_reason) || null;
  if (!delta && !finishReason) return { content: '', reasoning: '', usage: null, finishReason: null };
  return {
    content: delta ? (delta.content || '') : '',
    reasoning: delta ? (delta.reasoning_content || delta.thinking || '') : '',
    usage: parsed.usage || null,
    finishReason: finishReason,
  };
}

export function parseNonStreamResponse(provider, data) {
  var choice = data.choices && data.choices[0] ? data.choices[0] : null;
  var msg = choice ? choice.message : {};
  var finishReason = (choice && choice.finish_reason) || null;
  return {
    content: msg.content || '',
    reasoning: msg.reasoning_content || msg.thinking || '',
    usage: data.usage || null,
    finishReason: finishReason,
  };
}

export function isAnthropicModel(modelId) {
  if (!modelId) return false;
  const lower = modelId.toLowerCase();
  return lower.includes('claude') || lower.startsWith('anthropic/');
}
