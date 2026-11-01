import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import {
  OIDC_DISCOVERY_URL,
  OIDC_PROVIDER_ID,
  getAuth,
  isProviderReady,
} from "./auth";
import { DEV_BYPASS_USER, isDevBypass } from "./bypass";
import type { AuthUser } from "./types";

/**
 * The ONLY place server-side auth logic runs. Everything talks to better-auth
 * (cookie session) - swapping IdPs is a config change in `auth.ts`, not here.
 */

export const fetchCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ user: AuthUser | null; authDisabled: boolean }> => {
    if (isDevBypass()) return { user: DEV_BYPASS_USER, authDisabled: true };

    const data = await (
      await getAuth()
    ).api.getSession({ headers: getRequest().headers });
    if (!data?.session) return { user: null, authDisabled: false };
    const u = data.user as {
      id: string;
      email: string;
      name?: string;
      roles?: unknown;
    };
    return {
      user: {
        id: u.id,
        email: u.email,
        displayName: u.name,
        roles: Array.isArray(u.roles) ? (u.roles as string[]) : [],
      },
      authDisabled: false,
    };
  },
);

/** Error message signInFn throws when the OIDC provider can't be reached. */
export const PROVIDER_UNAVAILABLE = "OIDC_PROVIDER_UNAVAILABLE";

/** Kick off the OIDC redirect. Returns the URL for the browser to navigate to. */
export const signInFn = createServerFn({ method: "POST" })
  .validator((d: { callbackURL?: string }) => d)
  .handler(async ({ data }) => {
    // Discovery failed (provider down or unreachable from this server) - say
    // so instead of better-auth's generic "Provider not found".
    if (!(await isProviderReady())) {
      console.error(
        `[auth] OIDC provider unavailable: discovery at ${OIDC_DISCOVERY_URL} failed. ` +
          "Check OIDC_ISSUER / OIDC_INTERNAL_URL and that the provider is up.",
      );
      throw new Error(PROVIDER_UNAVAILABLE);
    }
    // better-auth's genericOAuth plugin registers each configured provider as
    // a first-class social provider (no plugin-specific sign-in endpoint) -
    // go through the core signInSocial API, not a dedicated OAuth2 method.
    const result = await (
      await getAuth()
    ).api.signInSocial({
      headers: getRequest().headers,
      body: {
        provider: OIDC_PROVIDER_ID,
        callbackURL: data.callbackURL || "/inventory",
        errorCallbackURL: "/login?error=oauth",
      },
    });
    // Only undefined on the id-token/session branch, which this call never
    // takes (no idToken in the body) - guard instead of navigating to
    // "undefined" if that ever stops being true.
    if (!result.url) throw new Error("signInSocial returned no redirect URL");
    return { url: result.url };
  });

/** Clear stale better-auth cookies before starting a fresh OAuth flow. */
export const clearAuthCookies = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      await (await getAuth()).api.signOut({ headers: getRequest().headers });
    } catch {
      // already invalid / expired - nothing to clear
    }
  },
);

export const logoutFn = createServerFn().handler(async () => {
  // Nothing to sign out of while the dev bypass is active.
  if (isDevBypass()) throw redirect({ href: "/inventory" });
  try {
    await (await getAuth()).api.signOut({ headers: getRequest().headers });
  } catch {
    // ignore - session may already be gone
  }
  throw redirect({ href: "/login" });
});
