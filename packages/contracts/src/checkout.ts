import { Type } from 'typebox'
import type { Static } from 'typebox'

import { cartLineInputSchema } from './cart'
import { orderIdSchema } from './common'
import { paymentMethodSchema } from './payments'

const requiredTextSchema = (maxLength: number) =>
  Type.String({ minLength: 1, maxLength, pattern: '\\S' })

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
    phone: Type.String({ minLength: 8, maxLength: 20 }),
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
    items: Type.Array(cartLineInputSchema, { minItems: 1, maxItems: 20 }),
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

export type UlaanbaatarDistrict = Static<typeof ulaanbaatarDistrictSchema>
export type CheckoutCustomer = Static<typeof checkoutCustomerSchema>
export type CheckoutDelivery = Static<typeof checkoutDeliverySchema>
export type CheckoutDetails = Static<typeof checkoutDetailsSchema>
export type CheckoutInput = Static<typeof checkoutInputSchema>
export type QPayPaymentInstructions = Static<typeof qpayPaymentInstructionsSchema>
export type BankTransferPaymentInstructions = Static<typeof bankTransferPaymentInstructionsSchema>
export type PaymentInstructions = Static<typeof paymentInstructionsSchema>
export type CheckoutCreated = Static<typeof checkoutCreatedSchema>
export type { CheckoutError } from './errors'
export { checkoutErrorSchema } from './errors'
