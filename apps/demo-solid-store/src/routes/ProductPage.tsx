import { useParams } from '@solidjs/router'
import { dynamic } from '@solidjs/web'
import { Errored, Loading, Show, createEffect, createMemo } from 'solid-js'

import { paths } from '~/app/router'
import type { ProductPageData } from '~/catalog/model'
import { ProductPurchase } from '~/components/ProductPurchase'
import { getProductDetailsFrame, getProductPage } from '~/server/catalog'

function ProductView(props: { data: ProductPageData }) {
  createEffect(
    () => props.data.product.name,
    name => {
      document.title = `${name} · ДУНД`
    },
  )

  return (
    <div class="contents">
      <header class="grid border-b-3 border-ink bg-white lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.36fr)]">
        <div class="px-[clamp(1rem,4vw,4rem)] py-[clamp(3rem,7vw,6rem)]">
          <a
            class="inline-flex min-h-11 items-center font-bold text-cobalt"
            href={props.data.category.href}
          >
            ← {props.data.category.name}
          </a>
          <p class="mt-6 font-bold text-cobalt">
            {props.data.brandName} / {props.data.useCaseText}
          </p>
          <h1 class="mt-3 max-w-[14ch] text-[clamp(3rem,8vw,5.75rem)] leading-[0.9] font-extrabold tracking-[-0.035em] text-balance">
            {props.data.product.name}
          </h1>
          <p class="mt-6 max-w-[58ch] text-xl leading-relaxed text-ink/70">
            {props.data.shortDescription}
          </p>
        </div>
        <div class="flex items-end bg-amber p-[clamp(1rem,4vw,3rem)]">
          <p class="m-0 text-2xl font-extrabold">
            −24° → +23°
            <br />
            <span class="text-base font-semibold">
              Энэ хэсгийн дулааны үүргийг доороос шалгана уу.
            </span>
          </p>
        </div>
      </header>

      <ProductPurchase product={props.data.product} />
    </div>
  )
}

function ProductNotFoundContent() {
  return (
    <section class="grid min-h-[60svh] place-content-center px-5 text-center">
      <h1 class="text-4xl font-extrabold">Бараа олдсонгүй.</h1>
      <p class="mt-3">Холбоосоо шалгаад капсул руу буцна уу.</p>
      <a class="mt-5 font-bold text-cobalt" href="/products">
        Бүх бараа →
      </a>
    </section>
  )
}

function ProductLoadError() {
  return (
    <main
      id="main-content"
      tabindex="-1"
      class="grid min-h-[60svh] place-content-center px-5 text-center"
    >
      <h1 class="text-4xl font-extrabold">Барааг ачаалж чадсангүй.</h1>
      <p class="mt-3">Сүлжээгээ шалгаад дахин оролдоно уу.</p>
      <button
        class="mx-auto mt-5 min-h-11 border-2 border-ink px-4 font-bold"
        type="button"
        onClick={() => window.location.reload()}
      >
        Дахин ачаалах
      </button>
    </main>
  )
}

export default function ProductPage() {
  const params = useParams(paths.products)
  const product = createMemo(() => getProductPage(params.slug))
  const ProductDetails = dynamic(() => getProductDetailsFrame(params.slug))

  return (
    <Errored fallback={<ProductLoadError />}>
      <main id="main-content" tabindex="-1">
        <Loading
          on={params.slug}
          fallback={
            <section class="grid min-h-[70svh] place-content-center bg-surface px-5 text-center">
              <p class="text-xl font-bold">Барааны файлыг нээж байна…</p>
            </section>
          }
        >
          <Show when={product()} keyed fallback={<ProductNotFoundContent />}>
            {data => <ProductView data={data} />}
          </Show>
        </Loading>
        <Loading fallback={<p class="sr-only">Барааны дэлгэрэнгүйг нээж байна…</p>}>
          <ProductDetails />
        </Loading>
      </main>
    </Errored>
  )
}
