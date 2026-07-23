import { getSystemStatus } from '@store-kit/commerce'
import { Result } from 'better-result'
import { Elysia } from 'elysia'

import { cartRoutes } from './routes/cart'
import { catalogRoutes } from './routes/catalog'

export const app = new Elysia({ aot: false })
  .get('/api/system/status', () => Result.serialize(getSystemStatus(true)))
  .use(catalogRoutes)
  .use(cartRoutes)

export { cartRoutes, catalogRoutes }
export type { CartLineInput, PersistedCartItem } from '@store-kit/commerce/shopping'
export type App = typeof app
