import { Type } from 'typebox'
import type { Static } from 'typebox'

import {
  nonNegativeIntegerSchema,
  validationIssueSchema,
  variantIdSchema,
  variantOptionsSchema,
} from './common'

export const cartLineInputSchema = Type.Object(
  {
    variantId: variantIdSchema,
    quantity: Type.Integer({ minimum: 1, maximum: 10 }),
  },
  { additionalProperties: false },
)

export const cartLineInputsSchema = Type.Array(cartLineInputSchema, {
  minItems: 1,
  maxItems: 20,
})

export const persistedCartItemSchema = Type.Object(
  {
    variantId: variantIdSchema,
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

export const stockStatusSchema = Type.Union([
  Type.Literal('in-stock'),
  Type.Literal('low-stock'),
  Type.Literal('sold-out'),
])

export const validatedCartLineSchema = Type.Object(
  {
    variantId: variantIdSchema,
    productSlug: Type.String({ minLength: 1 }),
    productName: Type.String({ minLength: 1 }),
    variantName: Type.String({ minLength: 1 }),
    sku: Type.String({ minLength: 1 }),
    options: variantOptionsSchema,
    imageR2Key: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    unitPriceMnt: nonNegativeIntegerSchema,
    requestedQuantity: Type.Integer({ minimum: 1, maximum: 10 }),
    availableQuantity: nonNegativeIntegerSchema,
    stockStatus: stockStatusSchema,
    lineTotalMnt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const validatedCartSchema = Type.Object(
  {
    lines: Type.Array(validatedCartLineSchema),
    corrections: Type.Array(cartCorrectionSchema),
    subtotalMnt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

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
      message: Type.String({ minLength: 1 }),
      fields: Type.Array(validationIssueSchema),
    },
    { additionalProperties: false },
  ),
])

export type CartLineInput = Static<typeof cartLineInputSchema>
export type PersistedCartItem = Static<typeof persistedCartItemSchema>
export type CartCorrection = Static<typeof cartCorrectionSchema>
export type StockStatus = Static<typeof stockStatusSchema>
export type ValidatedCartLine = Static<typeof validatedCartLineSchema>
export type ValidatedCart = Static<typeof validatedCartSchema>
export type CartValidationError = Static<typeof cartValidationErrorSchema>
export { variantIdPattern } from './common'
