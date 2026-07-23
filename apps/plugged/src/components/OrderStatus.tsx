/* oxlint-disable tailwindcss/no-unknown-classes, eslint/no-underscore-dangle */
import type { PublicOrder } from '@store-kit/contracts/orders'
import { formatMnt } from '@store-kit/storefront/format'
import { mediaUrl } from '@store-kit/storefront/media'
import { createStorefrontQueryClient } from '@store-kit/storefront/query-client'
import { orderQuery } from '@store-kit/storefront/query-options/orders'
import { paymentMutation } from '@store-kit/storefront/query-options/payments'
import { useQueryResult } from '@store-kit/storefront/query-options/result'
import {
  orderStatusLabel,
  paymentStatusLabel,
  shouldPollOrderStatus,
} from '@store-kit/storefront/status'
import { privateOrderStorageKey } from '@store-kit/storefront/storage'
import { QueryClientProvider, createMutation } from '@tanstack/solid-query'
import { For, Match, Show, Switch, createSignal, onMount } from 'solid-js'

const actionClass =
  'inline-flex min-h-12.5 cursor-pointer items-center justify-center border-3 border-ink bg-orange px-4 py-3 font-black text-ink no-underline transition-transform duration-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'
const statusBandClass =
  'border-4 border-t-0 border-ink bg-paper-clean p-[clamp(1rem,3vw,2rem)] [&>h2]:font-display [&>h2]:text-[3rem] [&>h2]:leading-[0.8]'
const pollingInterval = 5_000
const paymentSummary = (order: PublicOrder) => {
  const payment = order.payment
  if (!payment) return 'Төлөв тодорхойгүй'
  const method = payment.method === 'qpay' ? 'QPay' : 'Дансаар шилжүүлэх'
  return `${method} · ${paymentStatusLabel(payment.status)}`
}

