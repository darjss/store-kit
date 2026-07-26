import { useNavigate } from '@solidjs/router'
import type { PublicImage } from '@store-kit/contracts'
import { persistedCartItemsSchema } from '@store-kit/contracts/cart'
import type {
  CartCorrection,
  CartValidationError,
  PersistedCartItem,
  ValidatedCart,
} from '@store-kit/contracts/cart'
import {
  For,
  Show,
  createContext,
  createEffect,
  createSignal,
  createStore,
  deep,
  onSettled,
  snapshot,
  useContext,
} from 'solid-js'
import type { ParentProps } from 'solid-js'
import { Type } from 'typebox'
import { Value } from 'typebox/value'

import { formatMnt } from '~/catalog/format'
import type { PurchaseProduct, PurchaseVariant } from '~/catalog/model'
import { validateCart as requestCartValidation } from '~/server/cart'

const storageKey = 'dund:cart:v1'
const storedCartSchema = Type.Object(
  {
    version: Type.Literal(1),
    items: persistedCartItemsSchema,
  },
  { additionalProperties: false },
)

type CartValidationState =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'ready'; cart: ValidatedCart }
  | { type: 'corrections'; cart: ValidatedCart }
  | { type: 'domain-error'; error: CartValidationError }
  | { type: 'transport-error' }

interface CartContextValue {
  items: readonly PersistedCartItem[]
  count: () => number
  open: () => boolean
  validation: () => CartValidationState
  validatedCart: () => ValidatedCart | undefined
  setOpen: (open: boolean) => void
  add: (product: PurchaseProduct, variant: PurchaseVariant, quantity: number) => void
  remove: (variantId: string) => void
  setQuantity: (variantId: string, quantity: number) => void
  correctionsFor: (variantId: string) => CartCorrection[]
  maximumQuantity: (item: PersistedCartItem) => number
  applyCorrection: (correction: CartCorrection) => void
  validate: () => Promise<boolean>
  gateCheckout: () => Promise<boolean>
}

const CartContext = createContext<CartContextValue>()

export const useCart = () => useContext(CartContext)

const publicImage = (image: PurchaseProduct['images'][number] | undefined): PublicImage | null =>
  image
    ? {
        url: image.url,
        width: image.width,
        height: image.height,
        alt: image.alt,
      }
    : null

