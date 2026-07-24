/* oxlint-disable tailwindcss/no-unknown-classes */
import type { PublicImage } from '@store-kit/contracts'
import { formatMnt } from '@store-kit/storefront/format'
import { ProductPurchase as Purchase } from '@store-kit/storefront/purchase'
import { Button, ButtonGroup, ButtonGroupText, RadioGroup, RadioGroupItem } from '@store-kit/ui'
import { For, Show, createEffect, createSignal, on, onCleanup } from 'solid-js'

import { ProductImage } from './ProductImage'

type ProductPurchaseImage = PublicImage & { id: string }
type ProductPurchaseData = {
  slug: string
  name: string
  images: ProductPurchaseImage[]
  variants: {
    id: string
    name: string
    options: Record<string, string>
    priceMnt: number
    compareAtPriceMnt?: number | null
    stockQuantity: number
    imageLinks: { imageId: string }[]
  }[]
}

const reduceMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

const stockText = (stockQuantity: number) => {
  if (stockQuantity === 0) return 'ДУУССАН'
  if (stockQuantity <= 3) return `${stockQuantity} ШИРХЭГ ҮЛДСЭН`
  return 'АГУУЛАХАД БЭЛЭН'
}

export function ProductPurchase(props: { product: ProductPurchaseData }) {
  const [galleryImage, setGalleryImage] = createSignal(props.product.images[0])
  const [previousImage, setPreviousImage] = createSignal<ProductPurchaseImage>()
  let incomingSheet: HTMLDivElement | undefined
  let outgoingSheet: HTMLDivElement | undefined
  let incomingAnimation: Animation | undefined
  let outgoingAnimation: Animation | undefined

  const swapImage = (nextImage: ProductPurchaseImage | undefined) => {
    const currentImage = galleryImage()
    if (!nextImage || currentImage?.id === nextImage.id) return

    incomingAnimation?.cancel()
    outgoingAnimation?.cancel()
    setPreviousImage(currentImage)
    setGalleryImage(nextImage)

    queueMicrotask(() => {
      if (reduceMotion() || typeof incomingSheet?.animate !== 'function') {
        setPreviousImage()
        return
      }

      outgoingAnimation = outgoingSheet?.animate(
        [
          { opacity: 1, transform: 'translate3d(0, 0, 0) rotate(0deg)' },
          { opacity: 0, transform: 'translate3d(-9%, -3%, 0) rotate(-2.5deg)' },
        ],
        { duration: 230, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'forwards' },
      )
      incomingAnimation = incomingSheet?.animate(
        [
          { opacity: 0.25, transform: 'translate3d(8%, 4%, 0) rotate(1.75deg)' },
          { opacity: 1, transform: 'translate3d(0, 0, 0) rotate(0deg)' },
        ],
        { duration: 280, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' },
      )
      incomingAnimation?.finished.then(() => setPreviousImage()).catch(() => undefined)
    })
  }

  onCleanup(() => {
    incomingAnimation?.cancel()
    outgoingAnimation?.cancel()
  })

  return (
    <Purchase.Root product={props.product}>
      <Purchase.Selection>
        {selection => {
          createEffect(on(() => selection().selectedImage, swapImage))

          const chooseVariant = (id: string) => selection().selectVariant(id)
          const selectedPrice = () => selection().selectedVariant?.priceMnt ?? 0
          const selectedDetailedVariant = () =>
            props.product.variants.find(variant => variant.id === selection().selectedVariantId)
          const compareAtPrice = () => selectedDetailedVariant()?.compareAtPriceMnt
          const selectedStock = () => selection().selectedVariant?.stockQuantity ?? 0

          return (
            <section
              class="bg-petrol text-paper grid min-w-0 grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)] max-lg:grid-cols-1"
              aria-label="Барааны сонголт"
            >
              <div class="border-paper/25 bg-petrol p-gutter relative min-w-0 overflow-clip border-r-4 max-lg:border-r-0 max-lg:border-b-4">
                <div
                  class="bg-cyan/45 pointer-events-none absolute inset-x-0 top-[12%] h-px"
                  aria-hidden="true"
                />
                <div
                  class="bg-cyan/25 pointer-events-none absolute top-0 bottom-0 left-[14%] w-px"
                  aria-hidden="true"
                />
                <div
                  class="relative grid min-h-[clamp(25rem,65vw,50rem)] place-items-center max-[340px]:min-h-96 max-md:min-h-116"
                  aria-label="Бүтээгдэхүүний зураг"
                >
                  <Show when={previousImage()}>
                    {image => (
                      <div
                        class="absolute inset-0 grid place-items-center will-change-transform"
                        ref={element => (outgoingSheet = element)}
                        aria-hidden="true"
                      >
                        <ProductImage
                          class="h-[88%] w-[88%] object-contain drop-shadow-[0_12px_6px_rgb(0_0_0/0.38)]"
                          image={image()}
                          layout="detail"
                        />
                      </div>
                    )}
                  </Show>
                  <Show when={galleryImage()}>
                    {image => (
                      <div
                        class="absolute inset-0 grid place-items-center will-change-transform"
                        ref={element => (incomingSheet = element)}
                      >
                        <ProductImage
                          class="h-[88%] w-[88%] object-contain drop-shadow-[0_12px_6px_rgb(0_0_0/0.38)] max-md:h-[94%] max-md:w-[104%]"
                          image={image()}
                          layout="detail"
                          priority
                        />
                      </div>
                    )}
                  </Show>
                  <span class="border-cyan text-cyan absolute top-3 left-3 border px-2 py-1 text-xs font-extrabold">
                    PRODUCT STAGE /{' '}
                    {String(
                      props.product.images.findIndex(image => image.id === galleryImage()?.id) + 1,
                    ).padStart(2, '0')}
                  </span>
                </div>
                <p class="sr-only" aria-live="polite" aria-atomic="true">
                  {galleryImage()?.alt} сонгогдлоо.
                </p>
                <div
                  class="border-paper/35 relative z-2 grid grid-cols-4 gap-2 border-t-2 pt-3"
                  role="list"
                  aria-label="Зургийн цомог"
                >
                  <For each={props.product.images}>
                    {(image, index) => (
                      <button
                        class="pressable bg-ink/45 text-paper relative min-h-20 cursor-pointer overflow-hidden border-2 p-1 focus-visible:z-2 max-[340px]:min-h-16"
                        classList={{
                          'border-cyan': image.id === galleryImage()?.id,
                          'border-paper/30': image.id !== galleryImage()?.id,
                        }}
                        type="button"
                        onClick={() => swapImage(image)}
                        aria-label={`${index() + 1}-р зураг: ${image.alt}`}
                        aria-current={image.id === galleryImage()?.id ? 'true' : undefined}
                      >
                        <ProductImage
                          class="absolute inset-0 h-full w-full object-contain"
                          image={image}
                          layout="thumbnail"
                        />
                        <span class="bg-ink text-cyan absolute right-1 bottom-0 px-1 text-[0.65rem] font-black">
                          {String(index() + 1).padStart(2, '0')}
                        </span>
                      </button>
                    )}
                  </For>
                </div>
              </div>

              <div class="bg-ink p-gutter text-paper relative flex min-w-0 flex-col max-lg:pb-32">
                <div
                  class="border-paper/30 mb-6 border-y-2 py-4"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <p class="text-cyan m-0 text-sm font-black">{stockText(selectedStock())}</p>
                  <div class="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
                    <strong class="text-[clamp(2.25rem,5vw,4rem)] leading-none font-black tabular-nums">
                      {formatMnt(selectedPrice())}
                    </strong>
                    <Show when={compareAtPrice()}>
                      {price => <del class="text-paper/65 tabular-nums">{formatMnt(price())}</del>}
                    </Show>
                  </div>
                  <p class="text-paper/75 mt-2 mb-0 text-sm">
                    Сонгосон хувилбарын нэгж үнэ · НӨАТ орсон
                  </p>
                </div>

                <fieldset class="m-0 border-0 p-0">
                  <legend class="mb-3 text-xl font-black">ХУВИЛБАР СОНГОХ</legend>
                  <RadioGroup value={selection().selectedVariantId} onChange={chooseVariant}>
                    <div class="grid gap-2">
                      <Purchase.Variants>
                        {variant => (
                          <label
                            class="has-focus-visible:outline-cyan border-paper/45 bg-paper-clean text-ink grid min-h-16 cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 border-2 p-3 has-focus-visible:outline-3 has-focus-visible:outline-offset-2"
                            classList={{
                              'translate-x-1 border-cyan bg-cyan':
                                variant.id === selection().selectedVariantId,
                              'cursor-not-allowed opacity-45': variant.stockQuantity === 0,
                            }}
                            for={`variant-${variant.id}`}
                          >
                            <RadioGroupItem
                              id={`variant-${variant.id}`}
                              value={variant.id}
                              disabled={variant.stockQuantity === 0}
                            />
                            <span class="font-extrabold">{variant.name}</span>
                            <strong class="tabular-nums">{formatMnt(variant.priceMnt)}</strong>
                            <small class="col-start-2 text-xs font-bold">
                              {stockText(variant.stockQuantity)}
                            </small>
                          </label>
                        )}
                      </Purchase.Variants>
                    </div>
                  </RadioGroup>
                </fieldset>

                <div class="mt-auto pt-8">
                  <div class="mb-3 flex items-center justify-between gap-3">
                    <span class="font-black">ТОО ШИРХЭГ</span>
                    <span class="text-paper/70 text-sm">
                      Дээд хэмжээ: {selection().maximumQuantity}
                    </span>
                  </div>
                  <ButtonGroup aria-label="Тоо ширхэг">
                    <Button
                      class="pressable border-paper bg-ink text-paper h-12 w-14 rounded-none border-2 text-xl font-black"
                      type="button"
                      variant="outline"
                      onClick={selection().decrementQuantity}
                      disabled={selection().quantity <= 1}
                      aria-label="Нэгээр хасах"
                    >
                      −
                    </Button>
                    <ButtonGroupText class="border-paper bg-paper-clean text-ink h-12 min-w-16 justify-center border-y-2 font-black">
                      <output aria-live="polite" aria-label="Сонгосон тоо">
                        {selection().quantity}
                      </output>
                    </ButtonGroupText>
                    <Button
                      class="pressable border-paper bg-ink text-paper h-12 w-14 rounded-none border-2 text-xl font-black"
                      type="button"
                      variant="outline"
                      disabled={selection().quantity >= selection().maximumQuantity}
                      onClick={selection().incrementQuantity}
                      aria-label={`Нэгээр нэмэх. Дээд хэмжээ ${selection().maximumQuantity}`}
                    >
                      +
                    </Button>
                  </ButtonGroup>
                </div>

                <div class="border-ink bg-paper-clean text-ink fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 border-t-4 p-2 lg:static lg:mt-5 lg:border-t-0 lg:bg-transparent lg:p-0">
                  <Button
                    class="pressable border-cyan bg-cyan text-ink min-h-15 w-full cursor-pointer rounded-none border-3 px-4 py-3 text-lg font-black disabled:cursor-not-allowed disabled:opacity-55"
                    type="button"
                    disabled={!selection().selectedVariant || selectedStock() === 0}
                    onClick={selection().addToCart}
                  >
                    САГСАНД НЭМЭХ · {formatMnt(selectedPrice() * selection().quantity)} →
                  </Button>
                </div>
              </div>

              <Purchase.Announcement>
                {announcement => {
                  const announcementText = () => {
                    const item = announcement()
                    if (item?.type === 'quantity-clamped')
                      return `Энэ сонголтоос ${item.maximum} ширхэг үлдсэн байна.`
                    return item?.type === 'added' ? `${props.product.name} сагсанд нэмэгдлээ.` : ''
                  }
                  return (
                    <p class="sr-only" aria-live="polite" aria-atomic="true">
                      {announcementText()}
                    </p>
                  )
                }}
              </Purchase.Announcement>
            </section>
          )
        }}
      </Purchase.Selection>
    </Purchase.Root>
  )
}
