import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vite-plus/test'

import { createAdminSession } from '~/test/admin-session'

import { createApprovedAdminRoutes } from './approved-admin'

const guardedProbe = createApprovedAdminRoutes('/foundation').get('/foundation/probe', () => ({
  ok: true as const,
}))

const requestProbe = (cookie?: string) =>
  guardedProbe.handle(
    new Request('https://plugged.mn/api/admin/foundation/probe', {
      headers: { ...(cookie ? { cookie } : {}), origin: 'https://plugged.mn' },
    }),
  )

describe('approved admin route foundation', () => {
  it('guards a standalone feature plugin with the current D1 approval value', async () => {
    const unauthenticated = await requestProbe()
    const session = await createAdminSession(false)
    const unapproved = await requestProbe(session.cookie)

    await env.DB.prepare('update user set approved = true, updated_at = ? where id = ?')
      .bind(Date.now(), session.userId)
      .run()
    const approved = await requestProbe(session.cookie)

    expect(unauthenticated.status).toBe(401)
    expect(await unauthenticated.json()).toEqual({ _tag: 'Unauthenticated' })
    expect(unapproved.status).toBe(403)
    expect(await unapproved.json()).toEqual({ _tag: 'ApprovalRequired' })
    expect(approved.status).toBe(200)
    expect(await approved.json()).toEqual({ ok: true })
    for (const response of [unauthenticated, unapproved, approved])
      expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
})
