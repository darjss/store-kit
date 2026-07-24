import { commerce } from '@store-kit/commerce'
import { Result } from 'better-result'
import { Elysia } from 'elysia'

import { cartRoutes } from './routes/cart'
import { catalogRoutes } from './routes/catalog'
import { shoppingRoutes } from './routes/shopping'
import { qpayWebhook } from './webhooks/qpay'
import { telegramWebhook } from './webhooks/telegram'

export const app = new Elysia({ aot: false })
  .get('/api/system/status', () => Result.serialize(commerce.system.getStatus(true)))
  .use(catalogRoutes)
  .use(cartRoutes)
  .use(shoppingRoutes)
  .use(qpayWebhook)
  .use(telegramWebhook)

export { cartRoutes, catalogRoutes, qpayWebhook, shoppingRoutes, telegramWebhook }
export type App = typeof app
