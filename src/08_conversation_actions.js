import { state } from './state.js';
import { dom } from './dom.js';
import { saveToStorage, debouncedSave } from './03_storage.js';
import { generateId } from './02_utils.js';
import { normalizeConversation } from './04_migration.js';
import { escapeHtml, renderMarkdown, getVisibleAssistantContent } from './07_markdown.js';
import { ERR_MSGS, DEFAULTS, STORAGE_KEY } from './01_constants.js';
import { showToast } from './13_ui.js';
import { getCurrentConv, createConversation, updateTimestamp, renderAll } from './99_legacy_main.js';
import { renderConvList } from './14_render.js';

// =========================================================================
  // CONVERSATION ACTIONS — archive, new, switch, clear, delete, rename,
  // export, import.  All mutations to state.conversations[] live here.
  // =========================================================================

  // -- Archive -----------------------------------------------------------------

export function autoArchiveCheck() {
    const now = Date.now();
    const threshold = 60 * 60 * 1000; // 1 hour idle
    const minMessages = 2; // ≤ 2 messages = barely used
    let archivedCount = 0;

    for (const conv of state.conversations) {
      if (conv.archived) continue;
      if (conv.messages.length > minMessages) continue;
      const updated = new Date(conv.updatedAt).getTime();
      if (now - updated < threshold) continue;
      // Only archive if it's not the currently active conversation
      if (conv.id === state.currentConversationId) continue;
      conv.archived = true;
      archivedCount++;
    }

    if (archivedCount > 0) {
      saveToStorage();
      renderConvList();
    }
  }

export function toggleConversationArchive(id) {
    const conv = state.conversations.find((c) => c.id === id);
    if (!conv) return;
    conv.archived = !conv.archived;
    updateTimestamp(conv);
    saveToStorage();
    renderConvList();
    const label = conv.archived ? '已归档' : '已取消归档';
    showToast(label, 'info');
  }

export function toggleShowArchived() {
    state.showArchived = !state.showArchived;
    renderConvList();
  }

  // -- Conversation lifecycle --------------------------------------------------

export function resetRuntimeForNewConversation() {
    if (state.abortController) {
      try { state.abortController.abort(); } catch (_) {}
    }
    state.abortController = null;
    state.isStreaming = false;
    state.pendingHiddenRequest = null;
    state._regenerateFlags = null;

    state.ui.autoFollowStreaming = true;
    state.ui.userScrolling = false;
    state.ui.programmaticScroll = false;
    state.ui.detachedDuringStreaming = false;
    state.ui.pendingStreamRender = false;
    state.ui.detachedContentDirty = false;
    state.ui.detachedMessageCount = 0;

    if (typeof updateScrollToBottomButton === 'function') updateScrollToBottomButton(false);
    if (typeof updateSendUI === 'function') updateSendUI();
  }

export function newConversation(overrides) {
    resetRuntimeForNewConversation();

    var current = getCurrentConv();
    var provider = (overrides && overrides.provider) || (current && current.provider) || 'openai';
    var conv = createConversation(provider);

    if (overrides) {
      // Targeted creation from group header — only set provider/model/customModel
      if (overrides.model !== undefined) conv.model = overrides.model;
      if (overrides.customModel !== undefined) conv.customModel = overrides.customModel;
    } else if (current) {
      // Inherit provider/model only; reset generation params and scene data to defaults
      conv.model = current.model;
      conv.customModel = current.customModel;
      // generation params stay at createConversation defaults
      // scene data stays at createConversation defaults (empty)
    }

    state.conversations.push(conv);
    state.currentConversationId = conv.id;
    renderAll();
    saveToStorage();
  }

export function switchConversation(id) {
    const conv = state.conversations.find((c) => c.id === id);
    if (!conv) return;
    // Safety: ensure switched-to conversation is normalized to current schema
    normalizeConversation(conv);
    state.currentConversationId = id;
    closeDrawer('history');
    renderAll();
    scrollToBottom(true);
    debouncedSave();
  }

export function clearCurrentConversation() {
    const conv = getCurrentConv();
    if (!conv) return;
    showConfirm('确认清空当前会话的所有消息？（会话参数保留）', () => {
      conv.messages = [];
      conv.title = '新对话';
      updateTimestamp(conv);
      hideConfirm();
      renderAll();
      saveToStorage();
      showToast('会话已清空', 'success');
    });
  }

