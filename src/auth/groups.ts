/** Members of this group are superusers. Matches ovc-backend's OVC_ADMIN_GROUP. */
export const ADMIN_GROUP = "ADMINISTRATOR";

export const isAdminGroup = (groups: readonly string[] | undefined) =>
  !!groups?.includes(ADMIN_GROUP);

/** Permissions are granted to groups, so a user with none can never be granted anything. */
export const hasAnyGroup = (groups: readonly string[] | undefined) =>
  (groups?.length ?? 0) > 0;

/**
 * Where the user's groups sit in the OIDC token - the names permissions are
 * granted to. Provider-specific: configure with OIDC_GROUPS_CLAIM (same value as
 * ovc-backend's OVC_OIDC_GROUPS_CLAIM). `${client_id}` is substituted.
 *   Keycloak client roles (default)          : resource_access.${client_id}.roles
 *   Keycloak realm roles                     : realm_access.roles
 *   Keycloak groups (Group Membership mapper): groups
 *   Entra ID / Okta groups claim             : groups
 */
export const DEFAULT_GROUPS_CLAIM = "resource_access.${client_id}.roles";

/** Walk a dot-path (`a.b.c`) into a decoded-token object. */
export function claimByPath(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[key]
          : undefined,
      obj,
    );
}

/** The groups at `claimPath` in token claims (array or space-delimited string). */
export function groupsFromClaims(claims: unknown, claimPath: string): string[] {
  const value = claimByPath(claims, claimPath);
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(/\s+/).filter(Boolean);
  return [];
}
