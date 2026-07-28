import { db } from './client'
import { authQuery } from './queries/auth'
import { cartQuery } from './queries/cart'
import { catalogQuery } from './queries/catalog'
import { checkoutQuery } from './queries/checkout'
import { dashboardQuery } from './queries/dashboard'
import { orderQuery } from './queries/orders'
import { paymentQuery } from './queries/payments'
import { settingsQuery } from './queries/settings'

export type DatabaseQuery = {
  auth: typeof authQuery
  catalog: typeof catalogQuery
  cart: typeof cartQuery
  checkout: typeof checkoutQuery
  dashboard: typeof dashboardQuery
  orders: typeof orderQuery
  payments: typeof paymentQuery
  settings: typeof settingsQuery
}

export const database = {
  query: {
    auth: authQuery,
    catalog: catalogQuery,
    cart: cartQuery,
    checkout: checkoutQuery,
    dashboard: dashboardQuery,
    orders: orderQuery,
    payments: paymentQuery,
    settings: settingsQuery,
  } satisfies DatabaseQuery,
}

export { authSchema } from './schema/auth'
export { db }
