import { Show } from 'solid-js'

import { useCart } from '~/cart/CartProvider'

export default function CheckoutPage() {
  const cart = useCart()

  return (
    <main
      id="main-content"
      tabindex="-1"
      class="min-h-[70svh] bg-surface px-[clamp(1rem,4vw,4rem)] py-[clamp(3rem,7vw,6rem)]"
    >
      <div class="mx-auto max-w-3xl border-3 border-ink bg-white p-[clamp(1.25rem,4vw,3.5rem)]">
        <p class="font-bold text-cobalt">CHECKOUT / ДАРААГИЙН БОСОО ЗҮСЭЛТ</p>
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
          <p class="mt-6 text-lg leading-relaxed">
            Сагсны {cart.count()} бараа энэ байршилд хадгалагдсан. Улаанбаатарын хүргэлт, QPay,
            дансны шилжүүлэг, серверийн дахин баталгаажуулалтыг дараагийн commerce зүсэлтээр
            холбоно.
          </p>
          <button
            class="mt-5 min-h-12 bg-cobalt px-5 font-bold text-white"
            type="button"
            onClick={() => cart.setOpen(true)}
          >
            Сагсаа шалгах
          </button>
        </Show>
      </div>
    </main>
  )
}
