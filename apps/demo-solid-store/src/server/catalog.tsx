'use server'

import { respond } from '@solidjs/web'
import { commerce } from '@store-kit/commerce'
import {
  catalogSearchInputSchema,
  catalogSearchResultSchema,
  catalogSlugSchema,
} from '@store-kit/contracts/catalog'
import type { CatalogSearchResult, ProductListFilters } from '@store-kit/contracts/catalog'
import { env } from 'cloudflare:workers'
import type { Element } from 'solid-js'
import { Value } from 'typebox/value'

import { catalogSearchSchema, toCatalogFilters } from '~/app/catalog-search'
import type { CatalogSearch } from '~/app/catalog-search'
import { formatMnt } from '~/catalog/format'
import { mediaUrl } from '~/catalog/media'
import type { ProductPageData, PurchaseProduct, StoreImage } from '~/catalog/model'

import { enforceRateLimit, throwUnexpectedServerError } from './policy'

const useCaseLabels: Record<string, string> = {
  'workday': 'Ажлын өдөр',
  'off-duty': 'Чөлөөт өдөр',
  'layering': 'Давхарлах',
  'travel': 'Аялал',
  'cold-weather': 'Хүйтэн өдөр',
}
const sortLabels = {
  'featured': 'Онцлох дараалал',
  'recent': 'Шинэ эхэнд',
  'price-asc': 'Үнэ: багаас их',
  'price-desc': 'Үнэ: ихээс бага',
} as const
const productDetailLabels: Record<string, string> = {
  fabric: 'Материал',
  fit: 'Эсгүүр',
  care: 'Арчилгаа',
  origin: 'Гарал',
  season: 'Улирал',
}

const toPublicImage = (image: { r2Key: string; width: number; height: number; alt: string }) => ({
  url: mediaUrl(image.r2Key),
  width: image.width,
  height: image.height,
  alt: image.alt,
})

const toStoreImage = (image: {
  id: string
  r2Key: string
  width: number
  height: number
  alt: string
}): StoreImage => ({
  id: image.id,
  ...toPublicImage(image),
})

const StockLabel = (props: { quantity: number }) => (
  <span class={props.quantity === 0 ? 'text-alert' : 'text-cobalt'}>
    {props.quantity === 0 ? 'Дууссан' : props.quantity <= 3 ? 'Цөөн үлдсэн' : 'Бэлэн'}
  </span>
)

const ProductImage = (props: { image: StoreImage; class: string; sizes: string }) => (
  <img
    class={props.class}
    src={props.image.url}
    srcset={props.image.srcset}
    sizes={props.sizes}
    width={props.image.width}
    height={props.image.height}
    alt={props.image.alt}
    loading="lazy"
    decoding="async"
  />
)

const minimumPrice = (variants: { priceMnt: number }[]) =>
  variants.length === 0 ? undefined : Math.min(...variants.map(variant => variant.priceMnt))

const catalogHref = (filters: ProductListFilters, change: ProductListFilters) => {
  const next = { ...filters, ...change }
  const search = new URLSearchParams()
  if (next.category) search.set('category', next.category)
  if (next.brand) search.set('brand', next.brand)
  if (next.useCase) search.set('useCase', next.useCase)
  if (next.featured) search.set('featured', 'true')
  if (next.query) search.set('query', next.query)
  if (next.sort) search.set('sort', next.sort)
  const suffix = search.toString()
  return suffix ? `/products?${suffix}` : '/products'
}

const validateSearch = (input: unknown) => {
  if (!Value.Check(catalogSearchSchema, input)) {
    throw respond(
      { ok: false as const, code: 'invalid_catalog_filters' },
      { status: 400, headers: { 'cache-control': 'no-store' } },
    )
  }
  return input
}

const validateSlug = (input: unknown) => {
  if (!Value.Check(catalogSlugSchema, input)) {
    throw respond(
      { ok: false as const, code: 'invalid_product_slug' },
      { status: 400, headers: { 'cache-control': 'no-store' } },
    )
  }
  return input
}

