/**
 * Admin authentication is a genuinely separate flow from customer/seller
 * login — different endpoints, a different token (never mixed with the
 * regular `auth` token elsewhere in the app), and its own refresh cycle.
 * This mirrors the backend's ADMIN_JWT_SECRET separation: an admin session
 * here can never be produced by, or confused with, a customer/seller login.
 */
const API_BASE = "https://savivah-backend.onrender.com/api";

export async function adminLogin(email, password, totpCode) {
  const res = await fetch(`${API_BASE}/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, totpCode: totpCode || undefined }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.error || "Admin login failed");
  return data; // { accessToken, refreshToken, admin }
}

export async function adminRefresh(refreshToken) {
  const res = await fetch(`${API_BASE}/admin/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.error || "Session expired, please log in again");
  return data;
}

/**
 * A fetch wrapper for /api/admin/* calls that automatically retries once
 * with a refreshed access token if the first attempt comes back 401 —
 * since admin access tokens are deliberately short-lived (10 minutes).
 *
 * `tokens` is { accessToken, refreshToken }; `onRefreshed` is called with
 * the new token pair so the caller can update wherever it stores them
 * (React state — never localStorage, per this app's existing convention).
 */
export function createAdminApiClient(getTokens, onRefreshed, onSessionExpired) {
  async function adminFetch(path, opts = {}) {
    const tokens = getTokens();
    if (!tokens?.accessToken) throw new Error("Not logged in as admin");

    const doFetch = (accessToken) =>
      fetch(`${API_BASE}${path}`, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...(opts.headers || {}),
        },
      });

    let res = await doFetch(tokens.accessToken);

    if (res.status === 401 && tokens.refreshToken) {
      try {
        const refreshed = await adminRefresh(tokens.refreshToken);
        onRefreshed(refreshed);
        res = await doFetch(refreshed.accessToken);
      } catch (e) {
        onSessionExpired();
        throw new Error("Admin session expired — please log in again");
      }
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.detail || data?.error || `Request failed (${res.status})`);
    return data;
  }

  return adminFetch;
}
