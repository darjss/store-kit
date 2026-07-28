import { database } from '@store-kit/db'
import { Elysia } from 'elysia'

import { auth } from '~/auth'

const unauthenticated = { _tag: 'Unauthenticated' as const }
const approvalRequired = { _tag: 'ApprovalRequired' as const }

export const createApprovedAdminRoutes = () =>
  new Elysia({ aot: false, prefix: '/api/admin' })
    .derive(async ({ request }) => ({
      adminSession: await auth.api.getSession({ headers: request.headers }),
    }))
    .onBeforeHandle(async ({ adminSession, set, status }) => {
      set.headers['cache-control'] = 'private, no-store'
      if (!adminSession) return status(401, unauthenticated)

      const approved = await database.query.auth.isApproved(adminSession.user.id)
      if (!approved) return status(403, approvalRequired)
    })