export async function searchCatalog(input: unknown) {
  await enforceRateLimit('catalog-search', env.SEARCH_RATE_LIMITER)
  if (!Value.Check(catalogSearchInputSchema, input) || input.query.trim().length < 2) {
    throw respond(
      { ok: false as const, code: 'invalid_catalog_search' },
      { status: 400, headers: { 'cache-control': 'private, no-store' } },
    )
  }

  try {
    const query = input.query.trim()
    const result = await commerce.catalog.listProducts({ query, limit: 8 })
    const searchResult: CatalogSearchResult = {
      items: result.value.items.map(product => {
        const stockQuantity = product.variants.reduce(
          (total, variant) => total + variant.stockQuantity,
          0,
        )
        return {
          slug: product.slug,
          name: product.name,
          shortDescription: product.shortDescription ?? 'Тайлбар шинэчлэгдэж байна.',
          image: product.images[0] ? toPublicImage(product.images[0]) : null,
          priceMnt: minimumPrice(product.variants) ?? null,
          stockStatus:
            stockQuantity === 0
              ? ('sold-out' as const)
              : stockQuantity <= 3
                ? ('low-stock' as const)
                : ('in-stock' as const),
        }
      }),
      total: result.value.total,
    }

    if (!Value.Check(catalogSearchResultSchema, searchResult)) {
      throw new Error('Invalid catalog search result.')
    }
    return searchResult
  } catch (error) {
    return throwUnexpectedServerError('catalog-search', error, 'Хайлтыг гүйцэтгэж чадсангүй.')
  }
}