export function deleteLastRound() {
    const conv = getCurrentConv();
    if (!conv || conv.messages.length === 0) return;

    // Find last user message and remove it + everything after
    let lastUserIdx = -1;
    for (let i = conv.messages.length - 1; i >= 0; i--) {
      if (conv.messages[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }

    if (lastUserIdx === -1) return;

    conv.messages.splice(lastUserIdx);
    if (conv.messages.length === 0) conv.title = '新对话';
    updateTimestamp(conv);
    renderAll();
    saveToStorage();
    showToast('已删除最后一轮问答', 'success');
  }

export function copyLastAssistantReply() {
    const conv = getCurrentConv();
    if (!conv) return;
    for (let i = conv.messages.length - 1; i >= 0; i--) {
      if (conv.messages[i].role === 'assistant') {
        const text = conv.messages[i].content;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => showToast('已复制到剪贴板', 'success'));
        }
        return;
      }
    }
    showToast('没有可复制的 AI 回复', 'warning');
  }

export function togglePreciseMode() {
    const conv = getCurrentConv();
    if (!conv) return;
    conv.preciseMode = !conv.preciseMode;
    if (conv.preciseMode) {
      conv._savedTemperature = conv.temperature;
      conv.temperature = 0.2;
      showToast('精确模式已开启：低温输出 + 防幻觉 Prompt', 'success');
    } else {
      conv.temperature = conv._savedTemperature !== undefined && conv._savedTemperature !== null ? conv._savedTemperature : DEFAULTS.temperature;
      conv._savedTemperature = undefined;
      showToast('精确模式已关闭', 'info');
    }
    updateTimestamp(conv);
    updatePreciseButton();
    debouncedSave();
    if (state.ui.isSettingsOpen) {
      dom.inputPreciseMode.checked = conv.preciseMode;
      dom.inputTemperature.value = conv.temperature;
      dom.tempVal.textContent = conv.temperature;
    }
    updateTopBar();
  }

export function deleteConversation(id) {
    showConfirm('确认删除该会话？此操作不可恢复。', () => {
      state.conversations = state.conversations.filter((c) => c.id !== id);
      if (state.currentConversationId === id) {
        state.currentConversationId = state.conversations.length > 0 ? state.conversations[0].id : null;
      }
      hideConfirm();
      renderAll();
      saveToStorage();
      showToast('会话已删除', 'success');
    });
  }

export function clearAllConversations() {
    if (state.conversations.length === 0) return;
    showConfirm(`确认删除全部 ${state.conversations.length} 个会话？<br><br>此操作不可恢复。建议先导出全部 JSON 备份。`, () => {
      state.conversations = [];
      state.currentConversationId = null;
      hideConfirm();
      renderAll();
      saveToStorage();
      showToast('全部会话已清空', 'success');
    });
  }

export function clearArchivedConversations() {
    const archived = state.conversations.filter((c) => c.archived);
    if (archived.length === 0) {
      showToast('没有已归档的会话', 'info');
      return;
    }
    showConfirm(`确认删除全部 ${archived.length} 个已归档会话？<br><br>此操作不可恢复。建议先导出全部 JSON 备份。`, () => {
      state.conversations = state.conversations.filter((c) => !c.archived);
      hideConfirm();
      renderAll();
      saveToStorage();
      showToast(`已删除 ${archived.length} 个归档会话`, 'success');
    });
  }

export function renameConversation(id) {
    const conv = state.conversations.find((c) => c.id === id);
    if (!conv) return;
    showRenameDialog(id, conv.title);
  }

export function doRename() {
    const id = state.pendingRenameId;
    const newTitle = dom.renameInput.value.trim();
    if (!id || !newTitle) {
      hideRenameDialog();
      return;
    }
    const conv = state.conversations.find((c) => c.id === id);
    if (conv) {
      conv.title = newTitle;
      updateTimestamp(conv);
      renderConvList();
      saveToStorage();
    }
    hideRenameDialog();
  }

  // =========================================================================
  // IMPORT / EXPORT
  // =========================================================================

export function exportConversationMarkdown() {
    const conv = getCurrentConv();
    if (!conv) {
      showToast('无当前会话可导出', 'warning');
      return;
    }

    const pConf = getProviderConfig(conv.provider);
    const model = resolveModel(conv);
    let md = `# ${conv.title}\n\n`;
    md += `- 服务商：${pConf.name}\n`;
    md += `- 模型：${model || '未选择'}\n`;
    md += `- 时间：${conv.createdAt}\n`;
    if (conv.systemPrompt) {
      md += `- System Prompt：${conv.systemPrompt}\n`;
    }
    md += `\n---\n\n`;

    for (const m of conv.messages) {
      const role = m.role === 'user' ? '**You**' : '**AI**';
      md += `### ${role}\n\n${m.content}\n\n`;
    }

    downloadFile(`${conv.title}.md`, md, 'text/markdown');
    showToast('Markdown 导出成功', 'success');
  }

