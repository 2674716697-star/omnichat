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
      loginBtn.disabled = false;
      loginBtn.textContent = '发送登录链接';
    }
    if (userInfoEl) userInfoEl.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (statusEl) {
      if (_authState.error) {
        statusEl.textContent = _authState.error;
        statusEl.className = 'auth-status auth-status-error';
      } else {
        statusEl.textContent = '';
        statusEl.className = 'auth-status';
      }
    }
  }
