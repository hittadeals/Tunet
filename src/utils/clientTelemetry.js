/**
 * Minimal client error reporter.
 *
 * Errors are kept in a small localStorage ring buffer for local debugging and
 * sent (best effort, rate limited) to `/api/client-errors` so server logs show
 * crashes that only happen in the browser.
 */
const STORAGE_KEY = 'tunet_client_errors';
const MAX_STORED = 20;
const MAX_PER_SESSION = 12;
let sentCount = 0;

const truncate = (value, length) =>
  typeof value === 'string' ? value.slice(0, length) : value == null ? '' : String(value).slice(0, length);

const isIgnored = (message) =>
  /resizeobserver loop|script error\.?$/i.test(String(message || ''));

const storeLocally = (payload) => {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const next = Array.isArray(current) ? current : [];
    next.push(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-MAX_STORED)));
  } catch {
    // Local diagnostics are best effort.
  }
};

const send = (payload) => {
  if (sentCount >= MAX_PER_SESSION || typeof window === 'undefined') return;
  sentCount += 1;
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      const blob = new globalThis.Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/client-errors', blob)) return;
    }
  } catch {
    // Fall through to fetch.
  }
  try {
    fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Ignore reporting failures.
  }
};

export function reportClientError(error, context = {}) {
  const message = truncate(error?.message || error, 500);
  if (!message || isIgnored(message)) return;
  const payload = {
    message,
    stack: truncate(error?.stack, 4000),
    url: truncate(typeof window !== 'undefined' ? window.location.href : '', 500),
    context: truncate(
      typeof context === 'string' ? context : JSON.stringify(context || {}),
      1000
    ),
    ts: Date.now(),
  };
  storeLocally(payload);
  send(payload);
}

export function installClientErrorHandlers() {
  if (typeof window === 'undefined' || window.__tunetErrorHandlersInstalled) return;
  window.__tunetErrorHandlersInstalled = true;
  window.addEventListener('error', (event) => {
    if (event?.error) reportClientError(event.error, { source: 'error' });
  });
  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(event?.reason, { source: 'unhandledrejection' });
  });
}
