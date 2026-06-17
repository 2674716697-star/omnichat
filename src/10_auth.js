import { state } from './state.js';
import { dom } from './dom.js';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from './01_constants.js';
import { debouncedSave } from './03_storage.js';

// =========================================================================
  // AUTH STATE MANAGEMENT — Phase 2.1
  // Minimal Supabase Auth state + UI helpers.
  //
  // Design principles:
  //   - Anonymous usage preserved: everything degrades gracefully when
  //     Supabase SDK is not loaded or no session exists.
  //   - Auth state is shared across the module; mutations go through helpers.
  //   - UI synchronisation is a pure DOM function — call syncAuthUI() after
  //     any state change.
  //   - Supabase client calls live in 99_legacy_main.js (after getSupabaseClient)
  //     to respect concatenation order.  This file only holds state + UI.
  // =========================================================================

  // Shared auth state — mutable only through the set/clear helpers below.
export var _authState = {
    user: null,        // { id: string, email: string } | null
    session: null,     // Supabase session object | null
    loading: true,     // true while initial session check is in flight
    error: null,       // string | null — last user-visible error message
    notice: null,      // string | null — transient success/info message (survives syncAuthUI)
    initialised: false // true after first init attempt completes
  };

  // Cooldown state for OTP send button — in-memory only, never persisted.
  // Resets on page refresh so a user stuck in 429 can always recover.
  var _authCooldownUntil = 0;     // Date.now() + cooldownMs while cooldown is active; 0 otherwise
  var _authCooldownTimer = null;  // setInterval id for countdown tick — cleared when cooldown expires
export var _authSending = false;       // true while a signInWithOtp request is in flight
export function setAuthSending(val) { _authSending = val; }

  // getAuthState() — returns a shallow copy so callers can read but not mutate.
export function getAuthState() {
    return {
      user: _authState.user,
      loading: _authState.loading,
      error: _authState.error,
      initialised: _authState.initialised
    };
  }

  // setAuthSession(session) — update auth state from a valid Supabase session.
export function setAuthSession(session) {
    if (session && session.user) {
      _authState.session = session;
      _authState.user = {
        id: session.user.id,
        email: session.user.email || ''
      };
      _authState.error = null;
    }
    syncAuthUI();
  }

  // clearAuthSession() — clear auth state (sign out).
  // Preserves all local chats, settings, and API keys.
export function clearAuthSession() {
    _authState.session = null;
    _authState.user = null;
    _authState.error = null;
    _authState.notice = null;
    syncAuthUI();
  }

  // setAuthLoading(loading) — update loading state.
export function setAuthLoading(loading) {
    _authState.loading = !!loading;
    syncAuthUI();
  }

  // setAuthError(message) — set a user-visible error message.
export function setAuthError(message) {
    _authState.error = typeof message === 'string' ? message : null;
    _authState.notice = null;
    syncAuthUI();
  }

  // markAuthInitialised() — mark first init attempt as complete.
export function markAuthInitialised() {
    _authState.loading = false;
    _authState.initialised = true;
    syncAuthUI();
  }

  // isValidEmail(email) — basic email format check for OTP input.
export function isValidEmail(email) {
    if (typeof email !== 'string') return false;
    var trimmed = email.trim();
    if (trimmed.length === 0) return false;
    // Simple pattern: something@something.something
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }

  // getAuthCooldownRemainingSeconds() — seconds left on the OTP cooldown.
