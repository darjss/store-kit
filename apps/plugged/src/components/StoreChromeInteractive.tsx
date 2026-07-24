/* oxlint-disable tailwindcss/no-unknown-classes */
import { Cart } from '@store-kit/storefront/cart/components'
import { cartItemCount, isCartOpen } from '@store-kit/storefront/cart/store'
import { createStorefrontQueryClient } from '@store-kit/storefront/query-client'
import { Button, Sheet, cn } from '@store-kit/ui'
import { QueryClientProvider } from '@tanstack/solid-query'
import { Show } from 'solid-js'

import { CartSheet } from './CartSheet'
import StoreIcon from './StoreIcon'
import { StoreNavigation } from './StoreNavigation'
import { StoreSearch } from './StoreSearch'

function InteractiveChrome(props: { initialPanel: 'search' | 'cart' }) {
  return (
    <Cart.Root>
      <Cart.ValidationRoot enabled={isCartOpen}>
        <StoreNavigation
          home={<StoreIcon name="home" size={24} />}
          shop={<StoreIcon name="shop" size={24} />}
          search={<StoreSearch initialOpen={props.initialPanel === 'search'} />}
          cart={
            <Sheet.Trigger as={Button} variant="ghost" data-store-navigation-item aria-label="Сагс">
              <StoreIcon name="cart" size={24} />
              <small>Сагс</small>
              <Show when={cartItemCount() > 0}>
                <b
                  class={cn(
                    'border-ink bg-acid text-ink absolute top-1 right-[calc(50%-1.4rem)] grid h-5.25 min-w-5.25 place-items-center rounded-full border-2 text-[0.72rem]',
                    cartItemCount() > 9 && 'px-1',
                  )}
                >
                  {cartItemCount()}
                </b>
              </Show>
            </Sheet.Trigger>
          }
        />
        <CartSheet initialOpen={props.initialPanel === 'cart'} />
      </Cart.ValidationRoot>
    </Cart.Root>
  )
}

export default function StoreChromeInteractive(props: { initialPanel: 'search' | 'cart' }) {
  const client = createStorefrontQueryClient()
  return (
    <QueryClientProvider client={client}>
      <InteractiveChrome initialPanel={props.initialPanel} />
    </QueryClientProvider>
  )
}