function StatusOwner(props: { orderId: string }) {
  const storageKey = privateOrderStorageKey('plugged', props.orderId)
  const [token, setToken] = createSignal('')
  const [paymentMessage, setPaymentMessage] = createSignal('')
  const status = useQueryResult(() => ({
    ...orderQuery.findPrivateStatus(props.orderId, token),
    enabled: token().length > 0,
    retry: false,
    refetchInterval: query => {
      const result = query.state.data
      return result?.status === 'ok' && shouldPollOrderStatus(result.value)
        ? pollingInterval
        : false
    },
    refetchIntervalInBackground: false,
  }))
  const claim = createMutation(() => paymentMutation.claimBankTransfer())
  const refresh = createMutation(() => paymentMutation.refreshQPay())

  onMount(() => {
    const hash = new URLSearchParams(location.hash.slice(1))
    const fromFragment = hash.get('token')
    if (fromFragment) {
      sessionStorage.setItem(storageKey, fromFragment)
      history.replaceState(history.state, '', location.pathname + location.search)
    }
    setToken(fromFragment ?? sessionStorage.getItem(storageKey) ?? '')
  })

  const claimPayment = async () => {
    try {
      const result = await claim.mutateAsync({ orderId: props.orderId, token: token() })
      if (result.status === 'ok') {
        setPaymentMessage('Төлбөрийн мэдэгдэл хүлээн авлаа. Ажилтан баталгаажуулна.')
        await status.refetch()
        return
      }
      const failure = result.error
      if (failure._tag === 'BankTransferClaimNotAllowed') {
        const paymentStatus = failure.paymentStatus
        setPaymentMessage(`Одоогийн төлөв: ${paymentStatusLabel(paymentStatus)}`)
        await status.refetch()
      } else {
        setPaymentMessage(`${failure.message || 'Мэдэгдэл илгээж чадсангүй.'} Дахин оролдоно уу.`)
      }
    } catch {
      setPaymentMessage('Сүлжээний алдаа гарлаа. Дахин оролдоно уу.')
    }
  }

  const refreshPayment = async () => {
    try {
      const result = await refresh.mutateAsync({ orderId: props.orderId, token: token() })
      if (result.status === 'ok') {
        const value = result.value
        if ('needsStaffAction' in value && value.needsStaffAction)
          setPaymentMessage(
            'Төлбөр орсон. Барааны үлдэгдлийг гараар шалгаж байна. Дэлгүүр тантай холбогдоно.',
          )
        else if (value.paymentStatus === 'pending')
          setPaymentMessage('Төлбөр одоогоор хүлээгдэж байна.')
        else setPaymentMessage('Төлбөр баталгаажлаа.')
        await status.refetch()
        return
      }
      const failure = result.error
      if (failure._tag === 'PaymentVerificationFailed')
        setPaymentMessage(
          failure.retryable === true
            ? `${failure.message} Дахин оролдоно уу.`
            : `${failure.message} Дэлгүүртэй холбогдоно уу.`,
        )
      else if (failure._tag === 'PaymentMismatch')
        setPaymentMessage('Төлбөрийн мэдээллийг ажилтнаар шалгуулах шаардлагатай.')
    } catch {
      setPaymentMessage('Сүлжээний алдаа гарлаа. Дахин оролдоно уу.')
    }
  }

  const privateOrder = (): PublicOrder | undefined =>
    status.data?.status === 'ok' ? status.data.value : undefined

  return (
    <Switch>
      <Match when={!token()}>
        <div class="grid min-h-[60vh] place-content-center text-center">
          <h1 class="font-display text-[5rem] leading-[0.8]">Захиалга олдсонгүй.</h1>
          <p>Энэ холбоос бүрэн биш эсвэл хугацааны мэдээлэл алга.</p>
          <a href="/">Нүүр рүү буцах</a>
        </div>
      </Match>
      <Match when={status.isPending}>
        <div class="grid min-h-[60vh] place-content-center text-center">
          Захиалгыг шалгаж байна…
        </div>
      </Match>
      <Match when={status.isError || status.data?.status === 'error'}>
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
            <section class={statusBandClass} aria-busy={claim.isPending || refresh.isPending}>
              <h2>Төлбөр</h2>
              <p>{paymentSummary(order())}</p>
              <Show when={paymentMessage()}>
                <div class="border-warning my-4 border-3 p-3 font-extrabold" role="status">
                  {paymentMessage()}
                </div>
              </Show>
              <Show when={shouldPollOrderStatus(order())}>
                <button
                  type="button"
                  disabled={status.isFetching}
                  onClick={() => void status.refetch()}
                >
                  {status.isFetching ? 'Шинэчилж байна…' : 'Төлөв шинэчлэх'}
                </button>
              </Show>
              <Show when={order().payment?.method === 'qpay' && order().payment?.status !== 'paid'}>
                <button
                  class={actionClass}
                  type="button"
                  disabled={refresh.isPending}
                  onClick={refreshPayment}
                >
                  {refresh.isPending ? 'Шалгаж байна…' : 'QPay төлбөр шалгах'}
                </button>
              </Show>
              <Show
                when={
                  order().payment?.method === 'bank_transfer' &&
                  order().payment?.status === 'pending'
                }
              >
                <button
                  class={actionClass}
                  type="button"
                  disabled={claim.isPending}
                  onClick={claimPayment}
                >
                  Би төлбөр шилжүүлсэн
                </button>
              </Show>
              <Show when={order().payment?.status === 'claimed'}>
                <p class="text-warning inline-block -rotate-2 border-3 border-current px-2 py-1 font-black">
                  БАТАЛГААЖУУЛАЛТ ХҮЛЭЭЖ БАЙНА
                </p>
              </Show>
            </section>
            <section class={statusBandClass}>
              <h2>Бараа</h2>
              <For each={order().lines}>
                {line => (
                  <div class="border-ink grid grid-cols-[80px_1fr_auto] items-center gap-4 border-b-2 py-3 max-md:grid-cols-[64px_1fr] max-md:[&>strong]:col-2">
                    <Show when={line.imageR2Key}>
                      <img
                        class="size-20 object-contain max-md:size-16"
                        src={mediaUrl(line.imageR2Key!)}
                        alt=""
                      />
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
            <section class={statusBandClass}>
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
            <StatusOwner orderId={props.orderId} />
          </QueryClientProvider>
        )
      }}
    </Show>
  )
}
