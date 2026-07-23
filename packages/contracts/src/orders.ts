import { Type } from 'typebox'
import type { Static } from 'typebox'

import {
  nonNegativeIntegerSchema,
  nullableTimestampSchema,
  orderIdSchema,
  variantOptionsSchema,
} from './common'
import { paymentMethodSchema, paymentStatusSchema } from './payments'

export const orderStatusSchema = Type.Union([
  Type.Literal('new'),
  Type.Literal('confirmed'),
  Type.Literal('preparing'),
  Type.Literal('delivering'),
  Type.Literal('completed'),
  Type.Literal('cancelled'),
])

export const publicOrderLineSchema = Type.Object(
  {
    productName: Type.String({ minLength: 1 }),
    variantName: Type.String({ minLength: 1 }),
    sku: Type.String({ minLength: 1 }),
    options: variantOptionsSchema,
    imageR2Key: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    imageWidth: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
    imageHeight: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
    imageAlt: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
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

export const privateOrderErrorSchema = Type.Object(
  {
    _tag: Type.Literal('InvalidStatusToken'),
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export type OrderStatus = Static<typeof orderStatusSchema>
export type PublicOrderLine = Static<typeof publicOrderLineSchema>
export type PublicOrderPayment = Static<typeof publicOrderPaymentSchema>
export type PublicOrder = Static<typeof publicOrderSchema>
export type PrivateOrderError = Static<typeof privateOrderErrorSchema>
export { orderIdPattern } from './common'