export function getAuthCooldownRemainingSeconds() {
    if (!_authCooldownUntil) return 0;
    var remaining = Math.ceil((_authCooldownUntil - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  }

  // startAuthCooldown(seconds) — begin a countdown; clears any existing timer first.
export function startAuthCooldown(seconds) {
    stopAuthCooldown();
    _authCooldownUntil = Date.now() + seconds * 1000;
    _authCooldownTimer = setInterval(function () {
      if (getAuthCooldownRemainingSeconds() <= 0) {
        stopAuthCooldown();
      }
      syncAuthUI();
    }, 1000);
  }

  // stopAuthCooldown() — clear interval and reset cooldown state.
export function stopAuthCooldown() {
    if (_authCooldownTimer !== null) {
      clearInterval(_authCooldownTimer);
      _authCooldownTimer = null;
    }
    _authCooldownUntil = 0;
  }

  // getAuthRedirectUrl() — build the magic-link redirect URL.
  // Always redirects to index.html on the current origin.  Works for local
  // (http://127.0.0.1:4177/index.html), GitHub Pages, and custom deploys.
export function getAuthRedirectUrl() {
    var origin = window.location.origin;
    var pathname = window.location.pathname;
    // Replace the last path segment with index.html, preserving any subdirectory.
    // e.g. /foo/bar.html → /foo/index.html;  /  → /index.html
    var parts = pathname.split('/');
    parts[parts.length - 1] = 'index.html';
    return origin + parts.join('/');
  }

  // normalizeAuthError(error) — convert raw errors into Chinese-friendly messages.
export function normalizeAuthError(error) {
    if (!error) return '发送失败，请稍后重试';
    var msg = '';
    if (typeof error === 'string') {
      msg = error.toLowerCase();
    } else if (error.message) {
      msg = String(error.message).toLowerCase();
    } else if (error.error_description) {
      msg = String(error.error_description).toLowerCase();
    } else {
      return '发送失败，请稍后重试';
    }
    if (msg.indexOf('429') !== -1 || msg.indexOf('rate limit') !== -1 || msg.indexOf('email rate limit exceeded') !== -1 || msg.indexOf('too many requests') !== -1) {
      return '登录邮件发送太频繁，请等待 1 分钟后再试；也请检查邮箱垃圾箱';
    }
    if (msg.indexOf('network') !== -1 || msg.indexOf('fetch') !== -1 || msg.indexOf('timeout') !== -1) {
      return '网络连接失败，请检查网络后重试';
    }
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    return '发送失败，请稍后重试';
  }

  // =========================================================================
  // AUTH CALLBACK HELPERS — Phase 2.2
  // Detects OAuth/magic-link callback parameters in URL, cleans them after
  // processing, and guides users between browser and PWA contexts.
  // =========================================================================

  // detectAuthCallbackParams() — check URL for Supabase auth callback params.
  // Returns { type: 'code'|'hash', value: string } | null.
  // - 'code': query param ?code=... (PKCE magic link / OAuth)
  // - 'hash': fragment #access_token=... (implicit grant, legacy)
export function detectAuthCallbackParams() {
    if (typeof window === 'undefined') return null;

    // 1. PKCE code in query string (magic link, OAuth redirect)
    var params = new URLSearchParams(window.location.search);
    var code = params.get('code');
    if (code && code.trim()) {
      return { type: 'code', value: code.trim() };
    }

    // 2. Token in hash fragment (implicit grant, legacy, or recovery)
    var hash = window.location.hash;
    if (hash && hash.indexOf('access_token=') !== -1) {
      return { type: 'hash', value: hash };
    }

    return null;
  }

  // cleanAuthCallbackUrl() — remove auth params from address bar.
  // Preserves pathname and non-auth query params. Safe for GitHub Pages sub-paths.
export function cleanAuthCallbackUrl() {
    if (typeof window === 'undefined' || typeof history === 'undefined') return;

    var url = new URL(window.location.href);

    // Auth params to strip from query string
    var stripQuery = ['code', 'state', 'error', 'error_description', 'error_code', 'access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type', 'type', 'provider_token', 'provider_refresh_token'];
    for (var i = 0; i < stripQuery.length; i++) {
      url.searchParams.delete(stripQuery[i]);
    }

    // Auth params to strip from hash
    var hash = url.hash;
    if (hash) {
      // Remove leading # then parse
      var hashContent = hash.replace(/^#/, '');
      // If hash contains access_token, clear entire hash (auth-only hash)
      if (hashContent.indexOf('access_token=') !== -1 ||
          hashContent.indexOf('refresh_token=') !== -1) {
        url.hash = '';
      }
    }

    // Use replaceState to avoid adding a history entry
    var cleaned = url.toString();
    history.replaceState(null, '', cleaned);
  }

  // isStandalonePWA() — detect if page is running as installed PWA.
export function isStandalonePWA() {
    if (typeof window === 'undefined') return false;
    return window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches;
  }

  // showAuthCallbackHint(isStandalone) — display hint after callback login.
  // In browser: tell user they can return to installed PWA.
  // In PWA: session is already active, just confirm.
  // Only shows a brief status message; never blocks UI.
export function showAuthCallbackHint(isPWA) {
    if (isPWA) {
      _authState.notice = '登录成功 — 已恢复会话';
    } else {
      // Running in a regular browser tab, not the installed PWA.
      // User likely clicked the magic link in email → opened in browser.
      _authState.notice = '已在当前浏览器登录，可返回已安装的 Mira App 继续使用';
    }
    _authState.error = null;
    syncAuthUI();
  }

  // syncAuthUI() — update auth section in settings drawer to reflect _authState.
  // Safe to call before DOM is ready (returns silently).
export function syncAuthUI() {
    if (typeof document === 'undefined') return;

    var emailInput = document.getElementById('inputAuthEmail');
    var loginBtn = document.getElementById('btnAuthLogin');
    var logoutBtn = document.getElementById('btnAuthLogout');
    var statusEl = document.getElementById('authStatus');
    var userInfoEl = document.getElementById('authUserInfo');

    // Loading state
    if (_authState.loading) {
      if (statusEl) {
        statusEl.textContent = '正在检查登录状态…';
        statusEl.className = 'auth-status';
      }
      if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = '检查中…'; loginBtn.style.display = ''; }
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (userInfoEl) userInfoEl.style.display = 'none';
      if (emailInput) emailInput.style.display = 'none';
      return;
    }

    // Logged in
    if (_authState.user) {
      if (emailInput) emailInput.style.display = 'none';
      if (loginBtn) loginBtn.style.display = 'none';
      if (userInfoEl) {
        userInfoEl.style.display = '';
        userInfoEl.textContent = '已登录：' + (_authState.user.email || _authState.user.id);
      }
      if (logoutBtn) {
        logoutBtn.style.display = '';
        logoutBtn.disabled = false;
      }
      if (statusEl) {
        if (_authState.error) {
          statusEl.textContent = _authState.error;
          statusEl.className = 'auth-status auth-status-error';
        } else if (_authState.notice) {
          statusEl.textContent = _authState.notice;
          statusEl.className = 'auth-status auth-status-success';
        } else {
          statusEl.textContent = '';
          statusEl.className = 'auth-status';
        }
      }
      return;
    }

    // Logged out — show email input + login button
    if (emailInput) emailInput.style.display = '';
    if (loginBtn) {
      loginBtn.style.display = '';
      var remaining = getAuthCooldownRemainingSeconds();
      if (_authSending) {
        loginBtn.disabled = true;
        loginBtn.textContent = '发送中…';
      } else if (remaining > 0) {
        loginBtn.disabled = true;
        loginBtn.textContent = remaining + '秒后可重发';
      } else {
        loginBtn.disabled = false;
        loginBtn.textContent = '发送登录链接';
      }
    }
    if (userInfoEl) userInfoEl.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (statusEl) {
      if (_authState.error) {
        statusEl.textContent = _authState.error;
        statusEl.className = 'auth-status auth-status-error';
      } else if (getAuthCooldownRemainingSeconds() > 0) {
        statusEl.textContent = '登录链接已发送，请查收邮件（检查垃圾箱）';
        statusEl.className = 'auth-status auth-status-success';
      } else {
        statusEl.textContent = '';
        statusEl.className = 'auth-status';
      }
    }
  }
