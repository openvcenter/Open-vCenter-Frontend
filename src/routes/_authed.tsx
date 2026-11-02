import { createFileRoute } from '@tanstack/react-router'
import { requireAnyGroup } from '~/auth'

/**
 * Every app screen sits under this layout. Guard: must be authenticated AND be
 * in at least one group (permissions are granted to groups). No group →
 * /access-denied. What each user can actually see and do is ovc-backend's call.
 */
export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context, location }) => requireAnyGroup(context, location),
})
