import { Show, createSignal, lazy, onMount } from 'solid-js'

const StoreChromeInteractive = lazy(() => import('./StoreChromeInteractive'))
const navClass =
  'fixed top-[0.45rem] right-3 z-30 flex border-3 border-ink bg-paper-clean text-ink max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:grid max-md:min-h-[calc(68px+env(safe-area-inset-bottom))] max-md:grid-cols-4 max-md:border-0 max-md:border-t-4 max-md:border-orange max-md:bg-ink max-md:pb-[env(safe-area-inset-bottom)] max-md:text-paper'
const linkClass =
  'relative hidden min-h-11 min-w-24 place-items-center content-center border-0 border-r border-white/25 bg-transparent px-2 py-1 text-center leading-tight text-inherit no-underline [overflow-wrap:anywhere] max-md:grid max-md:min-h-16 max-md:min-w-0 max-md:px-1'

function StaticChrome() {
  return (
    <nav class={navClass} aria-label="Үндсэн цэс">
      <a class={linkClass} href="/">
        Нүүр
      </a>
      <a class={linkClass} href="/products">
        Дэлгүүр
      </a>
      <a class={linkClass} href="/products?focus=search">
        Хайх
      </a>
      <a class={linkClass} href="/checkout">
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
