/* oxlint-disable tailwindcss/no-unknown-classes */
import { formatMnt } from '@store-kit/storefront/format'
import { ProductPurchase } from '@store-kit/storefront/purchase'
import type {
  ProductPurchaseSelection,
  PurchaseAnnouncement,
  PurchasableProduct,
} from '@store-kit/storefront/purchase'
import { Button, ButtonGroup, cn } from '@store-kit/ui'
import { For, Show } from 'solid-js'

import { ProductImage } from './ProductImage'

export type PurchaseVariant = PurchasableProduct['variants'][number]

export type PurchasePanelProduct = Omit<PurchasableProduct, 'variants'> & {
  variants: (PurchaseVariant & {
    compareAtPriceMnt?: number | null
  })[]
}

const stockNote = (stockQuantity: number) => {
  if (stockQuantity === 0) return 'Дууссан'
  if (stockQuantity <= 3) return `Сүүлийн ${stockQuantity}`
  return 'Бэлэн'
}

const compareSavings = (price: number, compareAt?: number | null) =>
  compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0

const announcementText = (announcement: PurchaseAnnouncement | undefined) => {
  if (!announcement) return ''
  if (announcement.type === 'quantity-clamped')
    return `Хамгийн ихдээ ${announcement.maximum} ширхэг захиална.`
  return `${announcement.productName} сагсанд нэмэгдлээ.`
}

function OptionGroup(props: {
  selection: () => ProductPurchaseSelection
  variants: PurchasePanelProduct['variants']
  optionKey: string
}) {
  const values = () => {
    const seen = new Set<string>()
    for (const variant of props.variants) {
      const value = variant.options[props.optionKey]
      if (value) seen.add(value)
    }
    return [...seen]
  }

  const pick = (value: string) => {
    const current = props.selection().selectedVariant
    const others = (variant: PurchasePanelProduct['variants'][number]) =>
      Object.keys(variant.options).every(
        key => key === props.optionKey || !current || variant.options[key] === current.options[key],
      )
    const preferred =
      props.variants.find(
        variant =>
          variant.options[props.optionKey] === value &&
          others(variant) &&
          variant.stockQuantity > 0,
      ) ??
      props.variants.find(
        variant => variant.options[props.optionKey] === value && others(variant),
      ) ??
      props.variants.find(variant => variant.options[props.optionKey] === value)
    if (preferred) props.selection().selectVariant(preferred.id)
  }

  return (
    <fieldset class="border-0 p-0">
      <legend class="text-sm font-bold">
        {props.optionKey}
        <span class="ml-2 font-normal text-muted">
          {props.selection().selectedVariant?.options[props.optionKey]}
        </span>
      </legend>
      <div class="mt-2 flex flex-wrap gap-2">
        <For each={values()}>
          {value => {
            const available = () =>
              props.variants.some(
                variant => variant.options[props.optionKey] === value && variant.stockQuantity > 0,
              )
            const chosen = () =>
              props.selection().selectedVariant?.options[props.optionKey] === value
            return (
              <button
                type="button"
                class={cn(
                  'border-line rounded-action min-h-11 border px-4 text-sm font-bold transition-colors',
                  chosen()
                    ? 'text-on-accent border-accent bg-accent'
                    : 'bg-panel hover:border-ink/40',
                  !available() && 'text-muted line-through opacity-60',
                )}
                disabled={!available()}
                aria-pressed={chosen()}
                onClick={() => pick(value)}
              >
                {value}
              </button>
            )
          }}
        </For>
      </div>
    </fieldset>
  )
}

