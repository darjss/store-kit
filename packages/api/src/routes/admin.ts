import { createApprovedAdminRoutes } from './approved-admin'

const unauthenticated = { _tag: 'Unauthenticated' as const }

export const adminRoutes = createApprovedAdminRoutes().get(
  '/session',
  ({ adminSession, status }) => {
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
