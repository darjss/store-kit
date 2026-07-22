import { getSystemStatus } from '@store-kit/commerce'
import { Result } from 'better-result'
import { Elysia } from 'elysia'

export const app = new Elysia({ aot: false }).get('/api/system/status', () =>
  Result.serialize(getSystemStatus(true)),
)

export type App = typeof app
