import { useSearchParams } from '@solidjs/router'
import { dynamic } from '@solidjs/web'
import { Errored, Loading } from 'solid-js'

import { paths } from '~/app/router'
import { getCatalogFrame } from '~/server/catalog'

export default function CatalogPage() {
  const [search] = useSearchParams(paths.products)
  const input = () => ({
    ...(search.category ? { category: search.category } : {}),
    ...(search.brand ? { brand: search.brand } : {}),
    ...(search.useCase ? { useCase: search.useCase } : {}),
    ...(search.featured ? { featured: search.featured } : {}),
    ...(search.query ? { query: search.query } : {}),
    ...(search.sort ? { sort: search.sort } : {}),
  })
  const Catalog = dynamic(() => getCatalogFrame(input()))

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
        <Catalog />
      </Loading>
    </Errored>
  )
}
