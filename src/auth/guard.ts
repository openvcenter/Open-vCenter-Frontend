import { redirect } from '@tanstack/react-router'
import { hasAnyGroup, isAdminGroup } from './groups'
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
 * Authenticated but in no group → /access-denied (permissions are granted to
 * groups, so nothing could ever be granted). Anyone else gets in; what they see
 * is the backend's call.
 */
export function requireAnyGroup(context: Ctx, location: Loc) {
  requireAuth(context, location)
  if (!hasAnyGroup(context.user!.groups)) {
    throw redirect({ to: '/access-denied' })
  }
}

/** ADMINISTRATOR group only → otherwise /access-denied. */
export function requireAdmin(context: Ctx, location: Loc) {
  requireAuth(context, location)
  if (!isAdminGroup(context.user!.groups)) {
    throw redirect({ to: '/access-denied' })
  }
}
