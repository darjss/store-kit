import { cartOperations } from './cart/operations'
import { catalogOperations } from './catalog/operations'
import { checkoutOperations } from './checkout/operations'
import { systemOperations } from './operations/system-status'
import { orderOperations } from './orders/operations'
import { paymentOperations } from './payments/operations'

export { getSystemStatus } from './operations/system-status'
export type { QPayError, TelegramError } from './errors'
export type { SystemError, SystemStatus } from './operations/system-status'

export type Commerce = {
  system: typeof systemOperations
  catalog: typeof catalogOperations
  cart: typeof cartOperations
  checkout: typeof checkoutOperations
  orders: typeof orderOperations
  payments: typeof paymentOperations
}

export const commerce: Commerce = {
  system: systemOperations,
  catalog: catalogOperations,
  cart: cartOperations,
  checkout: checkoutOperations,
  orders: orderOperations,
  payments: paymentOperations,
}
