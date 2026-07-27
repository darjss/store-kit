import { env } from 'cloudflare:workers'
import { expect, test } from 'vite-plus/test'

import { createId } from '../ids'
import { authQuery } from './auth'

test('reads the current approval value from D1', async () => {
  const userId = createId('authUser')
  const now = Date.now()
  await env.DB.prepare(
    `insert into user
      (id, name, email, email_verified, approved, created_at, updated_at)
     values (?, ?, ?, false, false, ?, ?)`,
  )
    .bind(userId, 'Admin User', `${userId}@example.com`, now, now)
    .run()

  expect(await authQuery.isApproved(userId)).toBe(false)

  await env.DB.prepare('update user set approved = true where id = ?').bind(userId).run()

  expect(await authQuery.isApproved(userId)).toBe(true)
})
