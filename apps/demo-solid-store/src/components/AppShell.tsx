import { Show, createSignal } from 'solid-js'
import type { ParentProps } from 'solid-js'

import { paths } from '~/app/router'
import { CartDialog, useCart } from '~/cart/CartProvider'
import { CatalogSearchDialog } from '~/components/CatalogSearchDialog'

export function AppShell(props: ParentProps) {
  const [searchOpen, setSearchOpen] = createSignal(false)
  const cart = useCart()
  let searchTrigger: HTMLElement | undefined

  const setSearchVisibility = (open: boolean) => {
    if (open && document.activeElement instanceof HTMLElement) {
      searchTrigger = document.activeElement
    }
    setSearchOpen(open)
    if (!open) queueMicrotask(() => searchTrigger?.focus())
  }

  return (
    <>
      <a
        class="fixed top-2 left-2 z-60 translate-y-[-150%] bg-white px-4 py-3 font-bold text-ink outline-3 outline-cobalt focus:translate-y-0"
        href="#main-content"
      >
        Үндсэн хэсэг рүү очих
      </a>
      <header class="sticky top-0 z-40 border-b-3 border-ink bg-white">
        <div class="mx-auto flex min-h-20 max-w-384 items-stretch px-[clamp(1rem,3vw,3rem)]">
          <a
            class="flex min-h-11 items-center text-3xl font-extrabold tracking-[-0.04em] text-ink no-underline"
            href={paths()}
            aria-label="ДУНД нүүр"
          >
            ДУНД
          </a>
          <nav class="ml-10 hidden items-stretch lg:flex" aria-label="Дэлгүүрийн цэс">
            <a
              class="flex min-h-11 items-center border-l border-ink/20 px-5 font-semibold text-ink no-underline aria-[current=page]:bg-amber"
              href={paths.products}
            >
              Капсул
            </a>
            <a
              class="flex min-h-11 items-center border-l border-ink/20 px-5 font-semibold text-ink no-underline"
              href="/products?category=outerwear"
            >
              Гадуур хувцас
            </a>
            <a
              class="flex min-h-11 items-center border-x border-ink/20 px-5 font-semibold text-ink no-underline"
              href="/products?useCase=workday"
            >
              Ажлын өдөр
            </a>
          </nav>
          <div class="ml-auto flex items-center gap-1">
            <button
              class="min-h-11 min-w-11 px-3 font-bold hover:bg-surface"
              type="button"
              onClick={() => setSearchVisibility(true)}
              aria-label="Хайлт нээх"
            >
              Хайх
            </button>
            <button
              class="relative min-h-11 min-w-11 border-l border-ink/20 px-3 font-bold hover:bg-surface"
              type="button"
              onClick={() => cart.setOpen(true)}
              aria-label={`Сагс, ${cart.count()} бараа`}
            >
              Сагс
              <Show when={cart.count() > 0}>
                <span class="absolute top-0 right-0 grid min-h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-xs text-white">
                  {cart.count()}
                </span>
              </Show>
            </button>
          </div>
        </div>
      </header>

      {props.children}

      <footer class="border-t-3 border-ink bg-ink px-[clamp(1rem,4vw,4rem)] py-14 text-white">
        <div class="mx-auto grid max-w-360 gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <strong class="text-[clamp(2.5rem,6vw,5rem)] leading-none font-extrabold tracking-[-0.04em]">
              ДУНД / УЛААНБААТАР
            </strong>
            <p class="mt-4 text-amber">Гаднаас дотогш.</p>
          </div>
          <div class="grid content-start gap-3">
            <a class="text-white" href="/products">
              Бүх бараа
            </a>
            <a class="text-white" href="/checkout">
              Захиалга
            </a>
            <p class="m-0 text-white/70">QPay · Дансаар · Хот дотор хүргэлт</p>
          </div>
        </div>
      </footer>

      <nav
        class="fixed inset-x-0 bottom-0 z-40 grid min-h-[calc(4.25rem+env(safe-area-inset-bottom))] grid-cols-4 border-t-2 border-ink bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Үндсэн цэс"
      >
        <a
          class="grid min-h-11 place-items-center content-center px-1 text-sm font-bold text-ink no-underline"
          href={paths()}
        >
          Нүүр
        </a>
        <a
          class="grid min-h-11 place-items-center content-center px-1 text-sm font-bold text-ink no-underline"
          href={paths.products}
        >
          Капсул
        </a>
        <button
          class="min-h-11 px-1 text-sm font-bold"
          type="button"
          onClick={() => setSearchVisibility(true)}
        >
          Хайх
        </button>
        <button
          class="relative min-h-11 px-1 text-sm font-bold"
          type="button"
          onClick={() => cart.setOpen(true)}
        >
          Сагс
          <Show when={cart.count() > 0}>
            <span class="absolute top-1 right-[calc(50%-1.5rem)] grid min-h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-xs text-white">
              {cart.count()}
            </span>
          </Show>
        </button>
      </nav>

      <CatalogSearchDialog open={searchOpen} setOpen={setSearchVisibility} />
      <CartDialog />
    </>
  )
}
