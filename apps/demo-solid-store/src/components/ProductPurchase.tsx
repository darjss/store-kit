import { For, Show, createSignal, untrack } from 'solid-js'

import { useCart } from '~/cart/CartProvider'
import { formatMnt } from '~/catalog/format'
import type { PurchaseProduct, StockStatus, StoreImage } from '~/catalog/model'

const stockLabel = (status: StockStatus) => {
  if (status === 'sold-out') return 'Дууссан'
  if (status === 'low-stock') return 'Цөөн үлдсэн'
  return 'Бэлэн'
}

function ProductImage(props: {
  image: StoreImage
  priority?: boolean
  decorative?: boolean
  class?: string
  sizes?: string
}) {
  return (
    <img
      class={props.class ?? 'h-full w-full object-contain'}
      src={props.image.url}
      srcset={props.image.srcset}
      sizes={props.sizes ?? '(min-width: 1024px) 60vw, 100vw'}
      width={props.image.width}
      height={props.image.height}
      alt={props.decorative ? '' : props.image.alt}
      loading={props.priority ? 'eager' : 'lazy'}
      fetchpriority={props.priority ? 'high' : undefined}
      decoding="async"
      draggable={false}
    />
  )
}

export function ProductPurchase(props: { product: PurchaseProduct }) {
  const initialProduct = untrack(() => props.product)
  const firstAvailable = initialProduct.variants.find(variant => variant.maxQuantity > 0)
  const initialVariant = firstAvailable ?? initialProduct.variants[0]
  const initialImage = initialProduct.images.find(image =>
    initialVariant?.imageIds.includes(image.id),
  )
  const [variantId, setVariantId] = createSignal(initialVariant?.id)
  const [quantity, setQuantity] = createSignal(1)
  const [imageId, setImageId] = createSignal(initialImage?.id ?? initialProduct.images[0]?.id)
  const [announcement, setAnnouncement] = createSignal('')
  const cart = useCart()
  const galleryInstructionsId = `gallery-instructions-${initialProduct.id}`
  const galleryImageId = `gallery-image-${initialProduct.id}`
  let pointerStart: { id: number; x: number; y: number } | undefined

  const selectedVariant = () => props.product.variants.find(variant => variant.id === variantId())
  const selectedImage = () =>
    props.product.images.find(image => image.id === imageId()) ?? props.product.images[0]
  const selectedImageIndex = () => {
    const index = props.product.images.findIndex(image => image.id === selectedImage()?.id)
    return index < 0 ? 0 : index
  }
  const maximumQuantity = () => selectedVariant()?.maxQuantity ?? 0
  const optionValues = (name: 'size' | 'color') => [
    ...new Set(
      props.product.variants
        .map(variant => variant.options[name])
        .filter((value): value is string => Boolean(value)),
    ),
  ]
  const optionIsAvailable = (name: 'size' | 'color', value: string) => {
    const currentColor = selectedVariant()?.options.color
    return props.product.variants.some(
      variant =>
        variant.options[name] === value &&
        variant.maxQuantity > 0 &&
        (name === 'color' || !currentColor || variant.options.color === currentColor),
    )
  }

  const chooseVariant = (nextId: string) => {
    const variant = props.product.variants.find(item => item.id === nextId)
    if (!variant || variant.maxQuantity === 0) return
    const current = selectedVariant()
    const currentImageId = selectedImage()?.id
    const colorChanged = current?.options.color !== variant.options.color
    const currentImageStillLinked = Boolean(
      currentImageId && variant.imageIds.includes(currentImageId),
    )
    const primaryImage = props.product.images.find(image => variant.imageIds.includes(image.id))

    setVariantId(nextId)
    setQuantity(currentQuantity => Math.min(currentQuantity, variant.maxQuantity))
    if (primaryImage && (colorChanged || !currentImageStillLinked)) setImageId(primaryImage.id)
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
      (name === 'color'
        ? props.product.variants.find(
            variant => variant.maxQuantity > 0 && variant.options.color === value,
          )
        : undefined)
    if (next) chooseVariant(next.id)
  }

  const chooseImage = (image: StoreImage) => {
    setImageId(image.id)
  }

  const showImageAt = (index: number) => {
    const count = props.product.images.length
    if (count < 2) return
    const image = props.product.images[(index + count) % count]
    if (image) chooseImage(image)
  }

  const handleGalleryKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') showImageAt(selectedImageIndex() - 1)
    else if (event.key === 'ArrowRight') showImageAt(selectedImageIndex() + 1)
    else if (event.key === 'Home') showImageAt(0)
    else if (event.key === 'End') showImageAt(props.product.images.length - 1)
    else return
    event.preventDefault()
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (event.target instanceof Element && event.target.closest('button')) return
    if (!(event.currentTarget instanceof HTMLElement)) return
    pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY }
    if (event.isTrusted) event.currentTarget.setPointerCapture(event.pointerId)
  }

  const clearPointer = (event: PointerEvent) => {
    if (pointerStart?.id === event.pointerId) pointerStart = undefined
  }

  const handlePointerUp = (event: PointerEvent) => {
    const start = pointerStart
    clearPointer(event)
    if (!start || !(event.currentTarget instanceof HTMLElement)) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const distanceX = event.clientX - start.x
    const distanceY = event.clientY - start.y
    const threshold = Math.min(72, Math.max(44, event.currentTarget.clientWidth * 0.12))
    if (Math.abs(distanceX) < threshold || Math.abs(distanceX) <= Math.abs(distanceY) * 1.2) return
    showImageAt(selectedImageIndex() + (distanceX < 0 ? 1 : -1))
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
        <p id={galleryInstructionsId} class="sr-only">
          Зургийн хооронд шилжихдээ зүүн, баруун сум, Home, End товч ашиглана. Мэдрэгчтэй дэлгэц
          дээр хажуу тийш шударна.
        </p>
        <div
          class="relative aspect-4/5 w-full touch-pan-y overflow-hidden bg-white sm:aspect-5/4 lg:aspect-4/3"
          role="region"
          aria-roledescription="carousel"
          aria-label="Барааны зургийн цомог"
          aria-describedby={galleryInstructionsId}
          tabindex="0"
          onKeyDown={handleGalleryKeyDown}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={clearPointer}
          onLostPointerCapture={clearPointer}
        >
          <Show
            when={selectedImage()}
            keyed
            fallback={
              <p class="grid h-full place-items-center font-bold text-ink/60">
                Зураг шинэчлэгдэж байна.
              </p>
            }
          >
            {image => (
              <div id={galleryImageId} class="absolute inset-0 grid place-items-center">
                <ProductImage
                  image={image}
                  priority
                  class="h-full w-full object-contain motion-safe:animate-[gallery-image-in_240ms_cubic-bezier(0.16,1,0.3,1)_both]"
                />
              </div>
            )}
          </Show>
          <Show when={props.product.images.length > 1}>
            <button
              class="absolute top-1/2 left-2 z-2 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center border-2 border-ink bg-white/95 text-2xl font-extrabold transition-[color,background-color,transform] duration-150 hover:bg-amber active:scale-95 motion-reduce:transition-none"
              type="button"
              onClick={() => showImageAt(selectedImageIndex() - 1)}
              aria-label="Өмнөх зураг"
              aria-controls={galleryImageId}
            >
              ←
            </button>
            <button
              class="absolute top-1/2 right-2 z-2 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center border-2 border-ink bg-white/95 text-2xl font-extrabold transition-[color,background-color,transform] duration-150 hover:bg-amber active:scale-95 motion-reduce:transition-none"
              type="button"
              onClick={() => showImageAt(selectedImageIndex() + 1)}
              aria-label="Дараах зураг"
              aria-controls={galleryImageId}
            >
              →
            </button>
            <span
              class="absolute right-2 bottom-2 z-2 bg-ink px-3 py-1 text-sm font-bold text-white"
              aria-hidden="true"
            >
              {selectedImageIndex() + 1} / {props.product.images.length}
            </span>
          </Show>
        </div>
        <p class="sr-only" aria-live="polite" aria-atomic="true">
          {selectedImage()
            ? `Зураг ${selectedImageIndex() + 1} / ${props.product.images.length}. ${selectedImage()?.alt}`
            : 'Зураг алга.'}
        </p>
        <Show when={props.product.images.length > 1}>
          <div
            class="mt-3 flex snap-x gap-2 overflow-x-auto pb-2"
            role="group"
            aria-label="Барааны зураг сонгох"
          >
            <For each={props.product.images}>
              {(image, index) => (
                <button
                  class="relative aspect-4/5 w-18 shrink-0 snap-start overflow-hidden border-2 border-ink bg-white p-1 transition-[border-color,background-color,transform] duration-150 hover:bg-amber/20 active:scale-[0.98] aria-[current=true]:border-cobalt aria-[current=true]:bg-cobalt motion-reduce:transition-none"
                  type="button"
                  onClick={() => chooseImage(image)}
                  aria-label={`${index() + 1}-р зураг: ${image.alt}`}
                  aria-current={image.id === selectedImage()?.id ? 'true' : undefined}
                  aria-controls={galleryImageId}
                >
                  <ProductImage
                    image={image}
                    decorative
                    class="h-full w-full object-cover"
                    sizes="4.5rem"
                  />
                  <span
                    class="absolute right-1 bottom-1 grid size-6 place-items-center bg-white text-xs font-extrabold text-ink"
                    aria-hidden="true"
                  >
                    {index() + 1}
                  </span>
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
                  <p class="m-0 text-xs font-semibold tracking-wide text-ink/60">{variant().sku}</p>
                </div>
                <div class="mt-2 flex flex-wrap items-end gap-3">
                  <strong class="text-[clamp(2.25rem,5vw,4rem)] leading-none font-extrabold">
                    {formatMnt(variant().priceMnt)}
                  </strong>
                  <Show when={variant().compareAtPriceMnt}>
                    {price => <del class="text-muted">{formatMnt(price())}</del>}
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
