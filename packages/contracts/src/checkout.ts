import { Type } from 'typebox'
import type { Static } from 'typebox'

import { cartCorrectionSchema, cartLineInputSchema } from './cart'
import { orderIdSchema, validationIssueSchema } from './common'
import { paymentMethodSchema } from './payments'

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

export const qpayPaymentInstructionsSchema = Type.Object(
  {
    type: Type.Literal('qpay'),
    qrText: Type.String({ minLength: 1 }),
    qrImage: Type.String({ minLength: 1 }),
    urls: Type.Array(
      Type.Object(
        {
          name: Type.String({ minLength: 1 }),
          link: Type.String({ minLength: 1 }),
        },
        { additionalProperties: false },
      ),
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
      message: Type.String({ minLength: 1 }),
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

export type UlaanbaatarDistrict = Static<typeof ulaanbaatarDistrictSchema>
export type CheckoutInput = Static<typeof checkoutInputSchema>
export type QPayPaymentInstructions = Static<typeof qpayPaymentInstructionsSchema>
export type BankTransferPaymentInstructions = Static<typeof bankTransferPaymentInstructionsSchema>
export type PaymentInstructions = Static<typeof paymentInstructionsSchema>
export type CheckoutCreated = Static<typeof checkoutCreatedSchema>
export type CheckoutError = Static<typeof checkoutErrorSchema>
