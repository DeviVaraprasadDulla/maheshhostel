// js/auth.js
// Simple session-based auth helper

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const ROLE_KEY = "role";

export function saveTokens({ access, refresh, role }) {
  if (access) sessionStorage.setItem(ACCESS_KEY, access);
  if (refresh) sessionStorage.setItem(REFRESH_KEY, refresh);
  if (role) sessionStorage.setItem(ROLE_KEY, role);
}

export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return sessionStorage.getItem(REFRESH_KEY);
}

export function getRole() {
  return sessionStorage.getItem(ROLE_KEY);
}

export function clearAuth() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(ROLE_KEY);
}
