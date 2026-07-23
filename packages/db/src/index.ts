import { cartQuery } from './queries/cart'
import { catalogQuery } from './queries/catalog'
import { checkoutQuery } from './queries/checkout'
import { orderQuery } from './queries/orders'
import { paymentQuery } from './queries/payments'

const query = {
  catalog: catalogQuery,
  cart: cartQuery,
  checkout: checkoutQuery,
  orders: orderQuery,
  payments: paymentQuery,
}

export const database = { query }
