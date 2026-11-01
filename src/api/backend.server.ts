import { getAccessToken } from "~/auth/token.server";
import { isDevBypass } from "~/auth/bypass";

/**
 * Server-side access to ovc-backend: its base URL and a fetch that carries the
 * signed-in user's OIDC bearer. Server-only (`.server.ts`) - the token never
 * reaches the browser. Used by the `/frontend-api/api/*` proxy and by the
 * Guacamole tunnel, which asks the backend where a console may connect.
 */

export function backendBase(): string {
  const base = process.env.API_URL;
  if (!base)
    throw new Error(
      "API_URL is not set (base URL of ovc-backend, e.g. http://localhost:8000/api)",
    );
  return base.replace(/\/$/, "");
}

/**
 * The bearer to send: null in the dev bypass (ovc-backend runs
 * OVC_AUTH_MODE=stub), `undefined` when there is no valid session.
 */
export async function backendToken(): Promise<string | null | undefined> {
  if (isDevBypass()) return null;
  return (await getAccessToken()) ?? undefined;
}

/** GET a backend path as the signed-in user. */
export async function backendGet(path: string, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${backendBase()}${path}`, { headers });
}
