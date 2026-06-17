// =========================================================================
// SCROLL — viewport insets, smart auto-follow, scroll-to-bottom.
// Extracted from 99_legacy_main.js.
// =========================================================================

import { state } from './state.js';
import { dom } from './dom.js';



export function setupViewportInsets() {
    // Only track keyboard inset — let CSS 100dvh handle viewport height.
    // Do NOT override --app-height with visualViewport.height:
    // on devices with a home indicator, visualViewport.height excludes
    // the safe-area (~34px on iPhone), which shrinks the app container
    // and leaves a black bar at the bottom. CSS 100dvh correctly includes
    // the safe-area, so removing the JS override fixes the black bar.

    if (!window.visualViewport) return;
    var updateInsets = function() {
      var vv = window.visualViewport;
      var keyboardInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // Only apply when keyboard is clearly visible (> 50px gap); otherwise let CSS safe-bottom handle it alone
      if (keyboardInset < 50) keyboardInset = 0;
      document.documentElement.style.setProperty('--keyboard-inset', Math.round(keyboardInset) + 'px');
      updateBottomBarHeight();
    };
    window.visualViewport.addEventListener('resize', updateInsets);
    window.visualViewport.addEventListener('scroll', updateInsets);
    updateInsets();
  }

  // Measure actual bottom-bar height for accurate main-content reserve.
  // Coalesced via rAF so ResizeObserver / visualViewport bursts produce at most one
  // getBoundingClientRect + setProperty per frame, avoiding layout thrash.
  var _bbhPending = false;
  var _followScrollPending = false;
  function _updateBottomBarHeightImpl() {
    _bbhPending = false;
    var bar = document.querySelector('.bottom-bar');
    if (!bar) return;
    var h = Math.ceil(bar.getBoundingClientRect().height);
    var prev = document.documentElement.style.getPropertyValue('--bottom-bar-h');
    if (prev === h + 'px') return;
    document.documentElement.style.setProperty('--bottom-bar-h', h + 'px');
    // Keep user at bottom if they were near it before height changed
    if (prev && prev !== h + 'px' && state.ui.autoFollowStreaming) {
      ensureMessagesBottomSpacer();
      var sc = getScrollContainer();
      if (sc && isNearBottom(sc, 60)) {
        scheduleFollowScroll(60);
      }
    }
  }
export function updateBottomBarHeight() {
    if (_bbhPending) return;
    _bbhPending = true;
    requestAnimationFrame(_updateBottomBarHeightImpl);
  }

export function ensureMessagesBottomSpacer() {
    var spacer = document.getElementById('messagesBottomSpacer');
    if (!spacer && dom.messagesContainer) {
      spacer = document.createElement('div');
      spacer.id = 'messagesBottomSpacer';
      spacer.className = 'messages-bottom-spacer';
      dom.messagesContainer.appendChild(spacer);
    }
    // Always ensure spacer is the last child of messagesContainer
    if (spacer && dom.messagesContainer && spacer.parentNode === dom.messagesContainer) {
      if (dom.messagesContainer.lastElementChild !== spacer) {
        dom.messagesContainer.appendChild(spacer);
      }
    }
    return spacer;
  }
  // Expose globally so other handlers can call it
  window._updateBottomBarHeight = updateBottomBarHeight;

  // =========================================================================
  // RENDER: SCROLL
  // =========================================================================

  // =========================================================================
  // SMART SCROLL — auto-follow bottom unless user manually scrolls away
  // =========================================================================

export function getScrollContainer() {
    return dom.mainContent;
  }

export function isNearBottom(el, threshold) {
    if (!el) return true;
    var t = threshold || 80;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= t;
  }

export function scrollToBottomIfNeeded(opts) {
    ensureMessagesBottomSpacer();
    var el = getScrollContainer();
    if (!el) return;
    var smooth = opts && opts.smooth;
    var force = opts && opts.force;

    if (!force && !state.ui.autoFollowStreaming) return;
    if (!force && !isNearBottom(el, 120)) return;

    state.ui.programmaticScroll = true;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      // Use native scrollend event, with 500ms fallback for older browsers
      var scrollEnded = false;
      var clearFlag = function() {
        if (scrollEnded) return;
        scrollEnded = true;
        state.ui.programmaticScroll = false;
      };
      if ('onscrollend' in el) {
        el.addEventListener('scrollend', clearFlag, { once: true });
      }
      setTimeout(clearFlag, 500);
    } else {
      scheduleFollowScroll(force ? 0 : 120);
    }
  }

export function scheduleFollowScroll(threshold) {
    if (_followScrollPending) return;
    _followScrollPending = true;
    requestAnimationFrame(function() {
      _followScrollPending = false;
      var el = getScrollContainer();
      if (!el) return;
      if (threshold && !isNearBottom(el, threshold)) {
        state.ui.programmaticScroll = false;
        return;
      }
      el.scrollTop = el.scrollHeight;
      requestAnimationFrame(function() { state.ui.programmaticScroll = false; });
    });
  }

export function scrollToBottom(force) {
    scrollToBottomIfNeeded({ force: !!force });
  }

