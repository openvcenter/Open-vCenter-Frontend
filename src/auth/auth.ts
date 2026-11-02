import { betterAuth } from "better-auth/minimal";
import { genericOAuth } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { jwtDecode } from "jwt-decode";
import type { GenericOAuthUserInfo } from "better-auth/plugins";
import { DEFAULT_GROUPS_CLAIM, groupsFromClaims } from "./groups";
import { isDemoEnv } from "~/demo/env";

/**
 * OIDC login, brokered by better-auth in **cookie mode** (no database) - the
 * session, the OAuth state and the provider tokens all live in sealed cookies.
 *
 * Provider-agnostic: any OpenID Connect provider with a discovery document works
 * (Keycloak, Auth0, Okta, Entra ID, Google, …). Point OIDC_ISSUER at it and set
 * OIDC_GROUPS_CLAIM to wherever that provider puts the user's groups in the
 * token (Keycloak client roles by default).
 *
 * OIDC_INTERNAL_URL (optional) is the issuer URL as *this server* reaches it,
 * when that differs from the browser-facing OIDC_ISSUER (containers: the browser
 * uses http://localhost:8080, the server needs http://ovc-keycloak:8080). Only
 * the discovery document is fetched from it; the provider must then answer with
 * a browser-facing authorization_endpoint and server-reachable token / userinfo /
 * jwks endpoints (Keycloak: KC_HOSTNAME=<public URL> plus
 * KC_HOSTNAME_BACKCHANNEL_DYNAMIC=true).
 */

/** Stable provider id - used for the callback path and token lookups. */
export const OIDC_PROVIDER_ID = "oidc";

const trimSlash = (url: string | undefined) => url?.replace(/\/$/, "");

const oidc = {
  clientId: process.env.OIDC_CLIENT_ID as string,
  clientSecret: process.env.OIDC_CLIENT_SECRET as string,
  issuer: trimSlash(process.env.OIDC_ISSUER),
  internalUrl: trimSlash(process.env.OIDC_INTERNAL_URL),
};

export const OIDC_DISCOVERY_URL = `${oidc.internalUrl ?? oidc.issuer}/.well-known/openid-configuration`;

const GROUPS_CLAIM = (
  process.env.OIDC_GROUPS_CLAIM || DEFAULT_GROUPS_CLAIM
).replace("${client_id}", oidc.clientId ?? "");

const SCOPES = (process.env.OIDC_SCOPES || "openid profile email")
  .split(/\s+/)
  .filter(Boolean);

/** Decode a JWT's claims, or null if it isn't a decodable JWT (opaque token). */
function decodeClaims(token: unknown): Record<string, unknown> | null {
  if (typeof token !== "string") return null;
  try {
    return jwtDecode<Record<string, unknown>>(token);
  } catch {
    return null;
  }
}

/**
 * Demo mode (OVC_DEMO_MODE) never opens a better-auth session (its login is a
 * plain demo cookie), so a demo deployment needs no auth env at all.
 * better-auth still initialises eagerly, though: it refuses to start in
 * production without a secret, and warns about a missing base URL - hand it
 * placeholder values. The secret is a constant on purpose: nothing is sealed
 * with it, and Cloudflare Workers forbid generating random values at module
 * scope. The OIDC provider is left out entirely (see `plugins`), so no
 * discovery request is attempted either.
 */
const DEMO = isDemoEnv();

function demoOverrides(): { secret?: string; baseURL?: string } {
  if (!DEMO) return {};
  return {
    secret:
      process.env.BETTER_AUTH_SECRET ||
      "ovc-demo-mode-placeholder-secret-nothing-is-sealed-with-it",
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000/frontend-api/auth",
  };
}

function createAuth() {
  return betterAuth({
    ...demoOverrides(),
    telemetry: { enabled: false },
    basePath: "/frontend-api/auth",
    user: {
      additionalFields: {
        groups: { type: "json", fieldName: "groups" },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24,
      updateAge: 60 * 60,
      cookieCache: {
        enabled: true,
        refreshCache: true,
        maxAge: 60 * 60 * 24,
      },
    },
    account: {
      storeStateStrategy: "cookie",
      storeAccountCookie: true,
    },
    plugins: [
      ...(DEMO
        ? []
        : [
      genericOAuth({
        config: [
          {
            providerId: OIDC_PROVIDER_ID,
            discoveryUrl: OIDC_DISCOVERY_URL,
            clientId: oidc.clientId,
            clientSecret: oidc.clientSecret,
            scopes: SCOPES,
            overrideUserInfo: true,
            getUserInfo: (tokens) => {
              // Groups usually ride the access token; fall back to the id token.
              const accessClaims = decodeClaims(tokens.accessToken);
              const claims = accessClaims ?? decodeClaims(tokens.idToken) ?? {};
              const groups = groupsFromClaims(claims, GROUPS_CLAIM);

              return Promise.resolve({
                // `sub` (not `id`) is what better-auth's default accountSubject
                // resolver reads for discovery-based providers - keep both,
                // `id` is still used elsewhere (getUserInfo() below).
                id: String(claims.sub ?? ""),
                sub: String(claims.sub ?? ""),
                email: String(claims.email ?? claims.sub ?? ""),
                name: String(
                  claims.name ??
                    claims.preferred_username ??
                    claims.email ??
                    claims.sub ??
                    "",
                ),
                emailVerified: claims.email_verified === true,
                groups,
              } as GenericOAuthUserInfo);
            },
            // Without this, `groups` on the object returned by getUserInfo above
            // is silently dropped: better-auth only carries email/emailVerified/
            // image/name from the raw profile onto the user record by default,
            // then spreads mapProfileToUser's result on top for anything else -
            // if this isn't set, that's `{}`. This is what actually wires our
            // custom `groups` additionalField.
            mapProfileToUser: (profile) => {
              const groups = (profile as { groups?: unknown }).groups;
              return { groups: Array.isArray(groups) ? groups.map(String) : [] };
            },
          },
        ],
      }),
          ]),
      tanstackStartCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;

/**
 * better-auth fetches the discovery document once, when the instance is built,
 * and silently drops the provider if that fails (provider still booting, wrong
 * URL). Sign-in would then fail with "Provider not found" until a restart. So
 * the instance is rebuilt - at most every RETRY_MS - while the provider is
 * missing. Session reads keep working meanwhile: they only need the cookies.
 */
const RETRY_MS = 5_000;

let current: Auth = createAuth();
let currentHasProvider = providerRegistered(current);
let lastAttempt = Date.now();

async function providerRegistered(instance: Auth): Promise<boolean> {
  const ctx = await instance.$context;
  return ctx.socialProviders.some((p) => p.id === OIDC_PROVIDER_ID);
}

/** The better-auth instance, rebuilt if the OIDC provider failed to register. */
export async function getAuth(): Promise<Auth> {
  // demo mode has no provider by design - nothing to retry
  if (DEMO || (await currentHasProvider)) return current;
  if (Date.now() - lastAttempt >= RETRY_MS) {
    lastAttempt = Date.now();
    const next = createAuth();
    if (await providerRegistered(next)) {
      current = next;
      currentHasProvider = Promise.resolve(true);
    }
  }
  return current;
}

/** Whether sign-in can work right now (the provider's discovery succeeded). */
export async function isProviderReady(): Promise<boolean> {
  await getAuth();
  return currentHasProvider;
}

type InferSession = Auth["$Infer"]["Session"];

export type Session = {
  user: InferSession["user"];
} & InferSession["session"];