export function PurchasePanel(props: { product: PurchasePanelProduct }) {
  const optionKeys = (() => {
    const keys = new Set<string>()
    for (const variant of props.product.variants) {
      for (const key of Object.keys(variant.options)) keys.add(key)
    }
    return [...keys]
  })()

  return (
    <ProductPurchase.Root product={props.product}>
      <ProductPurchase.Selection>
        {selection => {
          const variant = () => selection().selectedVariant
          const compareAtOf = () =>
            (props.product.variants as PurchasePanelProduct['variants']).find(
              item => item.id === variant()?.id,
            )?.compareAtPriceMnt
          const stock = () => variant()?.stockQuantity ?? 0
          const savings = () => (variant() ? compareSavings(variant()!.priceMnt, compareAtOf()) : 0)
          return (
            <section class="grid gap-8 md:grid-cols-2 md:gap-12" aria-label="Барааны сонголт">
              <div>
                <div class="bg-panel border-line rounded-action overflow-hidden border">
                  <Show when={selection().selectedImage}>
                    {image => (
                      <ProductImage
                        class="aspect-4/5 w-full object-cover"
                        image={image()}
                        layout="detail"
                        priority
                      />
                    )}
                  </Show>
                </div>
                <Show when={props.product.images.length > 1}>
                  <div class="mt-3 grid grid-cols-5 gap-2">
                    <For each={props.product.images}>
                      {image => (
                        <button
                          type="button"
                          class={cn(
                            'border-line bg-panel rounded-action overflow-hidden border transition-colors',
                            selection().selectedImage?.id === image.id && 'border-2 border-accent',
                          )}
                          aria-label={`${props.product.name} зургийг солих`}
                          onClick={() => selection().selectImage(image.id)}
                        >
                          <ProductImage
                            class="aspect-4/5 w-full object-cover"
                            image={image}
                            layout="thumbnail"
                          />
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </div>

              <div class="md:sticky md:top-32 md:self-start">
                <h1 class="m-0 text-3xl leading-tight font-extrabold tracking-tight wrap-break-word md:text-4xl">
                  {props.product.name}
                </h1>
                <div class="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <strong class="font-number text-2xl md:text-3xl">
                    {formatMnt(variant()?.priceMnt ?? 0)}
                  </strong>
                  <Show when={savings() > 0 && compareAtOf() != null}>
                    <s class="font-number text-lg text-muted">{formatMnt(compareAtOf() ?? 0)}</s>
                    <span class="text-on-accent rounded-action bg-accent px-2 py-0.5 text-xs font-extrabold">
                      −{savings()}%
                    </span>
                  </Show>
                </div>
                <p
                  class={cn(
                    'm-0 mt-2 text-sm font-bold',
                    stock() === 0 ? 'text-muted' : stock() <= 3 ? 'text-accent' : 'text-muted',
                  )}
                >
                  {stockNote(stock())}
                </p>

                <div class="mt-6 space-y-5">
                  <For each={optionKeys}>
                    {key => (
                      <OptionGroup
                        selection={selection}
                        variants={props.product.variants}
                        optionKey={key}
                      />
                    )}
                  </For>

                  <fieldset class="border-0 p-0">
                    <legend class="text-sm font-bold">Тоо ширхэг</legend>
                    <div class="mt-2 flex items-center gap-3">
                      <ButtonGroup
                        class="border-line rounded-action border"
                        aria-label="Тоо ширхэг"
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-lg"
                          class="rounded-action min-h-11 min-w-11 border-0 font-extrabold shadow-none"
                          disabled={selection().quantity <= 1 || stock() === 0}
                          onClick={() => selection().decrementQuantity()}
                          aria-label="Тоог нэгээр хасах"
                        >
                          −
                        </Button>
                        <output class="font-number grid min-w-10 place-items-center text-center font-bold">
                          {selection().quantity}
                        </output>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-lg"
                          class="rounded-action min-h-11 min-w-11 border-0 font-extrabold shadow-none"
                          disabled={
                            selection().quantity >= selection().maximumQuantity || stock() === 0
                          }
                          onClick={() => selection().incrementQuantity()}
                          aria-label="Тоог нэгээр нэмэх"
                        >
                          +
                        </Button>
                      </ButtonGroup>
                      <span class="text-sm text-muted">
                        Нэг захиалгад {selection().maximumQuantity}-аас ихгүй
                      </span>
                    </div>
                  </fieldset>

                  <Button
                    type="button"
                    class="text-on-accent hover:bg-accent-strong rounded-action disabled:bg-panel min-h-14 w-full bg-accent px-6 text-base font-bold shadow-none disabled:text-muted max-md:fixed max-md:right-4 max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom))] max-md:left-4 max-md:z-30 max-md:w-auto max-md:shadow-lg"
                    disabled={stock() === 0 || !variant()}
                    onClick={() => selection().addToCart()}
                  >
                    {stock() === 0 ? 'Дууссан' : 'Сагсанд нэмэх'}
                  </Button>
                </div>

                <ProductPurchase.Announcement>
                  {announcement => (
                    <p class="sr-only" aria-live="polite">
                      {announcementText(announcement())}
                    </p>
                  )}
                </ProductPurchase.Announcement>
              </div>
            </section>
          )
        }}
      </ProductPurchase.Selection>
    </ProductPurchase.Root>
  )
}
