import type { CartCorrection, ValidatedCart } from '@store-kit/contracts/cart'
import { match } from 'dismatch'
import { createContext, createEffect, createMemo, createSignal, on, useContext } from 'solid-js'
import type { Accessor, JSX, ParentProps } from 'solid-js'

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

type CartValidationFacts = {
  itemCount: number
  checking: boolean
  transportError: unknown
  validationError: unknown
  cart: ValidatedCart | undefined
}

export const cartValidationState = (facts: CartValidationFacts) => {
  const outcome: CartValidationState = (() => {
    if (facts.itemCount === 0) return { type: 'idle' }
    if (facts.checking) return { type: 'checking' }
    if (facts.transportError !== null && facts.transportError !== undefined)
      return { type: 'transport-error', error: facts.transportError }
    if (facts.validationError !== undefined)
      return { type: 'validation-error', error: facts.validationError }
    if (!facts.cart) return { type: 'idle' }
    return facts.cart.corrections.length > 0
      ? { type: 'corrections', cart: facts.cart }
      : { type: 'ready', cart: facts.cart }
  })()

  return match(
    outcome,
    'type',
  )<CartValidationState>({
    'idle': () => ({ type: 'idle' }),
    'checking': () => ({ type: 'checking' }),
    'transport-error': ({ error }) => ({ type: 'transport-error', error }),
    'validation-error': ({ error }) => ({ type: 'validation-error', error }),
    'corrections': ({ cart }) => ({ type: 'corrections', cart }),
    'ready': ({ cart }) => ({ type: 'ready', cart }),
  })
}

export type CartCheckoutGateOutcome =
  | { type: 'empty' }
  | { type: 'transport-error' }
  | { type: 'validation-error' }
  | { type: 'corrections' }
  | { type: 'ready' }

type CartCheckoutGateFacts = {
  itemCount: number
  transportFailed: boolean
  validationFailed: boolean
  correctionCount: number
}

export const cartCheckoutGateOutcome = (facts: CartCheckoutGateFacts): CartCheckoutGateOutcome => {
  if (facts.itemCount === 0) return { type: 'empty' }
  if (facts.transportFailed) return { type: 'transport-error' }
  if (facts.validationFailed) return { type: 'validation-error' }
  return facts.correctionCount > 0 ? { type: 'corrections' } : { type: 'ready' }
}

const applyCartCorrection = (correction: CartCorrection) => {
  if (correction._tag === 'InsufficientStock' && correction.availableQuantity > 0)
    setCartItemQuantity(correction.variantId, correction.availableQuantity)
}

function createCartValidationState(options: { enabled: Accessor<boolean> }) {
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

  const state = createMemo(() =>
    cartValidationState({
      itemCount: cartItems().length,
      checking: validation.isFetching,
      transportError: transportError(),
      validationError: validationError(),
      cart: validatedCart(),
    }),
  )

  const gateCheckout = async () => {
    const itemCount = cartItems().length
    const response = itemCount > 0 ? await validation.refetch() : undefined
    const outcome = cartCheckoutGateOutcome({
      itemCount,
      transportFailed: Boolean(response?.error || !response?.data),
      validationFailed: response?.data?.status === 'error',
      correctionCount: response?.data?.status === 'ok' ? response.data.value.corrections.length : 0,
    })

    return match(
      outcome,
      'type',
    )<boolean>({
      'empty': () => {
        requestFocus('validation')
        return false
      },
      'transport-error': () => {
        requestFocus('transport')
        return false
      },
      'validation-error': () => {
        requestFocus('validation')
        return false
      },
      'corrections': () => {
        requestFocus('corrections')
        return false
      },
      'ready': () => true,
    })
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

type CartValidationContextValue = ReturnType<typeof createCartValidationState>
const CartValidationContext = createContext<CartValidationContextValue>()

export function useCartValidation() {
  const validation = useContext(CartValidationContext)
  if (!validation) throw new Error('Cart validation components must be inside Cart.ValidationRoot.')
  return validation
}

export function CartValidationRoot(props: ParentProps<{ enabled: Accessor<boolean> }>) {
  const validation = createCartValidationState({ enabled: props.enabled })
  return (
    <CartValidationContext.Provider value={validation}>
      {props.children}
    </CartValidationContext.Provider>
  )
}

type CartValidationStateProps = {
  idle: () => JSX.Element
  checking: () => JSX.Element
  transportError: (error: unknown) => JSX.Element
  validationError: (error: unknown) => JSX.Element
  corrections: (cart: ValidatedCart) => JSX.Element
  ready: (cart: ValidatedCart) => JSX.Element
}

export function CartValidationState(props: CartValidationStateProps) {
  const validation = useCartValidation()

  return (
    <>
      {match(
        validation.state(),
        'type',
      )<JSX.Element>({
        'idle': props.idle,
        'checking': props.checking,
        'transport-error': ({ error }) => props.transportError(error),
        'validation-error': ({ error }) => props.validationError(error),
        'corrections': ({ cart }) => props.corrections(cart),
        'ready': ({ cart }) => props.ready(cart),
      })}
    </>
  )
}

export type CartItemValidationState = {
  corrections: Accessor<CartCorrection[]>
  blocksQuantityChange: Accessor<boolean>
  blocksQuantityIncrease: Accessor<boolean>
  decrementQuantity: () => void
  incrementQuantity: () => void
  applyCorrection: (correction: CartCorrection) => void
  removeItem: () => void
}

type CartItemValidationProps = {
  item: PersistedCartItem
  children: (state: CartItemValidationState) => JSX.Element
}

export function CartItemValidation(props: CartItemValidationProps) {
  const validation = useCartValidation()
  return props.children({
    corrections: () => validation.correctionsFor(props.item.variantId),
    blocksQuantityChange: () => validation.blocksQuantityChange(props.item.variantId),
    blocksQuantityIncrease: () => validation.blocksQuantityIncrease(props.item),
    decrementQuantity: () => validation.decrementQuantity(props.item),
    incrementQuantity: () => validation.incrementQuantity(props.item),
    applyCorrection: validation.applyCorrection,
    removeItem: () => validation.removeItem(props.item.variantId),
  })
}
