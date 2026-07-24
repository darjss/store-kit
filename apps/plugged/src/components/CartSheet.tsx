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
        <article class="border-paper/25 text-paper grid grid-cols-[110px_minmax(0,1fr)] gap-4 border-b-2 py-5 max-md:grid-cols-[80px_minmax(0,1fr)]">
          <Show when={props.item.image}>
            {image => (
              <ProductImage
                class="bg-paper size-27.5 -rotate-1 object-contain max-md:size-20"
                image={image()}
                layout="thumbnail"
              />
            )}
          </Show>
          <div class="min-w-0">
            <a
              class="inline-flex min-h-11 items-center wrap-break-word"
              href={`/products/${props.item.productSlug}`}
            >
              <strong>{props.item.productName}</strong>
            </a>
            <p>{props.item.variantName}</p>
            <strong>{formatMnt(props.item.unitPriceMnt * props.item.quantity)}</strong>
            <For each={validation.corrections()}>
              {correction => (
                <div class="border-ink bg-orange my-2 border-2 p-2">
                  <p>{correction.message}</p>
                  <Show when={correction._tag === 'PriceChanged'}>
                    <small>
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
                      class="border-ink bg-paper mt-2 min-h-11 rounded-none border-2 font-extrabold"
                      onClick={() => validation.applyCorrection(correction)}
                    >
                      Үлдэгдэлд тааруулах
                    </Button>
                  </Show>
                </div>
              )}
            </For>
            <div class="mt-3 flex flex-wrap items-center gap-1">
              <ButtonGroup
                class="border-ink rounded-none border-2"
                aria-label={`${props.item.productName} тоо ширхэг`}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  class="border-paper bg-ink text-paper min-h-11 min-w-11 rounded-none border-0 shadow-none"
                  disabled={validation.blocksQuantityChange()}
                  onClick={validation.decrementQuantity}
                  aria-label={`${props.item.productName} тоог нэгээр хасах`}
                >
                  −
                </Button>
                <output class="grid min-w-10 place-items-center text-center">
                  {props.item.quantity}
                </output>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  class="border-paper bg-ink text-paper min-h-11 min-w-11 rounded-none border-0 border-l-2 shadow-none"
                  disabled={validation.blocksQuantityIncrease()}
                  onClick={validation.incrementQuantity}
                  aria-label={`${props.item.productName} тоог нэгээр нэмэх`}
                >
                  +
                </Button>
              </ButtonGroup>
              <Button
                type="button"
                variant="destructive"
                class="text-paper border-paper bg-ink hover:bg-warning ml-auto min-h-11 min-w-24 gap-2 rounded-none border-2 px-3"
                onClick={validation.removeItem}
                aria-label={`${props.item.productName} сагснаас хасах`}
              >
                <TrashBinTrash aria-hidden="true" size={20} />
                <span>Хасах</span>
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
    <>
      <Sheet.Content
        class="border-paper! bg-petrol! fixed! top-0! right-0! z-50! h-dvh! w-[min(100%,540px)]! max-w-none! gap-0! overflow-y-auto! border-l-[5px]! p-0! shadow-none! outline-none! data-[side=right]:animate-[sheet-in_280ms_var(--ease-paper)]! motion-reduce:animate-none! max-md:inset-0! max-md:w-full! max-md:border-l-0! max-md:data-[side=right]:animate-[sheet-up_280ms_var(--ease-paper)]!"
        showCloseButton={false}
      >
        <div class="border-paper bg-ink text-paper sticky top-0 z-10 flex min-h-17.5 items-center justify-between border-b-4 px-4 py-3">
          <div>
            <p class="text-cyan m-0 text-xs font-black">ACTIVE FILE / CART</p>
            <Sheet.Title class="font-body text-[2rem] leading-none font-black">САГС</Sheet.Title>
          </div>
          <Sheet.Close
            as={Button}
            variant="outline"
            size="icon-lg"
            class="border-paper bg-ink text-paper size-12 rounded-none border-3 text-[2rem]"
            aria-label="Сагс хаах"
          >
            <span aria-hidden="true">×</span>
          </Sheet.Close>
        </div>
        <div class="p-4" aria-busy={validation.isChecking()}>
          <Cart.Empty>
            <div class="grid min-h-[55dvh] place-content-center gap-4 text-center">
              <strong class="font-body text-paper text-[2.5rem] leading-none font-black">
                Сагс хоосон.
              </strong>
              <Button
                as="a"
                variant="outline"
                class="border-paper bg-cyan text-ink min-h-11 rounded-none border-3 font-black"
                href="/products"
              >
                Бараа үзэх →
              </Button>
            </div>
          </Cart.Empty>
          <Cart.ValidationState
            idle={() => <></>}
            checking={() => <></>}
            ready={() => <></>}
            corrections={() => (
              <Alert
                class="border-warning bg-paper-clean mb-4 rounded-none border-4 p-4"
                role="status"
                aria-live="polite"
              >
                <h2
                  class="m-0"
                  ref={element => validation.registerFocusTarget('corrections', element)}
                  tabIndex={-1}
                >
                  Сагсаа засна уу
                </h2>
                <p>Үргэлжлүүлэхийн өмнө доорх өөрчлөлтийг шалгана уу.</p>
              </Alert>
            )}
            transportError={() => (
              <Alert class="border-warning bg-paper-clean mb-4 rounded-none border-4 p-4">
                <h2
                  class="m-0"
                  ref={element => validation.registerFocusTarget('transport', element)}
                  tabIndex={-1}
                >
                  Сагсыг шалгаж чадсангүй.
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  class="border-ink bg-acid min-h-11 rounded-none border-3 font-black"
                  onClick={() => void validation.refresh()}
                >
                  Дахин шалгах
                </Button>
              </Alert>
            )}
            validationError={() => (
              <Alert class="border-warning bg-paper-clean mb-4 rounded-none border-4 p-4">
                <h2
                  class="m-0"
                  ref={element => validation.registerFocusTarget('validation', element)}
                  tabIndex={-1}
                >
                  Сагсны мэдээлэл буруу байна.
                </h2>
                <p>Бараагаа дахин сонгоод шалгана уу.</p>
                <Button
                  type="button"
                  variant="outline"
                  class="border-ink bg-acid min-h-11 rounded-none border-3 font-black"
                  onClick={() => void validation.refresh()}
                >
                  Дахин шалгах
                </Button>
              </Alert>
            )}
          />
          <Cart.Items>{item => <CartLine item={item} />}</Cart.Items>
          <Show when={cartItems().length > 0}>
            <div class="text-paper flex flex-wrap justify-between gap-2 py-5 text-xl">
              <span>Барааны дүн</span>
              <strong>
                {formatMnt(
                  validation.validatedCart()
                    ? (validation.validatedCart()?.subtotalMnt ?? 0)
                    : cartItems().reduce((sum, item) => sum + item.unitPriceMnt * item.quantity, 0),
                )}
              </strong>
            </div>
            <Button
              as="a"
              class="pressable border-paper bg-cyan text-ink sticky bottom-0 min-h-14 w-full rounded-none border-3 px-4 py-3 font-black no-underline motion-reduce:transition-none"
              href="/checkout"
              onClick={continueCheckout}
            >
              Захиалга үргэлжлүүлэх →
            </Button>
          </Show>
        </div>
      </Sheet.Content>
    </>
  )
}
