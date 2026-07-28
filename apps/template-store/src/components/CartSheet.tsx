/* oxlint-disable tailwindcss/no-unknown-classes, eslint/no-underscore-dangle */
import { TrashBinTrash } from '@solar-icons/solid/Outline'
import { Cart } from '@store-kit/storefront/cart/components'
import { cartItems, openCart } from '@store-kit/storefront/cart/store'
import type { PersistedCartItem } from '@store-kit/storefront/cart/store'
import { useCartValidation } from '@store-kit/storefront/cart/validation'
import { formatMnt } from '@store-kit/storefront/format'
import { Alert, Button, ButtonGroup, Sheet } from '@store-kit/ui'
import { For, Show, onMount } from 'solid-js'

import { ProductImage } from './ProductImage'

function CartLine(props: { item: PersistedCartItem }) {
  return (
    <Cart.ItemValidation item={props.item}>
      {validation => (
        <article class="border-line grid grid-cols-[84px_minmax(0,1fr)] gap-4 border-b py-4">
          <Show when={props.item.image}>
            {image => (
              <a href={`/products/${props.item.productSlug}`} tabIndex={-1} aria-hidden="true">
                <ProductImage
                  class="bg-surface rounded-action aspect-4/5 w-21 object-cover"
                  image={image()}
                  layout="thumbnail"
                />
              </a>
            )}
          </Show>
          <div class="min-w-0">
            <a
              class="inline-flex min-h-11 items-center font-bold wrap-break-word hover:text-accent"
              href={`/products/${props.item.productSlug}`}
            >
              {props.item.productName}
            </a>
            <p class="m-0 text-sm text-muted">{props.item.variantName}</p>
            <For each={validation.corrections()}>
              {correction => (
                <div class="rounded-action mt-2 border border-accent p-2.5 text-sm">
                  <p class="m-0 font-bold">{correction.message}</p>
                  <Show when={correction._tag === 'PriceChanged'}>
                    <small class="text-muted">
                      Хуучин:{' '}
                      {formatMnt(
                        correction._tag === 'PriceChanged' ? correction.previousUnitPriceMnt : 0,
                      )}{' '}
                      · Одоо: {formatMnt(props.item.unitPriceMnt)}
                    </small>
                  </Show>
                  <Show
                    when={
                      correction._tag === 'InsufficientStock' && correction.availableQuantity > 0
                    }
                  >
                    <Button
                      type="button"
                      variant="outline"
                      class="border-line bg-panel rounded-action mt-2 min-h-11 font-bold"
                      onClick={() => validation.applyCorrection(correction)}
                    >
                      Үлдэгдэлд тааруулах
                    </Button>
                  </Show>
                </div>
              )}
            </For>
            <div class="mt-2.5 flex flex-wrap items-center gap-2">
              <ButtonGroup
                class="border-line rounded-action border"
                aria-label={`${props.item.productName} тоо ширхэг`}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  class="rounded-action min-h-10 min-w-10 border-0 font-extrabold shadow-none"
                  disabled={validation.blocksQuantityChange()}
                  onClick={validation.decrementQuantity}
                  aria-label={`${props.item.productName} тоог нэгээр хасах`}
                >
                  −
                </Button>
                <output class="font-number grid min-w-9 place-items-center text-center font-bold">
                  {props.item.quantity}
                </output>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  class="rounded-action min-h-10 min-w-10 border-0 font-extrabold shadow-none"
                  disabled={validation.blocksQuantityIncrease()}
                  onClick={validation.incrementQuantity}
                  aria-label={`${props.item.productName} тоог нэгээр нэмэх`}
                >
                  +
                </Button>
              </ButtonGroup>
              <strong class="font-number ml-auto">
                {formatMnt(props.item.unitPriceMnt * props.item.quantity)}
              </strong>
              <Button
                type="button"
                variant="ghost"
                class="hover:text-ink rounded-action min-h-10 gap-1.5 px-2 text-muted"
                onClick={validation.removeItem}
                aria-label={`${props.item.productName} сагснаас хасах`}
              >
                <TrashBinTrash aria-hidden="true" size={18} />
                <span class="text-sm">Хасах</span>
              </Button>
            </div>
          </div>
        </article>
      )}
    </Cart.ItemValidation>
  )
}

