import { Type } from 'typebox'
import type { Static } from 'typebox'

import {
  nonNegativeIntegerSchema,
  publicImageSchema,
  variantIdSchema,
  variantOptionsSchema,
} from './common'
import { cartCorrectionSchema } from './errors'

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

export const cartValidationInputSchema = Type.Object(
  {
    variantId: variantIdSchema,
    quantity: Type.Integer({ minimum: 1, maximum: 10 }),
    previousUnitPriceMnt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const cartValidationInputsSchema = Type.Array(cartValidationInputSchema, {
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
    image: Type.Union([publicImageSchema, Type.Null()]),
    unitPriceMnt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const persistedCartItemsSchema = Type.Array(persistedCartItemSchema, {
  minItems: 1,
  maxItems: 20,
})

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
    image: Type.Union([publicImageSchema, Type.Null()]),
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

export type CartLineInput = Static<typeof cartLineInputSchema>
export type CartValidationInput = Static<typeof cartValidationInputSchema>
export type PersistedCartItem = Static<typeof persistedCartItemSchema>
export type StockStatus = Static<typeof stockStatusSchema>
export type ValidatedCartLine = Static<typeof validatedCartLineSchema>
export type ValidatedCart = Static<typeof validatedCartSchema>
export type { CartCorrection, CartValidationError } from './errors'
export { cartCorrectionSchema, cartValidationErrorSchema } from './errors'
export { variantIdPattern } from './common'
