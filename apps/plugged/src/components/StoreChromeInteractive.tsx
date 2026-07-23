import { TrashBinTrash } from '@solar-icons/solid/Outline'
import { Cart } from '@store-kit/storefront/cart/components'
import {
  cartItemCount,
  cartItems,
  isCartOpen,
  openCart,
  refreshCartItemSnapshots,
  removeCartItem,
  setCartItemQuantity,
} from '@store-kit/storefront/cart/store'
import { formatMnt } from '@store-kit/storefront/format'
import { createStorefrontQueryClient } from '@store-kit/storefront/query-client'
import { cartQuery } from '@store-kit/storefront/query-options/cart'
import { catalogQuery } from '@store-kit/storefront/query-options/catalog'
import { useQueryResult } from '@store-kit/storefront/query-options/result'
/* oxlint-disable tailwindcss/no-unknown-classes, eslint/no-underscore-dangle */
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Button,
  Input,
  Sheet,
} from '@store-kit/ui'
import { QueryClientProvider } from '@tanstack/solid-query'
import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createSignal,
  lazy,
  onCleanup,
  onMount,
} from 'solid-js'

import { ProductImage } from './ProductImage'

const StoreIcon = lazy(() => import('./StoreIcon'))
const navClass =
  'fixed top-[0.45rem] right-3 z-30 flex border-3 border-ink bg-paper-clean text-ink max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:grid max-md:min-h-[calc(68px+env(safe-area-inset-bottom))] max-md:grid-cols-4 max-md:border-0 max-md:border-t-4 max-md:border-orange max-md:bg-ink max-md:pb-[env(safe-area-inset-bottom)] max-md:text-paper'
const navLinkClass =
  'relative hidden min-h-11 min-w-24 place-items-center content-center border-0 border-r border-white/25 bg-transparent px-2 py-1 text-center leading-tight text-inherit no-underline [overflow-wrap:anywhere] max-md:grid max-md:min-h-16 max-md:min-w-0 max-md:px-1 [&_small]:max-w-full [&_small]:font-extrabold [&_small]:[overflow-wrap:anywhere]'
const navTriggerClass =
  'relative grid min-h-11 min-w-24 place-items-center content-center border-0 border-r border-white/25 bg-transparent px-2 py-1 text-center leading-tight text-inherit no-underline [overflow-wrap:anywhere] max-md:min-h-16 max-md:min-w-0 max-md:px-1 [&_small]:max-w-full [&_small]:font-extrabold [&_small]:[overflow-wrap:anywhere]'
const actionClass =
  'inline-flex min-h-12.5 cursor-pointer items-center justify-center border-3 border-ink bg-orange px-4 py-3 font-black text-ink no-underline transition-transform duration-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'
const errorPanelClass =
  'mb-4 border-4 border-warning bg-paper-clean p-4 [&_button]:min-h-11 [&_button]:cursor-pointer [&_button]:border-3 [&_button]:border-ink [&_button]:bg-acid [&_button]:px-3 [&_button]:py-2 [&_button]:font-black'
const searchPromptClass = 'm-0 grid min-h-48 place-items-center text-center text-xl font-extrabold'

