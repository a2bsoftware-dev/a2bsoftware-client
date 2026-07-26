// Global store for the "any API error opens a modal" behavior. apiFetch (a
// plain async function, not a component) reports here; ApiErrorModal
// subscribes via useSyncExternalStore. A module-level store is simpler than
// wiring a context through every layout, since apiFetch has no component
// tree to reach into.
export interface ApiError {
  id: number;
  code: number | string;
  title: string;
  method: string;
  url: string;
  detail?: string;
}

type Listener = () => void;

let currentError: ApiError | null = null;
let nextId = 1;
const listeners = new Set<Listener>();

export function reportApiError(error: Omit<ApiError, "id">): void {
  currentError = { ...error, id: nextId++ };
  listeners.forEach((listener) => listener());
}

export function clearApiError(): void {
  currentError = null;
  listeners.forEach((listener) => listener());
}

export function subscribeApiError(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getApiErrorSnapshot(): ApiError | null {
  return currentError;
}
