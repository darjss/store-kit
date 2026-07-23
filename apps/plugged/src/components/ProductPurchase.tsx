/* oxlint-disable tailwindcss/no-unknown-classes */
import type { ProductDetail } from '@store-kit/commerce/catalog'
import { addCartItem, openCart } from '@store-kit/storefront/cart/store'
import { animate } from 'motion'
import { For, Show, createMemo, createSignal, onMount } from 'solid-js'

const money = new Intl.NumberFormat('mn-MN')

export function ProductPurchase(props: { product: ProductDetail; mediaBaseUrl: string }) {
  const initial =
    props.product.variants.find(variant => variant.stockQuantity > 0) ?? props.product.variants[0]
  const [variantId, setVariantId] = createSignal(initial?.id ?? '')
  const [quantity, setQuantity] = createSignal(1)
  const [announcement, setAnnouncement] = createSignal('')
  const imageUrl = (key: string) => new URL(key, props.mediaBaseUrl).toString()
  const selected = createMemo(() =>
    props.product.variants.find(variant => variant.id === variantId()),
  )
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
      unitPriceMnt: variant.priceMnt,
    })
    setAnnouncement(`${props.product.name} сагсанд нэмэгдлээ.`)
    openCart()
  }

  return (
    <section class="purchase-owner" aria-label="Барааны сонголт">
      <div class="variant-stage" ref={element => (imageStage = element)}>
        <Show when={image()}>
          {item => <img src={imageUrl(item().r2Key)} alt={item().alt ?? props.product.name} />}
        </Show>
      </div>
      <fieldset class="variant-options">
        <legend>Сонголт</legend>
        <For each={props.product.variants}>
          {variant => (
            <label
              classList={{
                selected: variant.id === variantId(),
                unavailable: variant.stockQuantity === 0,
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
              <strong>{money.format(variant.priceMnt)} ₮</strong>
              <small>
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
      <div class="purchase-bar">
        <div class="quantity" aria-label="Тоо ширхэг">
          <button
            type="button"
            onClick={() => setQuantity(value => Math.max(1, value - 1))}
            aria-label="Нэгээр хасах"
          >
            −
          </button>
          <output>{quantity()}</output>
          <button
            type="button"
            onClick={() => setQuantity(value => Math.min(10, value + 1))}
            aria-label="Нэгээр нэмэх"
          >
            +
          </button>
        </div>
        <button
          class="slam-button"
          type="button"
          disabled={!selected() || selected()!.stockQuantity === 0}
          onClick={add}
        >
          Сагсанд нэмэх · {selected() ? money.format(selected()!.priceMnt * quantity()) : 0} ₮
        </button>
      </div>
      <p class="sr-only" aria-live="polite">
        {announcement()}
      </p>
    </section>
  )
}
