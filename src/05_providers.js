  // =========================================================================
  // PROVIDER ADAPTER LAYER
  // All 8 providers use OpenAI-compatible Chat Completions format.
  // Per-provider overrides are isolated here so sendMessage stays clean.
  // =========================================================================

  function getProviderConfig(provider) {
    return PROVIDERS[provider] || PROVIDERS.xai;
  }

  function getProviderCap(provider) {
    return (PROVIDER_CAPS[provider] || PROVIDER_CAPS.openai).maxOutputTokens;
  }

  function getApiKey(provider) {
    return state.apiKeys[provider] || '';
  }

  function resolveModel(conv) {
    return conv.customModel || conv.model || '';
  }

  // -- Adapter helpers: headers, body, parsing -------------------------------

  function buildRequestHeaders(provider, apiKey, conv) {
    var headers = {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      Accept: conv.stream ? 'text/event-stream' : 'application/json',
    };
    // OpenRouter-specific headers
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = location.origin || 'http://localhost';
      headers['X-Title'] = 'OmniChat';
    }
    return headers;
  }

  function buildRequestBody(conv, model, messages, responseFormat) {
    // Default OpenAI-compatible body — works for all 8 providers
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

  function parseModelList(provider, data) {
    // Default: OpenAI-compatible { data: [{ id }] }
    var rawModels = data.data || data.models || [];
    return rawModels.map(function (m) {
      return { id: m.id || m.name || String(m), object: m.object || 'model' };
    });
  }

  function parseStreamDelta(provider, parsed) {
    // Default: OpenAI-compatible choices[0].delta
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

  function parseNonStreamResponse(provider, data) {
    // Default: OpenAI-compatible choices[0].message
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

  function isAnthropicModel(modelId) {
    if (!modelId) return false;
    const lower = modelId.toLowerCase();
    return lower.includes('claude') || lower.startsWith('anthropic/');
  }
