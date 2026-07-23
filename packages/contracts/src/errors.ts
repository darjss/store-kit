import { Type } from 'typebox'
import type { Static } from 'typebox'

import { nonNegativeIntegerSchema, variantIdSchema } from './common'
import { paymentStatusSchema } from './payments'

export const validationIssueCodeSchema = Type.Union([
  Type.Literal('invalid'),
  Type.Literal('duplicate'),
])

export const validationIssueSchema = Type.Object(
  {
    path: Type.String({ minLength: 1 }),
    code: validationIssueCodeSchema,
  },
  { additionalProperties: false },
)

export const cartCorrectionSchema = Type.Union([
  Type.Object(
    {
      _tag: Type.Literal('MissingVariant'),
      variantId: variantIdSchema,
      message: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      _tag: Type.Literal('InactiveVariant'),
      variantId: variantIdSchema,
      message: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      _tag: Type.Literal('InsufficientStock'),
      variantId: variantIdSchema,
      availableQuantity: nonNegativeIntegerSchema,
      message: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      _tag: Type.Literal('PriceChanged'),
      variantId: variantIdSchema,
      previousUnitPriceMnt: nonNegativeIntegerSchema,
      currentUnitPriceMnt: nonNegativeIntegerSchema,
      message: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
])

export const cartValidationErrorSchema = Type.Union([
  Type.Object(
    {
      _tag: Type.Literal('CartEmpty'),
      message: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      _tag: Type.Literal('InvalidCart'),
      fields: Type.Array(validationIssueSchema),
    },
    { additionalProperties: false },
  ),
])

export const checkoutErrorSchema = Type.Union([
  Type.Object(
    {
      _tag: Type.Literal('CartEmpty'),
      message: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      _tag: Type.Literal('CartChanged'),
      message: Type.String({ minLength: 1 }),
      corrections: Type.Array(cartCorrectionSchema),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      _tag: Type.Literal('InvalidCheckoutDetails'),
      fields: Type.Array(validationIssueSchema),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      _tag: Type.Literal('DeliveryUnavailable'),
      message: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      _tag: Type.Literal('PaymentSetupFailed'),
      message: Type.String({ minLength: 1 }),
      canUseBankTransfer: Type.Boolean(),
    },
    { additionalProperties: false },
  ),
])

export const privateOrderErrorSchema = Type.Object(
  {
    _tag: Type.Literal('InvalidStatusToken'),
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

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

export const productNotFoundSchema = Type.Object(
  {
    _tag: Type.Literal('ProductNotFound'),
    message: Type.String({ minLength: 1 }),
    slug: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export type ValidationIssueCode = Static<typeof validationIssueCodeSchema>
export type ValidationIssue = Static<typeof validationIssueSchema>
export type CartCorrection = Static<typeof cartCorrectionSchema>
export type CartValidationError = Static<typeof cartValidationErrorSchema>
export type CheckoutError = Static<typeof checkoutErrorSchema>
export type PrivateOrderError = Static<typeof privateOrderErrorSchema>
export type BankTransferClaimError = Static<typeof bankTransferClaimErrorSchema>
export type PaymentRefreshError = Static<typeof paymentRefreshErrorSchema>
export type PaymentConfirmationError = Static<typeof paymentConfirmationErrorSchema>
export type ProductNotFound = Static<typeof productNotFoundSchema>
