import { database } from '@store-kit/db'
import { Elysia } from 'elysia'

import { auth } from '../auth'
import { localAdminEnabled } from '../local-admin'
import { approvalRequired, unauthenticated } from './admin-access-errors'

type AdminRequestGuard = (request: Request) => Response | undefined

export const createApprovedAdminRoutes = (
  scope: `/${string}`,
  requestGuard?: AdminRequestGuard,
) => {
  const routePrefix = `/api/admin${scope}`

  return new Elysia({ aot: false, prefix: '/api/admin' }).onRequest(
    async ({ request, set, status }) => {
      const pathname = new URL(request.url).pathname
      if (pathname !== routePrefix && !pathname.startsWith(`${routePrefix}/`)) return

      set.headers['cache-control'] = 'private, no-store'
      if (!localAdminEnabled(request)) {
        const adminSession = await auth.api.getSession({ headers: request.headers })
        if (!adminSession) return status(401, unauthenticated)

        const approved = await database.query.auth.isApproved(adminSession.user.id)
        if (!approved) return status(403, approvalRequired)
      }

      // Keep native guard responses out of Eden's 200 response type.
      return requestGuard?.(request) as never
    },
  )
}
