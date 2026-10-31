import "server-only";

const API = "https://api.resend.com";

/**
 * Calls the Resend API with the server-side key. Returns null when no key is configured
 * (local, staging, previews): email features then quietly do nothing.
 */
export async function resendFetch(path: string, init: { method: string; body?: unknown }): Promise<Response | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return fetch(`${API}${path}`, {
    method: init.method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}
