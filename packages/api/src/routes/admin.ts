import { database } from '@store-kit/db'
import { Elysia } from 'elysia'

import { auth } from '~/auth'

export const adminRoutes = new Elysia({ aot: false, prefix: '/api/admin' }).get(
  '/session',
  async ({ request, set, status }) => {
    set.headers['cache-control'] = 'private, no-store'

    const currentSession = await auth.api.getSession({ headers: request.headers })
    if (!currentSession) return status(401, { _tag: 'Unauthenticated' as const })

    const approved = await database.query.auth.isApproved(currentSession.user.id)
    if (!approved) return status(403, { _tag: 'ApprovalRequired' as const })

    return {
      _tag: 'AdminSession' as const,
      user: {
        id: currentSession.user.id,
        name: currentSession.user.name,
        email: currentSession.user.email,
        image: currentSession.user.image ?? null,
      },
      expiresAt: currentSession.session.expiresAt.getTime(),
    }
  },
)
