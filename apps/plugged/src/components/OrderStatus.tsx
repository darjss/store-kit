/* oxlint-disable tailwindcss/no-unknown-classes, eslint/no-underscore-dangle */
import type { PublicOrder } from '@store-kit/contracts/orders'
import { formatMnt } from '@store-kit/storefront/format'
import {
  OrderStatus as HeadlessOrderStatus,
  useOrderStatus,
} from '@store-kit/storefront/orders/order-status'
import type {
  BankTransferClaimFailure,
  BankTransferClaimOutcome,
  QPayRefreshFailure,
  QPayRefreshOutcome,
} from '@store-kit/storefront/orders/order-status'
import { createStorefrontQueryClient } from '@store-kit/storefront/query-client'
import {
  orderStatusLabel,
  paymentStatusLabel,
  shouldPollOrderStatus,
} from '@store-kit/storefront/status'
import { Button } from '@store-kit/ui'
import { QueryClientProvider } from '@tanstack/solid-query'
import { match } from 'dismatch'
import { For, Match, Show, Switch, createSignal, onMount } from 'solid-js'

import { ProductImage } from './ProductImage'

const paymentSummary = (order: PublicOrder) => {
  const payment = order.payment
  if (!payment) return 'Төлөв тодорхойгүй'
  const method = payment.method === 'qpay' ? 'QPay' : 'Дансаар шилжүүлэх'
  return `${method} · ${paymentStatusLabel(payment.status)}`
}

const claimSuccessMessage = (outcome: BankTransferClaimOutcome) =>
  match(
    outcome,
    '_tag',
  )({
    BankTransferPending: () => 'Төлбөрийн мэдэгдэл одоогоор хүлээгдэж байна.',
    BankTransferClaimed: () => 'Төлбөрийн мэдэгдэл хүлээн авлаа. Ажилтан баталгаажуулна.',
    BankTransferPaid: () => 'Төлбөр баталгаажлаа.',
  })

const claimFailureMessage = (failure: BankTransferClaimFailure) =>
  match(
    failure,
    '_tag',
  )({
    InvalidStatusToken: () => 'Хувийн холбоосоо шалгана уу.',
    BankTransferClaimNotAllowed: ({ paymentStatus }) =>
      `Одоогийн төлөв: ${paymentStatusLabel(paymentStatus)}`,
    StaffNotificationFailed: ({ retryable }) =>
      retryable
        ? 'Мэдэгдэл илгээж чадсангүй. Дахин оролдоно уу.'
        : 'Мэдэгдэл илгээж чадсангүй. Дэлгүүртэй холбогдоно уу.',
    TransportError: () => 'Сүлжээний алдаа гарлаа. Дахин оролдоно уу.',
  })

const refreshSuccessMessage = (outcome: QPayRefreshOutcome) =>
  match(
    outcome,
    '_tag',
  )({
    PaymentPending: () => 'Төлбөр одоогоор хүлээгдэж байна.',
    PaymentConfirmed: () => 'Төлбөр баталгаажлаа.',
    PaymentNeedsStaffAction: () =>
      'Төлбөр орсон. Барааны үлдэгдлийг гараар шалгаж байна. Дэлгүүр тантай холбогдоно.',
  })

const refreshFailureMessage = (failure: QPayRefreshFailure) =>
  match(
    failure,
    '_tag',
  )({
    InvalidStatusToken: () => 'Хувийн холбоосоо шалгана уу.',
    PaymentVerificationFailed: ({ retryable }) =>
      retryable
        ? 'Төлбөрийг шалгаж чадсангүй. Дахин оролдоно уу.'
        : 'Төлбөрийг шалгаж чадсангүй. Дэлгүүртэй холбогдоно уу.',
    PaymentMismatch: () => 'Төлбөрийн мэдээллийг ажилтнаар шалгуулах шаардлагатай.',
    InsufficientStock: () =>
      'Төлбөр орсон боловч барааны үлдэгдлийг ажилтнаар шалгуулах шаардлагатай.',
    TransportError: () => 'Сүлжээний алдаа гарлаа. Дахин оролдоно уу.',
  })

