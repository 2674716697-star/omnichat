import { state } from './state.js';
import { dom } from './dom.js';
import { getCurrentConv } from './99_legacy_main.js';
import { escapeHtml } from './07_markdown.js';
import { getApiKey, getProviderConfig, buildRequestHeaders, parseModelList } from './05_providers.js';
import { ERR_MSGS } from './01_constants.js';
import { saveToStorage } from './03_storage.js';
import { showToast } from './13_ui.js';

// =========================================================================
  // MODEL MANAGEMENT — tool warnings, model list populate, model refresh
  // =========================================================================

export function updateToolWarning() {
    dom.selectToolCallLimit.value = '0';
    dom.selectToolCallLimit.disabled = true;
    dom.toolWarning.style.display = '';
  }

export function populateModelSelect() {
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

export async function refreshModels() {
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
      const headers = buildRequestHeaders(provider, apiKey, { stream: false });
      const resp = await fetch(pConf.modelsUrl, {
        headers: { Authorization: headers.Authorization, 'Content-Type': 'application/json' },
      });

      if (!resp.ok) {
        if (resp.status === 401) throw new Error(ERR_MSGS.unauthorized);
        if (resp.status === 429) throw new Error(ERR_MSGS.rateLimited);
        throw new Error(`获取模型失败 (${resp.status})`);
      }

      const data = await resp.json();
      state.models[provider] = parseModelList(provider, data);

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
