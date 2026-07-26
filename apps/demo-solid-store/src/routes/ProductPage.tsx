import { useParams } from '@solidjs/router'
import { dynamic } from '@solidjs/web'
import { Errored, Loading } from 'solid-js'

import { paths } from '~/app/router'
import { ProductPurchase } from '~/components/ProductPurchase'
import { getProductFrame } from '~/server/catalog'

export default function ProductPage() {
  const params = useParams(paths.products)
  const Product = dynamic(() => getProductFrame(params.slug))

  return (
    <Errored
      fallback={
        <main id="main-content" class="grid min-h-[60svh] place-content-center px-5 text-center">
          <h1 class="text-4xl font-extrabold">Бараа олдсонгүй.</h1>
          <p class="mt-3">Холбоосоо шалгаад капсул руу буцна уу.</p>
          <a class="mt-5 font-bold text-cobalt" href="/products">
            Бүх бараа →
          </a>
        </main>
      }
    >
      <Loading
        on={params.slug}
        fallback={
          <main
            id="main-content"
            class="grid min-h-[70svh] place-content-center bg-surface px-5 text-center"
          >
            <p class="text-xl font-bold">Барааны файлыг нээж байна…</p>
          </main>
        }
      >
        <Product purchase={slot => <ProductPurchase product={slot.product} />} />
      </Loading>
    </Errored>
  )
}
