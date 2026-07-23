import { Cart } from '@store-kit/storefront/cart/components'
import {
  cartItemCount,
  cartItems,
  refreshCartItemSnapshots,
  removeCartItem,
  setCartItemQuantity,
} from '@store-kit/storefront/cart/store'
import { mediaUrl } from '@store-kit/storefront/media'
import { createStorefrontQueryClient } from '@store-kit/storefront/query-client'
import { cartQuery } from '@store-kit/storefront/query-options/cart'
import { catalogQuery } from '@store-kit/storefront/query-options/catalog'
/* oxlint-disable tailwindcss/no-unknown-classes, eslint/no-underscore-dangle */
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Sheet,
} from '@store-kit/ui'
import { QueryClientProvider, createQuery } from '@tanstack/solid-query'
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

const StoreIcon = lazy(() => import('./StoreIcon'))
const money = new Intl.NumberFormat('mn-MN')

function Search() {
  const [open, setOpen] = createSignal(false)
  const [queryText, setQueryText] = createSignal('')
  const [input, setInput] = createSignal<HTMLInputElement>()
  const results = createQuery(() => ({
    ...catalogQuery.findAllProducts({ query: queryText(), limit: 8 }),
    enabled: queryText().trim().length > 1,
  }))

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <DialogTrigger class="nav-action">
        <StoreIcon name="search" size={24} />
        <small>Хайх</small>
      </DialogTrigger>
      <DialogContent
        class="search-surface"
        showCloseButton={false}
        onOpenAutoFocus={event => {
          event.preventDefault()
          input()?.focus()
        }}
      >
        <header class="search-head">
          <div>
            <DialogTitle>ЮУ СОНСОХ ВЭ?</DialogTitle>
            <DialogDescription>IEM, DAC эсвэл cable нэрээр хайна уу.</DialogDescription>
          </div>
          <DialogClose class="search-close" aria-label="Хайлт хаах">
            ХААХ ×
          </DialogClose>
        </header>
        <label class="search-input" for="store-search">
          <span class="sr-only">Бараа хайх</span>
          <StoreIcon name="search" size={30} />
          <input
            ref={setInput}
            id="store-search"
            value={queryText()}
            onInput={event => setQueryText(event.currentTarget.value)}
            placeholder="IEM, DAC, cable…"
            autocomplete="off"
          />
        </label>
        <div class="search-results" aria-live="polite">
          <Switch>
            <Match when={queryText().trim().length < 2}>
              <p class="search-prompt">Хоёр ба түүнээс олон үсэг бичнэ үү.</p>
            </Match>
            <Match when={results.isPending || results.isFetching}>
              <p class="search-prompt">Каталог ухаж байна…</p>
            </Match>
            <Match when={results.isError || results.data?.status === 'error'}>
              <p class="search-prompt">Хайлт ажилласангүй. Дахин оролдоно уу.</p>
            </Match>
            <Match when={results.data?.status === 'ok' ? results.data.value : undefined}>
              {catalog => (
                <Show
                  when={catalog().items.length > 0}
                  fallback={<p class="search-prompt">Тохирох бараа олдсонгүй.</p>}
                >
                  <For each={catalog().items}>
                    {product => {
                      const image = product.images[0]
                      const variant = product.variants[0]
                      return (
                        <a class="search-hit" href={`/products/${product.slug}`}>
                          <Show when={image}>
                            {item => (
                              <img
                                src={mediaUrl(item().r2Key)}
                                width="120"
                                height="90"
                                alt={item().alt ?? product.name}
                              />
                            )}
                          </Show>
                          <span>
                            <strong>{product.name}</strong>
                            <small>{product.shortDescription}</small>
                          </span>
                          <b>{variant ? `${money.format(variant.priceMnt)} ₮` : '—'}</b>
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

function Chrome() {
  const validation = createQuery(() => ({
    ...cartQuery.validate([...cartItems()]),
    enabled: cartItems().length > 0,
    staleTime: 15_000,
  }))
  const [transportMessage, setTransportMessage] = createSignal('')
  let correctionHeading: HTMLHeadingElement | undefined = undefined

  onMount(() => {
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
    correctionHeading?.focus()
  }

  return (
    <Cart.Root>
      <nav class="bottom-nav" aria-label="Үндсэн цэс">
        <a class="nav-action" href="/" aria-label="Нүүр">
          <StoreIcon name="home" size={24} />
          <small>Нүүр</small>
        </a>
        <a class="nav-action" href="/products" aria-label="Дэлгүүр">
          <StoreIcon name="shop" size={24} />
          <small>Дэлгүүр</small>
        </a>
        <Search />
        <Cart.Trigger>
          <span class="nav-cart-icon" aria-hidden="true">
            <StoreIcon name="cart" size={24} />
          </span>
          <small>Сагс</small>
          <Show when={cartItemCount() > 0}>
            <b class="cart-count">{cartItemCount()}</b>
          </Show>
        </Cart.Trigger>
      </nav>

      <Cart.Content>
        <div class="cart-head">
          <Sheet.Title>САГС / BAG</Sheet.Title>
          <Sheet.Close aria-label="Сагс хаах">
            <span aria-hidden="true">×</span>
          </Sheet.Close>
        </div>
        <div class="cart-body">
          <Cart.Empty>
            <div class="empty-state">
              <strong>Сагс хоосон.</strong>
              <a href="/products">Бараа үзэх →</a>
            </div>
          </Cart.Empty>
          <Show
            when={validation.data?.status === 'ok' && validation.data.value.corrections.length > 0}
          >
            <section class="correction-panel" aria-live="polite">
              <h2 ref={element => (correctionHeading = element)} tabIndex={-1}>
                Сагсаа засна уу
              </h2>
              <p>Үргэлжлүүлэхийн өмнө доорх өөрчлөлтийг шалгана уу.</p>
            </section>
          </Show>
          <div class="cart-lines">
            <Cart.Items>
              {item => (
                <article class="cart-line">
                  <Show when={item.imageR2Key}>
                    <img src={mediaUrl(item.imageR2Key!)} alt="" />
                  </Show>
                  <div>
                    <a href={`/products/${item.productSlug}`}>
                      <strong>{item.productName}</strong>
                    </a>
                    <p>{item.variantName}</p>
                    <strong>{money.format(item.unitPriceMnt * item.quantity)} ₮</strong>
                    <For each={correctionsFor(item.variantId)}>
                      {correction => (
                        <div class="line-correction">
                          <p>{correction.message}</p>
                          <Show when={correction._tag === 'PriceChanged'}>
                            <small>
                              Хуучин:{' '}
                              {money.format(
                                correction._tag === 'PriceChanged'
                                  ? correction.previousUnitPriceMnt
                                  : 0,
                              )}{' '}
                              ₮ · Одоо: {money.format(item.unitPriceMnt)} ₮
                            </small>
                          </Show>
                          <Show
                            when={
                              correction._tag === 'InsufficientStock' &&
                              correction.availableQuantity > 0
                            }
                          >
                            <button
                              type="button"
                              onClick={() =>
                                correction._tag === 'InsufficientStock' &&
                                setCartItemQuantity(item.variantId, correction.availableQuantity)
                              }
                            >
                              Үлдэгдэлд тааруулах
                            </button>
                          </Show>
                        </div>
                      )}
                    </For>
                    <div class="line-actions">
                      <button
                        type="button"
                        disabled={correctionsFor(item.variantId).some(
                          item => item._tag === 'InactiveVariant' || item._tag === 'MissingVariant',
                        )}
                        onClick={() =>
                          setCartItemQuantity(item.variantId, Math.max(1, item.quantity - 1))
                        }
                      >
                        −
                      </button>
                      <output>{item.quantity}</output>
                      <button
                        type="button"
                        disabled={
                          item.quantity >= 10 ||
                          correctionsFor(item.variantId).some(item => item._tag !== 'PriceChanged')
                        }
                        onClick={() => setCartItemQuantity(item.variantId, item.quantity + 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        class="remove"
                        onClick={() => removeCartItem(item.variantId)}
                      >
                        Хасах
                      </button>
                    </div>
                  </div>
                </article>
              )}
            </Cart.Items>
          </div>
          <Show when={cartItems().length > 0}>
            <div class="cart-total">
              <span>Барааны дүн</span>
              <strong>
                {money.format(
                  validation.data?.status === 'ok'
                    ? validation.data.value.subtotalMnt
                    : cartItems().reduce((sum, item) => sum + item.unitPriceMnt * item.quantity, 0),
                )}{' '}
                ₮
              </strong>
            </div>
            <a class="slam-button checkout-link" href="/checkout" onClick={continueCheckout}>
              Захиалга үргэлжлүүлэх →
            </a>
          </Show>
        </div>
      </Cart.Content>
      <Show when={transportMessage()}>
        <div class="toast" role="status">
          {transportMessage()}
        </div>
      </Show>
    </Cart.Root>
  )
}

export default function StoreChromeInteractive() {
  const client = createStorefrontQueryClient()
  return (
    <QueryClientProvider client={client}>
      <Chrome />
    </QueryClientProvider>
  )
}
