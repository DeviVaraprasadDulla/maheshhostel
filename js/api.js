// js/api.js
import { API_BASE } from "./config.js";
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearAuth,
} from "./auth.js";

export async function apiFetch(
  path,
  { method = "GET", body = null, headers = {}, auth = true, retry = true } = {}
) {
  const url = API_BASE + path;
  const opts = { method, headers: { ...headers } };

  if (auth) {
    const token = getAccessToken();
    if (token)
      opts.headers["Authorization"] = token.startsWith("Bearer")
        ? token
        : `Bearer ${token}`;
  }

  // FormData check
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (res.status === 401 && auth && retry) {
      // try refresh once (if refresh token exists)
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // retry original request once
        return apiFetch(path, { method, body, headers, auth, retry: false });
      } else {
        // refresh failed -> clear auth so UI can redirect to login
        clearAuth();
        const err = new Error("Unauthorized - please login");
        err.status = 401;
        throw err;
      }
    }

    if (!res.ok) {
      const error = new Error(data?.message || res.statusText || "API error");
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
}

// Attempt to refresh access token using refresh token (sessionStorage)
async function tryRefreshToken() {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const res = await fetch(`${API_BASE}/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    // assume backend returns { access: "...", refresh: "..." } or at least access
    saveTokens({
      access: data.access || data.token || null,
      refresh: data.refresh || refresh,
    });
    return true;
  } catch (e) {
    return false;
  }
}
