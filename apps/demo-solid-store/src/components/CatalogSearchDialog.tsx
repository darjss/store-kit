import { query } from '@solidjs/router'
import type { CatalogSearchResult } from '@store-kit/contracts/catalog'
import { For, Show, createEffect, createSignal, onSettled } from 'solid-js'

import { formatMnt } from '~/catalog/format'
import { searchCatalog } from '~/server/catalog'

const findCatalogMatches = query(searchCatalog, 'dund-catalog-search')

const stockLabel = (status: CatalogSearchResult['items'][number]['stockStatus']) => {
  if (status === 'sold-out') return 'Дууссан'
  if (status === 'low-stock') return 'Цөөн үлдсэн'
  return 'Бэлэн'
}

type SearchState =
  | { type: 'prompt' }
  | { type: 'pending' }
  | { type: 'error' }
  | { type: 'ready'; result: CatalogSearchResult }

export function CatalogSearchDialog(props: {
  open: () => boolean
  setOpen: (open: boolean) => void
}) {
  const [queryText, setQueryText] = createSignal('')
  const [state, setState] = createSignal<SearchState>({ type: 'prompt' })
  let dialog: HTMLDialogElement | undefined
  let input: HTMLInputElement | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let requestVersion = 0

  const close = () => props.setOpen(false)
  const result = () => {
    const current = state()
    return current.type === 'ready' ? current.result : undefined
  }

  const runSearch = async (value: string, version: number) => {
    try {
      const result = await findCatalogMatches({ query: value })
      if (version === requestVersion) setState({ type: 'ready', result })
    } catch {
      if (version === requestVersion) setState({ type: 'error' })
    }
  }

  const updateQuery = (value: string) => {
    setQueryText(value)
    if (timer) clearTimeout(timer)
    const normalized = value.trim()
    requestVersion += 1
    const version = requestVersion

    if (normalized.length < 2) {
      setState({ type: 'prompt' })
      return
    }

    setState({ type: 'pending' })
    timer = setTimeout(() => void runSearch(normalized, version), 250)
  }

  createEffect(props.open, open => {
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      queueMicrotask(() => input?.focus())
    }
    if (!open && dialog.open) dialog.close()
  })

  onSettled(() => () => {
    if (timer) clearTimeout(timer)
  })

  return (
    <dialog
      ref={element => {
        dialog = element
      }}
      class="m-0 h-dvh max-h-none w-full max-w-none border-0 bg-cobalt p-0 text-white backdrop:bg-ink/70"
      onClose={close}
      aria-labelledby="search-title"
    >
      <header class="flex min-h-24 items-center justify-between gap-5 border-b-3 border-white px-[clamp(1rem,4vw,4rem)]">
        <h2 id="search-title" class="text-[clamp(2rem,6vw,4rem)] font-extrabold">
          Капсулаас хайх
        </h2>
        <button
          class="min-h-11 min-w-11 border-2 border-white px-3 font-bold"
          type="button"
          onClick={close}
          aria-label="Хайлт хаах"
        >
          Хаах ×
        </button>
      </header>
      <div class="mx-auto max-w-5xl px-[clamp(1rem,4vw,4rem)] py-8 sm:py-12">
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
            ref={element => {
              input = element
            }}
            class="min-h-16 min-w-0 border-0 px-5 text-xl -outline-offset-4"
            id="shell-search"
            name="query"
            value={queryText()}
            onInput={event => updateQuery(event.currentTarget.value)}
            placeholder="Хүрэм, ноосон цамц…"
            autocomplete="off"
          />
          <button class="min-h-16 bg-amber-action px-4 font-bold text-white sm:px-6" type="submit">
            Хайх →
          </button>
        </form>

        <div
          class="mt-5"
          aria-live="polite"
          aria-busy={state().type === 'pending' ? 'true' : undefined}
        >
          <Show when={state().type === 'prompt'}>
            <p class="grid min-h-32 place-items-center text-center text-lg font-semibold">
              Хоёр ба түүнээс олон үсэг бичнэ үү.
            </p>
          </Show>
          <Show when={state().type === 'pending'}>
            <p class="grid min-h-32 place-items-center text-center text-lg font-semibold">
              Каталогийг шалгаж байна…
            </p>
          </Show>
          <Show when={state().type === 'error'}>
            <div class="grid min-h-32 place-items-center gap-3 text-center">
              <p class="text-lg font-semibold">Хайлтыг ажиллуулж чадсангүй.</p>
              <button
                class="min-h-11 border-2 border-white px-4 font-bold"
                type="button"
                onClick={() => updateQuery(queryText())}
              >
                Дахин оролдох
              </button>
            </div>
          </Show>
          <Show when={result()}>
            {result => (
              <>
                <p class="border-b border-white/35 py-3 font-bold">{result().total} үр дүн</p>
                <Show
                  when={result().items.length > 0}
                  fallback={
                    <p class="grid min-h-32 place-items-center text-center text-lg font-semibold">
                      Тохирох бараа олдсонгүй.
                    </p>
                  }
                >
                  <div class="grid gap-3">
                    <For each={result().items}>
                      {item => (
                        <a
                          class="grid min-h-28 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-4 border-2 border-white p-3 text-white no-underline sm:grid-cols-[7rem_minmax(0,1fr)_auto]"
                          href={`/products/${item.slug}`}
                          onClick={close}
                        >
                          {item.image ? (
                            <img
                              class="aspect-square h-20 w-20 object-cover sm:h-24 sm:w-24"
                              src={item.image.url}
                              width={item.image.width}
                              height={item.image.height}
                              alt=""
                            />
                          ) : (
                            <span
                              class="grid aspect-square h-20 w-20 place-items-center bg-white/10 font-extrabold sm:h-24 sm:w-24"
                              aria-hidden="true"
                            >
                              ДУНД
                            </span>
                          )}
                          <span class="grid min-w-0">
                            <strong class="text-xl">{item.name}</strong>
                            <small class="mt-1 line-clamp-2 text-white/75">
                              {item.shortDescription}
                            </small>
                          </span>
                          <span class="col-start-2 grid sm:col-start-3 sm:text-right">
                            <strong>
                              {item.priceMnt === null ? 'Тун удахгүй' : formatMnt(item.priceMnt)}
                            </strong>
                            <small>{stockLabel(item.stockStatus)}</small>
                          </span>
                        </a>
                      )}
                    </For>
                  </div>
                </Show>
              </>
            )}
          </Show>
        </div>

        <div class="mt-8 flex flex-wrap gap-3">
          <a
            class="inline-flex min-h-11 items-center border-2 border-white px-4 font-semibold text-white no-underline"
            href="/products?useCase=cold-weather"
            onClick={close}
          >
            Хүйтэн өдөр
          </a>
          <a
            class="inline-flex min-h-11 items-center border-2 border-white px-4 font-semibold text-white no-underline"
            href="/products?useCase=workday"
            onClick={close}
          >
            Ажлын өдөр
          </a>
          <a
            class="inline-flex min-h-11 items-center border-2 border-white px-4 font-semibold text-white no-underline"
            href="/products?useCase=travel"
            onClick={close}
          >
            Аялал
          </a>
        </div>
      </div>
    </dialog>
  )
}
