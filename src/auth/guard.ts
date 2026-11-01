import { redirect } from '@tanstack/react-router'
import { hasAnyPrincipal, isAdminRole } from './roles'
import type { AuthUser } from './types'

type Ctx = { user: AuthUser | null }
type Loc = { href: string }

/** Unauthenticated → /login (remembering where they were headed). */
export function requireAuth(context: Ctx, location: Loc) {
  if (!context.user) {
    throw redirect({ to: '/login', search: { redirect: location.href } })
  }
}

/**
 * Authenticated but no roles and no groups → /access-denied (permissions are
 * granted to roles and groups only, so nothing could ever be granted). Anyone
 * else gets in; what they see is the backend's call.
 */
export function requireAnyRole(context: Ctx, location: Loc) {
  requireAuth(context, location)
  if (!hasAnyPrincipal(context.user)) {
    throw redirect({ to: '/access-denied' })
  }
}

/** ADMINISTRATOR only → otherwise /access-denied. */
export function requireAdmin(context: Ctx, location: Loc) {
  requireAuth(context, location)
  if (!isAdminRole(context.user!.roles)) {
    throw redirect({ to: '/access-denied' })
  }
}
