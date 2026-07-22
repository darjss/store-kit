import { getSystemStatus } from '@store-kit/commerce'
import { Result } from 'better-result'
import { Elysia } from 'elysia'

import { catalogRoutes } from './routes/catalog'

export const app = new Elysia({ aot: false })
  .get('/api/system/status', () => Result.serialize(getSystemStatus(true)))
  .use(catalogRoutes)

export { catalogRoutes }
export type App = typeof app
