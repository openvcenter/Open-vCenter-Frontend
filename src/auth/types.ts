export interface AuthUser {
  id: string
  email: string
  displayName?: string
  /** Groups from the OIDC token (see OIDC_GROUPS_CLAIM). None ⇒ access-denied. */
  groups: string[]
}

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  /** True when the user is in the ADMINISTRATOR group (superuser). UI gating
   *  uses privileges instead - see features/inventory/rbac/privileges.ts. */
  isAdmin: boolean
  /** Whether the user is in at least one group (⇒ can enter the app). */
  hasAnyGroup: boolean
  /** True when OVC_AUTH_MODE=stub is active - no login, everyone is admin. */
  authDisabled: boolean
  logout(): Promise<void>
}
