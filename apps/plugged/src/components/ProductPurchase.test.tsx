// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { clearCart, closeCart } from '@store-kit/storefront/cart/store'
import { afterEach, describe, expect, test } from 'vite-plus/test'

import { ProductPurchase } from './ProductPurchase'

const images = [
  {
    id: 'image-front',
    url: 'https://plugged.storekitcdn.darjs.dev/products/test/front.jpg',
    width: 1200,
    height: 900,
    alt: 'Урд талаас авсан зураг',
  },
  {
    id: 'image-red',
    url: 'https://plugged.storekitcdn.darjs.dev/products/test/red.jpg',
    width: 1200,
    height: 900,
    alt: 'Улаан хувилбарын зураг',
  },
  {
    id: 'image-detail',
    url: 'https://plugged.storekitcdn.darjs.dev/products/test/detail.jpg',
    width: 1200,
    height: 900,
    alt: 'Ойроос авсан зураг',
  },
]

const product = {
  slug: 'test-iem',
  name: 'Test IEM',
  images,
  variants: [
    {
      id: 'variant-black',
      name: 'Хар',
      options: { color: 'Black' },
      priceMnt: 120_000,
      compareAtPriceMnt: 130_000,
      stockQuantity: 8,
      imageLinks: [],
    },
    {
      id: 'variant-red',
      name: 'Улаан',
      options: { color: 'Red' },
      priceMnt: 125_000,
      stockQuantity: 2,
      imageLinks: [{ imageId: 'image-red' }],
    },
  ],
}

afterEach(() => {
  cleanup()
  clearCart()
  closeCart()
})

describe('interactive product stage', () => {
  test('selects real gallery images and follows a variant image link', async () => {
    const view = render(() => <ProductPurchase product={product} />)
    const front = view.getByRole('button', { name: '1-р зураг: Урд талаас авсан зураг' })
    const detail = view.getByRole('button', { name: '3-р зураг: Ойроос авсан зураг' })

    expect(front.getAttribute('aria-current')).toBe('true')
    fireEvent.click(detail)
    await Promise.resolve()
    expect(detail.getAttribute('aria-current')).toBe('true')
    expect(view.getByText('Ойроос авсан зураг сонгогдлоо.').textContent).toBe(
      'Ойроос авсан зураг сонгогдлоо.',
    )

    fireEvent.click(view.getByText('Улаан', { selector: 'label span' }))
    await Promise.resolve()
    expect(
      view
        .getByRole('button', { name: '2-р зураг: Улаан хувилбарын зураг' })
        .getAttribute('aria-current'),
    ).toBe('true')
    expect(view.getAllByText('2 ШИРХЭГ ҮЛДСЭН')).toHaveLength(2)
    expect(view.getAllByText(/125,000/, { selector: 'strong' })).toHaveLength(2)
  })

  test('updates quantity totals and announces the cart action', () => {
    const view = render(() => <ProductPurchase product={product} />)

    fireEvent.click(view.getByRole('button', { name: /Нэгээр нэмэх/ }))
    expect(view.getByLabelText('Сонгосон тоо').textContent).toBe('2')
    expect(view.getByRole('button', { name: /САГСАНД НЭМЭХ.*240,000/ })).toBeTruthy()

    fireEvent.click(view.getByRole('button', { name: /САГСАНД НЭМЭХ/ }))
    expect(view.getByText('Test IEM сагсанд нэмэгдлээ.').textContent).toBe(
      'Test IEM сагсанд нэмэгдлээ.',
    )
  })
})