export function exportAllJSON() {
    if (state.conversations.length === 0) {
      showToast('无会话可导出', 'warning');
      return;
    }

    // Strip API keys from export. Preserve story-mode _requestContent
    // so world-story backups can be restored with full character card intact.
    const data = {
      version: STORAGE_VERSION,
      exportedAt: nowISO(),
      conversations: state.conversations.map(function(c) {
        var copy = Object.assign({}, c);
        copy.messages = copy.messages.map(function(m) {
          var msg = Object.assign({}, m);
          var isStoryStarted = c.storyMode && c.storyMode.started;
          var isFirstUser = msg.role === 'user' && msg.displayContent && msg._requestContent;
          if (!(isStoryStarted && isFirstUser)) {
            delete msg._requestContent;
          }
          return msg;
        });
        return copy;
      }),
    };

    downloadFile(`omnichat-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
    showToast('全部会话 JSON 导出成功', 'success');
  }

export function importJSON(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);

        if (!data.conversations || !Array.isArray(data.conversations)) {
          throw new Error('格式无效：缺少 conversations 数组');
        }

        let imported = 0;
        const existingIds = new Set(state.conversations.map((c) => c.id));

        for (const c of data.conversations) {
          if (!c.id || !c.messages || !Array.isArray(c.messages)) continue;

          // Avoid overwriting existing IDs
          if (existingIds.has(c.id)) {
            c.id = generateId();
          }
          existingIds.add(c.id);

          // Ensure all fields exist
          c.title = c.title || '导入的对话';
          c.createdAt = c.createdAt || nowISO();
          c.updatedAt = c.updatedAt || nowISO();
          c.provider = c.provider || 'xai';
          c.model = c.model || '';
          c.customModel = c.customModel || '';
          c.systemPrompt = c.systemPrompt || '';
          c.temperature = c.temperature ?? DEFAULTS.temperature;
          c.topP = c.topP ?? DEFAULTS.topP;
          c.maxTokens = c.maxTokens ?? DEFAULTS.maxTokens;
          c.stream = c.stream ?? DEFAULTS.stream;
          c.toolCallLimit = c.toolCallLimit ?? DEFAULTS.toolCallLimit;
          c.toolCallLimitMode = c.toolCallLimitMode || 'disabled';
          c.enableCaching = c.enableCaching !== undefined ? c.enableCaching : DEFAULTS.enableCaching;
          c.preciseMode = c.preciseMode || false;
          c.archived = c.archived || false;
          c.sceneMode = c.sceneMode || false;
          c.sceneState = createSceneState(c.sceneState);
          c.autoCompress = c.autoCompress || false;
          c.keepThinkingOpen = c.keepThinkingOpen !== undefined ? c.keepThinkingOpen : DEFAULTS.keepThinkingOpen;
          c.sceneDetailLevel = c.sceneDetailLevel || DEFAULTS.sceneDetailLevel;
          c.sceneWorld = createSceneWorld(c.sceneWorld);
          c.sceneCharacter = createSceneCharacter(c.sceneCharacter);
          c.sceneStatus = createSceneStatus(c.sceneStatus);
          c.sceneNpcs = normalizeSceneNpcs(c.sceneNpcs);
          // Migrate old scene/world data to unified storyMode
          migrateStoryMode(c);
          // Preserve story-mode hidden request content so restored
          // world-story conversations keep their full character card.
          c.messages = (c.messages || []).map(function(m) {
            var msg = Object.assign({}, m);
            var isStoryStarted = c.storyMode && c.storyMode.started;
            var isFirstUser = msg.role === 'user' && msg.displayContent && msg._requestContent;
            if (!(isStoryStarted && isFirstUser)) {
              delete msg._requestContent;
            }
            return msg;
          }).filter(function(m) { return m.role && m.content !== undefined; });
          // Normalize imported conversation to current display model
          c = normalizeConversation(c);

          state.conversations.push(c);
          imported++;
        }

        if (imported === 0) {
          throw new Error('未找到有效会话数据');
        }

        saveToStorage();
        renderAll();
        showToast(`成功导入 ${imported} 个会话`, 'success');
      } catch (e) {
        showToast(e.message || ERR_MSGS.importFailed, 'error');
      }
    };
    reader.onerror = function () {
      showToast(ERR_MSGS.importFailed, 'error');
    };
    reader.readAsText(file);
  }

export function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

export function copyTextToClipboard(text, successMessage) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(function () { showToast(successMessage, 'success'); })
        .catch(function () { showToast('复制失败，请手动选择文本复制', 'warning'); });
      return;
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(successMessage, 'success');
    } catch (_) {
      showToast('复制失败，请手动选择文本复制', 'warning');
    } finally {
      document.body.removeChild(ta);
    }
  }
