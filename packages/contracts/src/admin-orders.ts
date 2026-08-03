import { Type } from 'typebox'
import type { Static } from 'typebox'

import {
  nonNegativeIntegerSchema,
  nullableTimestampSchema,
  orderIdSchema,
  orderStatusSchema,
  variantOptionsSchema,
} from './common'
import { paymentMethodSchema, paymentStatusSchema } from './payments'

export const adminOrderListFiltersSchema = Type.Object(
  {
    query: Type.Optional(Type.String()),
    status: Type.Optional(orderStatusSchema),
    paymentStatus: Type.Optional(paymentStatusSchema),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
    offset: Type.Optional(nonNegativeIntegerSchema),
  },
  { additionalProperties: false },
)

export const adminOrderListItemSchema = Type.Object(
  {
    id: orderIdSchema,
    number: Type.String({ minLength: 1 }),
    customerName: Type.String({ minLength: 1 }),
    customerPhone: Type.String({ minLength: 1 }),
    status: orderStatusSchema,
    paymentMethod: paymentMethodSchema,
    paymentStatus: paymentStatusSchema,
    lineCount: nonNegativeIntegerSchema,
    totalMnt: nonNegativeIntegerSchema,
    createdAt: nonNegativeIntegerSchema,
    updatedAt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const adminOrderListSchema = Type.Object(
  {
    items: Type.Array(adminOrderListItemSchema),
    total: nonNegativeIntegerSchema,
    limit: Type.Integer({ minimum: 1, maximum: 100 }),
    offset: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const adminOrderLineSchema = Type.Object(
  {
    productName: Type.String({ minLength: 1 }),
    variantName: Type.String({ minLength: 1 }),
    sku: Type.String({ minLength: 1 }),
    options: variantOptionsSchema,
    unitPriceMnt: nonNegativeIntegerSchema,
    quantity: Type.Integer({ minimum: 1 }),
    lineTotalMnt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const adminOrderPaymentSchema = Type.Object(
  {
    method: paymentMethodSchema,
    status: paymentStatusSchema,
    amountMnt: nonNegativeIntegerSchema,
    claimedAt: nullableTimestampSchema,
    paidAt: nullableTimestampSchema,
  },
  { additionalProperties: false },
)

export const adminOrderDetailSchema = Type.Object(
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
    lines: Type.Array(adminOrderLineSchema),
    payment: adminOrderPaymentSchema,
    allowedTransitions: Type.Array(orderStatusSchema),
  },
  { additionalProperties: false },
)

export const adminOrderStatusUpdateSchema = Type.Object(
  {
    status: orderStatusSchema,
    expectedUpdatedAt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const adminOrderNotFoundSchema = Type.Object(
  {
    _tag: Type.Literal('AdminOrderNotFound'),
    orderId: orderIdSchema,
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export const adminOrderConflictSchema = Type.Object(
  {
    _tag: Type.Literal('AdminOrderConflict'),
    orderId: orderIdSchema,
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export const orderStatusTransitionNotAllowedSchema = Type.Object(
  {
    _tag: Type.Literal('OrderStatusTransitionNotAllowed'),
    currentStatus: orderStatusSchema,
    requestedStatus: orderStatusSchema,
    allowedStatuses: Type.Array(orderStatusSchema),
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export const adminOrderErrorSchema = Type.Union([
  adminOrderNotFoundSchema,
  adminOrderConflictSchema,
  orderStatusTransitionNotAllowedSchema,
])

export type AdminOrderListFilters = Static<typeof adminOrderListFiltersSchema>
export type AdminOrderListItem = Static<typeof adminOrderListItemSchema>
export type AdminOrderList = Static<typeof adminOrderListSchema>
export type AdminOrderLine = Static<typeof adminOrderLineSchema>
export type AdminOrderPayment = Static<typeof adminOrderPaymentSchema>
export type AdminOrderDetail = Static<typeof adminOrderDetailSchema>
export type AdminOrderStatusUpdate = Static<typeof adminOrderStatusUpdateSchema>
export type AdminOrderNotFound = Static<typeof adminOrderNotFoundSchema>
export type AdminOrderConflict = Static<typeof adminOrderConflictSchema>
export type OrderStatusTransitionNotAllowed = Static<typeof orderStatusTransitionNotAllowedSchema>
export type AdminOrderError = Static<typeof adminOrderErrorSchema>