function StatusContent() {
  const status = useOrderStatus()
  const privateOrder = () => {
    const state = status.state()
    return state._tag === 'Ready' ? state.order : undefined
  }
  const claimMessage = () =>
    status.claimOutcome()?.match({ err: claimFailureMessage, ok: claimSuccessMessage })
  const refreshMessage = () =>
    status.refreshOutcome()?.match({ err: refreshFailureMessage, ok: refreshSuccessMessage })

  return (
    <Switch>
      <Match when={status.state()._tag === 'MissingToken'}>
        <div class="grid min-h-[60vh] place-content-center text-center">
          <h1 class="font-display text-[5rem] leading-[0.8]">Захиалга олдсонгүй.</h1>
          <p>Энэ холбоос бүрэн биш эсвэл хугацааны мэдээлэл алга.</p>
          <a href="/">Нүүр рүү буцах</a>
        </div>
      </Match>
      <Match when={status.state()._tag === 'Hydrating' || status.state()._tag === 'Loading'}>
        <div class="grid min-h-[60vh] place-content-center text-center">
          Захиалгыг шалгаж байна…
        </div>
      </Match>
      <Match
        when={
          status.state()._tag === 'TransportError' || status.state()._tag === 'InvalidStatusToken'
        }
      >
        <div class="grid min-h-[60vh] place-content-center text-center">
          <h1 class="font-display text-[5rem] leading-[0.8]">Захиалга олдсонгүй.</h1>
          <p>Хувийн холбоосоо шалгана уу.</p>
          <a href="/">Нүүр рүү буцах</a>
        </div>
      </Match>
      <Match when={privateOrder()}>
        {order => (
          <article class="mx-auto w-[min(900px,100%)]">
            <header class="border-ink bg-orange border-[5px] p-4">
              <p class="inline-block -rotate-2 border-3 border-current px-2 py-1 font-black">
                ЗАХИАЛГЫН ТӨЛӨВ
              </p>
              <h1 class="font-display my-2 text-[clamp(4rem,10vw,6rem)] leading-[0.75] text-balance">
                {order().number}
              </h1>
              <strong>{orderStatusLabel(order().status)}</strong>
            </header>
            <section
              class="border-ink bg-paper-clean [&>h2]:font-display border-4 border-t-0 p-[clamp(1rem,3vw,2rem)] [&>h2]:text-[3rem] [&>h2]:leading-[0.8]"
              aria-busy={status.isClaimingBankTransfer() || status.isRefreshingQPay()}
            >
              <h2>Төлбөр</h2>
              <p>{paymentSummary(order())}</p>
              <Show when={claimMessage() ?? refreshMessage()}>
                {message => (
                  <div class="border-warning my-4 border-3 p-3 font-extrabold" role="status">
                    {message()}
                  </div>
                )}
              </Show>
              <Show when={shouldPollOrderStatus(order())}>
                <Button
                  class="border-ink bg-orange text-ink mr-2 min-h-12.5 cursor-pointer border-3 px-4 py-3 font-black transition-transform duration-100 active:scale-[0.97] motion-reduce:transition-none"
                  type="button"
                  disabled={status.isRefreshingStatus()}
                  onClick={() => void status.refreshStatus()}
                >
                  {status.isRefreshingStatus() ? 'Шинэчилж байна…' : 'Төлөв шинэчлэх'}
                </Button>
              </Show>
              <Show when={order().payment?.method === 'qpay' && order().payment?.status !== 'paid'}>
                <Button
                  class="border-ink bg-orange text-ink min-h-12.5 cursor-pointer border-3 px-4 py-3 font-black transition-transform duration-100 active:scale-[0.97] motion-reduce:transition-none"
                  type="button"
                  disabled={status.isRefreshingQPay()}
                  onClick={() => void status.refreshQPay()}
                >
                  {status.isRefreshingQPay() ? 'Шалгаж байна…' : 'QPay төлбөр шалгах'}
                </Button>
              </Show>
              <Show
                when={
                  order().payment?.method === 'bank_transfer' &&
                  order().payment?.status === 'pending'
                }
              >
                <Button
                  class="border-ink bg-orange text-ink min-h-12.5 cursor-pointer border-3 px-4 py-3 font-black transition-transform duration-100 active:scale-[0.97] motion-reduce:transition-none"
                  type="button"
                  disabled={status.isClaimingBankTransfer()}
                  onClick={() => void status.claimBankTransfer()}
                >
                  Би төлбөр шилжүүлсэн
                </Button>
              </Show>
              <Show when={order().payment?.status === 'claimed'}>
                <p class="text-warning inline-block -rotate-2 border-3 border-current px-2 py-1 font-black">
                  БАТАЛГААЖУУЛАЛТ ХҮЛЭЭЖ БАЙНА
                </p>
              </Show>
            </section>
            <section class="border-ink bg-paper-clean [&>h2]:font-display border-4 border-t-0 p-[clamp(1rem,3vw,2rem)] [&>h2]:text-[3rem] [&>h2]:leading-[0.8]">
              <h2>Бараа</h2>
              <For each={order().lines}>
                {line => (
                  <div class="border-ink grid grid-cols-[80px_1fr_auto] items-center gap-4 border-b-2 py-3 max-md:grid-cols-[64px_1fr] max-md:[&>strong]:col-2">
                    <Show when={line.image}>
                      {image => (
                        <ProductImage
                          class="size-20 object-contain max-md:size-16"
                          image={image()}
                          layout="thumbnail"
                        />
                      )}
                    </Show>
                    <div>
                      <strong>{line.productName}</strong>
                      <p>
                        {line.variantName} · {line.quantity} ш
                      </p>
                    </div>
                    <strong>{formatMnt(line.lineTotalMnt)}</strong>
                  </div>
                )}
              </For>
              <div class="flex justify-between pt-4 text-2xl">
                <span>Нийт</span>
                <strong>{formatMnt(order().totalMnt)}</strong>
              </div>
            </section>
            <section class="border-ink bg-paper-clean [&>h2]:font-display border-4 border-t-0 p-[clamp(1rem,3vw,2rem)] [&>h2]:text-[3rem] [&>h2]:leading-[0.8]">
              <h2>Хүргэлт</h2>
              <p>
                {order().district}, {order().khoroo}-р хороо
              </p>
              <p>{order().address}</p>
              <small>Төлбөр батлагдсаны дараа захиалгыг бэлтгэнэ.</small>
            </section>
          </article>
        )}
      </Match>
    </Switch>
  )
}

export function OrderStatus(props: { orderId: string }) {
  const [mounted, setMounted] = createSignal(false)
  onMount(() => setMounted(true))

  return (
    <Show
      when={mounted()}
      fallback={
        <div class="grid min-h-[60vh] place-content-center text-center">
          Захиалгыг шалгаж байна…
        </div>
      }
    >
      {_mounted => {
        const client = createStorefrontQueryClient()
        return (
          <QueryClientProvider client={client}>
            <HeadlessOrderStatus.Root orderId={props.orderId} store="plugged">
              <StatusContent />
            </HeadlessOrderStatus.Root>
          </QueryClientProvider>
        )
      }}
    </Show>
  )
}
