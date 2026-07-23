import { orderStatusSchema } from '@store-kit/contracts/orders'
import { paymentMethodSchema, paymentStatusSchema } from '@store-kit/contracts/payments'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/typebox'
import { Type } from 'typebox'
import type { Static } from 'typebox'

import { checkoutSettings, order, orderLine, payment } from '../schema/shopping'
import { nonNegativeIntegerSchema, variantOptionsSchema } from './catalog'

const settingsRefinements = { deliveryFeeMnt: () => nonNegativeIntegerSchema }
const orderRefinements = {
  status: () => orderStatusSchema,
  subtotalMnt: () => nonNegativeIntegerSchema,
  deliveryFeeMnt: () => nonNegativeIntegerSchema,
  totalMnt: () => nonNegativeIntegerSchema,
}
const lineRefinements = {
  options: () => variantOptionsSchema,
  unitPriceMnt: () => nonNegativeIntegerSchema,
  quantity: () => Type.Integer({ minimum: 1 }),
  lineTotalMnt: () => nonNegativeIntegerSchema,
}
const paymentRefinements = {
  method: () => paymentMethodSchema,
  status: () => paymentStatusSchema,
  amountMnt: () => nonNegativeIntegerSchema,
}

export const selectCheckoutSettingsSchema = createSelectSchema(
  checkoutSettings,
  settingsRefinements,
)
export const insertCheckoutSettingsSchema = createInsertSchema(
  checkoutSettings,
  settingsRefinements,
)
export const updateCheckoutSettingsSchema = createUpdateSchema(
  checkoutSettings,
  settingsRefinements,
)
export const selectOrderSchema = createSelectSchema(order, orderRefinements)
export const insertOrderSchema = createInsertSchema(order, orderRefinements)
export const updateOrderSchema = createUpdateSchema(order, orderRefinements)
export const selectOrderLineSchema = createSelectSchema(orderLine, lineRefinements)
export const insertOrderLineSchema = createInsertSchema(orderLine, lineRefinements)
export const selectPaymentSchema = createSelectSchema(payment, paymentRefinements)
export const insertPaymentSchema = createInsertSchema(payment, paymentRefinements)
export const updatePaymentSchema = createUpdateSchema(payment, paymentRefinements)

export type CheckoutSettings = Static<typeof selectCheckoutSettingsSchema>
export type NewCheckoutSettings = typeof checkoutSettings.$inferInsert
export type Order = Static<typeof selectOrderSchema>
export type NewOrder = typeof order.$inferInsert
export type OrderLine = Static<typeof selectOrderLineSchema>
export type NewOrderLine = typeof orderLine.$inferInsert
export type Payment = Static<typeof selectPaymentSchema>
export type NewPayment = typeof payment.$inferInsert
