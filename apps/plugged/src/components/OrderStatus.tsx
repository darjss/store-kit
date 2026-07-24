/* oxlint-disable tailwindcss/no-unknown-classes, eslint/no-underscore-dangle */
import type { PublicOrder } from '@store-kit/contracts/orders'
import { mediaUrl } from '@store-kit/storefront/media'
import { createStorefrontQueryClient } from '@store-kit/storefront/query-client'
import { orderQuery } from '@store-kit/storefront/query-options/orders'
import { paymentMutation } from '@store-kit/storefront/query-options/payments'
import { QueryClientProvider, createMutation, createQuery } from '@tanstack/solid-query'
import { For, Match, Show, Switch, createSignal, onMount } from 'solid-js'

const money = new Intl.NumberFormat('mn-MN')
const orderStatusLabels: Record<string, string> = {
  new: 'Төлбөр хүлээж байна',
  confirmed: 'Баталгаажсан',
  preparing: 'Бэлтгэж байна',
  delivering: 'Хүргэлтэд гарсан',
  completed: 'Хүлээлгэн өгсөн',
  cancelled: 'Цуцлагдсан',
}
const paymentStatusLabels: Record<string, string> = {
  pending: 'Төлбөр хүлээж байна',
  claimed: 'Шилжүүлгийг шалгаж байна',
  confirming: 'Баталгаажуулж байна',
  paid: 'Төлөгдсөн',
  failed: 'Төлбөр амжилтгүй',
}

function StatusOwner(props: { orderId: string }) {
  const storageKey = `plugged:order-token:${props.orderId}`
  const [token, setToken] = createSignal('')
  const [paymentMessage, setPaymentMessage] = createSignal('')
  const status = createQuery(() => ({
    ...orderQuery.findPrivateStatus(props.orderId, token),
    enabled: token().length > 0,
    retry: false,
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
        setPaymentMessage(
          `Одоогийн төлөв: ${paymentStatusLabels[paymentStatus] ?? 'Баталгаажуулж байна'}`,
        )
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
        <div class="private-empty">
          <h1>Захиалга олдсонгүй.</h1>
          <p>Энэ холбоос бүрэн биш эсвэл хугацааны мэдээлэл алга.</p>
          <a href="/">Нүүр рүү буцах</a>
        </div>
      </Match>
      <Match when={status.isPending}>
        <div class="status-loading">Захиалгыг шалгаж байна…</div>
      </Match>
      <Match when={status.isError || status.data?.status === 'error'}>
        <div class="private-empty">
          <h1>Захиалга олдсонгүй.</h1>
          <p>Хувийн холбоосоо шалгана уу.</p>
          <a href="/">Нүүр рүү буцах</a>
        </div>
      </Match>
      <Match when={privateOrder()}>
        {order => (
          <article class="order-status">
            <header>
              <p class="stamp">ЗАХИАЛГЫН ТӨЛӨВ</p>
              <h1>{order().number}</h1>
              <strong>{orderStatusLabels[order().status] ?? 'Захиалгыг шалгаж байна'}</strong>
            </header>
            <section class="status-band" aria-busy={claim.isPending || refresh.isPending}>
              <h2>Төлбөр</h2>
              <p>
                {order().payment?.method === 'qpay' ? 'QPay' : 'Дансаар шилжүүлэх'} ·{' '}
                {paymentStatusLabels[order().payment?.status ?? ''] ?? 'Төлөв тодорхойгүй'}
              </p>
              <Show when={paymentMessage()}>
                <div class="inline-status" role="status">
                  {paymentMessage()}
                </div>
              </Show>
              <Show when={order().payment?.method === 'qpay' && order().payment?.status !== 'paid'}>
                <button
                  class="slam-button"
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
                  class="slam-button"
                  type="button"
                  disabled={claim.isPending}
                  onClick={claimPayment}
                >
                  Би төлбөр шилжүүлсэн
                </button>
              </Show>
              <Show when={order().payment?.status === 'claimed'}>
                <p class="stamp warning">БАТАЛГААЖУУЛАЛТ ХҮЛЭЭЖ БАЙНА</p>
              </Show>
            </section>
            <section class="status-band">
              <h2>Бараа</h2>
              <For each={order().lines}>
                {line => (
                  <div class="order-line">
                    <Show when={line.imageR2Key}>
                      <img src={mediaUrl(line.imageR2Key!)} alt="" />
                    </Show>
                    <div>
                      <strong>{line.productName}</strong>
                      <p>
                        {line.variantName} · {line.quantity} ш
                      </p>
                    </div>
                    <strong>{money.format(line.lineTotalMnt)} ₮</strong>
                  </div>
                )}
              </For>
              <div class="status-total">
                <span>Нийт</span>
                <strong>{money.format(order().totalMnt)} ₮</strong>
              </div>
            </section>
            <section class="status-band">
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
    <Show when={mounted()} fallback={<div class="status-loading">Захиалгыг шалгаж байна…</div>}>
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
