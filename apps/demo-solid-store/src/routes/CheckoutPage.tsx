import { For, Show, onSettled } from 'solid-js'

import { useCart } from '~/cart/CartProvider'
import { formatMnt } from '~/catalog/format'

export default function CheckoutPage() {
  const cart = useCart()

  onSettled(() => {
    queueMicrotask(() => {
      if (cart.validation().type === 'idle') void cart.validate()
    })
  })

  return (
    <main
      id="main-content"
      tabindex="-1"
      class="min-h-[70svh] bg-surface px-[clamp(1rem,4vw,4rem)] py-[clamp(3rem,7vw,6rem)]"
    >
      <div class="mx-auto max-w-3xl border-3 border-ink bg-white p-[clamp(1.25rem,4vw,3.5rem)]">
        <p class="font-bold text-cobalt">CHECKOUT / SERVER CHECK</p>
        <h1 class="mt-3 text-[clamp(2.5rem,7vw,5rem)] leading-none font-extrabold">Захиалга</h1>
        <Show
          when={cart.items.length > 0}
          fallback={
            <>
              <p class="mt-6 text-lg">Сагс хоосон байна.</p>
              <a
                class="mt-4 inline-flex min-h-11 items-center font-bold text-cobalt"
                href="/products"
              >
                Бараа сонгох →
              </a>
            </>
          }
        >
          <Show when={cart.validation().type === 'checking' || cart.validation().type === 'idle'}>
            <p class="mt-6 text-lg" role="status">
              Үнэ, идэвхтэй төлөв, үлдэгдлийг шалгаж байна…
            </p>
          </Show>
          <Show when={cart.validation().type === 'corrections'}>
            <div class="mt-6 border-3 border-alert bg-surface p-5" role="alert">
              <h2 class="m-0 text-2xl font-extrabold">Сагсаа эхлээд засна уу</h2>
              <p class="mt-2">Серверийн өөрчлөлтийг зөвшөөрсний дараа checkout үргэлжилнэ.</p>
              <button
                class="mt-4 min-h-11 bg-alert px-4 font-bold text-white"
                type="button"
                onClick={() => cart.setOpen(true)}
              >
                Сагсны засварыг нээх
              </button>
            </div>
          </Show>
          <Show
            when={
              cart.validation().type === 'domain-error' ||
              cart.validation().type === 'transport-error'
            }
          >
            <div class="mt-6 border-3 border-alert bg-surface p-5" role="alert">
              <h2 class="m-0 text-2xl font-extrabold">Сагсыг шалгаж чадсангүй</h2>
              <button
                class="mt-4 min-h-11 border-2 border-ink px-4 font-bold"
                type="button"
                onClick={() => void cart.validate()}
              >
                Дахин шалгах
              </button>
            </div>
          </Show>
          <Show when={cart.validation().type === 'ready'}>
            <section class="mt-6" aria-labelledby="validated-cart-title">
              <h2 id="validated-cart-title" class="text-2xl font-extrabold">
                Сагс баталгаажлаа
              </h2>
              <div class="mt-4 divide-y divide-ink/25 border-y border-ink/25">
                <For each={cart.validatedCart()?.lines ?? []}>
                  {line => (
                    <div class="flex flex-wrap justify-between gap-3 py-4">
                      <span>
                        <strong>{line.productName}</strong>
                        <small class="mt-1 block text-ink/65">
                          {line.variantName} · {line.requestedQuantity} ш
                        </small>
                      </span>
                      <strong>{formatMnt(line.lineTotalMnt)}</strong>
                    </div>
                  )}
                </For>
              </div>
              <p class="mt-5 flex justify-between gap-4 text-xl">
                <span>Барааны дүн</span>
                <strong>{formatMnt(cart.validatedCart()?.subtotalMnt ?? 0)}</strong>
              </p>
              <p class="mt-6 border-l-4 border-cobalt pl-4 text-ink/70">
                Хүргэлтийн мэдээлэл болон төлбөрийн алхам дараагийн checkout үе шатанд орно.
              </p>
            </section>
          </Show>
        </Show>
      </div>
    </main>
  )
}
