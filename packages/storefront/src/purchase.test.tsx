// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { afterEach, expect, test } from 'vite-plus/test'

import { cartItems, clearCart, closeCart, isCartOpen } from './cart/store'
import { ProductPurchase } from './purchase'

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
  cleanup()
  clearCart()
  closeCart()
})

test('ProductPurchase parts select variants, clamp quantity, announce changes, and add to cart', () => {
  const view = render(() => (
    <ProductPurchase.Root product={product}>
      <ProductPurchase.Selection>
        {selection => (
          <>
            <output aria-label="selection">
              {selection().selectedVariant?.name}:{selection().selectedImage?.id}:
              {selection().quantity}
            </output>
            <button type="button" onClick={() => selection().setQuantity(7)}>
              Seven
            </button>
            <button
              type="button"
              onClick={() => selection().selectVariant(product.variants[1]!.id)}
            >
              Copper
            </button>
            <button type="button" onClick={selection().addToCart}>
              Add
            </button>
          </>
        )}
      </ProductPurchase.Selection>
      <ul>
        <ProductPurchase.Variants>{variant => <li>{variant.name}</li>}</ProductPurchase.Variants>
      </ul>
      <ProductPurchase.Announcement>
        {announcement => <output aria-label="announcement">{announcement()?.type}</output>}
      </ProductPurchase.Announcement>
    </ProductPurchase.Root>
  ))

  expect(view.getByLabelText('selection').textContent).toBe('Graphite:image-default:1')
  expect(view.getAllByRole('listitem').map(item => item.textContent)).toEqual([
    'Graphite',
    'Copper',
    'Silver',
  ])

  fireEvent.click(view.getByRole('button', { name: 'Seven' }))
  fireEvent.click(view.getByRole('button', { name: 'Copper' }))
  expect(view.getByLabelText('selection').textContent).toBe('Copper:image-copper:2')
  expect(view.getByLabelText('announcement').textContent).toBe('quantity-clamped')

  fireEvent.click(view.getByRole('button', { name: 'Add' }))
  expect(cartItems()).toEqual([
    expect.objectContaining({
      variantId: product.variants[1]!.id,
      quantity: 2,
      image: expect.objectContaining({ url: product.images[1]!.url }),
    }),
  ])
  expect(isCartOpen()).toBe(true)
  expect(view.getByLabelText('announcement').textContent).toBe('added')
})
