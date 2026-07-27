import { useNavigate, useSearchParams } from '@solidjs/router'
import { dynamic } from '@solidjs/web'
import type { JSX } from '@solidjs/web'
import { Errored, Loading, onSettled, untrack } from 'solid-js'
import type { ParentProps } from 'solid-js'

import { toCatalogSearch } from '~/app/catalog-search'
import { paths } from '~/app/router'
import { getCatalogFrame } from '~/server/catalog'

function CatalogFilters(props: ParentProps<{ initiallyOpen: boolean }>) {
  const initiallyOpen = untrack(() => props.initiallyOpen)

  return (
    <details class="mt-3 border-2 border-ink bg-white" open={initiallyOpen || undefined}>
      <summary class="flex min-h-12 cursor-pointer items-center justify-between px-4 font-bold">
        Төрөл, брэндээр шүүх <span aria-hidden="true">＋</span>
      </summary>
      {props.children}
    </details>
  )
}

export default function CatalogPage() {
  const [search] = useSearchParams(paths.products)
  const navigate = useNavigate()
  const input = () => toCatalogSearch(search)
  const Catalog = dynamic(() => getCatalogFrame(input()))
  let pendingFilterFocus: string | undefined

  onSettled(() => {
    const restoreFilterFocus = () => {
      if (!pendingFilterFocus) return
      const link = [
        ...document.querySelectorAll<HTMLAnchorElement>('details a[target="_self"]'),
      ].find(
        candidate =>
          candidate.getAttribute('href') === pendingFilterFocus &&
          candidate.getAttribute('aria-current') === 'page',
      )
      if (!link) return
      pendingFilterFocus = undefined
      queueMicrotask(() => link.focus())
    }
    document.addEventListener('frame:applied', restoreFilterFocus)
    return () => document.removeEventListener('frame:applied', restoreFilterFocus)
  })
  const navigateCatalog: JSX.EventHandlerUnion<HTMLDivElement, MouseEvent> = event => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    const target = event.target
    const link =
      target instanceof Element ? target.closest<HTMLAnchorElement>('a[target="_self"]') : null
    if (!link || link.hasAttribute('download')) return

    const url = new URL(link.href)
    if (url.origin !== window.location.origin) return

    event.preventDefault()
    pendingFilterFocus = link.getAttribute('href') ?? undefined
    navigate(`${url.pathname}${url.search}${url.hash}`)
  }

  return (
    <Errored
      fallback={
        <main id="main-content" class="grid min-h-[60svh] place-content-center px-5 text-center">
          <h1 class="text-4xl font-extrabold">Каталогийг ачаалж чадсангүй.</h1>
          <a class="mt-5 font-bold text-cobalt" href="/products">
            Шүүлтүүр цэвэрлэх
          </a>
        </main>
      }
    >
      <Loading
        on={JSON.stringify(input())}
        fallback={
          <main
            id="main-content"
            class="grid min-h-[70svh] place-content-center bg-surface px-5 text-center"
          >
            <p class="text-xl font-bold">Барааг ангилж байна…</p>
          </main>
        }
      >
        <div onClick={navigateCatalog}>
          <Catalog
            filters={slot => (
              <CatalogFilters initiallyOpen={Boolean(input().category || input().brand)}>
                {slot.children}
              </CatalogFilters>
            )}
          />
        </div>
      </Loading>
    </Errored>
  )
}
