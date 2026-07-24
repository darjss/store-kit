import { createRoot } from 'solid-js'
import { afterEach, expect, test } from 'vite-plus/test'

import { cartItems, clearCart, closeCart, isCartOpen } from './cart/store'
import { createProductPurchaseController } from './purchase'

const product = {
  slug: 'aster-kit',
  name: 'Aster Kit',
  images: [
    {
      id: 'image-default',
      url: 'https://media.example.com/aster-default.webp',
      width: 1200,
      height: 900,
      alt: 'Aster Kit',
    },
    {
      id: 'image-copper',
      url: 'https://media.example.com/aster-copper.webp',
      width: 1200,
      height: 900,
      alt: 'Aster Kit Copper',
    },
  ],
  variants: [
    {
      id: 'var_01arz3ndektsv4rrffq69g5fav',
      name: 'Graphite',
      options: { color: 'Graphite' },
      priceMnt: 120_000,
      stockQuantity: 8,
      imageLinks: [],
    },
    {
      id: 'var_01arz3ndektsv4rrffq69g5faw',
      name: 'Copper',
      options: { color: 'Copper' },
      priceMnt: 125_000,
      stockQuantity: 2,
      imageLinks: [{ imageId: 'image-copper' }],
    },
    {
      id: 'var_01arz3ndektsv4rrffq69g5fax',
      name: 'Silver',
      options: { color: 'Silver' },
      priceMnt: 125_000,
      stockQuantity: 0,
      imageLinks: [],
    },
  ],
}

afterEach(() => {
  clearCart()
  closeCart()
})

test('purchase controller selects variants, clamps quantity, chooses images, and adds to cart', () => {
  const owned = createRoot(dispose => ({
    controller: createProductPurchaseController(product),
    dispose,
  }))
  const purchase = owned.controller

  expect(purchase.selectedVariant()?.name).toBe('Graphite')
  expect(purchase.selectedImage()?.id).toBe('image-default')

  purchase.setQuantity(7)
  expect(purchase.selectVariant(product.variants[1]!.id)).toBe(true)
  expect(purchase.quantity()).toBe(2)
  expect(purchase.selectedImage()?.id).toBe('image-copper')
  expect(purchase.announcement()).toEqual({ type: 'quantity-clamped', maximum: 2 })

  expect(purchase.addToCart()).toBe(true)
  expect(cartItems()).toEqual([
    expect.objectContaining({
      variantId: product.variants[1]!.id,
      quantity: 2,
      image: expect.objectContaining({ url: product.images[1]!.url }),
    }),
  ])
  expect(isCartOpen()).toBe(true)
  expect(purchase.announcement()).toEqual({ type: 'added', productName: product.name })

  expect(purchase.selectVariant(product.variants[2]!.id)).toBe(true)
  expect(purchase.quantity()).toBe(0)
  expect(purchase.selectedImage()?.id).toBe('image-default')
  expect(purchase.addToCart()).toBe(false)

  owned.dispose()
})
