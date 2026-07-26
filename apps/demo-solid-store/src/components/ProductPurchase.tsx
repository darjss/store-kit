import { For, Show, createSignal, untrack } from 'solid-js'

import { useCart } from '~/cart/CartProvider'
import { formatMnt } from '~/catalog/format'
import type { PurchaseProduct, StockStatus, StoreImage } from '~/catalog/model'

const stockLabel = (status: StockStatus) => {
  if (status === 'sold-out') return 'Дууссан'
  if (status === 'low-stock') return 'Цөөн үлдсэн'
  return 'Бэлэн'
}

function ProductImage(props: { image: StoreImage; priority?: boolean }) {
  return (
    <img
      class="h-full w-full object-contain"
      src={props.image.url}
      srcset={props.image.srcset}
      sizes="(min-width: 1024px) 60vw, 100vw"
      width={props.image.width}
      height={props.image.height}
      alt={props.image.alt}
      loading={props.priority ? 'eager' : 'lazy'}
      fetchpriority={props.priority ? 'high' : undefined}
      decoding="async"
    />
  )
}

export function ProductPurchase(props: { product: PurchaseProduct }) {
  const initialProduct = untrack(() => props.product)
  const firstAvailable = initialProduct.variants.find(variant => variant.maxQuantity > 0)
  const initialVariant = firstAvailable ?? initialProduct.variants[0]
  const [variantId, setVariantId] = createSignal(initialVariant?.id)
  const [quantity, setQuantity] = createSignal(1)
  const [imageId, setImageId] = createSignal(
    initialVariant?.imageIds[0] ?? initialProduct.images[0]?.id,
  )
  const [announcement, setAnnouncement] = createSignal('')
  const cart = useCart()

  const selectedVariant = () => props.product.variants.find(variant => variant.id === variantId())
  const selectedImage = () =>
    props.product.images.find(image => image.id === imageId()) ?? props.product.images[0]
  const maximumQuantity = () => selectedVariant()?.maxQuantity ?? 0
  const optionValues = (name: 'size' | 'color') => [
    ...new Set(
      props.product.variants
        .map(variant => variant.options[name])
        .filter((value): value is string => Boolean(value)),
    ),
  ]
  const optionIsAvailable = (name: 'size' | 'color', value: string) =>
    props.product.variants.some(
      variant => variant.options[name] === value && variant.maxQuantity > 0,
    )

  const chooseVariant = (nextId: string) => {
    const variant = props.product.variants.find(item => item.id === nextId)
    if (!variant || variant.maxQuantity === 0) return
    setVariantId(nextId)
    setQuantity(current => Math.min(current, variant.maxQuantity))
    const linkedImage = props.product.images.find(image => variant.imageIds.includes(image.id))
    if (linkedImage) setImageId(linkedImage.id)
    setAnnouncement(`${variant.name} сонгогдлоо. ${stockLabel(variant.stockStatus)}.`)
  }

  const chooseOption = (name: 'size' | 'color', value: string) => {
    const current = selectedVariant()
    const matchingCurrent = props.product.variants.find(
      variant =>
        variant.maxQuantity > 0 &&
        variant.options[name] === value &&
        (!current ||
          Object.entries(current.options).every(
            ([option, selected]) => option === name || variant.options[option] === selected,
          )),
    )
    const next =
      matchingCurrent ??
      props.product.variants.find(
        variant => variant.maxQuantity > 0 && variant.options[name] === value,
      )
    if (next) chooseVariant(next.id)
  }

  const chooseImage = (image: StoreImage) => {
    setImageId(image.id)
    setAnnouncement(`${image.alt} зураг сонгогдлоо.`)
  }

  const addToCart = () => {
    const variant = selectedVariant()
    if (!variant || variant.maxQuantity === 0) return
    cart.add(props.product, variant, quantity())
    setAnnouncement(`${props.product.name}, ${variant.name} сагсанд нэмэгдлээ.`)
  }

  return (
    <section
      class="grid border-b-3 border-ink bg-white lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]"
      aria-label="Барааны сонголт"
    >
      <div class="min-w-0 border-b-3 border-ink bg-surface p-[clamp(1rem,4vw,3rem)] lg:border-r-3 lg:border-b-0">
        <div class="grid min-h-112 place-items-center bg-white sm:min-h-152">
          <Show
            when={selectedImage()}
            fallback={<p class="font-bold text-ink/60">Зураг шинэчлэгдэж байна.</p>}
          >
            {image => <ProductImage image={image()} priority />}
          </Show>
        </div>
        <p class="sr-only" aria-live="polite" aria-atomic="true">
          {selectedImage()?.alt}
        </p>
        <Show when={props.product.images.length > 1}>
          <div class="mt-3 grid grid-cols-4 gap-2" role="list" aria-label="Барааны зураг">
            <For each={props.product.images}>
              {(image, index) => (
                <button
                  class="aspect-square min-h-11 border-2 bg-white p-1 aria-[current=true]:border-cobalt"
                  type="button"
                  onClick={() => chooseImage(image)}
                  aria-label={`${index() + 1}-р зураг: ${image.alt}`}
                  aria-current={image.id === selectedImage()?.id ? 'true' : undefined}
                >
                  <ProductImage image={image} />
                </button>
              )}
            </For>
          </div>
        </Show>
      </div>

      <div class="flex min-w-0 flex-col p-[clamp(1.25rem,4vw,3.5rem)]">
        <Show
          when={selectedVariant()}
          fallback={
            <div class="border-y-3 border-alert py-5">
              <h2 class="text-2xl font-extrabold">Худалдан авах хувилбар алга.</h2>
              <p class="mt-2">Дэлгүүртэй холбогдож шинэчлэлтийг лавлана уу.</p>
            </div>
          }
        >
          {variant => (
            <>
              <div class="border-y-3 border-ink py-5" aria-live="polite" aria-atomic="true">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p
                    class={`m-0 font-bold ${variant().stockStatus === 'sold-out' ? 'text-alert' : 'text-cobalt'}`}
                  >
                    {stockLabel(variant().stockStatus)}
                  </p>
                  <p class="m-0 font-mono text-xs text-ink/55">{variant().sku}</p>
                </div>
                <div class="mt-2 flex flex-wrap items-end gap-3">
                  <strong class="text-[clamp(2.25rem,5vw,4rem)] leading-none font-extrabold">
                    {formatMnt(variant().priceMnt)}
                  </strong>
                  <Show when={variant().compareAtPriceMnt}>
                    {price => <del class="text-ink/55">{formatMnt(price())}</del>}
                  </Show>
                </div>
              </div>

              <fieldset class="mt-8 border-0 p-0">
                <legend class="mb-3 text-xl font-extrabold">Хэмжээ</legend>
                <div class="flex flex-wrap gap-2">
                  <For each={optionValues('size')}>
                    {size => (
                      <button
                        class="min-h-12 min-w-14 border-2 border-ink px-4 font-bold disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:border-cobalt aria-pressed:bg-surface"
                        type="button"
                        disabled={!optionIsAvailable('size', size)}
                        aria-pressed={variant().options.size === size ? 'true' : 'false'}
                        onClick={() => chooseOption('size', size)}
                      >
                        {size}
                      </button>
                    )}
                  </For>
                </div>
              </fieldset>

              <fieldset class="mt-6 border-0 p-0">
                <legend class="mb-3 text-xl font-extrabold">Өнгө</legend>
                <div class="flex flex-wrap gap-2">
                  <For each={optionValues('color')}>
                    {color => (
                      <button
                        class="min-h-12 border-2 border-ink px-4 font-bold disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:border-cobalt aria-pressed:bg-surface"
                        type="button"
                        disabled={!optionIsAvailable('color', color)}
                        aria-pressed={variant().options.color === color ? 'true' : 'false'}
                        onClick={() => chooseOption('color', color)}
                      >
                        {color}
                      </button>
                    )}
                  </For>
                </div>
              </fieldset>

              <div class="mt-auto pt-9">
                <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p class="m-0 font-extrabold">Тоо ширхэг</p>
                  <p class="m-0 text-sm text-ink/60">Дээд хэмжээ: {maximumQuantity()}</p>
                </div>
                <div class="inline-grid grid-cols-[3rem_4rem_3rem] border-2 border-ink">
                  <button
                    class="min-h-12 text-xl font-bold disabled:opacity-40"
                    type="button"
                    onClick={() => setQuantity(value => Math.max(1, value - 1))}
                    disabled={quantity() <= 1}
                    aria-label="Нэгээр хасах"
                  >
                    −
                  </button>
                  <output
                    class="grid min-h-12 place-items-center border-x-2 border-ink"
                    aria-live="polite"
                    aria-label="Сонгосон тоо"
                  >
                    {quantity()}
                  </output>
                  <button
                    class="min-h-12 text-xl font-bold disabled:opacity-40"
                    type="button"
                    onClick={() => setQuantity(value => Math.min(maximumQuantity(), value + 1))}
                    disabled={quantity() >= maximumQuantity()}
                    aria-label={`Нэгээр нэмэх. Дээд хэмжээ ${maximumQuantity()}`}
                  >
                    +
                  </button>
                </div>
                <button
                  class="mt-5 min-h-14 w-full bg-amber-action px-5 py-3 text-lg font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
                  type="button"
                  disabled={variant().stockStatus === 'sold-out'}
                  onClick={addToCart}
                >
                  Сагсанд нэмэх · {formatMnt(variant().priceMnt * quantity())} →
                </button>
              </div>
            </>
          )}
        </Show>
        <p class="sr-only" aria-live="polite" aria-atomic="true">
          {announcement()}
        </p>
      </div>
    </section>
  )
}
