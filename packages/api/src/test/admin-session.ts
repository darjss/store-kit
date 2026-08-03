import { createId } from '@store-kit/db/ids'
import { makeSignature } from 'better-auth/crypto'
import { env } from 'cloudflare:workers'

import { auth } from '../auth'

export const createAdminSession = async (approved: boolean) => {
  const context = await auth.$context
  const userId = createId('authUser')
  const now = Date.now()
  await env.DB.prepare(
    `insert into user
      (id, name, email, email_verified, approved, created_at, updated_at)
     values (?, 'Admin User', ?, true, ?, ?, ?)`,
  )
    .bind(userId, `${userId}@example.com`, approved, now, now)
    .run()

  const session = await context.internalAdapter.createSession(userId)
  const signature = await makeSignature(session.token, context.secret)
  return {
    userId,
    cookie: `${context.authCookies.sessionToken.name}=${session.token}.${signature}`,
    session,
  }
}

export const createAdminCookie = async (approved: boolean) =>
  (await createAdminSession(approved)).cookie
