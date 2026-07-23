/* oxlint-disable tailwindcss/no-unknown-classes */
import type { ProductDetail } from '@store-kit/commerce/catalog'
import { addCartItem, openCart } from '@store-kit/storefront/cart/store'
import { formatMnt } from '@store-kit/storefront/format'
import { clampPurchaseQuantity, maximumPurchaseQuantity } from '@store-kit/storefront/purchase'
import { animate } from 'motion'
import { For, Show, createEffect, createMemo, createSignal, onMount } from 'solid-js'

import { ProductImage } from './ProductImage'

const actionClass =
  'inline-flex min-h-12.5 cursor-pointer items-center justify-center border-3 border-ink bg-orange px-4 py-3 font-black text-ink no-underline transition-transform duration-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'

export function ProductPurchase(props: { product: ProductDetail; mediaBaseUrl: string }) {
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

  onMount(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduced && imageStage)
      animate(imageStage, { opacity: [0, 1], scale: [1.025, 1] }, { duration: 0.2 })
  })

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
    if (imageStage && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animate(imageStage, { opacity: [0, 1], scale: [1.025, 1] }, { duration: 0.2 })
    }
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
      imageR2Key: image()?.r2Key ?? null,
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
        class="bg-orange sticky top-0 grid min-h-[min(700px,72svh)] place-items-center overflow-clip max-md:relative max-md:min-h-[70svh]"
        ref={element => (imageStage = element)}
      >
        <Show when={image()}>
          {item => (
            <ProductImage
              class="h-[90%] w-[90%] object-contain filter-[drop-shadow(0_6px_0_rgb(0_0_0/0.2))] max-md:w-[115%] max-md:max-w-none"
              image={item()}
              layout="detail"
              mediaBaseUrl={props.mediaBaseUrl}
              priority
            />
          )}
        </Show>
      </div>
      <fieldset class="bg-paper m-0 border-0 p-4">
        <legend class="text-xl font-black">Сонголт</legend>
        <For each={props.product.variants}>
          {variant => (
            <label
              class="border-ink has-focus-visible:outline-acid mb-2 grid min-h-14.5 cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 border-3 p-3 has-focus-visible:outline-4 has-focus-visible:outline-offset-3"
              classList={{
                'bg-acid': variant.id === variantId(),
                'opacity-60 line-through': variant.stockQuantity === 0,
              }}
            >
              <input
                type="radio"
                name="variant"
                value={variant.id}
                checked={variant.id === variantId()}
                onChange={() => chooseVariant(variant.id)}
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
      </fieldset>
      <div class="border-ink bg-paper-clean sticky bottom-0 z-10 flex min-w-0 gap-3 border-t-4 p-4 max-[340px]:flex-col max-md:bottom-[calc(68px+env(safe-area-inset-bottom))] max-md:flex-wrap max-md:p-2">
        <div class="border-ink flex border-3 max-[340px]:self-start" aria-label="Тоо ширхэг">
          <button
            class="bg-paper w-12 border-0 font-black max-md:w-11"
            type="button"
            onClick={() => setQuantity(value => Math.max(1, value - 1))}
            aria-label="Нэгээр хасах"
          >
            −
          </button>
          <output class="grid min-w-10 place-items-center font-black">{quantity()}</output>
          <button
            class="bg-paper w-12 border-0 font-black max-md:w-11"
            type="button"
            disabled={quantity() >= maximumQuantity()}
            onClick={() => setQuantity(value => Math.min(maximumQuantity(), value + 1))}
            aria-label={`Нэгээр нэмэх. Дээд хэмжээ ${maximumQuantity()}`}
          >
            +
          </button>
        </div>
        <button
          class={`${actionClass} flex-1 max-md:p-2 max-md:text-[0.82rem]`}
          type="button"
          disabled={!selected() || selected()!.stockQuantity === 0}
          onClick={add}
        >
          Сагсанд нэмэх · {selected() ? formatMnt(selected()!.priceMnt * quantity()) : formatMnt(0)}
        </button>
      </div>
      <p class="sr-only" aria-live="polite">
        {announcement()}
      </p>
    </section>
  )
}
