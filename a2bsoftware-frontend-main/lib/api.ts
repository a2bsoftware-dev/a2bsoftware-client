export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8081";

// Idle-logout tracking: updated whenever the user's own actions cause a real
// API call. Deliberately NOT a React state - it's read from a polling
// interval, not rendered, and must survive across every component on the page.
let lastActivityAt = Date.now();

export function getLastActivityAt(): number {
  return lastActivityAt;
}

function markActivity(): void {
  lastActivityAt = Date.now();
}

interface ApiFetchOptions extends RequestInit {
  // Set to false for calls that aren't a real user action (background polling,
  // the silent keep-alive refresh) so they don't reset the idle-logout timer.
  trackActivity?: boolean;
}

// The backend owns all auth/session/token logic. This helper only reacts to
// HTTP status codes — it never inspects or stores a token itself.
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { trackActivity = true, ...fetchOptions } = options;
  if (trackActivity) {
    markActivity();
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const withCredentials: RequestInit = { ...fetchOptions, credentials: "include" };

  const res = await fetch(url, withCredentials);
  if (res.status !== 401) {
    return res;
  }

  const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!refreshRes.ok) {
    return res;
  }

  return fetch(url, withCredentials);
}

// Proactive keep-alive ping on a fixed timer, independent of user activity -
// bypasses apiFetch entirely so it never counts as "the user did something"
// for idle-logout purposes.
export async function refreshTokensSilently(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch (err) {
    console.error("Silent token refresh failed", err);
    return false;
  }
}
