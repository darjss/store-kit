import { makePersisted } from '@solid-primitives/storage'
import { variantIdPattern } from '@store-kit/contracts/cart'
import type { CartLineInput, PersistedCartItem } from '@store-kit/contracts/cart'
import { cartStorageKey } from '@store-kit/storefront/storage'
import { createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import { isServer } from 'solid-js/web'

export type { CartLineInput, PersistedCartItem } from '@store-kit/contracts/cart'

const storageKey = cartStorageKey('plugged')
type CartState = { items: PersistedCartItem[] }
const nativeCartStore = createStore<CartState>({ items: [] })
const [cartState, setNativeCartState] = nativeCartStore
const variantIdExpression = new RegExp(variantIdPattern)
type CartItemsUpdater = (items: PersistedCartItem[]) => PersistedCartItem[]
let setCartItems = (update: CartItemsUpdater) => setNativeCartState('items', update)
const [isCartOpen, setIsCartOpen] = createSignal(false)
let persistenceStarted = false

function parsePersistedCartItem(value: unknown): PersistedCartItem | undefined {
  if (typeof value !== 'object' || value === null) return

  const item = value as Partial<PersistedCartItem>
  const quantity = item.quantity
  const image = item.image
  const unitPriceMnt = item.unitPriceMnt
  if (
    !(
      typeof item.variantId === 'string' &&
      variantIdExpression.test(item.variantId) &&
      typeof quantity === 'number' &&
      Number.isInteger(quantity) &&
      quantity > 0 &&
      quantity <= 10 &&
      typeof item.productSlug === 'string' &&
      typeof item.productName === 'string' &&
      typeof item.variantName === 'string' &&
      typeof item.options === 'object' &&
      item.options !== null &&
      !Array.isArray(item.options) &&
      Object.values(item.options).every(option => typeof option === 'string') &&
      (image === null ||
        (typeof image === 'object' &&
          typeof image.url === 'string' &&
          image.url.length > 0 &&
          Number.isInteger(image.width) &&
          image.width > 0 &&
          Number.isInteger(image.height) &&
          image.height > 0 &&
          typeof image.alt === 'string' &&
          image.alt.length > 0)) &&
      typeof unitPriceMnt === 'number' &&
      Number.isInteger(unitPriceMnt) &&
      unitPriceMnt >= 0
    )
  )
    return

  return {
    variantId: item.variantId,
    quantity,
    productSlug: item.productSlug,
    productName: item.productName,
    variantName: item.variantName,
    options: item.options,
    image,
    unitPriceMnt,
  }
}

export function deserializeCart(value: string): PersistedCartItem[] {
  try {
    const items: unknown = JSON.parse(value)
    if (!Array.isArray(items)) return []

    const parsed = items.map(parsePersistedCartItem)
    return parsed.every((item): item is PersistedCartItem => item !== undefined) ? parsed : []
  } catch {
    return []
  }
}

function isPersistedCartItem(value: unknown): value is PersistedCartItem {
  return parsePersistedCartItem(value) !== undefined
}

export function startCartPersistence() {
  if (isServer || persistenceStarted) return

  persistenceStarted = true
  const [, setPersistedCartState] = makePersisted<CartState, typeof nativeCartStore>(
    nativeCartStore,
    {
      name: storageKey,
      storage: localStorage,
      serialize: state => JSON.stringify(state.items),
      deserialize: value => ({ items: deserializeCart(value) }),
    },
  )
  setCartItems = update => setPersistedCartState('items', update)
  window.addEventListener('storefront:cart-cleared', () => setCartItems(() => []))
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
    | 'image'
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
  setCartItems(() => [])
  if (!isServer) window.dispatchEvent(new CustomEvent('storefront:cart-cleared'))
}

export function openCart() {
  setIsCartOpen(true)
  if (!isServer) window.dispatchEvent(new CustomEvent('storefront:cart-opened'))
}

export function closeCart() {
  setIsCartOpen(false)
}

export const cartItems = () => cartState.items

export const cartItemCount = () => cartState.items.reduce((count, item) => count + item.quantity, 0)

export const cartLineInputs = (): CartLineInput[] =>
  cartState.items.map(({ variantId, quantity }) => ({ variantId, quantity }))

export { isCartOpen }
