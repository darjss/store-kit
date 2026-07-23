/* oxlint-disable tailwindcss/no-unknown-classes */
import type { ProductDetail } from '@store-kit/commerce/catalog'
import type { PublicImage } from '@store-kit/contracts'
import { addCartItem, openCart } from '@store-kit/storefront/cart/store'
import { formatMnt } from '@store-kit/storefront/format'
import { clampPurchaseQuantity, maximumPurchaseQuantity } from '@store-kit/storefront/purchase'
import { Button, ButtonGroup, ButtonGroupText, RadioGroup, RadioGroupItem } from '@store-kit/ui'
import { For, Show, createEffect, createMemo, createSignal, onMount } from 'solid-js'

import { ProductImage } from './ProductImage'

type ProductPurchaseImage = PublicImage & Pick<ProductDetail['images'][number], 'id'>
type ProductPurchaseData = Omit<ProductDetail, 'images'> & { images: ProductPurchaseImage[] }

export function ProductPurchase(props: { product: ProductPurchaseData }) {
  const initial =
    props.product.variants.find(variant => variant.stockQuantity > 0) ?? props.product.variants[0]
  const [variantId, setVariantId] = createSignal(initial?.id ?? '')
  const [quantity, setQuantity] = createSignal(1)
  const [announcement, setAnnouncement] = createSignal('')
  const selected = createMemo(() =>
    props.product.variants.find(variant => variant.id === variantId()),
  )
  const maximumQuantity = createMemo(() => maximumPurchaseQuantity(selected()?.stockQuantity ?? 0))
  const image = createMemo(() => {
    const variant = selected()
    const linked = variant?.imageLinks[0]
    return props.product.images.find(item => item.id === linked?.imageId) ?? props.product.images[0]
  })
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

  createEffect(() => {
    const current = quantity()
    const maximum = maximumQuantity()
    const clamped = clampPurchaseQuantity(current, selected()?.stockQuantity ?? 0)
    if (clamped === current) return

    setQuantity(clamped)
    if (maximum > 0 && current > maximum)
      setAnnouncement(`Энэ сонголтоос ${maximum} ширхэг үлдсэн байна.`)
  })

  const chooseVariant = (id: string) => {
    setVariantId(id)
    animateImageStage()
  }

  const add = () => {
    const variant = selected()
    if (!variant || variant.stockQuantity === 0) return
    addCartItem({
      variantId: variant.id,
      quantity: quantity(),
      productSlug: props.product.slug,
      productName: props.product.name,
      variantName: variant.name,
      options: variant.options,
      imageR2Key: image()?.url ?? null,
      imageWidth: image()?.width ?? null,
      imageHeight: image()?.height ?? null,
      imageAlt: image()?.alt ?? null,
      unitPriceMnt: variant.priceMnt,
    })
    setAnnouncement(`${props.product.name} сагсанд нэмэгдлээ.`)
    openCart()
  }

  return (
    <section class="contents" aria-label="Барааны сонголт">
      <div
        class="bg-orange sticky top-0 grid min-h-[min(700px,72svh)] place-items-center overflow-clip max-md:relative max-md:min-h-[52svh]"
        ref={element => (imageStage = element)}
      >
        <Show when={image()}>
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
        <RadioGroup value={variantId()} onChange={chooseVariant}>
          <For each={props.product.variants}>
            {variant => (
              <label
                class="border-ink has-focus-visible:outline-acid mb-2 grid min-h-14.5 cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 border-3 p-3 has-focus-visible:outline-4 has-focus-visible:outline-offset-3"
                classList={{
                  'bg-acid': variant.id === variantId(),
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
          </For>
        </RadioGroup>
      </fieldset>
      <div class="border-ink bg-paper-clean sticky bottom-0 z-10 flex min-w-0 gap-3 border-t-4 p-4 max-[340px]:flex-col max-md:bottom-[calc(68px+env(safe-area-inset-bottom))] max-md:flex-wrap max-md:p-2">
        <ButtonGroup class="max-[340px]:self-start" aria-label="Тоо ширхэг">
          <Button
            class="border-ink bg-paper h-auto w-12 rounded-none border-3 font-black max-md:w-11"
            type="button"
            variant="outline"
            onClick={() => setQuantity(value => Math.max(1, value - 1))}
            aria-label="Нэгээр хасах"
          >
            −
          </Button>
          <ButtonGroupText class="border-ink bg-paper min-w-10 justify-center border-y-3 font-black">
            <output>{quantity()}</output>
          </ButtonGroupText>
          <Button
            class="border-ink bg-paper h-auto w-12 rounded-none border-3 font-black max-md:w-11"
            type="button"
            variant="outline"
            disabled={quantity() >= maximumQuantity()}
            onClick={() => setQuantity(value => Math.min(maximumQuantity(), value + 1))}
            aria-label={`Нэгээр нэмэх. Дээд хэмжээ ${maximumQuantity()}`}
          >
            +
          </Button>
        </ButtonGroup>
        <Button
          class="border-ink bg-orange text-ink min-h-12.5 flex-1 cursor-pointer rounded-none border-3 px-4 py-3 font-black transition-transform duration-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none max-md:p-2 max-md:text-[0.82rem]"
          type="button"
          disabled={!selected() || selected()?.stockQuantity === 0}
          onClick={add}
        >
          Сагсанд нэмэх · {formatMnt((selected()?.priceMnt ?? 0) * quantity())}
        </Button>
      </div>
      <p class="sr-only" aria-live="polite">
        {announcement()}
      </p>
    </section>
  )
}
