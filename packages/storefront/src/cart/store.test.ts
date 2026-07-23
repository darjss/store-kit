import { afterEach, expect, test } from 'vite-plus/test'

import {
  addCartItem,
  cartItemCount,
  cartLineInputs,
  clearCart,
  removeCartItem,
  setCartItemQuantity,
} from './store'
import type { PersistedCartItem } from './store'

const item: PersistedCartItem = {
  variantId: 'variant-1',
  quantity: 1,
  productSlug: 'product',
  productName: 'Product',
  variantName: 'Black',
  options: { color: 'Black' },
  imageR2Key: 'products/product/black.webp',
  unitPriceMnt: 120_000,
}

afterEach(clearCart)

test('adding the same variant increases its quantity', () => {
  addCartItem(item)
  addCartItem({ ...item, quantity: 2 })

  expect(cartItemCount()).toBe(3)
  expect(cartLineInputs()).toEqual([{ variantId: 'variant-1', quantity: 3 }])
})

test('cart submission projects only variant identity and quantity', () => {
  addCartItem(item)
  setCartItemQuantity(item.variantId, 4)

  expect(cartLineInputs()).toEqual([{ variantId: 'variant-1', quantity: 4 }])
  expect(cartLineInputs()[0]).not.toHaveProperty('unitPriceMnt')
  expect(cartLineInputs()[0]).not.toHaveProperty('productName')
})

test('quantity commands keep quantities positive integers', () => {
  addCartItem(item)
  setCartItemQuantity(item.variantId, 0)
  setCartItemQuantity(item.variantId, 1.5)

  expect(cartLineInputs()).toEqual([{ variantId: 'variant-1', quantity: 1 }])

  removeCartItem(item.variantId)
  expect(cartItemCount()).toBe(0)
})
