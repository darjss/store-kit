// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@solidjs/testing-library'
import type { ValidatedCart } from '@store-kit/contracts/cart'
import { QueryClientProvider } from '@tanstack/solid-query'
import { Result } from 'better-result'
import { createSignal } from 'solid-js'
import { afterEach, expect, test } from 'vite-plus/test'

import { createStorefrontQueryClient } from '~/query-client'
import { cartQuery } from '~/query-options/cart'

import { addCartItem, cartItems, clearCart } from './store'
import type { PersistedCartItem } from './store'
import { createCartValidationController } from './validation'

const item: PersistedCartItem = {
  variantId: 'var_01arz3ndektsv4rrffq69g5fav',
  quantity: 5,
  productSlug: 'aster-kit',
  productName: 'Old Aster Kit',
  variantName: 'Graphite',
  options: { color: 'Graphite' },
  image: {
    url: 'https://media.example.com/aster-kit.webp',
    width: 1200,
    height: 900,
    alt: 'Aster Kit',
  },
  unitPriceMnt: 120_000,
}

const validatedCart: ValidatedCart = {
  lines: [
    {
      variantId: item.variantId,
      productSlug: item.productSlug,
      productName: 'Aster Kit',
      variantName: item.variantName,
      sku: 'ASTER-GRAPHITE',
      options: item.options,
      image: item.image,
      unitPriceMnt: item.unitPriceMnt,
      requestedQuantity: item.quantity,
      availableQuantity: 2,
      stockStatus: 'low-stock',
      lineTotalMnt: item.unitPriceMnt * item.quantity,
    },
  ],
  corrections: [
    {
      _tag: 'InsufficientStock',
      variantId: item.variantId,
      availableQuantity: 2,
      message: 'Only two remain.',
    },
  ],
  subtotalMnt: item.unitPriceMnt * item.quantity,
}

afterEach(() => {
  cleanup()
  clearCart()
})

test('cart validation controller refreshes snapshots, maps corrections, gates checkout, and focuses targets', async () => {
  addCartItem(item)
  const client = createStorefrontQueryClient()
  client.setQueryData(cartQuery.validate([item]).queryKey, Result.ok(validatedCart))

  let controller!: ReturnType<typeof createCartValidationController>
  let disableValidation!: () => void

  function Fixture() {
    const [enabled, setEnabled] = createSignal(true)
    disableValidation = () => setEnabled(false)
    controller = createCartValidationController({ enabled })
    return (
      <button type="button" ref={element => controller.registerFocusTarget('corrections', element)}>
        Corrections
      </button>
    )
  }

  render(() => (
    <QueryClientProvider client={client}>
      <Fixture />
    </QueryClientProvider>
  ))

  await waitFor(() => expect(controller.state().type).toBe('corrections'))
  await waitFor(() => expect(cartItems()[0]?.productName).toBe('Aster Kit'))
  expect(controller.correctionsFor(item.variantId)).toEqual(validatedCart.corrections)
  expect(controller.blocksQuantityChange(item.variantId)).toBe(false)
  expect(controller.blocksQuantityIncrease(cartItems()[0]!)).toBe(true)
  expect(controller.canCheckout()).toBe(false)

  controller.requestFocus('corrections')
  await waitFor(() => expect(document.activeElement?.textContent).toBe('Corrections'))
  expect(controller.focusTarget()).toBe('corrections')

  disableValidation()
  controller.applyCorrection(validatedCart.corrections[0]!)
  expect(cartItems()[0]?.quantity).toBe(2)
})
