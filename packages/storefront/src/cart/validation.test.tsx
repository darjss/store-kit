// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@solidjs/testing-library'
import type { ValidatedCart } from '@store-kit/contracts/cart'
import { QueryClientProvider } from '@tanstack/solid-query'
import { Result } from 'better-result'
import { createSignal } from 'solid-js'
import { afterEach, expect, test } from 'vite-plus/test'

import { createStorefrontQueryClient } from '~/query-client'
import { cartQuery } from '~/query-options/cart'

import { Cart } from './components'
import { addCartItem, cartItems, clearCart } from './store'
import type { PersistedCartItem } from './store'
import { cartCheckoutGateOutcome, cartValidationState, useCartValidation } from './validation'

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

function ValidationControls() {
  const validation = useCartValidation()
  return (
    <>
      <button
        type="button"
        ref={element => validation.registerFocusTarget('corrections', element)}
        onClick={() => validation.requestFocus('corrections')}
      >
        Focus corrections
      </button>
      <output aria-label="can-checkout">{validation.canCheckout() ? 'yes' : 'no'}</output>
    </>
  )
}

test('Cart validation context refreshes snapshots and exposes state and item actions through parts', async () => {
  addCartItem(item)
  const client = createStorefrontQueryClient()
  client.setQueryData(cartQuery.validate([item]).queryKey, Result.ok(validatedCart))

  function Fixture() {
    const [enabled, setEnabled] = createSignal(true)
    return (
      <Cart.ValidationRoot enabled={enabled}>
        <button type="button" onClick={() => setEnabled(false)}>
          Disable
        </button>
        <Cart.ValidationState
          idle={() => <>idle</>}
          checking={() => <>checking</>}
          transportError={() => <>transport-error</>}
          validationError={() => <>validation-error</>}
          corrections={() => <>corrections</>}
          ready={() => <>ready</>}
        />
        <Cart.ItemValidation item={item}>
          {line => (
            <>
              <output aria-label="corrections">{line.corrections().length}</output>
              <button type="button" onClick={() => line.applyCorrection(line.corrections()[0]!)}>
                Correct
              </button>
            </>
          )}
        </Cart.ItemValidation>
        <ValidationControls />
      </Cart.ValidationRoot>
    )
  }

  const view = render(() => (
    <QueryClientProvider client={client}>
      <Fixture />
    </QueryClientProvider>
  ))

  await waitFor(() => expect(view.getByText('corrections')).toBeTruthy())
  await waitFor(() => expect(cartItems()[0]?.productName).toBe('Aster Kit'))
  expect(view.getByLabelText('corrections').textContent).toBe('1')
  expect(view.getByLabelText('can-checkout').textContent).toBe('no')

  fireEvent.click(view.getByRole('button', { name: 'Focus corrections' }))
  await waitFor(() =>
    expect(document.activeElement).toBe(view.getByRole('button', { name: 'Focus corrections' })),
  )

  fireEvent.click(view.getByRole('button', { name: 'Disable' }))
  fireEvent.click(view.getByRole('button', { name: 'Correct' }))
  expect(cartItems()[0]?.quantity).toBe(2)
})

test('cart validation state exhaustively classifies every UI outcome', () => {
  const error = new Error('offline')
  const readyCart = { ...validatedCart, corrections: [] }

  expect(
    cartValidationState({
      itemCount: 0,
      checking: false,
      transportError: undefined,
      validationError: undefined,
      cart: undefined,
    }).type,
  ).toBe('idle')
  expect(
    cartValidationState({
      itemCount: 1,
      checking: true,
      transportError: undefined,
      validationError: undefined,
      cart: undefined,
    }).type,
  ).toBe('checking')
  expect(
    cartValidationState({
      itemCount: 1,
      checking: false,
      transportError: error,
      validationError: undefined,
      cart: undefined,
    }).type,
  ).toBe('transport-error')
  expect(
    cartValidationState({
      itemCount: 1,
      checking: false,
      transportError: undefined,
      validationError: { _tag: 'InvalidCart' },
      cart: undefined,
    }).type,
  ).toBe('validation-error')
  expect(
    cartValidationState({
      itemCount: 1,
      checking: false,
      transportError: undefined,
      validationError: undefined,
      cart: validatedCart,
    }).type,
  ).toBe('corrections')
  expect(
    cartValidationState({
      itemCount: 1,
      checking: false,
      transportError: undefined,
      validationError: undefined,
      cart: readyCart,
    }).type,
  ).toBe('ready')
})

test('cart checkout gate exhaustively classifies focus outcomes', () => {
  expect(
    cartCheckoutGateOutcome({
      itemCount: 0,
      transportFailed: false,
      validationFailed: false,
      correctionCount: 0,
    }).type,
  ).toBe('empty')
  expect(
    cartCheckoutGateOutcome({
      itemCount: 1,
      transportFailed: true,
      validationFailed: false,
      correctionCount: 0,
    }).type,
  ).toBe('transport-error')
  expect(
    cartCheckoutGateOutcome({
      itemCount: 1,
      transportFailed: false,
      validationFailed: true,
      correctionCount: 0,
    }).type,
  ).toBe('validation-error')
  expect(
    cartCheckoutGateOutcome({
      itemCount: 1,
      transportFailed: false,
      validationFailed: false,
      correctionCount: 1,
    }).type,
  ).toBe('corrections')
  expect(
    cartCheckoutGateOutcome({
      itemCount: 1,
      transportFailed: false,
      validationFailed: false,
      correctionCount: 0,
    }).type,
  ).toBe('ready')
})
