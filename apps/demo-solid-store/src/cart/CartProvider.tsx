import {
  For,
  Show,
  createContext,
  createEffect,
  createSignal,
  createStore,
  onSettled,
  snapshot,
  useContext,
} from 'solid-js'
import type { ParentProps } from 'solid-js'
import { Type } from 'typebox'
import { Value } from 'typebox/value'

import { formatMnt } from '~/catalog/format'
import type { PurchaseProduct, PurchaseVariant, StoreImage } from '~/catalog/model'

const storageKey = 'dund:cart:v1'
const storedCartSchema = Type.Object(
  {
    version: Type.Literal(1),
    items: Type.Array(
      Type.Object(
        {
          variantId: Type.String({ minLength: 1 }),
          quantity: Type.Integer({ minimum: 1, maximum: 10 }),
          productSlug: Type.String({ minLength: 1 }),
          productName: Type.String({ minLength: 1 }),
          variantName: Type.String({ minLength: 1 }),
          options: Type.Record(Type.String(), Type.String()),
          image: Type.Union([
            Type.Object({
              id: Type.String(),
              url: Type.String(),
              srcset: Type.String(),
              width: Type.Integer({ minimum: 1 }),
              height: Type.Integer({ minimum: 1 }),
              alt: Type.String(),
            }),
            Type.Null(),
          ]),
          unitPriceMnt: Type.Integer({ minimum: 0 }),
        },
        { additionalProperties: false },
      ),
      { maxItems: 20 },
    ),
  },
  { additionalProperties: false },
)

interface CartItem {
  variantId: string
  quantity: number
  productSlug: string
  productName: string
  variantName: string
  options: Record<string, string>
  image: StoreImage | null
  unitPriceMnt: number
}

interface CartContextValue {
  items: readonly CartItem[]
  count: () => number
  open: () => boolean
  setOpen: (open: boolean) => void
  add: (product: PurchaseProduct, variant: PurchaseVariant, quantity: number) => void
  remove: (variantId: string) => void
}

const CartContext = createContext<CartContextValue>()

export const useCart = () => useContext(CartContext)

export function CartProvider(props: ParentProps) {
  const [items, setItems] = createStore<CartItem[]>([])
  const [open, setOpen] = createSignal(false)
  const [storageReady, setStorageReady] = createSignal(false)

  onSettled(() => {
    const source = localStorage.getItem(storageKey)
    if (source) {
      try {
        const stored: unknown = JSON.parse(source)
        if (Value.Check(storedCartSchema, stored)) {
          setItems(draft => {
            draft.push(...stored.items)
          })
        }
      } catch {
        localStorage.removeItem(storageKey)
      }
    }
    setStorageReady(true)
  })

  createEffect(
    () => (storageReady() ? JSON.stringify({ version: 1, items: snapshot(items) }) : undefined),
    value => {
      if (value) localStorage.setItem(storageKey, value)
    },
  )

  const value: CartContextValue = {
    items,
    count: () => items.reduce((total, item) => total + item.quantity, 0),
    open,
    setOpen,
    add(product, variant, quantity) {
      setItems(draft => {
        const existing = draft.find(item => item.variantId === variant.id)
        if (existing) {
          existing.quantity = Math.min(variant.maxQuantity, existing.quantity + quantity)
          existing.unitPriceMnt = variant.priceMnt
          return
        }
        draft.push({
          variantId: variant.id,
          quantity: Math.min(variant.maxQuantity, quantity),
          productSlug: product.slug,
          productName: product.name,
          variantName: variant.name,
          options: variant.options,
          image:
            product.images.find(image => variant.imageIds.includes(image.id)) ??
            product.images[0] ??
            null,
          unitPriceMnt: variant.priceMnt,
        })
      })
      setOpen(true)
    },
    remove(variantId) {
      setItems(draft => {
        const index = draft.findIndex(item => item.variantId === variantId)
        if (index !== -1) draft.splice(index, 1)
      })
    },
  }

  return <CartContext value={value}>{props.children}</CartContext>
}

export function CartDialog() {
  const cart = useCart()
  let dialog: HTMLDialogElement | undefined

  createEffect(cart.open, isOpen => {
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  })

  return (
    <dialog
      ref={element => {
        dialog = element
      }}
      class="m-0 ml-auto h-dvh max-h-none w-[min(100%,34rem)] max-w-none border-0 border-l-3 border-ink bg-white p-0 text-ink backdrop:bg-ink/60 open:flex open:flex-col"
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
      <div class="flex-1 overflow-y-auto px-5">
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
          <div class="divide-y divide-ink/25">
            <For each={cart.items}>
              {item => (
                <article class="grid grid-cols-[5rem_minmax(0,1fr)_auto] gap-4 py-5">
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
                    <p class="mt-1 text-sm text-ink/65">
                      {item.variantName} · {item.quantity} ш
                    </p>
                    <strong>{formatMnt(item.unitPriceMnt * item.quantity)}</strong>
                  </div>
                  <button
                    class="min-h-11 px-2 font-semibold text-alert"
                    type="button"
                    onClick={() => cart.remove(item.variantId)}
                    aria-label={`${item.productName} сагснаас хасах`}
                  >
                    Хасах
                  </button>
                </article>
              )}
            </For>
          </div>
        </Show>
      </div>
      <Show when={cart.items.length > 0}>
        <footer class="border-t-3 border-ink bg-surface p-5">
          <div class="mb-4 flex justify-between gap-4 text-xl">
            <span>Барааны дүн</span>
            <strong>
              {formatMnt(
                cart.items.reduce((total, item) => total + item.unitPriceMnt * item.quantity, 0),
              )}
            </strong>
          </div>
          <a
            class="flex min-h-12 items-center justify-center bg-cobalt px-5 font-bold text-white no-underline"
            href="/checkout"
            onClick={() => cart.setOpen(false)}
          >
            Захиалга үргэлжлүүлэх →
          </a>
          <p class="mt-3 text-sm text-ink/65">
            Үнэ, идэвхтэй төлөв, үлдэгдлийг checkout-ийн өмнө сервер дахин шалгана.
          </p>
        </footer>
      </Show>
    </dialog>
  )
}
