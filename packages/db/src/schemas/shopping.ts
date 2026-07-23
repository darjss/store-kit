import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/typebox'
import { Type } from 'typebox'
import type { Static } from 'typebox'

import { checkoutSettings, order, orderLine, payment } from '../schema/shopping'
import { nonNegativeIntegerSchema, variantOptionsSchema } from './catalog'

export const orderStatusSchema = Type.Union([
  Type.Literal('new'),
  Type.Literal('confirmed'),
  Type.Literal('preparing'),
  Type.Literal('delivering'),
  Type.Literal('completed'),
  Type.Literal('cancelled'),
])
export const paymentMethodSchema = Type.Union([Type.Literal('qpay'), Type.Literal('bank_transfer')])
export const cartLineInputSchema = Type.Object(
  {
    variantId: Type.String({ minLength: 1 }),
    quantity: Type.Integer({ minimum: 1, maximum: 10 }),
  },
  { additionalProperties: false },
)
export const cartLineInputsSchema = Type.Array(cartLineInputSchema, { minItems: 1, maxItems: 20 })
export const ulaanbaatarDistrictSchema = Type.Union([
  Type.Literal('Багануур'),
  Type.Literal('Багахангай'),
  Type.Literal('Баянгол'),
  Type.Literal('Баянзүрх'),
  Type.Literal('Налайх'),
  Type.Literal('Сонгинохайрхан'),
  Type.Literal('Сүхбаатар'),
  Type.Literal('Хан-Уул'),
  Type.Literal('Чингэлтэй'),
])
export const checkoutInputSchema = Type.Object(
  {
    items: Type.Array(cartLineInputSchema, { minItems: 1, maxItems: 20 }),
    customer: Type.Object(
      {
        name: Type.String({ minLength: 1, maxLength: 100 }),
        phone: Type.String({ minLength: 8, maxLength: 20 }),
      },
      { additionalProperties: false },
    ),
    delivery: Type.Object(
      {
        district: ulaanbaatarDistrictSchema,
        khoroo: Type.String({ minLength: 1, maxLength: 50 }),
        address: Type.String({ minLength: 1, maxLength: 500 }),
        notes: Type.Optional(Type.String({ maxLength: 500 })),
      },
      { additionalProperties: false },
    ),
    paymentMethod: paymentMethodSchema,
  },
  { additionalProperties: false },
)
export const paymentStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('claimed'),
  Type.Literal('confirming'),
  Type.Literal('paid'),
  Type.Literal('failed'),
])
export const persistedCartItemSchema = Type.Object(
  {
    variantId: Type.String({ minLength: 1 }),
    quantity: Type.Integer({ minimum: 1, maximum: 10 }),
    productSlug: Type.String({ minLength: 1 }),
    productName: Type.String({ minLength: 1 }),
    variantName: Type.String({ minLength: 1 }),
    options: variantOptionsSchema,
    imageR2Key: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    unitPriceMnt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)
export const persistedCartItemsSchema = Type.Array(persistedCartItemSchema, {
  minItems: 1,
  maxItems: 20,
})

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

export type CartLineInput = Static<typeof cartLineInputSchema>
export type CheckoutInput = Static<typeof checkoutInputSchema>
export type PersistedCartItem = Static<typeof persistedCartItemSchema>
export type CheckoutSettings = Static<typeof selectCheckoutSettingsSchema>
export type NewCheckoutSettings = typeof checkoutSettings.$inferInsert
export type Order = Static<typeof selectOrderSchema>
export type NewOrder = typeof order.$inferInsert
export type OrderLine = Static<typeof selectOrderLineSchema>
export type NewOrderLine = typeof orderLine.$inferInsert
export type Payment = Static<typeof selectPaymentSchema>
export type NewPayment = typeof payment.$inferInsert
