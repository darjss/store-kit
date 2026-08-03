import { auth } from '../auth'
import { localAdminEnabled, localAdminSession } from '../local-admin'
import { unauthenticated } from './admin-access-errors'
import { createApprovedAdminRoutes } from './approved-admin'

export const adminRoutes = createApprovedAdminRoutes('/session').get(
  '/session',
  async ({ request, status }) => {
    if (localAdminEnabled(request)) return localAdminSession

    const adminSession = await auth.api.getSession({ headers: request.headers })
    if (!adminSession) return status(401, unauthenticated)

    return {
      _tag: 'AdminSession' as const,
      user: {
        id: adminSession.user.id,
        name: adminSession.user.name,
        email: adminSession.user.email,
        image: adminSession.user.image ?? null,
      },
      expiresAt: adminSession.session.expiresAt.getTime(),
    }
  },
)
