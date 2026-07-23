import { Value } from 'typebox/value'
import { expect, test } from 'vite-plus/test'

import {
  cartCorrectionSchema,
  cartLineInputsSchema,
  persistedCartItemSchema,
  validatedCartSchema,
} from './cart'

const persistedItem = {
  variantId: 'var_01arz3ndektsv4rrffq69g5fav',
  quantity: 2,
  productSlug: 'first-iem',
  productName: 'First IEM',
  variantName: 'Black',
  options: { color: 'Black' },
  imageR2Key: 'products/first-iem/black.webp',
  unitPriceMnt: 120_000,
} as const

test('cart input carries only authoritative identity and quantity', () => {
  expect(
    Value.Check(cartLineInputsSchema, [{ variantId: persistedItem.variantId, quantity: 1 }]),
  ).toBe(true)
  expect(
    Value.Check(cartLineInputsSchema, [
      { variantId: persistedItem.variantId, quantity: 1, unitPriceMnt: 1 },
    ]),
  ).toBe(false)
  expect(Value.Check(cartLineInputsSchema, [{ variantId: 'variant-1', quantity: 1 }])).toBe(false)
  expect(
    Value.Check(cartLineInputsSchema, [
      { variantId: 'var_81arz3ndektsv4rrffq69g5fav', quantity: 1 },
    ]),
  ).toBe(false)
  expect(
    Value.Check(cartLineInputsSchema, [{ variantId: persistedItem.variantId, quantity: 11 }]),
  ).toBe(false)
  expect(Value.Check(cartLineInputsSchema, [])).toBe(false)
})

test('persisted cart accepts its display snapshot and no server authority fields', () => {
  expect(Value.Check(persistedCartItemSchema, persistedItem)).toBe(true)
  expect(Value.Check(persistedCartItemSchema, { ...persistedItem, unitPriceMnt: -1 })).toBe(false)
  expect(Value.Check(persistedCartItemSchema, { ...persistedItem, stockQuantity: 3 })).toBe(false)
})

test('cart corrections and validation results are tagged, serializable contracts', () => {
  const correction = {
    _tag: 'PriceChanged',
    variantId: persistedItem.variantId,
    previousUnitPriceMnt: 120_000,
    currentUnitPriceMnt: 125_000,
    message: 'Үнэ өөрчлөгдсөн байна.',
  } as const
  const validation = {
    lines: [
      {
        variantId: persistedItem.variantId,
        productSlug: persistedItem.productSlug,
        productName: persistedItem.productName,
        variantName: persistedItem.variantName,
        sku: 'IEM-BLACK',
        options: persistedItem.options,
        imageR2Key: persistedItem.imageR2Key,
        unitPriceMnt: 125_000,
        requestedQuantity: 2,
        availableQuantity: 4,
        stockStatus: 'low-stock',
        lineTotalMnt: 250_000,
      },
    ],
    corrections: [correction],
    subtotalMnt: 250_000,
  } as const

  expect(Value.Check(cartCorrectionSchema, correction)).toBe(true)
  expect(Value.Check(validatedCartSchema, validation)).toBe(true)
  expect(Value.Check(cartCorrectionSchema, { ...correction, _tag: 'UnknownCorrection' })).toBe(
    false,
  )
})