function Search(props: { initialOpen: boolean }) {
  const [open, setOpen] = createSignal(props.initialOpen)
  const [queryText, setQueryText] = createSignal('')
  const [debouncedQuery, setDebouncedQuery] = createSignal('')
  const [input, setInput] = createSignal<HTMLInputElement>()
  let trigger: HTMLButtonElement | undefined = undefined

  onMount(() => {
    if (props.initialOpen) requestAnimationFrame(() => input()?.focus())
  })

  createEffect(() => {
    const value = queryText().trim()
    const timer = window.setTimeout(() => setDebouncedQuery(value), 250)
    onCleanup(() => window.clearTimeout(timer))
  })

  const results = useQueryResult(() => ({
    ...catalogQuery.findAllProducts({ query: debouncedQuery(), limit: 8 }),
    enabled: debouncedQuery().length > 1,
  }))

  const setDialogOpen = (value: boolean) => {
    setOpen(value)
    if (!value) requestAnimationFrame(() => trigger?.focus())
  }

  return (
    <Dialog open={open()} onOpenChange={setDialogOpen}>
      <DialogTrigger class={navTriggerClass} ref={element => (trigger = element)}>
        <StoreIcon name="search" size={24} />
        <small>Хайх</small>
      </DialogTrigger>
      <DialogContent
        class="bg-orange! text-ink! fixed! inset-0! z-50! h-dvh! w-full! max-w-none! translate-none! transform-none! gap-0! overflow-y-auto! rounded-none! p-0! ring-0! outline-none! motion-reduce:animate-none!"
        showCloseButton={false}
        onOpenAutoFocus={event => {
          event.preventDefault()
          input()?.focus()
        }}
      >
        <header class="border-ink flex min-h-30 items-start justify-between gap-4 border-b-[5px] p-[clamp(1rem,3vw,2.5rem)]">
          <div>
            <DialogTitle class="font-display text-[clamp(3.8rem,10vw,6rem)] leading-[0.72] tracking-[-0.02em]">
              ЮУ СОНСОХ ВЭ?
            </DialogTitle>
            <DialogDescription class="text-ink! mt-2 mb-0 font-extrabold">
              IEM, DAC эсвэл cable нэрээр хайна уу.
            </DialogDescription>
          </div>
          <DialogClose
            class="border-ink bg-paper-clean text-ink min-h-12 min-w-20 cursor-pointer border-3 font-black"
            aria-label="Хайлт хаах"
          >
            ХААХ ×
          </DialogClose>
        </header>
        <label
          class="border-ink bg-paper-clean grid min-h-22 grid-cols-[auto_1fr] items-center gap-4 border-b-[5px] px-[clamp(1rem,3vw,2.5rem)] py-3"
          for="store-search"
        >
          <span class="sr-only">Бараа хайх</span>
          <StoreIcon name="search" size={30} />
          <Input
            ref={setInput}
            class="text-ink placeholder:text-ink/75 min-w-0 rounded-none border-0 bg-transparent text-[clamp(1.5rem,5vw,3rem)] font-black shadow-none outline-none"
            id="store-search"
            value={queryText()}
            onInput={event => setQueryText(event.currentTarget.value)}
            placeholder="IEM, DAC, cable…"
            autocomplete="off"
          />
        </label>
        <div class="grid gap-0 p-[clamp(0.75rem,2vw,1.5rem)]" aria-live="polite">
          <Switch>
            <Match when={queryText().trim().length < 2}>
              <p class={searchPromptClass}>Хоёр ба түүнээс олон үсэг бичнэ үү.</p>
            </Match>
            <Match when={results.isPending || results.isFetching}>
              <p class={searchPromptClass}>Каталог ухаж байна…</p>
            </Match>
            <Match when={results.isError || results.data?.status === 'error'}>
              <p class={searchPromptClass}>Хайлт ажилласангүй. Дахин оролдоно уу.</p>
            </Match>
            <Match when={results.data?.status === 'ok' ? results.data.value : undefined}>
              {catalog => (
                <Show
                  when={catalog().items.length > 0}
                  fallback={<p class={searchPromptClass}>Тохирох бараа олдсонгүй.</p>}
                >
                  <For each={catalog().items}>
                    {product => {
                      const image = product.images[0]
                      const variant = product.variants[0]
                      return (
                        <a
                          class="border-ink bg-paper-clean hover:bg-acid focus-visible:bg-acid grid min-h-30 grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-[clamp(0.75rem,2vw,1.5rem)] border-4 border-b-0 p-3 no-underline last:border-b-4 max-md:grid-cols-[5.5rem_minmax(0,1fr)]"
                          href={`/products/${product.slug}`}
                        >
                          <Show when={image}>
                            {item => (
                              <ProductImage
                                class="h-22.5 w-30 object-contain max-md:h-16.5 max-md:w-22"
                                image={item()}
                                layout="thumbnail"
                              />
                            )}
                          </Show>
                          <span class="grid min-w-0">
                            <strong class="text-[clamp(1.1rem,3vw,1.8rem)] leading-[1.05]">
                              {product.name}
                            </strong>
                            <small class="overflow-hidden text-ellipsis whitespace-nowrap">
                              {product.shortDescription}
                            </small>
                          </span>
                          <b class="border-ink bg-acid border-3 p-2 tabular-nums max-md:col-2 max-md:justify-self-start">
                            {variant ? formatMnt(variant.priceMnt) : '—'}
                          </b>
                        </a>
                      )
                    }}
                  </For>
                </Show>
              )}
            </Match>
          </Switch>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Chrome(props: { initialPanel: 'search' | 'cart' }) {
  const validation = useQueryResult(() => ({
    ...cartQuery.validate([...cartItems()]),
    enabled: cartItems().length > 0 && isCartOpen(),
    staleTime: 15_000,
  }))
  const [transportMessage, setTransportMessage] = createSignal('')
  let correctionHeading: HTMLHeadingElement | undefined = undefined

  onMount(() => {
    if (props.initialPanel === 'cart') openCart()

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
        imageR2Key: line.imageR2Key,
        imageWidth: line.imageWidth,
        imageHeight: line.imageHeight,
        imageAlt: line.imageAlt,
        unitPriceMnt: line.unitPriceMnt,
      })),
    )
  })

  const correctionsFor = (variantId: string) => {
    const result = validation.data
    return result?.status === 'ok'
      ? result.value.corrections.filter(item => item.variantId === variantId)
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
    <Cart.Root>
      <nav class={navClass} aria-label="Үндсэн цэс">
        <a class={navLinkClass} href="/" aria-label="Нүүр">
          <StoreIcon name="home" size={24} />
          <small>Нүүр</small>
        </a>
        <a class={navLinkClass} href="/products" aria-label="Дэлгүүр">
          <StoreIcon name="shop" size={24} />
          <small>Дэлгүүр</small>
        </a>
        <Search initialOpen={props.initialPanel === 'search'} />
        <Sheet.Trigger class={navTriggerClass}>
          <span aria-hidden="true">
            <StoreIcon name="cart" size={24} />
          </span>
          <small>Сагс</small>
          <Show when={cartItemCount() > 0}>
            <b class="border-ink bg-acid text-ink absolute top-1 right-[calc(50%-1.4rem)] grid h-5.25 min-w-5.25 place-items-center rounded-full border-2 text-[0.72rem]">
              {cartItemCount()}
            </b>
          </Show>
        </Sheet.Trigger>
      </nav>

      <Sheet.Content
        class="border-ink! bg-paper! fixed! top-0! right-0! z-50! h-dvh! w-[min(100%,500px)]! max-w-none! gap-0! overflow-y-auto! border-l-[5px]! p-0! shadow-none! outline-none! data-[side=right]:animate-[sheet-in_280ms_var(--ease-slam)]! motion-reduce:animate-none! max-md:inset-0! max-md:w-full! max-md:border-l-0! max-md:data-[side=right]:animate-[sheet-up_280ms_var(--ease-slam)]!"
        showCloseButton={false}
      >
        <div class="border-ink bg-orange flex min-h-17.5 items-center justify-between border-b-4 px-4 py-3">
          <Sheet.Title class="font-display text-[3rem] leading-[0.8]">САГС / BAG</Sheet.Title>
          <Sheet.Close
            class="border-ink bg-paper size-12 border-3 text-[2rem]"
            aria-label="Сагс хаах"
          >
            <span aria-hidden="true">×</span>
          </Sheet.Close>
        </div>
        <div class="p-4" aria-busy={validation.isFetching}>
          <Cart.Empty>
            <div class="grid min-h-[55dvh] place-content-center gap-4 text-center">
              <strong class="font-display text-[4rem] leading-[0.8]">Сагс хоосон.</strong>
              <a href="/products">Бараа үзэх →</a>
            </div>
          </Cart.Empty>
          <Show
            when={validation.data?.status === 'ok' && validation.data.value.corrections.length > 0}
          >
            <section class={errorPanelClass} aria-live="polite">
              <h2 class="m-0" ref={element => (correctionHeading = element)} tabIndex={-1}>
                Сагсаа засна уу
              </h2>
              <p>Үргэлжлүүлэхийн өмнө доорх өөрчлөлтийг шалгана уу.</p>
            </section>
          </Show>
          <Show when={validation.isError}>
            <div class={errorPanelClass} role="alert">
              <p>Сагсыг шалгаж чадсангүй.</p>
              <Button type="button" variant="outline" onClick={() => void validation.refetch()}>
                Дахин шалгах
              </Button>
            </div>
          </Show>
          <div>
            <Cart.Items>
              {item => (
                <article class="border-ink grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b-3 py-4 max-md:grid-cols-[80px_minmax(0,1fr)]">
                  <Show
                    when={
                      item.imageR2Key && item.imageWidth && item.imageHeight && item.imageAlt
                        ? {
                            url: item.imageR2Key,
                            width: item.imageWidth,
                            height: item.imageHeight,
                            alt: item.imageAlt,
                          }
                        : undefined
                    }
                  >
                    {image => (
                      <ProductImage
                        class="bg-paper-clean size-27.5 object-contain max-md:size-20"
                        image={image()}
                        layout="thumbnail"
                      />
                    )}
                  </Show>
                  <div class="min-w-0">
                    <a class="wrap-break-word" href={`/products/${item.productSlug}`}>
                      <strong>{item.productName}</strong>
                    </a>
                    <p>{item.variantName}</p>
                    <strong>{formatMnt(item.unitPriceMnt * item.quantity)}</strong>
                    <For each={correctionsFor(item.variantId)}>
                      {correction => (
                        <div class="border-ink bg-orange [&_button]:border-ink [&_button]:bg-paper my-2 border-2 p-2 [&_button]:border-2 [&_button]:font-extrabold">
                          <p>{correction.message}</p>
                          <Show when={correction._tag === 'PriceChanged'}>
                            <small>
                              Хуучин:{' '}
                              {formatMnt(
                                correction._tag === 'PriceChanged'
                                  ? correction.previousUnitPriceMnt
                                  : 0,
                              )}{' '}
                              · Одоо: {formatMnt(item.unitPriceMnt)}
                            </small>
                          </Show>
                          <Show
                            when={
                              correction._tag === 'InsufficientStock' &&
                              correction.availableQuantity > 0
                            }
                          >
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                correction._tag === 'InsufficientStock' &&
                                setCartItemQuantity(item.variantId, correction.availableQuantity)
                              }
                            >
                              Үлдэгдэлд тааруулах
                            </Button>
                          </Show>
                        </div>
                      )}
                    </For>
                    <div class="[&_button]:border-ink [&_button]:bg-paper-clean mt-3 flex flex-wrap items-center gap-1 [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:rounded-none [&_button]:border-2 [&_output]:min-w-10 [&_output]:text-center">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={correctionsFor(item.variantId).some(
                          item => item._tag === 'InactiveVariant' || item._tag === 'MissingVariant',
                        )}
                        onClick={() =>
                          setCartItemQuantity(item.variantId, Math.max(1, item.quantity - 1))
                        }
                        aria-label={`${item.productName} тоог нэгээр хасах`}
                      >
                        −
                      </Button>
                      <output>{item.quantity}</output>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          item.quantity >= 10 ||
                          correctionsFor(item.variantId).some(item => item._tag !== 'PriceChanged')
                        }
                        onClick={() => setCartItemQuantity(item.variantId, item.quantity + 1)}
                        aria-label={`${item.productName} тоог нэгээр нэмэх`}
                      >
                        +
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        class="text-warning ml-auto min-w-24 gap-2 px-3"
                        onClick={() => removeCartItem(item.variantId)}
                        aria-label={`${item.productName} сагснаас хасах`}
                      >
                        <TrashBinTrash aria-hidden="true" size={20} />
                        <span>Хасах</span>
                      </Button>
                    </div>
                  </div>
                </article>
              )}
            </Cart.Items>
          </div>
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
            <a class={`${actionClass} w-full`} href="/checkout" onClick={continueCheckout}>
              Захиалга үргэлжлүүлэх →
            </a>
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
    </Cart.Root>
  )
}

export default function StoreChromeInteractive(props: { initialPanel: 'search' | 'cart' }) {
  const client = createStorefrontQueryClient()
  return (
    <QueryClientProvider client={client}>
      <Chrome initialPanel={props.initialPanel} />
    </QueryClientProvider>
  )
}
