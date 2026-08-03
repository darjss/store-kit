/* oxlint-disable tailwindcss/no-unknown-classes */
import { CartLarge2, Home2, Magnifer, Shop } from '@solar-icons/solid/Outline'
/* oxlint-disable tailwindcss/no-unknown-classes */
import { Cart } from '@store-kit/storefront/cart/components'
import { cartItemCount, isCartOpen } from '@store-kit/storefront/cart/store'
import { createStorefrontQueryClient } from '@store-kit/storefront/query-client'
import { Button, Sheet } from '@store-kit/ui'
import { QueryClientProvider } from '@tanstack/solid-query'
import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

import { CartSheet } from './CartSheet'
import { SearchDialog } from './SearchDialog'

const mobileItemClass =
  'grid min-h-14 place-items-center content-center gap-0.5 py-1.5 text-[0.7rem] font-bold leading-tight text-ink no-underline'

function CartBadge(props: { class?: string }) {
  return (
    <Show when={cartItemCount() > 0}>
      <b
        class={`text-on-accent grid h-4.5 min-w-4.5 place-items-center rounded-full bg-accent px-1 text-[0.65rem] leading-none ${props.class ?? ''}`}
      >
        {cartItemCount()}
      </b>
    </Show>
  )
}

function MobileNavItem(props: { href: string; label: string; icon: JSX.Element }) {
  return (
    <a href={props.href} class={mobileItemClass}>
      {props.icon}
      <span>{props.label}</span>
    </a>
  )
}

function InteractiveChrome(props: { initialPanel: 'search' | 'cart' }) {
  return (
    <Cart.Root>
      <Cart.ValidationRoot enabled={isCartOpen}>
        <div class="flex items-center gap-5 max-md:hidden">
          <SearchDialog
            initialOpen={props.initialPanel === 'search'}
            trigger="Хайх"
            triggerClass="hover:text-accent font-bold shadow-none"
          />
          <Sheet.Trigger as={Button} variant="ghost" class="relative font-bold shadow-none">
            Сагс
            <CartBadge class="absolute -top-2 -right-2" />
          </Sheet.Trigger>
        </div>
        <nav
          class="border-line bg-panel fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
          aria-label="Үндсэн цэс"
        >
          <MobileNavItem href="/" label="Нүүр" icon={<Home2 size={22} />} />
          <MobileNavItem href="/products" label="Бараа" icon={<Shop size={22} />} />
          <SearchDialog
            initialOpen={props.initialPanel === 'search'}
            trigger={
              <>
                <Magnifer size={22} />
                <span>Хайх</span>
              </>
            }
            triggerClass={mobileItemClass}
          />
          <Sheet.Trigger
            as={Button}
            variant="ghost"
            class={`${mobileItemClass} relative shadow-none`}
          >
            <CartLarge2 size={22} />
            <span>Сагс</span>
            <CartBadge class="absolute top-1 right-[calc(50%-1.6rem)]" />
          </Sheet.Trigger>
        </nav>
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
