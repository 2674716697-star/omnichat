// =========================================================================
// RENDER — conversation list, messages, bubbles, top bar, welcome UI.
// Extracted from 99_legacy_main.js.
// =========================================================================

import { state } from './state.js';
import { dom } from './dom.js';
import { ERR_MSGS, DEFAULTS, PROVIDERS } from './01_constants.js';
import { escapeHtml, renderContentFast, appendFastText, getVisibleAssistantContent, renderMarkdown } from './07_markdown.js';
import { getApiKey, resolveModel, getProviderConfig } from './05_providers.js';
import { ensureMessagesBottomSpacer, preserveScrollPosition, isNearBottom, scrollToBottomIfNeeded, updateScrollToBottomButton } from './17_scroll.js';
import { getCurrentConv } from './99_legacy_main.js';

// RENDER: CONVERSATION LIST
  // =========================================================================

  // Search index cache — rebuilt lazily when conversations or messages change
  var _searchIndex = null;
  var _searchIndexFingerprint = '';
  function _ensureSearchIndex() {
    // Fingerprint: conversation count + total message count
    var totalMsgs = 0;
    for (var ci = 0; ci < state.conversations.length; ci++) {
      totalMsgs += state.conversations[ci].messages.length;
    }
    var fp = state.conversations.length + ':' + totalMsgs;
    if (_searchIndex && _searchIndexFingerprint === fp) return;
    _searchIndex = new Map();
    for (var ci = 0; ci < state.conversations.length; ci++) {
      var c = state.conversations[ci];
      var parts = [c.title || ''];
      for (var mi = 0; mi < c.messages.length; mi++) {
        parts.push(String(c.messages[mi].content || ''));
      }
      _searchIndex.set(c.id, parts.join(' ').toLowerCase());
    }
    _searchIndexFingerprint = fp;
  }

  export function renderConvList() {
    const query = (dom.searchInput.value || '').toLowerCase().trim();
    const showArchived = state.showArchived || query;
    let list = state.conversations;

    // Filter by archive status (unless searching); always show active conv
    if (!query) {
      list = list.filter((c) => c.id === state.currentConversationId || showArchived || !c.archived);
    }

    // Search filter — uses cached index, O(n) instead of O(n*m)
    if (query) {
      _ensureSearchIndex();
      var idx = _searchIndex;
      list = list.filter(function(c) {
        if (c.title.toLowerCase().includes(query)) return true;
        var text = idx.get(c.id);
        return text ? text.includes(query) : false;
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

export function updateArchiveToggleUI() {
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

export function formatDate(isoStr) {
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

export function getRenderableMessageEntries(messages) {
    const entries = [];
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role !== 'system') {
        entries.push({ msg: messages[i], index: i });
      }
    }
    return entries;
  }

  export function renderMessages() {
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

  export function fullRenderMessages(messages) {
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

  export function renderBubbleHTML(msg, msgIndex) {
    // Build inner HTML for an assistant message bubble
    let html = '';

    // Thinking / reasoning section — always pre-created during streaming so
    // updateLastBubble can append deltas incrementally without full rebuild.
    const reasoning = msg.reasoning || '';
    if (reasoning || msg._streaming) {
      const conv = getCurrentConv();
      const isStreamingReasoning = msg._streaming && !!reasoning;
      const keepOpen = msg._keepThinkingOpen !== undefined
        ? msg._keepThinkingOpen
        : conv && conv.keepThinkingOpen !== false;
      const stayOpen = isStreamingReasoning || (keepOpen && !msg._streaming);
      const openAttr = stayOpen ? ' open' : '';
      const reasonHTML = reasoning
        ? (msg._streaming ? renderContentFast(reasoning) : renderMarkdown(reasoning))
        : '';
      const hiddenAttr = !reasoning && msg._streaming ? ' hidden' : '';
      html += '<details class="thinking-section"' + openAttr + hiddenAttr + '>';
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

  export function createMessageElement(msg, index) {
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

  export function animateBubbleIn(el) {
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

  export function updateLastBubble(msg) {
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
          // Fallback: thinking section was not pre-created — full rebuild
          bubble.innerHTML = renderBubbleHTML(msg, msgIndex);
          msg._lastRenderedVisibleText = visibleText;
        } else if (thinkDiv && reasoning.indexOf(prevReasoning) === 0) {
          // Normal streaming: append only the delta
          appendFastText(thinkDiv, reasoning.slice(prevReasoning.length));
        } else if (thinkDiv) {
          // Fallback: reasoning diverged
          thinkDiv.innerHTML = renderContentFast(reasoning);
        }

        if (details) { details.hidden = false; details.open = true; }
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
      // Crossfade: fade out old content, swap, then fade back in
      bubble.style.opacity = '0';
      bubble.innerHTML = renderBubbleHTML(msg, msgIndex);
      var details = bubble.querySelector('.thinking-section');
      var keepOpen = msg._keepThinkingOpen !== undefined
        ? msg._keepThinkingOpen
        : conv && conv.keepThinkingOpen !== false;
      if (details) details.open = !!keepOpen;
      bubble.classList.remove('streaming-cursor');
      requestAnimationFrame(function() {
        bubble.style.opacity = '';
      });
    }
  }

  // =========================================================================
  // RENDER: TOP BAR / CONTEXT
  // =========================================================================

export function updateTopBar() {
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

export function updateWelcomeUI() {
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