export function preserveScrollPosition(fn) {
    var el = getScrollContainer();
    if (!el) { fn(); return; }
    var beforeTop = el.scrollTop;
    // Detect whether the user was following the bottom before we mutate the DOM.
    // If they were, we keep them at the new bottom after the mutation so that
    // the scroll event handler (onUserScrollIntent) does not falsely flag them
    // as detached — which would suppress all streaming renders.
    var wasNearBottom = isNearBottom(el, 80);
    fn();
    // Mark scroll as programmatic so onUserScrollIntent ignores scroll events
    // triggered by our own scrollTop restoration. Without this, the preserved
    // position may be far enough from the new bottom that the detector falsely
    // enters detachedDuringStreaming mode, suppressing all streaming renders
    // until the response completes.
    state.ui.programmaticScroll = true;
    if (wasNearBottom) {
      // User was following the bottom — keep them at the new bottom so they
      // don't get falsely flagged as detached when streaming begins.
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTop = beforeTop;
    }
    requestAnimationFrame(function() {
      if (wasNearBottom) {
        el.scrollTop = el.scrollHeight;
      } else {
        el.scrollTop = beforeTop;
      }
      // Clear the flag after the rAF-delayed restoration has also fired —
      // the scroll event it triggers will be handled before the next rAF.
      requestAnimationFrame(function() { state.ui.programmaticScroll = false; });
    });
  }

  function checkUserScroll() {
    // Handled by the scroll/wheel/touch listeners below
  }

  // User scroll detection: pause auto-follow when user scrolls away.
  // Auto-follow is ONLY restored via explicit button click or new message send.
export function onUserScrollIntent() {
    if (state.ui.programmaticScroll) return;
    var el = getScrollContainer();
    if (!el) return;
    var nearBottom = isNearBottom(el, 80);

    if (!nearBottom) {
      state.ui.autoFollowStreaming = false;
      state.ui.userScrolling = true;
      state.ui.lastUserScrollAt = Date.now();
      // Enter detached mode: stop DOM updates during streaming
      if (state.isStreaming) {
        state.ui.detachedDuringStreaming = true;
        // 记录脱离时的消息数基线，用于未读计数
        var cur = state.conversations.find(function(c) { return c.id === state.currentConversationId; });
        state.ui.detachedMessageCount = cur ? cur.messages.length : 0;
      }
      updateScrollToBottomButton(true);
    } else {
      // User scrolled back near bottom — clear detached state so streaming
      // resumes normal rendering with auto-follow.
      if (state.isStreaming && state.ui.detachedDuringStreaming) {
        state.ui.detachedDuringStreaming = false;
        state.ui.autoFollowStreaming = true;
      }
      updateScrollToBottomButton(false);
    }
  }

export function updateScrollToBottomButton(showIntent) {
    var btn = document.getElementById('scrollToBottomBtn');
    var el = getScrollContainer();

    // Button is visible when explicit showIntent or user scrolled away
    var shouldShow = showIntent ||
      (!state.ui.autoFollowStreaming && !isNearBottom(el, 80));

    if (!shouldShow) {
      if (btn) {
        btn.classList.remove('show');
        btn.setAttribute('aria-hidden', 'true');
        // 清除未读计数标记
        var badge = btn.querySelector('.scroll-btn-badge');
        if (badge) badge.remove();
      }
      return;
    }

    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'scrollToBottomBtn';
      btn.setAttribute('aria-label', '到达最新正文');
      btn.setAttribute('title', '到达最新正文');
      btn.setAttribute('aria-hidden', 'true');
      btn.addEventListener('click', function() {
        state.ui.detachedDuringStreaming = false;
        state.ui.detachedContentDirty = false;
        state.ui.detachedMessageCount = 0;
        state.ui.autoFollowStreaming = true;
        state.ui.userScrolling = false;
        state.ui.programmaticScroll = true;

        try {
          var sc = getScrollContainer();
          if (sc) {
            // Use instant scrollTop instead of smooth scrollTo to avoid
            // intermediate scroll events racing with programmaticScroll cleanup
            sc.scrollTop = sc.scrollHeight;
          }
        } finally {
          // Double-rAF lets scroll events from scrollTop settle before
          // we clear programmaticScroll, preventing the flag from being
          // prematurely cleared by the smooth-scroll race
          requestAnimationFrame(function() {
            requestAnimationFrame(function() {
              state.ui.programmaticScroll = false;
            });
          });
          updateScrollToBottomButton(false);
        }
      });
      document.body.appendChild(btn);
    }

    btn.classList.add('show');
    btn.removeAttribute('aria-hidden');

    // --- 显示未读计数标记 ---
    if (showIntent && state.ui.detachedContentDirty && state.ui.detachedMessageCount > 0) {
      var cur = state.conversations.find(function(c) { return c.id === state.currentConversationId; });
      var total = cur ? cur.messages.length : 0;
      var diff = total - state.ui.detachedMessageCount;
      if (diff > 0) {
        var badge = btn.querySelector('.scroll-btn-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'scroll-btn-badge';
          btn.appendChild(badge);
        }
        badge.textContent = diff > 99 ? '99+' : String(diff);
      } else {
        // 有 dirty 标记但没有实际差值，清除旧徽章
        var stale = btn.querySelector('.scroll-btn-badge');
        if (stale) stale.remove();
      }
    } else {
      // 条件不满足，清除旧徽章
      var stale = btn.querySelector('.scroll-btn-badge');
      if (stale) stale.remove();
    }
  }

  // Reset all scroll-follow / detached-streaming flags at the start of a new request.
  // Prevents state leakage from a previous turn where the user scrolled away
  // during streaming — without this reset, the next stream silently skips all
  // updateLastBubble calls and the user sees nothing.
export function resetStreamFollowState() {
    state.ui.autoFollowStreaming = true;
    state.ui.userScrolling = false;
    state.ui.detachedDuringStreaming = false;
    state.ui.detachedContentDirty = false;
    state.ui.detachedMessageCount = 0;
    updateScrollToBottomButton(false);
  }

  // =========================================================================
