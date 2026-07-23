import { Type } from 'typebox'
import type { Static } from 'typebox'

import {
  nonNegativeIntegerSchema,
  nullableTimestampSchema,
  orderIdSchema,
  publicImageSchema,
  orderStatusSchema,
  variantOptionsSchema,
} from './common'
import { paymentMethodSchema, paymentStatusSchema } from './payments'

export const publicOrderLineSchema = Type.Object(
  {
    productName: Type.String({ minLength: 1 }),
    variantName: Type.String({ minLength: 1 }),
    sku: Type.String({ minLength: 1 }),
    options: variantOptionsSchema,
    image: Type.Union([publicImageSchema, Type.Null()]),
    unitPriceMnt: nonNegativeIntegerSchema,
    quantity: Type.Integer({ minimum: 1 }),
    lineTotalMnt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const publicOrderPaymentSchema = Type.Object(
  {
    method: paymentMethodSchema,
    status: paymentStatusSchema,
    amountMnt: nonNegativeIntegerSchema,
    claimedAt: nullableTimestampSchema,
    paidAt: nullableTimestampSchema,
  },
  { additionalProperties: false },
)

export const publicOrderSchema = Type.Object(
  {
    id: orderIdSchema,
    number: Type.String({ minLength: 1 }),
    status: orderStatusSchema,
    customerName: Type.String({ minLength: 1 }),
    customerPhone: Type.String({ minLength: 1 }),
    district: Type.String({ minLength: 1 }),
    khoroo: Type.String({ minLength: 1 }),
    address: Type.String({ minLength: 1 }),
    deliveryNotes: Type.Union([Type.String(), Type.Null()]),
    subtotalMnt: nonNegativeIntegerSchema,
    deliveryFeeMnt: nonNegativeIntegerSchema,
    totalMnt: nonNegativeIntegerSchema,
    createdAt: nonNegativeIntegerSchema,
    updatedAt: nonNegativeIntegerSchema,
    lines: Type.Array(publicOrderLineSchema),
    payment: Type.Union([publicOrderPaymentSchema, Type.Null()]),
  },
  { additionalProperties: false },
)

export type OrderStatus = Static<typeof orderStatusSchema>
export type PublicOrderLine = Static<typeof publicOrderLineSchema>
export type PublicOrderPayment = Static<typeof publicOrderPaymentSchema>
export type PublicOrder = Static<typeof publicOrderSchema>
export type { PrivateOrderError } from './errors'
export { privateOrderErrorSchema } from './errors'
export { orderIdPattern, orderStatusSchema } from './common'