export function CartSheet(props: { initialOpen: boolean }) {
  const validation = useCartValidation()

  onMount(() => {
    if (props.initialOpen) openCart()
  })

  const continueCheckout = async (event: MouseEvent) => {
    event.preventDefault()
    if (await validation.gateCheckout()) window.location.assign('/checkout')
  }

  return (
    <Sheet.Content
      class="bg-panel! text-ink! border-line! fixed! top-0! right-0! z-50! h-dvh! w-[min(100%,480px)]! max-w-none! gap-0! overflow-y-auto! border-l! p-0! shadow-2xl! outline-none! motion-reduce:animate-none! max-md:inset-x-0! max-md:top-auto! max-md:bottom-0! max-md:h-[85dvh]! max-md:w-full! max-md:rounded-t-2xl! max-md:border-l-0!"
      showCloseButton={false}
    >
      <div class="border-line bg-panel sticky top-0 z-10 flex min-h-16 items-center justify-between border-b px-4 py-3">
        <div>
          <p class="m-0 text-[0.7rem] font-bold tracking-widest text-muted uppercase">
            Захиалгын төлөвлөгөө
          </p>
          <Sheet.Title class="text-ink! m-0 text-xl font-extrabold tracking-tight">
            Сагс
          </Sheet.Title>
        </div>
        <Sheet.Close
          as={Button}
          variant="outline"
          size="icon-lg"
          class="border-line! bg-panel! text-ink! rounded-action! size-11 border text-xl"
          aria-label="Сагс хаах"
        >
          <span aria-hidden="true">×</span>
        </Sheet.Close>
      </div>
      <div class="p-4" aria-busy={validation.isChecking()}>
        <Cart.Empty>
          <div class="grid min-h-[60dvh] place-content-center gap-4 text-center">
            <strong class="text-2xl font-extrabold">Сагс хоосон байна.</strong>
            <p class="m-0 text-sm text-muted">Таалагдсан бараагаа энд нэмнэ үү.</p>
            <Button
              as="a"
              class="text-on-accent rounded-action min-h-12 bg-accent px-6 font-bold no-underline"
              href="/products"
            >
              Бараа үзэх
            </Button>
          </div>
        </Cart.Empty>
        <Cart.ValidationState
          idle={() => <></>}
          checking={() => <></>}
          ready={() => <></>}
          corrections={() => (
            <Alert
              class="bg-surface rounded-action mb-4 border border-accent p-4"
              role="status"
              aria-live="polite"
            >
              <h2
                class="m-0 text-base font-extrabold"
                ref={element => validation.registerFocusTarget('corrections', element)}
                tabIndex={-1}
              >
                Сагсаа шалгана уу
              </h2>
              <p class="mt-1 mb-0 text-sm text-muted">
                Үргэлжлүүлэхээсээ өмнө доорх өөрчлөлтийг баталгаажуулна уу.
              </p>
            </Alert>
          )}
          transportError={() => (
            <Alert class="bg-surface rounded-action mb-4 border border-accent p-4">
              <h2
                class="m-0 text-base font-extrabold"
                ref={element => validation.registerFocusTarget('transport', element)}
                tabIndex={-1}
              >
                Сагсыг шалгаж чадсангүй.
              </h2>
              <Button
                type="button"
                variant="outline"
                class="border-line bg-panel rounded-action mt-2 min-h-11 font-bold"
                onClick={() => void validation.refresh()}
              >
                Дахин шалгах
              </Button>
            </Alert>
          )}
          validationError={() => (
            <Alert class="bg-surface rounded-action mb-4 border border-accent p-4">
              <h2
                class="m-0 text-base font-extrabold"
                ref={element => validation.registerFocusTarget('validation', element)}
                tabIndex={-1}
              >
                Сагсны мэдээлэл буруу байна.
              </h2>
              <p class="mt-1 mb-0 text-sm text-muted">Бараагаа дахин сонгоод шалгана уу.</p>
              <Button
                type="button"
                variant="outline"
                class="border-line bg-panel rounded-action mt-2 min-h-11 font-bold"
                onClick={() => void validation.refresh()}
              >
                Дахин шалгах
              </Button>
            </Alert>
          )}
        />
        <Cart.Items>{item => <CartLine item={item} />}</Cart.Items>
        <Show when={cartItems().length > 0}>
          <div class="flex flex-wrap justify-between gap-2 py-4 text-lg font-bold">
            <span>Барааны дүн</span>
            <strong class="font-number">
              {formatMnt(
                validation.validatedCart()
                  ? (validation.validatedCart()?.subtotalMnt ?? 0)
                  : cartItems().reduce((sum, item) => sum + item.unitPriceMnt * item.quantity, 0),
              )}
            </strong>
          </div>
          <Button
            as="a"
            class="text-on-accent hover:bg-accent-strong rounded-action sticky bottom-0 min-h-14 w-full bg-accent px-4 py-3 text-base font-bold no-underline shadow-lg motion-reduce:transition-none"
            href="/checkout"
            onClick={continueCheckout}
          >
            Захиалга үргэлжлүүлэх →
          </Button>
          <p class="mt-3 mb-0 text-center text-xs text-muted">
            Хүргэлтийн хөлс болон нийт дүнг төлбөрийн алхамд харуулна.
          </p>
        </Show>
      </div>
    </Sheet.Content>
  )
}
