import { Sheet } from '@store-kit/ui'
import { For, Show, createContext, onMount, useContext } from 'solid-js'
import type { JSX, ParentProps } from 'solid-js'

import {
  cartItemCount,
  cartItems,
  clearCart,
  closeCart,
  isCartOpen,
  openCart,
  removeCartItem,
  setCartItemQuantity,
  startCartPersistence,
} from './store'
import type { PersistedCartItem } from './store'

const cartCommands = {
  itemCount: cartItemCount,
  setItemQuantity: setCartItemQuantity,
  removeItem: removeCartItem,
  clear: clearCart,
}
const CartContext = createContext<typeof cartCommands>()

function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('Cart components must be inside Cart.Root')
  return context
}

function Root(props: ParentProps) {
  onMount(startCartPersistence)

  return (
    <CartContext.Provider value={cartCommands}>
      <Sheet.Root open={isCartOpen()} onOpenChange={open => (open ? openCart() : closeCart())}>
        {props.children}
      </Sheet.Root>
    </CartContext.Provider>
  )
}

function Trigger(props: ParentProps) {
  useCart()
  return <Sheet.Trigger>{props.children}</Sheet.Trigger>
}

function Content(props: ParentProps) {
  useCart()
  return <Sheet.Content showCloseButton={false}>{props.children}</Sheet.Content>
}

export type CartItemsProps = {
  children: (item: PersistedCartItem) => JSX.Element
}

function Items(props: CartItemsProps) {
  useCart()
  return <For each={cartItems()}>{props.children}</For>
}

function Empty(props: ParentProps) {
  useCart()
  return <Show when={cartItems().length === 0}>{props.children}</Show>
}

export const Cart = { Root, Trigger, Content, Items, Empty }
