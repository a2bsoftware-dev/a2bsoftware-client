import { reportApiError } from "./api-error-store";

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

// Strips an API_BASE_URL prefix down to a same-origin relative path. Every
// call site historically built its URL as `${API_BASE_URL}/api/...` (an
// absolute, cross-port URL) - that bypasses next.config.ts's /api/:path*
// rewrite entirely (rewrites only intercept requests the browser sends to
// THIS app's own origin) and forces the browser to attach the auth cookie
// cross-port, which Incognito's third-party-cookie blocking silently drops.
// Normalizing here means every existing call site keeps working without
// having to hunt down and edit each one individually.
function toSameOriginPath(path: string): string {
  if (path.startsWith(API_BASE_URL)) {
    return path.slice(API_BASE_URL.length) || "/";
  }
  return path;
}

// Reports a non-ok response to the global error-modal store. Reads the body
// via res.clone() so the call site's own res.json()/res.text() still works -
// a Response body can only be consumed once.
async function reportIfError(res: Response, method: string, url: string): Promise<void> {
  if (res.ok) return;

  let bodyText = "";
  try {
    bodyText = await res.clone().text();
  } catch {
    // no readable body
  }

  let title = res.statusText || "Request failed";
  try {
    const data = JSON.parse(bodyText);
    if (typeof data?.error === "string" && data.error) title = data.error;
  } catch {
    // body wasn't JSON - keep statusText as the title
  }

  reportApiError({
    code: res.status,
    title,
    method,
    url,
    detail: bodyText || undefined,
  });
}

// The backend owns all auth/session/token logic. This helper only reacts to
// HTTP status codes — it never inspects or stores a token itself.
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { trackActivity = true, ...fetchOptions } = options;
  if (trackActivity) {
    markActivity();
  }

  const url = toSameOriginPath(path);
  const method = (fetchOptions.method || "GET").toString().toUpperCase();
  const withCredentials: RequestInit = { ...fetchOptions, credentials: "include" };

  let res: Response;
  try {
    res = await fetch(url, withCredentials);
  } catch (err) {
    reportApiError({
      code: "NETWORK_ERROR",
      title: err instanceof Error ? err.message : "Network request failed",
      method,
      url,
      detail: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }

  if (res.status !== 401) {
    await reportIfError(res, method, url);
    return res;
  }

  const refreshRes = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });
  if (!refreshRes.ok) {
    await reportIfError(res, method, url);
    return res;
  }

  const retryRes = await fetch(url, withCredentials);
  await reportIfError(retryRes, method, url);
  return retryRes;
}

// Proactive keep-alive ping on a fixed timer, independent of user activity -
// bypasses apiFetch entirely so it never counts as "the user did something"
// for idle-logout purposes.
export async function refreshTokensSilently(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch (err) {
    console.error("Silent token refresh failed", err);
    return false;
  }
}
