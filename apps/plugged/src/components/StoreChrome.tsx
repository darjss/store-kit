import { startCartPersistence } from '@store-kit/storefront/cart/store'
import { Show, createSignal, lazy, onCleanup, onMount } from 'solid-js'

import { StoreNavigation } from './StoreNavigation'

const StoreChromeInteractive = lazy(() => import('./StoreChromeInteractive'))

type InitialPanel = 'search' | 'cart'

function StaticChrome(props: { open: (panel: InitialPanel) => void }) {
  return (
    <StoreNavigation
      search={
        <a
          data-store-navigation-item
          href="/products?focus=search"
          aria-label="Хайх"
          onClick={event => {
            event.preventDefault()
            props.open('search')
          }}
        >
          <small>Хайх</small>
        </a>
      }
      cart={
        <a
          data-store-navigation-item
          href="/checkout"
          aria-label="Сагс"
          onClick={event => {
            event.preventDefault()
            props.open('cart')
          }}
        >
          <small>Сагс</small>
        </a>
      }
    />
  )
}

export function StoreChrome() {
  const [initialPanel, setInitialPanel] = createSignal<InitialPanel>()

  onMount(() => {
    startCartPersistence()

    const openCart = () => setInitialPanel('cart')
    window.addEventListener('storefront:cart-opened', openCart)
    onCleanup(() => window.removeEventListener('storefront:cart-opened', openCart))

    if (new URLSearchParams(location.search).get('focus') === 'search') setInitialPanel('search')
  })

  return (
    <Show when={initialPanel()} fallback={<StaticChrome open={panel => setInitialPanel(panel)} />}>
      {panel => <StoreChromeInteractive initialPanel={panel()} />}
    </Show>
  )
}
