import { Type } from 'typebox'
import type { Static } from 'typebox'

import { orderIdSchema, orderStatusSchema, variantIdSchema } from './common'
import { privateOrderErrorSchema } from './private-orders'

export const paymentMethodSchema = Type.Union([Type.Literal('qpay'), Type.Literal('bank_transfer')])

export const paymentStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('claimed'),
  Type.Literal('confirming'),
  Type.Literal('paid'),
  Type.Literal('failed'),
])

export const bankTransferClaimSchema = Type.Object(
  {
    paymentStatus: Type.Union([
      Type.Literal('pending'),
      Type.Literal('claimed'),
      Type.Literal('paid'),
    ]),
  },
  { additionalProperties: false },
)

export const paymentConfirmationSchema = Type.Object(
  {
    orderId: orderIdSchema,
    paymentStatus: Type.Literal('paid'),
    orderStatus: orderStatusSchema,
    stockApplied: Type.Boolean(),
    needsStaffAction: Type.Boolean(),
    newlyPaid: Type.Boolean(),
  },
  { additionalProperties: false },
)

export const paymentRefreshSchema = Type.Union([
  Type.Object({ paymentStatus: Type.Literal('pending') }, { additionalProperties: false }),
  paymentConfirmationSchema,
])

export const bankTransferClaimErrorSchema = Type.Union([
  privateOrderErrorSchema,
  Type.Object(
    {
      _tag: Type.Literal('BankTransferClaimNotAllowed'),
      message: Type.String({ minLength: 1 }),
      paymentStatus: paymentStatusSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      _tag: Type.Literal('StaffNotificationFailed'),
      message: Type.String({ minLength: 1 }),
      retryable: Type.Boolean(),
    },
    { additionalProperties: false },
  ),
])

export const paymentConfirmationErrorSchema = Type.Union([
  Type.Object(
    {
      _tag: Type.Literal('PaymentMismatch'),
      message: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      _tag: Type.Literal('InsufficientStock'),
      message: Type.String({ minLength: 1 }),
      variantIds: Type.Array(variantIdSchema),
    },
    { additionalProperties: false },
  ),
])

export const paymentRefreshErrorSchema = Type.Union([
  privateOrderErrorSchema,
  Type.Object(
    {
      _tag: Type.Literal('PaymentVerificationFailed'),
      message: Type.String({ minLength: 1 }),
      retryable: Type.Boolean(),
    },
    { additionalProperties: false },
  ),
  paymentConfirmationErrorSchema,
])

export type PaymentMethod = Static<typeof paymentMethodSchema>
export type PaymentStatus = Static<typeof paymentStatusSchema>
export type BankTransferClaim = Static<typeof bankTransferClaimSchema>
export type PaymentConfirmation = Static<typeof paymentConfirmationSchema>
export type PaymentRefresh = Static<typeof paymentRefreshSchema>
export type BankTransferClaimError = Static<typeof bankTransferClaimErrorSchema>
export type PaymentConfirmationError = Static<typeof paymentConfirmationErrorSchema>
export type PaymentRefreshError = Static<typeof paymentRefreshErrorSchema>
