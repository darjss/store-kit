import { getSystemStatus } from '@store-kit/commerce'
import { Result } from 'better-result'
import { Elysia } from 'elysia'

import { cartRoutes } from './routes/cart'
import { catalogRoutes } from './routes/catalog'
import { shoppingRoutes } from './routes/shopping'
import { telegramWebhook } from './webhooks/telegram'

export const app = new Elysia({ aot: false })
  .get('/api/system/status', () => Result.serialize(getSystemStatus(true)))
  .use(catalogRoutes)
  .use(cartRoutes)
  .use(shoppingRoutes)
  .use(telegramWebhook)

export { cartRoutes, catalogRoutes, shoppingRoutes, telegramWebhook }
export type App = typeof app
