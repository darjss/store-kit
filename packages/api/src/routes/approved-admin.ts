import { adminCatalogImageMaxBytes } from '@store-kit/contracts/admin-catalog'
import { database } from '@store-kit/db'
import { Elysia } from 'elysia'

import { auth } from '~/auth'
import { localAdminEnabled } from '~/local-admin'

const unauthenticated = { _tag: 'Unauthenticated' as const }
const approvalRequired = { _tag: 'ApprovalRequired' as const }
const lengthRequired = { _tag: 'LengthRequired' as const }
const payloadTooLarge = { _tag: 'PayloadTooLarge' as const }
const maximumImageRequestBytes = adminCatalogImageMaxBytes + 64 * 1024
const imageUploadPath = /^\/api\/admin\/catalog\/products\/[^/]+\/images$/u

export const createApprovedAdminRoutes = (scope: `/${string}`) => {
  const routePrefix = `/api/admin${scope}`

  return new Elysia({ aot: false, prefix: '/api/admin' })
    .onRequest(async ({ request, set, status }) => {
      const pathname = new URL(request.url).pathname
      if (pathname !== routePrefix && !pathname.startsWith(`${routePrefix}/`)) return

      set.headers['cache-control'] = 'private, no-store'
      if (localAdminEnabled()) return

      const adminSession = await auth.api.getSession({ headers: request.headers })
      if (!adminSession) return status(401, unauthenticated)

      const approved = await database.query.auth.isApproved(adminSession.user.id)
      if (!approved) return status(403, approvalRequired)

      if (request.method === 'POST' && imageUploadPath.test(pathname)) {
        const contentLengthHeader = request.headers.get('content-length')
        const contentLength = Number(contentLengthHeader)
        if (
          contentLengthHeader === null ||
          !Number.isSafeInteger(contentLength) ||
          contentLength <= 0
        )
          return status(411, lengthRequired)
        if (contentLength > maximumImageRequestBytes) return status(413, payloadTooLarge)
      }
    })
    .onError(({ set }) => {
      set.headers['cache-control'] = 'private, no-store'
    })
    .as('scoped')
}
