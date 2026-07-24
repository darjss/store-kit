import { makePersisted } from '@solid-primitives/storage'
import { variantIdPattern } from '@store-kit/contracts/cart'
import type { CartLineInput, PersistedCartItem } from '@store-kit/contracts/cart'
import { createSignal } from 'solid-js'
import { isServer } from 'solid-js/web'

export type { CartLineInput, PersistedCartItem } from '@store-kit/contracts/cart'

const storageKey = 'store-kit:plugged:cart:v1'
const [cartItems, setNativeCartItems] = createSignal<PersistedCartItem[]>([])
const variantIdExpression = new RegExp(variantIdPattern)
let setCartItems = setNativeCartItems
const [isCartOpen, setIsCartOpen] = createSignal(false)
let persistenceStarted = false

function isPersistedCartItem(value: unknown): value is PersistedCartItem {
  if (typeof value !== 'object' || value === null) return false

  const item = value as Partial<PersistedCartItem>
  return (
    variantIdExpression.test(item.variantId ?? '') &&
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
  const [, setPersistedCartItems] = makePersisted([cartItems, setNativeCartItems], {
    name: storageKey,
    storage: localStorage,
    deserialize: deserializeCart,
  })
  setCartItems = setPersistedCartItems
  window.addEventListener('storefront:cart-cleared', () => setCartItems([]))
}

export function addCartItem(item: PersistedCartItem) {
  if (!isPersistedCartItem(item)) return

  setCartItems(items => {
    const existing = items.find(({ variantId }) => variantId === item.variantId)
    return existing
      ? items.map(cartItem =>
          cartItem.variantId === item.variantId
            ? { ...item, quantity: Math.min(existing.quantity + item.quantity, 10) }
            : cartItem,
        )
      : [...items, item]
  })
}

export function setCartItemQuantity(variantId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return

  setCartItems(items =>
    items.map(item => (item.variantId === variantId ? { ...item, quantity } : item)),
  )
}

export function removeCartItem(variantId: string) {
  setCartItems(items => items.filter(item => item.variantId !== variantId))
}

export function refreshCartItemSnapshots(
  lines: Pick<
    PersistedCartItem,
    | 'variantId'
    | 'productSlug'
    | 'productName'
    | 'variantName'
    | 'options'
    | 'imageR2Key'
    | 'unitPriceMnt'
  >[],
) {
  const currentById = new Map(lines.map(line => [line.variantId, line]))
  setCartItems(items =>
    items.map(item => {
      const current = currentById.get(item.variantId)
      return current ? { ...item, ...current } : item
    }),
  )
}

export function clearCart() {
  setCartItems([])
  if (!isServer) window.dispatchEvent(new CustomEvent('storefront:cart-cleared'))
}

export function openCart() {
  setIsCartOpen(true)
}

export function closeCart() {
  setIsCartOpen(false)
}

export const cartItemCount = () => cartItems().reduce((count, item) => count + item.quantity, 0)

export const cartLineInputs = (): CartLineInput[] =>
  cartItems().map(({ variantId, quantity }) => ({ variantId, quantity }))

export { cartItems, isCartOpen }
