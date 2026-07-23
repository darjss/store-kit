import { makePersisted } from '@solid-primitives/storage'
import type { CartLineInput, PersistedCartItem } from '@store-kit/db/schemas/shopping'
import { createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import { isServer } from 'solid-js/web'

export type { CartLineInput, PersistedCartItem } from '@store-kit/db/schemas/shopping'

const storageKey = 'store-kit:plugged:cart:v1'
const [cartItems, setStore] = createStore<PersistedCartItem[]>([])
let setCartItems = setStore
const [isCartOpen, setIsCartOpen] = createSignal(false)
let persistenceStarted = false

function isPersistedCartItem(value: unknown): value is PersistedCartItem {
  if (typeof value !== 'object' || value === null) return false

  const item = value as Partial<PersistedCartItem>
  return (
    typeof item.variantId === 'string' &&
    Number.isInteger(item.quantity) &&
    (item.quantity ?? 0) > 0 &&
    (item.quantity ?? 11) <= 10 &&
    typeof item.productSlug === 'string' &&
    typeof item.productName === 'string' &&
    typeof item.variantName === 'string' &&
    typeof item.options === 'object' &&
    item.options !== null &&
    Object.values(item.options).every(option => typeof option === 'string') &&
    (typeof item.imageR2Key === 'string' || item.imageR2Key === null) &&
    Number.isInteger(item.unitPriceMnt) &&
    (item.unitPriceMnt ?? -1) >= 0
  )
}

function deserializeCart(value: string) {
  try {
    const items: unknown = JSON.parse(value)
    return Array.isArray(items) && items.every(isPersistedCartItem) ? items : []
  } catch {
    return []
  }
}

export function startCartPersistence() {
  if (isServer || persistenceStarted) return

  persistenceStarted = true
  const [, setPersistedCartItems] = makePersisted([cartItems, setStore], {
    name: storageKey,
    storage: localStorage,
    deserialize: deserializeCart,
  })
  setCartItems = setPersistedCartItems
}

export function addCartItem(item: PersistedCartItem) {
  if (!isPersistedCartItem(item)) return

  const existing = cartItems.find(({ variantId }) => variantId === item.variantId)
  setCartItems(
    existing
      ? cartItems.map(cartItem =>
          cartItem.variantId === item.variantId
            ? { ...item, quantity: Math.min(existing.quantity + item.quantity, 10) }
            : cartItem,
        )
      : [...cartItems, item],
  )
}

export function setCartItemQuantity(variantId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return

  setCartItems(cartItems.map(item => (item.variantId === variantId ? { ...item, quantity } : item)))
}

export function removeCartItem(variantId: string) {
  setCartItems(cartItems.filter(item => item.variantId !== variantId))
}

export function clearCart() {
  setCartItems([])
}

export function openCart() {
  setIsCartOpen(true)
}

export function closeCart() {
  setIsCartOpen(false)
}

export const cartItemCount = () => cartItems.reduce((count, item) => count + item.quantity, 0)

export const cartLineInputs = (): CartLineInput[] =>
  cartItems.map(({ variantId, quantity }) => ({ variantId, quantity }))

export { cartItems, isCartOpen }