export function CartProvider(props: ParentProps) {
  const [items, setItems] = createStore<PersistedCartItem[]>([])
  const [open, setOpenState] = createSignal(false)
  const [storageReady, setStorageReady] = createSignal(false)
  const [validation, setValidation] = createSignal<CartValidationState>({ type: 'idle' })
  let validationRequest = 0
  let openTrigger: HTMLElement | undefined

  const invalidateValidation = () => {
    validationRequest += 1
    setValidation({ type: 'idle' })
  }

  const remove = (variantId: string) => {
    setItems(draft => {
      const index = draft.findIndex(item => item.variantId === variantId)
      if (index !== -1) draft.splice(index, 1)
    })
    invalidateValidation()
  }

  const setQuantity = (variantId: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return
    setItems(draft => {
      const item = draft.find(candidate => candidate.variantId === variantId)
      if (item) item.quantity = quantity
    })
    invalidateValidation()
  }

  const validatedCart = () => {
    const state = validation()
    return state.type === 'ready' || state.type === 'corrections' ? state.cart : undefined
  }

  const correctionsFor = (variantId: string) =>
    validatedCart()?.corrections.filter(correction => correction.variantId === variantId) ?? []

  const maximumQuantity = (item: PersistedCartItem) => {
    const line = validatedCart()?.lines.find(candidate => candidate.variantId === item.variantId)
    return Math.min(10, line?.availableQuantity ?? 10)
  }

  const validate = async () => {
    const currentItems = snapshot(items)
    if (currentItems.length === 0) {
      setValidation({
        type: 'domain-error',
        error: { _tag: 'CartEmpty', message: 'Сагс хоосон байна.' },
      })
      return false
    }

    const request = ++validationRequest
    setValidation({ type: 'checking' })
    try {
      const response = await requestCartValidation(
        currentItems.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity,
          previousUnitPriceMnt: item.unitPriceMnt,
        })),
      )
      if (request !== validationRequest) return false
      if (!response.ok) {
        setValidation({ type: 'domain-error', error: response.error })
        return false
      }

      const lines = new Map(response.cart.lines.map(line => [line.variantId, line]))
      setItems(draft => {
        for (const item of draft) {
          const line = lines.get(item.variantId)
          if (!line) continue
          item.productSlug = line.productSlug
          item.productName = line.productName
          item.variantName = line.variantName
          item.options = line.options
          item.image = line.image
          item.unitPriceMnt = line.unitPriceMnt
        }
      })
      setValidation(
        response.cart.corrections.length > 0
          ? { type: 'corrections', cart: response.cart }
          : { type: 'ready', cart: response.cart },
      )
      return response.cart.corrections.length === 0
    } catch {
      if (request === validationRequest) setValidation({ type: 'transport-error' })
      return false
    }
  }

  const setOpen = (nextOpen: boolean) => {
    if (
      nextOpen &&
      typeof document !== 'undefined' &&
      document.activeElement instanceof HTMLElement
    ) {
      openTrigger = document.activeElement
    }
    setOpenState(nextOpen)
    if (!nextOpen) queueMicrotask(() => openTrigger?.focus())
  }

  const applyCorrection = (correction: CartCorrection) => {
    switch (correction._tag) {
      case 'MissingVariant':
      case 'InactiveVariant':
        remove(correction.variantId)
        break
      case 'InsufficientStock':
        if (correction.availableQuantity === 0) remove(correction.variantId)
        else setQuantity(correction.variantId, correction.availableQuantity)
        break
      case 'PriceChanged':
        void validate()
        break
    }
  }

  const gateCheckout = async () => {
    const ready = await validate()
    if (ready) return true
    setOpen(true)
    return false
  }

  onSettled(() => {
    const source = localStorage.getItem(storageKey)
    if (source) {
      try {
        const stored: unknown = JSON.parse(source)
        if (
          Value.Check(storedCartSchema, stored) &&
          new Set(stored.items.map(item => item.variantId)).size === stored.items.length
        ) {
          setItems(draft => {
            draft.push(...stored.items)
          })
        } else {
          localStorage.removeItem(storageKey)
        }
      } catch {
        localStorage.removeItem(storageKey)
      }
    }
    setStorageReady(true)
  })

  createEffect(
    () => (storageReady() ? JSON.stringify({ version: 1, items: deep(items) }) : undefined),
    value => {
      if (!value) return
      const stored: unknown = JSON.parse(value)
      if (Value.Check(storedCartSchema, stored)) localStorage.setItem(storageKey, value)
      else localStorage.removeItem(storageKey)
    },
  )

  const value: CartContextValue = {
    items,
    count: () => items.reduce((total, item) => total + item.quantity, 0),
    open,
    validation,
    validatedCart,
    setOpen,
    add(product, variant, quantity) {
      setItems(draft => {
        const existing = draft.find(item => item.variantId === variant.id)
        if (existing) {
          existing.quantity = Math.min(variant.maxQuantity, existing.quantity + quantity)
          existing.productSlug = product.slug
          existing.productName = product.name
          existing.variantName = variant.name
          existing.options = variant.options
          existing.image = publicImage(
            product.images.find(image => variant.imageIds.includes(image.id)) ?? product.images[0],
          )
          existing.unitPriceMnt = variant.priceMnt
          return
        }
        if (draft.length >= 20) return
        draft.push({
          variantId: variant.id,
          quantity: Math.min(variant.maxQuantity, quantity),
          productSlug: product.slug,
          productName: product.name,
          variantName: variant.name,
          options: variant.options,
          image: publicImage(
            product.images.find(image => variant.imageIds.includes(image.id)) ?? product.images[0],
          ),
          unitPriceMnt: variant.priceMnt,
        })
      })
      invalidateValidation()
      setOpen(true)
    },
    remove,
    setQuantity,
    correctionsFor,
    maximumQuantity,
    applyCorrection,
    validate,
    gateCheckout,
  }

  return <CartContext value={value}>{props.children}</CartContext>
}

