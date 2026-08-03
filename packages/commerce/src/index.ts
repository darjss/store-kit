import { cartOperations } from './cart/operations'
import { adminCatalogOperations } from './catalog/admin-operations'
import { catalogOperations } from './catalog/operations'
import { checkoutOperations } from './checkout/operations'
import { dashboardOperations } from './dashboard/operations'
import { systemOperations } from './operations/system-status'
import { orderOperations } from './orders/operations'
import { paymentOperations } from './payments/operations'
import { settingsOperations } from './settings/operations'

export { getSystemStatus } from './operations/system-status'
export type { SystemError, SystemStatus } from './operations/system-status'

const catalog = { ...catalogOperations, ...adminCatalogOperations }

export type Commerce = {
  system: typeof systemOperations
  catalog: typeof catalog
  cart: typeof cartOperations
  checkout: typeof checkoutOperations
  dashboard: typeof dashboardOperations
  orders: typeof orderOperations
  payments: typeof paymentOperations
  settings: typeof settingsOperations
}

export const commerce: Commerce = {
  system: systemOperations,
  catalog,
  cart: cartOperations,
  checkout: checkoutOperations,
  dashboard: dashboardOperations,
  orders: orderOperations,
  payments: paymentOperations,
  settings: settingsOperations,
}
