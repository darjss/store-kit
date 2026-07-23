/* oxlint-disable tailwindcss/no-unknown-classes */
import { Show, createSignal, lazy, onMount } from 'solid-js'

const StoreChromeInteractive = lazy(() => import('./StoreChromeInteractive'))

function StaticChrome() {
  return (
    <nav class="bottom-nav" aria-label="Үндсэн цэс">
      <a class="nav-action" href="/">
        Нүүр
      </a>
      <a class="nav-action" href="/products">
        Дэлгүүр
      </a>
      <a class="nav-action" href="/products?focus=search">
        Хайх
      </a>
      <a class="nav-action" href="/checkout">
        Сагс
      </a>
    </nav>
  )
}

export function StoreChrome() {
  const [mounted, setMounted] = createSignal(false)
  onMount(() => setMounted(true))

  return (
    <Show when={mounted()} fallback={<StaticChrome />}>
      <StoreChromeInteractive />
    </Show>
  )
}