function CartCorrectionNotice(props: {
  correction: CartCorrection
  apply: (correction: CartCorrection) => void
}) {
  return (
    <div class="mt-2 border-2 border-alert bg-white p-3 text-sm" role="status">
      <p class="m-0 font-semibold">{props.correction.message}</p>
      {props.correction._tag === 'PriceChanged' && (
        <p class="mt-1 text-ink/65">
          Хуучин {formatMnt(props.correction.previousUnitPriceMnt)} · Одоо{' '}
          {formatMnt(props.correction.currentUnitPriceMnt)}
        </p>
      )}
      <button
        class="mt-2 min-h-11 border-2 border-ink px-3 font-bold"
        type="button"
        onClick={() => props.apply(props.correction)}
      >
        {props.correction._tag === 'PriceChanged'
          ? 'Шинэ үнийг зөвшөөрөх'
          : props.correction._tag === 'InsufficientStock' && props.correction.availableQuantity > 0
            ? 'Үлдэгдэлд тааруулах'
            : 'Сагснаас хасах'}
      </button>
    </div>
  )
}

export function CartDialog() {
  const cart = useCart()
  const navigate = useNavigate()
  let dialog: HTMLDialogElement | undefined
  let validationHeading: HTMLHeadingElement | undefined

  createEffect(cart.open, isOpen => {
    if (!dialog) return
    if (isOpen && !dialog.open) {
      dialog.showModal()
      if (cart.validation().type === 'idle') void cart.validate()
    }
    if (!isOpen && dialog.open) dialog.close()
  })

  const continueCheckout = async () => {
    if (!(await cart.gateCheckout())) {
      queueMicrotask(() => validationHeading?.focus())
      return
    }
    cart.setOpen(false)
    navigate('/checkout')
  }

  const subtotal = () =>
    cart.validatedCart()?.subtotalMnt ??
    cart.items.reduce((total, item) => total + item.unitPriceMnt * item.quantity, 0)

  return (
    <dialog
      ref={element => {
        dialog = element
      }}
      class="m-0 ml-auto h-dvh max-h-none w-[min(100%,34rem)] max-w-none border-0 border-l-3 border-ink bg-white p-0 text-ink backdrop:bg-ink/60 open:flex open:flex-col max-sm:w-full max-sm:border-l-0"
      onClose={() => cart.setOpen(false)}
      aria-labelledby="cart-title"
    >
      <header class="flex min-h-20 items-center justify-between gap-4 border-b-3 border-ink bg-amber px-5">
        <div>
          <p class="m-0 text-xs font-bold text-cobalt">ДУНД / CART</p>
          <h2 id="cart-title" class="m-0 text-3xl font-extrabold">
            Сагс
          </h2>
        </div>
        <button
          class="min-h-11 min-w-11 border-2 border-ink bg-white text-2xl"
          type="button"
          onClick={() => cart.setOpen(false)}
          aria-label="Сагс хаах"
        >
          ×
        </button>
      </header>
      <div
        class="flex-1 overflow-y-auto px-5"
        aria-busy={cart.validation().type === 'checking' ? 'true' : undefined}
      >
        <Show
          when={cart.items.length > 0}
          fallback={
            <div class="grid min-h-[60dvh] place-content-center gap-4 text-center">
              <p class="text-3xl font-extrabold">Сагс хоосон.</p>
              <a class="font-bold text-cobalt" href="/products" onClick={() => cart.setOpen(false)}>
                Капсул үзэх →
              </a>
            </div>
          }
        >
          <Show when={cart.validation().type === 'checking'}>
            <p class="border-b border-ink/25 py-3 font-semibold" role="status">
              Үнэ, үлдэгдлийг шалгаж байна…
            </p>
          </Show>
          <Show when={cart.validation().type === 'corrections'}>
            <div class="my-4 border-3 border-alert bg-surface p-4" role="alert">
              <h3
                ref={element => {
                  validationHeading = element
                }}
                tabindex="-1"
                class="m-0 text-xl font-extrabold"
              >
                Сагсаа засна уу
              </h3>
              <p class="mt-2">Үргэлжлүүлэхийн өмнө доорх өөрчлөлтийг шалгана уу.</p>
            </div>
          </Show>
          <Show
            when={
              cart.validation().type === 'domain-error' ||
              cart.validation().type === 'transport-error'
            }
          >
            <div class="my-4 border-3 border-alert bg-surface p-4" role="alert">
              <h3
                ref={element => {
                  validationHeading = element
                }}
                tabindex="-1"
                class="m-0 text-xl font-extrabold"
              >
                Сагсыг шалгаж чадсангүй
              </h3>
              <button
                class="mt-3 min-h-11 border-2 border-ink px-3 font-bold"
                type="button"
                onClick={() => void cart.validate()}
              >
                Дахин шалгах
              </button>
            </div>
          </Show>
          <div class="divide-y divide-ink/25">
            <For each={cart.items}>
              {item => (
                <article class="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 py-5">
                  {item.image ? (
                    <img
                      class="aspect-square h-20 w-20 object-cover"
                      src={item.image.url}
                      width={item.image.width}
                      height={item.image.height}
                      alt=""
                    />
                  ) : (
                    <div class="aspect-square h-20 w-20 bg-surface" aria-hidden="true" />
                  )}
                  <div class="min-w-0">
                    <a
                      class="font-bold text-ink"
                      href={`/products/${item.productSlug}`}
                      onClick={() => cart.setOpen(false)}
                    >
                      {item.productName}
                    </a>
                    <p class="mt-1 text-sm text-ink/65">{item.variantName}</p>
                    <strong>{formatMnt(item.unitPriceMnt * item.quantity)}</strong>
                    <For each={cart.correctionsFor(item.variantId)}>
                      {correction => (
                        <CartCorrectionNotice
                          correction={correction}
                          apply={cart.applyCorrection}
                        />
                      )}
                    </For>
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                      <div
                        class="inline-grid grid-cols-[2.75rem_3.5rem_2.75rem] border-2 border-ink"
                        aria-label={`${item.productName} тоо ширхэг`}
                      >
                        <button
                          class="min-h-11 font-bold disabled:opacity-40"
                          type="button"
                          disabled={item.quantity <= 1}
                          onClick={() => cart.setQuantity(item.variantId, item.quantity - 1)}
                          aria-label={`${item.productName} тоог нэгээр хасах`}
                        >
                          −
                        </button>
                        <output class="grid min-h-11 place-items-center border-x-2 border-ink">
                          {item.quantity}
                        </output>
                        <button
                          class="min-h-11 font-bold disabled:opacity-40"
                          type="button"
                          disabled={
                            item.quantity >= cart.maximumQuantity(item) ||
                            cart
                              .correctionsFor(item.variantId)
                              .some(correction => correction._tag !== 'PriceChanged')
                          }
                          onClick={() => cart.setQuantity(item.variantId, item.quantity + 1)}
                          aria-label={`${item.productName} тоог нэгээр нэмэх`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        class="ml-auto min-h-11 px-2 font-semibold text-alert"
                        type="button"
                        onClick={() => cart.remove(item.variantId)}
                        aria-label={`${item.productName} сагснаас хасах`}
                      >
                        Хасах
                      </button>
                    </div>
                  </div>
                </article>
              )}
            </For>
          </div>
        </Show>
      </div>
      <Show when={cart.items.length > 0}>
        <footer class="border-t-3 border-ink bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div class="mb-4 flex justify-between gap-4 text-xl">
            <span>Барааны дүн</span>
            <strong>{formatMnt(subtotal())}</strong>
          </div>
          <button
            class="flex min-h-12 w-full items-center justify-center bg-cobalt px-5 font-bold text-white"
            type="button"
            disabled={cart.validation().type === 'checking'}
            onClick={() => void continueCheckout()}
          >
            Захиалга үргэлжлүүлэх →
          </button>
          <p class="mt-3 text-sm text-ink/65">
            Үнэ, идэвхтэй төлөв, үлдэгдлийг сервер баталгаажуулсны дараа үргэлжилнэ.
          </p>
        </footer>
      </Show>
    </dialog>
  )
}
