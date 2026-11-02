import { createFileRoute } from '@tanstack/react-router'
import { requireAnyGroup } from '~/auth'

/**
 * Every app screen sits under this layout. Guard: must be authenticated AND be
 * in at least one group (permissions are granted to groups). No group →
 * /access-denied. What each user can actually see and do is ovc-backend's call.
 */
export const Route = createFileRoute('/_authed')({
  // Demo branch: the app screens render in the browser only. Their data lives
  // in the browser anyway (src/demo/), so SSR would only paint an empty
  // Explorer - and it costs far more CPU than the Cloudflare Workers free plan
  // allows per request. /login keeps SSR (it is tiny).
  ssr: false,
  beforeLoad: ({ context, location }) => requireAnyGroup(context, location),
})
