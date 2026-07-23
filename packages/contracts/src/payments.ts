import { Type } from 'typebox'
import type { Static } from 'typebox'

import { orderIdSchema, orderStatusSchema } from './common'

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

export type PaymentMethod = Static<typeof paymentMethodSchema>
export type PaymentStatus = Static<typeof paymentStatusSchema>
export type BankTransferClaim = Static<typeof bankTransferClaimSchema>
export type PaymentConfirmation = Static<typeof paymentConfirmationSchema>
export type PaymentRefresh = Static<typeof paymentRefreshSchema>
export type {
  BankTransferClaimError,
  PaymentConfirmationError,
  PaymentRefreshError,
} from './errors'
