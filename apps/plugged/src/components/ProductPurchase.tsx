/* oxlint-disable tailwindcss/no-unknown-classes */
import type { ProductDetail } from '@store-kit/commerce/catalog'
import type { PublicImage } from '@store-kit/contracts'
import { formatMnt } from '@store-kit/storefront/format'
import { ProductPurchase as Purchase } from '@store-kit/storefront/purchase'
import { Button, ButtonGroup, ButtonGroupText, RadioGroup, RadioGroupItem } from '@store-kit/ui'
import { Show, onMount } from 'solid-js'

import { ProductImage } from './ProductImage'

type ProductPurchaseImage = PublicImage & Pick<ProductDetail['images'][number], 'id'>
type ProductPurchaseData = Omit<ProductDetail, 'images'> & { images: ProductPurchaseImage[] }

export function ProductPurchase(props: { product: ProductPurchaseData }) {
  let imageStage: HTMLDivElement | undefined = undefined
  let stageAnimation: Animation | undefined

  const animateImageStage = () => {
    if (!imageStage || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    stageAnimation?.cancel()
    stageAnimation = imageStage.animate(
      [
        { opacity: 0.72, transform: 'translate3d(1rem,-0.5rem,0) rotate(1.2deg)' },
        { opacity: 1, transform: 'translate3d(0,0,0) rotate(0deg)' },
      ],
      { duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    )
  }

  onMount(animateImageStage)

  return (
    <Purchase.Root product={props.product}>
      <Purchase.Selection>
        {selection => {
          const chooseVariant = (id: string) => {
            if (selection().selectVariant(id)) animateImageStage()
          }
          const chooseImage = (id: string) => {
            if (selection().selectImage(id)) animateImageStage()
          }

          return (
            <section class="contents" aria-label="Барааны сонголт">
              <div class="bg-petrol relative grid min-h-[min(700px,72svh)] grid-cols-[5.5rem_minmax(0,1fr)] overflow-clip p-4 max-md:min-h-[50svh] max-md:grid-cols-1 max-md:grid-rows-[minmax(0,1fr)_4.75rem] max-md:p-2">
                <div
                  class="order-2 flex flex-col gap-2 overflow-x-auto max-md:flex-row"
                  aria-label="Барааны зураг"
                >
                  {props.product.images.map((image, index) => (
                    <button
                      class="pressable border-paper/45 aria-pressed:border-cyan bg-ink grid aspect-square w-full shrink-0 place-items-center border-2 p-1 max-md:w-18"
                      type="button"
                      aria-label={`Зураг ${index + 1} / ${props.product.images.length}`}
                      aria-pressed={image.id === selection().selectedImage?.id}
                      onClick={() => chooseImage(image.id)}
                    >
                      <ProductImage
                        class="h-full w-full object-contain"
                        image={image}
                        layout="thumbnail"
                      />
                    </button>
                  ))}
                </div>
                <div
                  class="before:bg-ink/35 relative grid min-w-0 place-items-center before:absolute before:inset-[8%_5%] before:-rotate-1 before:content-['']"
                  ref={element => (imageStage = element)}
                >
                  <Show when={selection().selectedImage}>
                    {item => (
                      <ProductImage
                        class="relative z-1 h-[90%] w-[90%] object-contain filter-[drop-shadow(0_8px_0_rgb(0_0_0/0.3))] max-md:h-full max-md:w-full"
                        image={item()}
                        layout="detail"
                        priority
                      />
                    )}
                  </Show>
                  <span class="bg-ink text-cyan absolute right-3 bottom-3 z-2 px-2 py-1 text-sm font-black">
                    {props.product.images.findIndex(
                      image => image.id === selection().selectedImage?.id,
                    ) + 1}{' '}
                    / {props.product.images.length}
                  </span>
                </div>
              </div>
              <fieldset class="texture-paper border-ink m-0 border-0 border-t-4 p-4">
                <legend class="text-xl font-black">Сонголт</legend>
                <RadioGroup value={selection().selectedVariantId} onChange={chooseVariant}>
                  <Purchase.Variants>
                    {variant => (
                      <label
                        class="border-ink has-focus-visible:outline-acid mb-2 grid min-h-14.5 cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 border-3 p-3 has-focus-visible:outline-4 has-focus-visible:outline-offset-3"
                        classList={{
                          'border-cyan bg-cyan/20 shadow-[inset_5px_0_0_var(--color-cyan)]':
                            variant.id === selection().selectedVariantId,
                          'opacity-60 line-through': variant.stockQuantity === 0,
                        }}
                        for={`variant-${variant.id}`}
                      >
                        <RadioGroupItem
                          id={`variant-${variant.id}`}
                          value={variant.id}
                          disabled={variant.stockQuantity === 0}
                        />
                        <span>{variant.name}</span>
                        <strong>{formatMnt(variant.priceMnt)}</strong>
                        <small class="col-2">
                          {variant.stockQuantity === 0
                            ? 'Дууссан'
                            : variant.stockQuantity <= 3
                              ? 'Цөөн үлдсэн'
                              : 'Бэлэн'}
                        </small>
                      </label>
                    )}
                  </Purchase.Variants>
                </RadioGroup>
              </fieldset>
              <div class="border-ink bg-paper-clean sticky bottom-0 z-10 flex min-w-0 gap-3 border-t-4 p-4 max-[340px]:flex-col max-md:bottom-[calc(68px+env(safe-area-inset-bottom))] max-md:flex-wrap max-md:p-2">
                <ButtonGroup class="max-[340px]:self-start" aria-label="Тоо ширхэг">
                  <Button
                    class="border-ink bg-paper h-auto min-h-11 w-12 rounded-none border-3 font-black max-md:w-11"
                    type="button"
                    variant="outline"
                    onClick={selection().decrementQuantity}
                    aria-label="Нэгээр хасах"
                  >
                    −
                  </Button>
                  <ButtonGroupText class="border-ink bg-paper min-w-10 justify-center border-y-3 font-black">
                    <output>{selection().quantity}</output>
                  </ButtonGroupText>
                  <Button
                    class="border-ink bg-paper h-auto min-h-11 w-12 rounded-none border-3 font-black max-md:w-11"
                    type="button"
                    variant="outline"
                    disabled={selection().quantity >= selection().maximumQuantity}
                    onClick={selection().incrementQuantity}
                    aria-label={`Нэгээр нэмэх. Дээд хэмжээ ${selection().maximumQuantity}`}
                  >
                    +
                  </Button>
                </ButtonGroup>
                <Button
                  class="border-cyan bg-ink text-paper min-h-12.5 flex-1 cursor-pointer rounded-none border-3 px-4 py-3 font-black transition-transform duration-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none max-md:p-2 max-md:text-[0.82rem]"
                  type="button"
                  disabled={
                    !selection().selectedVariant || selection().selectedVariant?.stockQuantity === 0
                  }
                  onClick={selection().addToCart}
                >
                  Сагсанд нэмэх ·{' '}
                  {formatMnt((selection().selectedVariant?.priceMnt ?? 0) * selection().quantity)}
                </Button>
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
                    <p class="sr-only" aria-live="polite">
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
