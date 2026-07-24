import { cartQuery } from './queries/cart'
import { catalogQuery } from './queries/catalog'
import { checkoutQuery } from './queries/checkout'
import { orderQuery } from './queries/orders'
import { paymentQuery } from './queries/payments'

export type Query = {
  catalog: typeof catalogQuery
  cart: typeof cartQuery
  checkout: typeof checkoutQuery
  orders: typeof orderQuery
  payments: typeof paymentQuery
}

export const query: Query = {
  catalog: catalogQuery,
  cart: cartQuery,
  checkout: checkoutQuery,
  orders: orderQuery,
  payments: paymentQuery,
}
