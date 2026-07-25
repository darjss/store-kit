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
import { Button, Spinner } from '@store-kit/ui'
import { QueryClientProvider } from '@tanstack/solid-query'
import { match } from 'dismatch'
import { For, Match, Show, Switch, createSignal, onMount } from 'solid-js'
import type { JSX } from 'solid-js'

import { ProductImage } from './ProductImage'

const orderStages = ['Хүлээн авсан', 'Баталгаажсан', 'Бэлтгэж байна', 'Хүргэлт', 'Дууссан'] as const

const orderStageIndex = (status: PublicOrder['status']) => {
  if (status === 'confirmed') return 1
  if (status === 'preparing') return 2
  if (status === 'delivering') return 3
  if (status === 'completed') return 4
  return 0
}

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

function OrderAction(props: {
  children: JSX.Element
  pending: boolean
  pendingLabel: string
  onClick: () => void
}) {
  return (
    <Button
      class="pressable border-paper bg-cyan text-ink mr-2 mb-2 min-h-12.5 cursor-pointer gap-2 rounded-none border-3 px-4 py-3 font-black disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none"
      type="button"
      disabled={props.pending}
      aria-busy={props.pending}
      onClick={props.onClick}
    >
      <Show when={props.pending} fallback={props.children}>
        <Spinner />
        {props.pendingLabel}
      </Show>
    </Button>
  )
}

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
        <div class="text-paper grid min-h-[60vh] place-content-center text-center">
          <h1 class="font-body text-[clamp(2.5rem,10vw,5rem)] leading-none font-black">
            Захиалга олдсонгүй.
          </h1>
          <p>Энэ холбоос бүрэн биш эсвэл хугацааны мэдээлэл алга.</p>
          <a href="/">Нүүр рүү буцах</a>
        </div>
      </Match>
      <Match when={status.state()._tag === 'Hydrating' || status.state()._tag === 'Loading'}>
        <div class="text-paper grid min-h-[60vh] place-content-center text-center">
          Захиалгыг шалгаж байна…
        </div>
      </Match>
      <Match when={status.state()._tag === 'TransportError'}>
        <div class="dossier-sheet mx-auto grid min-h-80 w-[min(620px,100%)] place-content-center p-6 text-center">
          <p class="dossier-stamp text-warning mx-auto mb-4">CONNECTION / FAILED</p>
          <h1 class="font-body text-[clamp(2rem,8vw,4rem)] leading-none font-black">
            Төлөв татаж чадсангүй.
          </h1>
          <p>Хувийн холбоос хадгалагдсан. Сүлжээгээ шалгаад дахин оролдоно уу.</p>
          <OrderAction
            pending={status.isRefreshingStatus()}
            pendingLabel="Дахин шалгаж байна…"
            onClick={() => void status.refreshStatus()}
          >
            Дахин шалгах
          </OrderAction>
        </div>
      </Match>
      <Match when={status.state()._tag === 'InvalidStatusToken'}>
        <div class="text-paper grid min-h-[60vh] place-content-center text-center">
          <h1 class="font-body text-[clamp(2rem,8vw,4rem)] leading-none font-black">
            Захиалга олдсонгүй.
          </h1>
          <p>Хувийн холбоосоо шалгана уу.</p>
          <a class="text-cyan" href="/">
            Нүүр рүү буцах
          </a>
        </div>
      </Match>
      <Match when={privateOrder()}>
        {order => (
          <article class="text-ink mx-auto w-[min(960px,100%)]">
            <header class="dossier-sheet bg-cyan p-[clamp(1rem,4vw,2.5rem)]">
              <p class="dossier-stamp text-petrol mb-4">PRIVATE ORDER / STATUS</p>
              <h1 class="font-body my-2 text-[clamp(2.5rem,9vw,5.5rem)] leading-[0.9] font-black tracking-[-0.035em] text-balance">
                {order().number}
              </h1>
              <strong class="border-ink inline-block border-y-3 py-1 text-xl">
                {orderStatusLabel(order().status)}
              </strong>
              <ol
                class="mt-8 grid grid-cols-5 gap-1 max-md:grid-cols-1"
                aria-label="Захиалгын үе шат"
              >
                <For each={orderStages}>
                  {(label, index) => (
                    <li
                      class="border-ink flex min-h-14 items-center gap-2 border-t-3 pt-2 text-sm font-extrabold max-md:min-h-0"
                      classList={{
                        'text-petrol': index() <= orderStageIndex(order().status),
                        'opacity-45': index() > orderStageIndex(order().status),
                      }}
                      aria-current={
                        index() === orderStageIndex(order().status) ? 'step' : undefined
                      }
                    >
                      <span class="font-display text-3xl leading-none" aria-hidden="true">
                        0{index() + 1}
                      </span>
                      {label}
                    </li>
                  )}
                </For>
              </ol>
            </header>
            <section
              class="dossier-sheet [&>h2]:font-body mt-7 animate-[dossier-reveal_420ms_var(--ease-slam)_both] p-[clamp(1rem,3vw,2rem)] [&>h2]:text-[2rem] [&>h2]:leading-none [&>h2]:font-black"
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
                <OrderAction
                  pending={status.isRefreshingStatus()}
                  pendingLabel="Шинэчилж байна…"
                  onClick={() => void status.refreshStatus()}
                >
                  Төлөв шинэчлэх
                </OrderAction>
              </Show>
              <Show when={order().payment?.method === 'qpay' && order().payment?.status !== 'paid'}>
                <OrderAction
                  pending={status.isRefreshingQPay()}
                  pendingLabel="Шалгаж байна…"
                  onClick={() => void status.refreshQPay()}
                >
                  QPay төлбөр шалгах
                </OrderAction>
              </Show>
              <Show
                when={
                  order().payment?.method === 'bank_transfer' &&
                  order().payment?.status === 'pending'
                }
              >
                <OrderAction
                  pending={status.isClaimingBankTransfer()}
                  pendingLabel="Илгээж байна…"
                  onClick={() => void status.claimBankTransfer()}
                >
                  Би төлбөр шилжүүлсэн
                </OrderAction>
              </Show>
              <Show when={order().payment?.status === 'claimed'}>
                <p class="text-warning inline-block -rotate-2 border-3 border-current px-2 py-1 font-black">
                  БАТАЛГААЖУУЛАЛТ ХҮЛЭЭЖ БАЙНА
                </p>
              </Show>
            </section>
            <section class="dossier-sheet [&>h2]:font-body mt-7 animate-[dossier-reveal_420ms_var(--ease-slam)_70ms_both] p-[clamp(1rem,3vw,2rem)] [&>h2]:text-[2rem] [&>h2]:leading-none [&>h2]:font-black">
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
            <section class="dossier-sheet [&>h2]:font-body mt-7 animate-[dossier-reveal_420ms_var(--ease-slam)_140ms_both] p-[clamp(1rem,3vw,2rem)] [&>h2]:text-[2rem] [&>h2]:leading-none [&>h2]:font-black">
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
        <div class="text-paper grid min-h-[60vh] place-content-center text-center">
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
