import { Show, createEffect, createSignal } from 'solid-js'
import type { ParentProps } from 'solid-js'

import { paths } from '~/app/router'
import { CartDialog, useCart } from '~/cart/CartProvider'

export function AppShell(props: ParentProps) {
  const [searchOpen, setSearchOpen] = createSignal(false)
  const cart = useCart()
  let searchDialog: HTMLDialogElement | undefined

  createEffect(searchOpen, open => {
    if (!searchDialog) return
    if (open && !searchDialog.open) searchDialog.showModal()
    if (!open && searchDialog.open) searchDialog.close()
  })

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
              onClick={() => setSearchOpen(true)}
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
          onClick={() => setSearchOpen(true)}
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

      <dialog
        ref={element => {
          searchDialog = element
        }}
        class="m-0 h-dvh max-h-none w-full max-w-none border-0 bg-cobalt p-0 text-white backdrop:bg-ink/70"
        onClose={() => setSearchOpen(false)}
        aria-labelledby="search-title"
      >
        <header class="flex min-h-24 items-center justify-between gap-5 border-b-3 border-white px-[clamp(1rem,4vw,4rem)]">
          <h2 id="search-title" class="text-[clamp(2rem,6vw,4rem)] font-extrabold">
            Капсулаас хайх
          </h2>
          <button
            class="min-h-11 min-w-11 border-2 border-white px-3 font-bold"
            type="button"
            onClick={() => setSearchOpen(false)}
          >
            Хаах ×
          </button>
        </header>
        <div class="mx-auto max-w-5xl px-[clamp(1rem,4vw,4rem)] py-12">
          <form
            class="grid grid-cols-[minmax(0,1fr)_auto] bg-white text-ink"
            action="/products"
            method="get"
            role="search"
          >
            <label class="sr-only" for="shell-search">
              Бараа хайх
            </label>
            <input
              class="min-h-16 min-w-0 border-0 px-5 text-xl -outline-offset-4"
              id="shell-search"
              name="query"
              placeholder="Хүрэм, ноосон цамц…"
              autocomplete="off"
            />
            <button class="min-h-16 bg-amber-action px-6 font-bold text-white" type="submit">
              Хайх →
            </button>
          </form>
          <div class="mt-8 flex flex-wrap gap-3">
            <a
              class="inline-flex min-h-11 items-center border-2 border-white px-4 font-semibold text-white no-underline"
              href="/products?useCase=cold-weather"
            >
              Хүйтэн өдөр
            </a>
            <a
              class="inline-flex min-h-11 items-center border-2 border-white px-4 font-semibold text-white no-underline"
              href="/products?useCase=workday"
            >
              Ажлын өдөр
            </a>
            <a
              class="inline-flex min-h-11 items-center border-2 border-white px-4 font-semibold text-white no-underline"
              href="/products?useCase=travel"
            >
              Аялал
            </a>
          </div>
        </div>
      </dialog>
      <CartDialog />
    </>
  )
}
