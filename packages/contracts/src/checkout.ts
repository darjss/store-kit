import { Type } from 'typebox'
import type { Static } from 'typebox'

import { cartCorrectionSchema, cartLineInputSchema } from './cart'
import { orderIdSchema, validationIssueSchema } from './common'
import { paymentMethodSchema } from './payments'

const requiredTextSchema = (maxLength: number) =>
  Type.String({ minLength: 1, maxLength, pattern: '\\S' })

export const normalizedMongolianPhonePattern = '^[6789]\\d{7}$'
export const checkoutIdempotencyKeyPattern =
  '^checkout_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'

export const checkoutIdempotencyKeySchema = Type.String({
  minLength: 45,
  maxLength: 45,
  pattern: checkoutIdempotencyKeyPattern,
})

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

export const checkoutCustomerSchema = Type.Object(
  {
    name: requiredTextSchema(100),
    phone: Type.String({ pattern: normalizedMongolianPhonePattern }),
  },
  { additionalProperties: false },
)

export const checkoutDeliverySchema = Type.Object(
  {
    district: ulaanbaatarDistrictSchema,
    khoroo: requiredTextSchema(50),
    address: requiredTextSchema(500),
    notes: Type.Optional(Type.String({ maxLength: 500 })),
  },
  { additionalProperties: false },
)

export const checkoutDetailsSchema = Type.Object(
  {
    customer: checkoutCustomerSchema,
    delivery: checkoutDeliverySchema,
    paymentMethod: paymentMethodSchema,
  },
  { additionalProperties: false },
)

export const checkoutInputSchema = Type.Object(
  {
    ...checkoutDetailsSchema.properties,
    idempotencyKey: checkoutIdempotencyKeySchema,
    items: Type.Array(cartLineInputSchema, { minItems: 1, maxItems: 20 }),
  },
  { additionalProperties: false },
)

export const qpayPaymentInstructionsSchema = Type.Object(
  {
    type: Type.Literal('qpay'),
    qrText: Type.String({ minLength: 1, maxLength: 4_096 }),
    qrImage: Type.String({
      minLength: 1,
      maxLength: 524_288,
      pattern: '^data:image/png;base64,[A-Za-z0-9+/]+={0,2}$',
    }),
    urls: Type.Array(
      Type.Object(
        {
          name: Type.String({ minLength: 1, maxLength: 100 }),
          link: Type.String({ minLength: 1, maxLength: 2_048 }),
        },
        { additionalProperties: false },
      ),
      { maxItems: 30 },
    ),
  },
  { additionalProperties: false },
)

export const bankTransferPaymentInstructionsSchema = Type.Object(
  {
    type: Type.Literal('bank_transfer'),
    bankName: Type.String({ minLength: 1 }),
    accountName: Type.String({ minLength: 1 }),
    accountNumber: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export const paymentInstructionsSchema = Type.Union([
  qpayPaymentInstructionsSchema,
  bankTransferPaymentInstructionsSchema,
])

export const checkoutCreatedSchema = Type.Object(
  {
    orderId: orderIdSchema,
    orderNumber: Type.String({ minLength: 1 }),
    statusToken: Type.String({ minLength: 1 }),
    nextAction: paymentInstructionsSchema,
  },
  { additionalProperties: false },
)

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

export type CheckoutIdempotencyKey = Static<typeof checkoutIdempotencyKeySchema>
export type UlaanbaatarDistrict = Static<typeof ulaanbaatarDistrictSchema>
export type CheckoutCustomer = Static<typeof checkoutCustomerSchema>
export type CheckoutDelivery = Static<typeof checkoutDeliverySchema>
export type CheckoutDetails = Static<typeof checkoutDetailsSchema>
export type CheckoutInput = Static<typeof checkoutInputSchema>
export type QPayPaymentInstructions = Static<typeof qpayPaymentInstructionsSchema>
export type BankTransferPaymentInstructions = Static<typeof bankTransferPaymentInstructionsSchema>
export type PaymentInstructions = Static<typeof paymentInstructionsSchema>
export type CheckoutCreated = Static<typeof checkoutCreatedSchema>
export type CheckoutError = Static<typeof checkoutErrorSchema>
