import { commerce } from '@store-kit/commerce'
import { Result } from 'better-result'
import { Elysia } from 'elysia'

import { auth } from './auth'
import { adminRoutes } from './routes/admin'
import { adminCatalogRoutes } from './routes/admin-catalog'
import { adminDashboardRoutes } from './routes/admin-dashboard'
import { adminOrderRoutes } from './routes/admin-orders'
import { adminSettingsRoutes } from './routes/admin-settings'
import { cartRoutes } from './routes/cart'
import { catalogRoutes } from './routes/catalog'
import { shoppingRoutes } from './routes/shopping'
import { qpayWebhook } from './webhooks/qpay'
import { telegramWebhook } from './webhooks/telegram'

export const app = new Elysia({ aot: false })
  .mount(auth.handler)
  .get('/api/system/status', () => Result.serialize(commerce.system.getStatus(true)))
  .use(adminRoutes)
  .use(adminDashboardRoutes)
  .use(adminCatalogRoutes)
  .use(adminOrderRoutes)
  .use(adminSettingsRoutes)
  .use(catalogRoutes)
  .use(cartRoutes)
  .use(shoppingRoutes)
  .use(qpayWebhook)
  .use(telegramWebhook)

export {
  adminCatalogRoutes,
  adminDashboardRoutes,
  adminOrderRoutes,
  adminRoutes,
  adminSettingsRoutes,
  auth,
  cartRoutes,
  catalogRoutes,
  qpayWebhook,
  shoppingRoutes,
  telegramWebhook,
}
export type App = typeof app
