/* oxlint-disable tailwindcss/no-unknown-classes, eslint/no-underscore-dangle */
import { TrashBinTrash } from '@solar-icons/solid/Outline'
import type { CartCorrection } from '@store-kit/contracts/cart'
import { Cart } from '@store-kit/storefront/cart/components'
import {
  cartItems,
  isCartOpen,
  openCart,
  refreshCartItemSnapshots,
  removeCartItem,
  setCartItemQuantity,
} from '@store-kit/storefront/cart/store'
import type { PersistedCartItem } from '@store-kit/storefront/cart/store'
import { formatMnt } from '@store-kit/storefront/format'
import { cartQuery } from '@store-kit/storefront/query-options/cart'
import { useQueryResult } from '@store-kit/storefront/query-options/result'
import { Alert, Button, ButtonGroup, Sheet } from '@store-kit/ui'
import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js'

import { ProductImage } from './ProductImage'

function CartLine(props: { item: PersistedCartItem; corrections: CartCorrection[] }) {
  const blocksQuantityChange = () =>
    props.corrections.some(
      correction => correction._tag === 'InactiveVariant' || correction._tag === 'MissingVariant',
    )
  const blocksQuantityIncrease = () =>
    props.item.quantity >= 10 ||
    props.corrections.some(correction => correction._tag !== 'PriceChanged')

  return (
    <article class="border-ink grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b-3 py-4 max-md:grid-cols-[80px_minmax(0,1fr)]">
      <Show when={props.item.image}>
        {image => (
          <ProductImage
            class="bg-paper-clean size-27.5 object-contain max-md:size-20"
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
        <For each={props.corrections}>
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
                when={correction._tag === 'InsufficientStock' && correction.availableQuantity > 0}
              >
                <Button
                  type="button"
                  variant="outline"
                  class="border-ink bg-paper mt-2 min-h-11 rounded-none border-2 font-extrabold"
                  onClick={() =>
                    correction._tag === 'InsufficientStock' &&
                    setCartItemQuantity(props.item.variantId, correction.availableQuantity)
                  }
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
              class="border-ink bg-paper-clean min-h-11 min-w-11 rounded-none border-0 shadow-none"
              disabled={blocksQuantityChange()}
              onClick={() =>
                setCartItemQuantity(props.item.variantId, Math.max(1, props.item.quantity - 1))
              }
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
              class="border-ink bg-paper-clean min-h-11 min-w-11 rounded-none border-0 border-l-2 shadow-none"
              disabled={blocksQuantityIncrease()}
              onClick={() => setCartItemQuantity(props.item.variantId, props.item.quantity + 1)}
              aria-label={`${props.item.productName} тоог нэгээр нэмэх`}
            >
              +
            </Button>
          </ButtonGroup>
          <Button
            type="button"
            variant="destructive"
            class="text-warning border-ink bg-paper-clean hover:bg-paper ml-auto min-h-11 min-w-24 gap-2 rounded-none border-2 px-3"
            onClick={() => removeCartItem(props.item.variantId)}
            aria-label={`${props.item.productName} сагснаас хасах`}
          >
            <TrashBinTrash aria-hidden="true" size={20} />
            <span>Хасах</span>
          </Button>
        </div>
      </div>
    </article>
  )
}

export function CartSheet(props: { initialOpen: boolean }) {
  const validation = useQueryResult(() => ({
    ...cartQuery.validate([...cartItems()]),
    enabled: cartItems().length > 0 && isCartOpen(),
    staleTime: 15_000,
  }))
  const [transportMessage, setTransportMessage] = createSignal('')
  let correctionHeading: HTMLHeadingElement | undefined = undefined

  onMount(() => {
    if (props.initialOpen) openCart()

    const handler = () => {
      setTransportMessage('Сүлжээ тасалдлаа. Дахин оролдоно уу.')
      window.setTimeout(() => setTransportMessage(''), 4000)
    }
    window.addEventListener('storefront:transport-error', handler)
    onCleanup(() => window.removeEventListener('storefront:transport-error', handler))
  })

  createEffect(() => {
    const result = validation.data
    if (result?.status !== 'ok') return
    refreshCartItemSnapshots(
      result.value.lines.map(line => ({
        variantId: line.variantId,
        productSlug: line.productSlug,
        productName: line.productName,
        variantName: line.variantName,
        options: line.options,
        image: line.image,
        unitPriceMnt: line.unitPriceMnt,
      })),
    )
  })

  const correctionsFor = (variantId: string) => {
    const result = validation.data
    return result?.status === 'ok'
      ? result.value.corrections.filter(correction => correction.variantId === variantId)
      : []
  }

  const continueCheckout = async (event: MouseEvent) => {
    event.preventDefault()
    const result = await validation.refetch()
    if (result.data?.status === 'ok' && result.data.value.corrections.length === 0) {
      window.location.assign('/checkout')
      return
    }
    if (!result.data || result.data.status === 'error') {
      setTransportMessage('Сагсыг шалгаж чадсангүй. Дахин оролдоно уу.')
      return
    }
    correctionHeading?.focus()
  }

  return (
    <>
      <Sheet.Content
        class="border-ink! bg-paper! fixed! top-0! right-0! z-50! h-dvh! w-[min(100%,500px)]! max-w-none! gap-0! overflow-y-auto! border-l-[5px]! p-0! shadow-none! outline-none! data-[side=right]:animate-[sheet-in_280ms_var(--ease-slam)]! motion-reduce:animate-none! max-md:inset-0! max-md:w-full! max-md:border-l-0! max-md:data-[side=right]:animate-[sheet-up_280ms_var(--ease-slam)]!"
        showCloseButton={false}
      >
        <div class="border-ink bg-orange flex min-h-17.5 items-center justify-between border-b-4 px-4 py-3">
          <Sheet.Title class="font-display text-[3rem] leading-[0.8]">САГС / BAG</Sheet.Title>
          <Sheet.Close
            as={Button}
            variant="outline"
            size="icon-lg"
            class="border-ink bg-paper size-12 rounded-none border-3 text-[2rem]"
            aria-label="Сагс хаах"
          >
            <span aria-hidden="true">×</span>
          </Sheet.Close>
        </div>
        <div class="p-4" aria-busy={validation.isFetching}>
          <Cart.Empty>
            <div class="grid min-h-[55dvh] place-content-center gap-4 text-center">
              <strong class="font-display text-[4rem] leading-[0.8]">Сагс хоосон.</strong>
              <Button
                as="a"
                variant="outline"
                class="border-ink bg-paper-clean min-h-11 rounded-none border-3 font-black"
                href="/products"
              >
                Бараа үзэх →
              </Button>
            </div>
          </Cart.Empty>
          <Show
            when={validation.data?.status === 'ok' && validation.data.value.corrections.length > 0}
          >
            <Alert
              class="border-warning bg-paper-clean mb-4 rounded-none border-4 p-4"
              role="status"
              aria-live="polite"
            >
              <h2 class="m-0" ref={element => (correctionHeading = element)} tabIndex={-1}>
                Сагсаа засна уу
              </h2>
              <p>Үргэлжлүүлэхийн өмнө доорх өөрчлөлтийг шалгана уу.</p>
            </Alert>
          </Show>
          <Show when={validation.isError}>
            <Alert class="border-warning bg-paper-clean mb-4 rounded-none border-4 p-4">
              <p>Сагсыг шалгаж чадсангүй.</p>
              <Button
                type="button"
                variant="outline"
                class="border-ink bg-acid min-h-11 rounded-none border-3 font-black"
                onClick={() => void validation.refetch()}
              >
                Дахин шалгах
              </Button>
            </Alert>
          </Show>
          <Cart.Items>
            {item => <CartLine item={item} corrections={correctionsFor(item.variantId)} />}
          </Cart.Items>
          <Show when={cartItems().length > 0}>
            <div class="flex flex-wrap justify-between gap-2 py-4 text-xl">
              <span>Барааны дүн</span>
              <strong>
                {formatMnt(
                  validation.data?.status === 'ok'
                    ? validation.data.value.subtotalMnt
                    : cartItems().reduce((sum, item) => sum + item.unitPriceMnt * item.quantity, 0),
                )}
              </strong>
            </div>
            <Button
              as="a"
              class="border-ink bg-orange text-ink min-h-12.5 w-full rounded-none border-3 px-4 py-3 font-black no-underline transition-transform duration-100 active:scale-[0.97] motion-reduce:transition-none"
              href="/checkout"
              onClick={continueCheckout}
            >
              Захиалга үргэлжлүүлэх →
            </Button>
          </Show>
        </div>
      </Sheet.Content>
      <Show when={transportMessage()}>
        <div
          class="border-orange bg-ink text-paper fixed bottom-24 left-1/2 z-60 w-[min(90%,420px)] -translate-x-1/2 border-3 px-4 py-3"
          role="status"
        >
          {transportMessage()}
        </div>
      </Show>
    </>
  )
}