export async function getHomeFrame() {
  const result = await commerce.catalog.listProducts({ limit: 5 })
  const products = result.value.items
  return () => (
    <main id="main-content" tabindex="-1">
      <section class="grid min-h-[calc(100svh-5rem)] overflow-hidden border-b border-ink/20 bg-white md:grid-cols-[42%_58%] lg:grid-cols-[35%_65%]">
        <div class="relative z-2 flex min-w-0 flex-col justify-center gap-7 px-[clamp(1rem,4vw,4rem)] py-12 lg:py-20">
          <div class="flex items-center gap-4 text-sm font-bold tracking-wide">
            <span>−24°</span>
            <span class="h-px flex-1 bg-ink" aria-hidden="true" />
            <span>+23°</span>
          </div>
          <p class="m-0 font-semibold text-cobalt">Гаднаас дотогш.</p>
          <h1 class="m-0 max-w-[10ch] text-[clamp(3rem,7vw,5.75rem)] leading-[0.94] font-extrabold tracking-[-0.03em] text-balance">
            Давхарга бүр ажиллана.
          </h1>
          <p class="m-0 max-w-136 text-lg leading-relaxed text-ink/75">
            −24°-өөс +23° хүртэл, ажил болон өдөр тутмын хөдөлгөөнд зориулсан таван хэсгийн капсул.
          </p>
          <div class="flex flex-wrap gap-3">
            <a
              class="inline-flex min-h-12 items-center bg-amber-action px-5 font-bold text-white no-underline hover:bg-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-cobalt"
              href="/products/shiljilt-bridge-coat"
            >
              Шилжилт хүрэм үзэх →
            </a>
            <a
              class="inline-flex min-h-12 items-center border-2 border-ink px-5 font-bold text-ink no-underline hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-cobalt"
              href="/products"
            >
              5 хэсгийн капсул үзэх
            </a>
          </div>
        </div>
        <div class="relative min-h-[58svh] bg-amber md:min-h-full">
          <div
            class="absolute inset-[clamp(1rem,4vw,3.5rem)] translate-x-3 translate-y-3 border-3 border-ink"
            aria-hidden="true"
          />
          <img
            class="relative h-full min-h-[58svh] w-full object-cover object-[58%_center] motion-safe:animate-[doorway-reveal_600ms_cubic-bezier(0.16,1,0.3,1)_both] lg:min-h-full"
            src="/images/hero-threshold.webp"
            width="1122"
            height="1402"
            alt="Хар шилжилт хүрэм, хөх дотор давхаргатай загварыг өвлийн гэрэлтэй үүдэнд өмссөн хүн."
            fetchpriority="high"
          />
        </div>
      </section>

      <section
        class="bg-amber px-[clamp(1rem,4vw,4rem)] py-[clamp(4rem,8vw,7rem)]"
        aria-labelledby="coat-system-title"
      >
        <div class="mx-auto grid max-w-360 items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <img
            class="h-auto w-full border-3 border-ink object-cover"
            src="/images/bridge-coat-system.webp"
            width="1448"
            height="1086"
            alt="Хар урт хүрэм ба салдаг хөх дотор давхаргыг зэрэгцүүлэн өлгөсөн нь."
            loading="lazy"
          />
          <div class="bg-white p-[clamp(1.25rem,4vw,3.5rem)] shadow-[12px_12px_0_var(--color-cobalt)]">
            <p class="font-bold text-cobalt">01 / ГАДУУР ДАВХАРГА</p>
            <h2
              id="coat-system-title"
              class="mt-3 text-[clamp(2.25rem,5vw,4.5rem)] leading-[0.98] font-extrabold tracking-tight"
            >
              Нэг хүрэм. Хоёр дулаан.
            </h2>
            <p class="mt-5 max-w-[54ch] text-lg leading-relaxed">
              Матт гадуур бүрхүүл ба салдаг кобальт дотор давхаргыг цаг агаар, дотор орчноос хамаарч
              салгаж өмсөнө.
            </p>
            <a
              class="mt-7 inline-flex min-h-12 items-center bg-cobalt px-5 font-bold text-white no-underline"
              href="/products/shiljilt-bridge-coat"
            >
              Хэмжээ, өнгө сонгох →
            </a>
          </div>
        </div>
      </section>

      <section
        class="px-[clamp(1rem,4vw,4rem)] py-[clamp(4rem,8vw,7rem)]"
        aria-labelledby="capsule-title"
      >
        <div class="mx-auto max-w-360">
          <div class="flex flex-wrap items-end justify-between gap-5 border-b-3 border-ink pb-5">
            <div>
              <p class="font-bold text-cobalt">ДАВХАРГЫН ДАРААЛАЛ</p>
              <h2
                id="capsule-title"
                class="mt-2 text-[clamp(2.25rem,5vw,4.5rem)] leading-none font-extrabold"
              >
                Таван хэсгийн капсул
              </h2>
            </div>
            <a class="inline-flex min-h-11 items-center font-bold text-cobalt" href="/products">
              Бүх бараа →
            </a>
          </div>
          <div class="divide-y divide-ink/25">
            {products.map((product, index) => {
              const image = product.images[0] ? toStoreImage(product.images[0]) : undefined
              const price = minimumPrice(product.variants)
              const stock = product.variants.reduce(
                (total, variant) => total + variant.stockQuantity,
                0,
              )
              return (
                <article class="grid min-h-44 items-center gap-5 py-6 sm:grid-cols-[5rem_10rem_minmax(0,1fr)_auto]">
                  <span class="text-4xl font-extrabold text-cobalt">0{index + 1}</span>
                  {image ? (
                    <ProductImage
                      image={image}
                      class="aspect-square h-36 w-full object-cover"
                      sizes="10rem"
                    />
                  ) : (
                    <div class="aspect-square h-36 w-full bg-surface" aria-hidden="true" />
                  )}
                  <div class="min-w-0">
                    <p class="font-semibold text-ink/60">{product.category?.name}</p>
                    <h3 class="mt-1 text-2xl font-extrabold">
                      <a class="text-ink no-underline" href={`/products/${product.slug}`}>
                        {product.name}
                      </a>
                    </h3>
                    <p class="mt-2 max-w-[58ch] text-ink/70">{product.shortDescription}</p>
                  </div>
                  <div class="flex min-w-40 flex-col items-start gap-2 sm:items-end">
                    <strong class="text-xl">
                      {price === undefined ? 'Тун удахгүй' : formatMnt(price)}
                    </strong>
                    <StockLabel quantity={stock} />
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section
        class="grid border-y-3 border-ink bg-cobalt text-white md:grid-cols-3"
        aria-label="Үйлчилгээний мэдээлэл"
      >
        <p class="m-0 flex min-h-28 items-center border-b border-white/30 px-6 font-semibold md:border-r md:border-b-0">
          Улаанбаатарын 9 дүүрэгт хүргэнэ
        </p>
        <p class="m-0 flex min-h-28 items-center border-b border-white/30 px-6 font-semibold md:border-r md:border-b-0">
          QPay эсвэл дансаар төлнө
        </p>
        <p class="m-0 flex min-h-28 items-center px-6 font-semibold">
          Үнэ, үлдэгдлийг захиалгын өмнө баталгаажуулна
        </p>
      </section>
    </main>
  )
}

interface CatalogFrameProps {
  filters: (props: { children: Element }) => Element
}

export async function getCatalogFrame(input: unknown) {
  const search = validateSearch(input) satisfies CatalogSearch
  const filters = toCatalogFilters(search)
  const [result, categories, brands] = await Promise.all([
    commerce.catalog.listProducts(filters),
    commerce.catalog.listCategories(),
    commerce.catalog.listBrands(),
  ])

  const products = result.value.items
  return (props: CatalogFrameProps) => (
    <main id="main-content" tabindex="-1">
      <header class="bg-cobalt px-[clamp(1rem,4vw,4rem)] py-[clamp(3rem,7vw,6rem)] text-white">
        <div class="mx-auto max-w-360">
          <p class="font-bold text-amber">ДУНД / 5 ХЭСГИЙН СИСТЕМ</p>
          <h1 class="mt-3 text-[clamp(3rem,8vw,5.75rem)] leading-[0.9] font-extrabold tracking-[-0.035em]">
            Бүх давхарга
          </h1>
          <form
            class="mt-8 grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] bg-white text-ink"
            action="/products"
            method="get"
            role="search"
          >
            {filters.category && <input type="hidden" name="category" value={filters.category} />}
            {filters.brand && <input type="hidden" name="brand" value={filters.brand} />}
            {filters.useCase && <input type="hidden" name="useCase" value={filters.useCase} />}
            <label class="sr-only" for="catalog-query">
              Бараа хайх
            </label>
            <input
              class="min-h-12 min-w-0 border-0 px-4 outline-offset-[-3px]"
              id="catalog-query"
              name="query"
              value={filters.query ?? ''}
              placeholder="Хүрэм, ноосон цамц…"
            />
            <button class="min-h-12 bg-amber-action px-5 font-bold text-white" type="submit">
              Хайх
            </button>
          </form>
        </div>
      </header>

      <section
        class="border-b border-ink/20 px-[clamp(1rem,4vw,4rem)] py-5"
        aria-label="Каталогийн шүүлтүүр"
      >
        <div class="mx-auto max-w-360">
          <nav
            class="flex snap-x scrollbar-none gap-2 overflow-x-auto pb-2"
            aria-label="Хэрэглээгээр шүүх"
          >
            <a
              class="inline-flex min-h-11 shrink-0 snap-start items-center border-2 border-ink px-4 font-semibold text-ink no-underline aria-[current=page]:bg-amber"
              href={catalogHref(filters, { useCase: undefined })}
              target="_self"
              aria-current={!filters.useCase ? 'page' : undefined}
            >
              Бүх хэрэглээ
            </a>
            {Object.entries(useCaseLabels).map(([slug, label]) => (
              <a
                class="inline-flex min-h-11 shrink-0 snap-start items-center border-2 border-ink px-4 font-semibold text-ink no-underline aria-[current=page]:bg-amber"
                href={catalogHref(filters, { useCase: slug })}
                target="_self"
                aria-current={filters.useCase === slug ? 'page' : undefined}
              >
                {label}
              </a>
            ))}
          </nav>

          {props.filters({
            children: (
              <div class="grid gap-5 border-t-2 border-ink p-4 md:grid-cols-2">
                <div>
                  <strong class="text-cobalt">Төрөл</strong>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <a
                      class="inline-flex min-h-11 items-center border-2 border-ink px-3 font-semibold text-ink no-underline"
                      href={catalogHref(filters, { category: undefined })}
                      target="_self"
                      aria-current={!filters.category ? 'page' : undefined}
                    >
                      Бүх төрөл
                    </a>
                    {categories.map(category => (
                      <a
                        class="inline-flex min-h-11 items-center border-2 border-ink px-3 font-semibold text-ink no-underline aria-[current=page]:bg-amber"
                        href={catalogHref(filters, { category: category.slug })}
                        target="_self"
                        aria-current={filters.category === category.slug ? 'page' : undefined}
                      >
                        {category.name}
                      </a>
                    ))}
                  </div>
                </div>
                <div>
                  <strong class="text-cobalt">Брэнд</strong>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <a
                      class="inline-flex min-h-11 items-center border-2 border-cobalt px-3 font-semibold text-cobalt no-underline"
                      href={catalogHref(filters, { brand: undefined })}
                      target="_self"
                      aria-current={!filters.brand ? 'page' : undefined}
                    >
                      Бүх брэнд
                    </a>
                    {brands.map(brand => (
                      <a
                        class="inline-flex min-h-11 items-center border-2 border-cobalt px-3 font-semibold text-cobalt no-underline aria-[current=page]:bg-cobalt aria-[current=page]:text-white"
                        href={catalogHref(filters, { brand: brand.slug })}
                        target="_self"
                        aria-current={filters.brand === brand.slug ? 'page' : undefined}
                      >
                        {brand.name}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ),
          })}

          <div class="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2" aria-label="Идэвхтэй шүүлтүүр">
              {filters.query && (
                <a
                  class="inline-flex min-h-11 items-center border border-cobalt px-3 font-semibold text-cobalt no-underline"
                  href={catalogHref(filters, { query: undefined })}
                  target="_self"
                >
                  “{filters.query}” ×
                </a>
              )}
              {filters.category && (
                <a
                  class="inline-flex min-h-11 items-center border border-cobalt px-3 font-semibold text-cobalt no-underline"
                  href={catalogHref(filters, { category: undefined })}
                  target="_self"
                >
                  {categories.find(category => category.slug === filters.category)?.name ??
                    filters.category}{' '}
                  ×
                </a>
              )}
              {filters.brand && (
                <a
                  class="inline-flex min-h-11 items-center border border-cobalt px-3 font-semibold text-cobalt no-underline"
                  href={catalogHref(filters, { brand: undefined })}
                  target="_self"
                >
                  {brands.find(brand => brand.slug === filters.brand)?.name ?? filters.brand} ×
                </a>
              )}
              {filters.useCase && (
                <a
                  class="inline-flex min-h-11 items-center border border-cobalt px-3 font-semibold text-cobalt no-underline"
                  href={catalogHref(filters, { useCase: undefined })}
                  target="_self"
                >
                  {useCaseLabels[filters.useCase] ?? filters.useCase} ×
                </a>
              )}
              {(filters.query || filters.category || filters.brand || filters.useCase) && (
                <a
                  class="inline-flex min-h-11 items-center font-bold text-alert"
                  href="/products"
                  target="_self"
                >
                  Бүгдийг цэвэрлэх
                </a>
              )}
            </div>
            <form class="flex items-end gap-2" action="/products" method="get">
              {filters.category && <input type="hidden" name="category" value={filters.category} />}
              {filters.brand && <input type="hidden" name="brand" value={filters.brand} />}
              {filters.useCase && <input type="hidden" name="useCase" value={filters.useCase} />}
              {filters.query && <input type="hidden" name="query" value={filters.query} />}
              <label class="grid gap-1 text-sm font-bold" for="catalog-sort">
                Эрэмбэ
                <select
                  class="min-h-11 border-2 border-ink bg-white px-3"
                  id="catalog-sort"
                  name="sort"
                >
                  {Object.entries(sortLabels).map(([value, label]) => (
                    <option value={value} selected={(filters.sort ?? 'featured') === value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button class="min-h-11 bg-ink px-4 font-bold text-white" type="submit">
                Хэрэглэх
              </button>
            </form>
          </div>
        </div>
      </section>

      {products.length === 0 ? (
        <section class="mx-auto grid min-h-[50svh] max-w-3xl place-content-center px-5 text-center">
          <h2 class="text-4xl font-extrabold">Тохирох бараа алга.</h2>
          <p class="mt-3">Хайлтаа богиносгох эсвэл шүүлтүүрээ цэвэрлэнэ үү.</p>
          <a class="mt-6 font-bold text-cobalt" href="/products">
            Бүх бараа харах
          </a>
        </section>
      ) : (
        <section
          class="mx-auto max-w-360 divide-y divide-ink/25 px-[clamp(1rem,4vw,4rem)] py-6"
          aria-label="Барааны жагсаалт"
        >
          {products.map((product, index) => {
            const image = product.images[0] ? toStoreImage(product.images[0]) : undefined
            const price = minimumPrice(product.variants)
            const stock = product.variants.reduce(
              (total, variant) => total + variant.stockQuantity,
              0,
            )
            return (
              <article
                class={
                  index % 2 === 0
                    ? 'grid min-h-64 items-stretch py-6 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]'
                    : 'grid min-h-64 items-stretch py-6 lg:ml-[7%] lg:grid-cols-[minmax(18rem,1.1fr)_minmax(0,1.2fr)]'
                }
              >
                <a
                  class="min-h-64 overflow-hidden bg-surface"
                  href={`/products/${product.slug}`}
                  tabindex="-1"
                >
                  {image ? (
                    <ProductImage
                      image={image}
                      class="h-full max-h-96 w-full object-cover"
                      sizes="(min-width: 1024px) 42vw, 100vw"
                    />
                  ) : (
                    <span
                      class="grid h-full min-h-64 place-items-center text-7xl font-extrabold text-cobalt/30"
                      aria-hidden="true"
                    >
                      ДУНД
                    </span>
                  )}
                </a>
                <div class="flex min-w-0 flex-col justify-center border-3 border-ink bg-white p-[clamp(1.25rem,4vw,3.5rem)]">
                  <p class="font-bold text-cobalt">
                    {product.category?.name ?? 'Капсул'} / 0{index + 1}
                  </p>
                  <h2 class="mt-3 text-[clamp(2rem,5vw,4rem)] leading-none font-extrabold tracking-tight">
                    <a class="text-ink no-underline" href={`/products/${product.slug}`}>
                      {product.name}
                    </a>
                  </h2>
                  <p class="mt-4 max-w-[58ch] text-lg text-ink/70">{product.shortDescription}</p>
                  <div class="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-ink/25 pt-5">
                    <strong class="text-2xl">
                      {price === undefined ? 'Тун удахгүй' : formatMnt(price)}
                    </strong>
                    <StockLabel quantity={stock} />
                    <a
                      class="inline-flex min-h-11 items-center bg-cobalt px-4 font-bold text-white no-underline"
                      href={`/products/${product.slug}`}
                    >
                      Сонгох →
                    </a>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </main>
  )
}

export async function getProductPage(input: unknown) {
  const slug = validateSlug(input)
  const result = await commerce.catalog.getProduct(slug)
  if (result.status === 'error') return null

  const product = result.value
  const purchaseProduct: PurchaseProduct = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    images: product.images.map(toStoreImage),
    variants: product.variants.map(variant => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      options: variant.options,
      priceMnt: variant.priceMnt,
      compareAtPriceMnt: variant.compareAtPriceMnt,
      stockStatus:
        variant.stockQuantity === 0
          ? 'sold-out'
          : variant.stockQuantity <= 3
            ? 'low-stock'
            : 'in-stock',
      maxQuantity: Math.min(variant.stockQuantity, 10),
      imageIds: variant.imageLinks.map(link => link.imageId),
    })),
  }

  return {
    product: purchaseProduct,
    category: {
      name: product.category?.name ?? 'Бүх бараа',
      href: product.category ? `/products?category=${product.category.slug}` : '/products',
    },
    brandName: product.brand?.name ?? 'ДУНД',
    useCaseText:
      product.useCases
        .map(useCase => useCaseLabels[useCase])
        .filter((label): label is string => Boolean(label))
        .join(' · ') || 'Өдөр тутам',
    shortDescription: product.shortDescription ?? 'Тайлбар шинэчлэгдэж байна.',
  } satisfies ProductPageData
}

export async function getProductDetailsFrame(input: unknown) {
  const slug = validateSlug(input)
  const result = await commerce.catalog.getProduct(slug)
  if (result.status === 'error') return () => <div />

  const product = result.value
  const details = product.details ?? {}

  return () => (
    <div>
      <section
        class="grid border-y-3 border-ink bg-surface lg:grid-cols-2"
        aria-labelledby="description-title"
      >
        <div class="border-b-3 border-ink p-[clamp(1.25rem,4vw,4rem)] lg:border-r-3 lg:border-b-0">
          <p class="font-bold text-cobalt">ХУВЦАСНЫ ҮҮРЭГ</p>
          <h2
            id="description-title"
            class="mt-3 text-[clamp(2.25rem,5vw,4.5rem)] leading-none font-extrabold"
          >
            Өдөр бүр давхарлахад
          </h2>
        </div>
        <div class="p-[clamp(1.25rem,4vw,4rem)]">
          <p class="m-0 max-w-[60ch] text-xl leading-relaxed">
            {product.description ?? 'Энэ барааны дэлгэрэнгүй тайлбар шинэчлэгдэж байна.'}
          </p>
        </div>
      </section>

      <section
        class="px-[clamp(1rem,4vw,4rem)] py-[clamp(4rem,8vw,7rem)]"
        aria-labelledby="facts-title"
      >
        <div class="mx-auto max-w-360">
          <p class="font-bold text-cobalt">МАТЕРИАЛ / ЭСГҮҮР / АРЧИЛГАА</p>
          <h2
            id="facts-title"
            class="mt-3 text-[clamp(2.25rem,5vw,4.5rem)] leading-none font-extrabold"
          >
            Барааны баримт
          </h2>
          {Object.keys(details).length === 0 ? (
            <p class="mt-6 border-y border-ink/25 py-5">Барааны баримт шинэчлэгдэж байна.</p>
          ) : (
            <dl class="mt-8 grid border-t-3 border-ink md:grid-cols-2">
              {Object.entries(details).map(([key, value]) => (
                <div class="grid grid-cols-[8rem_minmax(0,1fr)] gap-4 border-b border-ink/30 py-5 odd:md:border-r odd:md:pr-6 even:md:pl-6">
                  <dt class="font-bold text-cobalt">{productDetailLabels[key] ?? 'Нэмэлт'}</dt>
                  <dd class="m-0 font-semibold">
                    {Array.isArray(value) ? value.join(' · ') : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>
    </div>
  )
}
