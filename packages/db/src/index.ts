import { db } from './client'
import { authQuery } from './queries/auth'
import { cartQuery } from './queries/cart'
import { catalogQuery } from './queries/catalog'
import { checkoutQuery } from './queries/checkout'
import { orderQuery } from './queries/orders'
import { paymentQuery } from './queries/payments'

export type DatabaseQuery = {
  auth: typeof authQuery
  catalog: typeof catalogQuery
  cart: typeof cartQuery
  checkout: typeof checkoutQuery
  orders: typeof orderQuery
  payments: typeof paymentQuery
}

export const database = {
  query: {
    auth: authQuery,
    catalog: catalogQuery,
    cart: cartQuery,
    checkout: checkoutQuery,
    orders: orderQuery,
    payments: paymentQuery,
  } satisfies DatabaseQuery,
}

export { authSchema } from './schema/auth'
export { db }
