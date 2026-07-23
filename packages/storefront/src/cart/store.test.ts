import { afterEach, expect, test } from 'vite-plus/test'

import {
  addCartItem,
  cartItemCount,
  cartLineInputs,
  clearCart,
  deserializeCart,
  removeCartItem,
  setCartItemQuantity,
} from './store'
import type { PersistedCartItem } from './store'

const item: PersistedCartItem = {
  variantId: 'var_01arz3ndektsv4rrffq69g5fav',
  quantity: 1,
  productSlug: 'product',
  productName: 'Product',
  variantName: 'Black',
  options: { color: 'Black' },
  imageR2Key: 'products/product/black.webp',
  imageWidth: 1200,
  imageHeight: 900,
  imageAlt: 'Black Product',
  unitPriceMnt: 120_000,
}

afterEach(clearCart)

test('adding the same variant increases its quantity', () => {
  addCartItem(item)
  addCartItem({ ...item, quantity: 2 })

  expect(cartItemCount()).toBe(3)
  expect(cartLineInputs()).toEqual([{ variantId: item.variantId, quantity: 3 }])
})

test('cart submission projects only variant identity and quantity', () => {
  addCartItem(item)
  setCartItemQuantity(item.variantId, 4)

  expect(cartLineInputs()).toEqual([{ variantId: item.variantId, quantity: 4 }])
  expect(cartLineInputs()[0]).not.toHaveProperty('unitPriceMnt')
  expect(cartLineInputs()[0]).not.toHaveProperty('productName')
})

test('quantity commands keep quantities positive integers', () => {
  addCartItem(item)
  setCartItemQuantity(item.variantId, 0)
  setCartItemQuantity(item.variantId, 1.5)
  setCartItemQuantity(item.variantId, 11)

  expect(cartLineInputs()).toEqual([{ variantId: item.variantId, quantity: 1 }])

  removeCartItem(item.variantId)
  expect(cartItemCount()).toBe(0)
})

test('persisted carts keep legacy items and add nullable image metadata', () => {
  const { imageWidth: _width, imageHeight: _height, imageAlt: _alt, ...legacyItem } = item

  expect(deserializeCart(JSON.stringify([legacyItem]))).toEqual([
    { ...legacyItem, imageWidth: null, imageHeight: null, imageAlt: null },
  ])
})

test('persisted carts reject non-string variant identifiers', () => {
  expect(deserializeCart(JSON.stringify([{ ...item, variantId: [item.variantId] }]))).toEqual([])
})
