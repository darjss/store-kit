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

  const animateImageStage = () => {
    if (!imageStage || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    imageStage.animate(
      [
        { opacity: 0, transform: 'scale(1.025)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      { duration: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
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

          return (
            <section class="contents" aria-label="Барааны сонголт">
              <div
                class="bg-orange sticky top-0 grid min-h-[min(700px,72svh)] place-items-center overflow-clip max-md:relative max-md:min-h-[52svh]"
                ref={element => (imageStage = element)}
              >
                <Show when={selection().selectedImage}>
                  {item => (
                    <ProductImage
                      class="h-[90%] w-[90%] object-contain filter-[drop-shadow(0_6px_0_rgb(0_0_0/0.2))] max-md:w-[115%] max-md:max-w-none"
                      image={item()}
                      layout="detail"
                      priority
                    />
                  )}
                </Show>
              </div>
              <fieldset class="bg-paper m-0 border-0 p-4">
                <legend class="text-xl font-black">Сонголт</legend>
                <RadioGroup value={selection().selectedVariantId} onChange={chooseVariant}>
                  <Purchase.Variants>
                    {variant => (
                      <label
                        class="border-ink has-focus-visible:outline-acid mb-2 grid min-h-14.5 cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 border-3 p-3 has-focus-visible:outline-4 has-focus-visible:outline-offset-3"
                        classList={{
                          'bg-acid': variant.id === selection().selectedVariantId,
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
                  class="border-ink bg-orange text-ink min-h-12.5 flex-1 cursor-pointer rounded-none border-3 px-4 py-3 font-black transition-transform duration-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none max-md:p-2 max-md:text-[0.82rem]"
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
