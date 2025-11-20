// js/auth.js
// Improved auth helper with optional persistent storage ("Remember me").
// Keys:
const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const ROLE_KEY = "role";

// saveTokens({ access, refresh, role, persistent })
// - persistent: boolean -> store in localStorage when true, otherwise in sessionStorage
export function saveTokens({ access, refresh, role, persistent = false } = {}) {
  try {
    if (access) {
      if (persistent) localStorage.setItem(ACCESS_KEY, access);
      else sessionStorage.setItem(ACCESS_KEY, access);
    }
    if (refresh) {
      if (persistent) localStorage.setItem(REFRESH_KEY, refresh);
      else sessionStorage.setItem(REFRESH_KEY, refresh);
    }
    if (role) {
      if (persistent) localStorage.setItem(ROLE_KEY, role);
      else sessionStorage.setItem(ROLE_KEY, role);
    }
  } catch (e) {
    // storage might be disabled; fall back to sessionStorage
    if (access) sessionStorage.setItem(ACCESS_KEY, access);
    if (refresh) sessionStorage.setItem(REFRESH_KEY, refresh);
    if (role) sessionStorage.setItem(ROLE_KEY, role);
  }
}

// get access token: prefer sessionStorage (current session), else localStorage (remembered)
export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_KEY) || localStorage.getItem(ACCESS_KEY);
}

// get refresh token
export function getRefreshToken() {
  return (
    sessionStorage.getItem(REFRESH_KEY) || localStorage.getItem(REFRESH_KEY)
  );
}

export function getRole() {
  return sessionStorage.getItem(ROLE_KEY) || localStorage.getItem(ROLE_KEY);
}

// clear both storages
export function clearAuth() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(ROLE_KEY);

  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ROLE_KEY);
}
