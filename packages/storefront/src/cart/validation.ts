import type { CartCorrection, ValidatedCart } from '@store-kit/contracts/cart'
import { createEffect, createMemo, createSignal, on } from 'solid-js'
import type { Accessor } from 'solid-js'

import { cartQuery } from '~/query-options/cart'
import { useQueryResult } from '~/query-options/result'

import { cartItems, refreshCartItemSnapshots, removeCartItem, setCartItemQuantity } from './store'
import type { PersistedCartItem } from './store'

export type CartValidationFocusTarget = 'corrections' | 'transport' | 'validation'

export type CartValidationState =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'ready'; cart: ValidatedCart }
  | { type: 'corrections'; cart: ValidatedCart }
  | { type: 'transport-error'; error: unknown }
  | { type: 'validation-error'; error: unknown }

type CartValidationControllerOptions = {
  enabled: Accessor<boolean>
}

const applyCartCorrection = (correction: CartCorrection) => {
  if (correction._tag === 'InsufficientStock' && correction.availableQuantity > 0)
    setCartItemQuantity(correction.variantId, correction.availableQuantity)
}

export function createCartValidationController(options: CartValidationControllerOptions) {
  const validation = useQueryResult(() => ({
    ...cartQuery.validate([...cartItems()]),
    enabled: cartItems().length > 0 && options.enabled(),
    staleTime: 15_000,
  }))
  const [focusTarget, setFocusTarget] = createSignal<CartValidationFocusTarget>()
  const focusElements = new Map<CartValidationFocusTarget, HTMLElement>()

  const validatedCart = createMemo(() =>
    validation.data?.status === 'ok' ? validation.data.value : undefined,
  )
  const validationError = createMemo(() =>
    validation.data?.status === 'error' ? validation.data.error : undefined,
  )
  const transportError = () => validation.error

  createEffect(
    on(validatedCart, cart => {
      if (!cart) return

      refreshCartItemSnapshots(
        cart.lines.map(line => ({
          variantId: line.variantId,
          productSlug: line.productSlug,
          productName: line.productName,
          variantName: line.variantName,
          options: line.options,
          image: line.image,
          unitPriceMnt: line.unitPriceMnt,
        })),
      )
    }),
  )

  const correctionsFor = (variantId: string) =>
    validatedCart()?.corrections.filter(correction => correction.variantId === variantId) ?? []

  const requestFocus = (target: CartValidationFocusTarget) => {
    setFocusTarget(target)
    queueMicrotask(() => focusElements.get(target)?.focus())
  }

  const state = createMemo<CartValidationState>(() => {
    if (cartItems().length === 0) return { type: 'idle' }
    if (validation.isFetching) return { type: 'checking' }
    if (transportError()) return { type: 'transport-error', error: transportError() }

    const domainError = validationError()
    if (domainError !== undefined) return { type: 'validation-error', error: domainError }

    const cart = validatedCart()
    if (!cart) return { type: 'idle' }
    return cart.corrections.length > 0 ? { type: 'corrections', cart } : { type: 'ready', cart }
  })

  const gateCheckout = async () => {
    if (cartItems().length === 0) {
      requestFocus('validation')
      return false
    }

    const response = await validation.refetch()
    if (response.error || !response.data) {
      requestFocus('transport')
      return false
    }
    if (response.data.status === 'error') {
      requestFocus('validation')
      return false
    }
    if (response.data.value.corrections.length > 0) {
      requestFocus('corrections')
      return false
    }

    return true
  }

  const blocksQuantityChange = (variantId: string) =>
    correctionsFor(variantId).some(
      correction => correction._tag === 'InactiveVariant' || correction._tag === 'MissingVariant',
    )

  const blocksQuantityIncrease = (item: PersistedCartItem) =>
    item.quantity >= 10 ||
    correctionsFor(item.variantId).some(correction => correction._tag !== 'PriceChanged')

  return {
    state,
    focusTarget,
    validatedCart,
    validationError,
    transportError,
    isChecking: () => validation.isFetching,
    correctionsFor,
    canCheckout: () =>
      cartItems().length > 0 &&
      !validation.isFetching &&
      !transportError() &&
      validatedCart()?.corrections.length === 0,
    refresh: validation.refetch,
    gateCheckout,
    registerFocusTarget: (target: CartValidationFocusTarget, element: HTMLElement) => {
      focusElements.set(target, element)
    },
    requestFocus,
    blocksQuantityChange,
    blocksQuantityIncrease,
    decrementQuantity: (item: PersistedCartItem) =>
      setCartItemQuantity(item.variantId, Math.max(1, item.quantity - 1)),
    incrementQuantity: (item: PersistedCartItem) =>
      setCartItemQuantity(item.variantId, Math.min(10, item.quantity + 1)),
    applyCorrection: applyCartCorrection,
    removeItem: (variantId: string) => removeCartItem(variantId),
  }
}
