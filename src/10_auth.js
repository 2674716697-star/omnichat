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
  var _authState = {
    user: null,        // { id: string, email: string } | null
    session: null,     // Supabase session object | null
    loading: true,     // true while initial session check is in flight
    error: null,       // string | null — last user-visible error message
    initialised: false // true after first init attempt completes
  };

  // Cooldown state for OTP send button — in-memory only, never persisted.
  // Resets on page refresh so a user stuck in 429 can always recover.
  var _authCooldownUntil = 0;     // Date.now() + cooldownMs while cooldown is active; 0 otherwise
  var _authCooldownTimer = null;  // setInterval id for countdown tick — cleared when cooldown expires
  var _authSending = false;       // true while a signInWithOtp request is in flight

  // getAuthState() — returns a shallow copy so callers can read but not mutate.
  function getAuthState() {
    return {
      user: _authState.user,
      loading: _authState.loading,
      error: _authState.error,
      initialised: _authState.initialised
    };
  }

  // setAuthSession(session) — update auth state from a valid Supabase session.
  function setAuthSession(session) {
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
  function clearAuthSession() {
    _authState.session = null;
    _authState.user = null;
    _authState.error = null;
    syncAuthUI();
  }

  // setAuthLoading(loading) — update loading state.
  function setAuthLoading(loading) {
    _authState.loading = !!loading;
    syncAuthUI();
  }

  // setAuthError(message) — set a user-visible error message.
  function setAuthError(message) {
    _authState.error = typeof message === 'string' ? message : null;
    syncAuthUI();
  }

  // markAuthInitialised() — mark first init attempt as complete.
  function markAuthInitialised() {
    _authState.loading = false;
    _authState.initialised = true;
    syncAuthUI();
  }

  // isValidEmail(email) — basic email format check for OTP input.
  function isValidEmail(email) {
    if (typeof email !== 'string') return false;
    var trimmed = email.trim();
    if (trimmed.length === 0) return false;
    // Simple pattern: something@something.something
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }

  // getAuthCooldownRemainingSeconds() — seconds left on the OTP cooldown.
  function getAuthCooldownRemainingSeconds() {
    if (!_authCooldownUntil) return 0;
    var remaining = Math.ceil((_authCooldownUntil - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  }

  // startAuthCooldown(seconds) — begin a countdown; clears any existing timer first.
  function startAuthCooldown(seconds) {
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
  function stopAuthCooldown() {
    if (_authCooldownTimer !== null) {
      clearInterval(_authCooldownTimer);
      _authCooldownTimer = null;
    }
    _authCooldownUntil = 0;
  }

  // getAuthRedirectUrl() — build the magic-link redirect URL.
  // Always redirects to index.html on the current origin.  Works for local
  // (http://127.0.0.1:4177/index.html), GitHub Pages, and custom deploys.
  function getAuthRedirectUrl() {
    var origin = window.location.origin;
    var pathname = window.location.pathname;
    // Replace the last path segment with index.html, preserving any subdirectory.
    // e.g. /foo/bar.html → /foo/index.html;  /  → /index.html
    var parts = pathname.split('/');
    parts[parts.length - 1] = 'index.html';
    return origin + parts.join('/');
  }

  // normalizeAuthError(error) — convert raw errors into Chinese-friendly messages.
  function normalizeAuthError(error) {
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

  // syncAuthUI() — update auth section in settings drawer to reflect _authState.
  // Safe to call before DOM is ready (returns silently).
  function syncAuthUI() {
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
        statusEl.textContent = _authState.error || '';
        statusEl.className = _authState.error ? 'auth-status auth-status-error' : 'auth-status';
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
