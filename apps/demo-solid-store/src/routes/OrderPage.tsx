import { useParams } from '@solidjs/router'
import type { PublicOrder } from '@store-kit/contracts/orders'
import type {
  BankTransferClaimError,
  PaymentRefreshError,
  PaymentStatus,
} from '@store-kit/contracts/payments'
import { For, Show, createSignal, onSettled } from 'solid-js'

import { paths } from '~/app/router'
import { formatMnt } from '~/catalog/format'
import { claimPrivateBankTransfer, getPrivateOrder, refreshPrivateQPay } from '~/server/orders'

const pollDelay = 5_000

const orderLabels = {
  new: 'Төлбөр хүлээж байна',
  confirmed: 'Баталгаажсан',
  preparing: 'Бэлтгэж байна',
  delivering: 'Хүргэлтэд гарсан',
  completed: 'Хүлээлгэн өгсөн',
  cancelled: 'Цуцлагдсан',
} as const

const paymentLabels = {
  pending: 'Төлбөр хүлээж байна',
  claimed: 'Шилжүүлгийг шалгаж байна',
  confirming: 'Баталгаажуулж байна',
  paid: 'Төлөгдсөн',
  failed: 'Төлбөр амжилтгүй',
} as const

const orderStages = [
  { status: 'new', label: 'Хүлээн авсан' },
  { status: 'confirmed', label: 'Баталгаажсан' },
  { status: 'preparing', label: 'Бэлтгэж байна' },
  { status: 'delivering', label: 'Хүргэлт' },
  { status: 'completed', label: 'Дууссан' },
] as const

const paymentStages = ['Нэхэмжлэл үүссэн', 'Төлбөр шалгаж байна', 'Төлбөр батлагдсан'] as const

const orderStageIndex = (status: PublicOrder['status']) => {
  if (status === 'confirmed') return 1
  if (status === 'preparing') return 2
  if (status === 'delivering') return 3
  if (status === 'completed') return 4
  return 0
}

const paymentStageIndex = (status: PaymentStatus) => {
  if (status === 'claimed' || status === 'confirming') return 1
  if (status === 'paid') return 2
  return 0
}

const shouldPoll = (order: PublicOrder) =>
  order.status !== 'completed' &&
  order.status !== 'cancelled' &&
  (order.payment?.status === 'pending' || order.payment?.status === 'claimed')

const dateTime = new Intl.DateTimeFormat('mn-MN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const formatDateTime = (value: number) => dateTime.format(new Date(value))

const claimErrorMessage = (error: BankTransferClaimError) => {
  switch (error._tag) {
    case 'InvalidStatusToken':
      return 'Хувийн холбоосоо шалгана уу.'
    case 'BankTransferClaimNotAllowed':
      return `Одоогийн төлөв: ${paymentLabels[error.paymentStatus]}`
    case 'StaffNotificationFailed':
      return error.retryable
        ? 'Ажилтанд мэдэгдэж чадсангүй. Дахин оролдоно уу.'
        : 'Ажилтанд мэдэгдэж чадсангүй. Дэлгүүртэй холбогдоно уу.'
  }
}

const qpayErrorMessage = (error: PaymentRefreshError) => {
  switch (error._tag) {
    case 'InvalidStatusToken':
      return 'Хувийн холбоосоо шалгана уу.'
    case 'PaymentVerificationFailed':
      return error.retryable
        ? 'QPay төлбөрийг шалгаж чадсангүй. Дахин оролдоно уу.'
        : 'QPay төлбөрийг шалгаж чадсангүй. Дэлгүүртэй холбогдоно уу.'
    case 'PaymentMismatch':
      return 'Төлбөрийн мэдээллийг ажилтнаар шалгуулах шаардлагатай.'
    case 'InsufficientStock':
      return 'Төлбөр орсон боловч үлдэгдлийг ажилтнаар шалгуулах шаардлагатай.'
  }
}

type OrderViewState =
  | { type: 'hydrating' }
  | { type: 'missing-token' }
  | { type: 'loading' }
  | { type: 'invalid-token' }
  | { type: 'transport-error' }
  | { type: 'ready'; order: PublicOrder }

type ActionNotice =
  | { type: 'success'; message: string }
  | { type: 'domain'; message: string }
  | { type: 'transport'; message: string }

function PendingButton(props: {
  children: string
  pendingLabel: string
  pending: boolean
  onClick: () => void
}) {
  return (
    <button
      class="min-h-12 border-2 border-ink bg-white px-4 font-bold disabled:cursor-not-allowed disabled:opacity-55"
      type="button"
      disabled={props.pending}
      aria-busy={props.pending ? 'true' : undefined}
      onClick={props.onClick}
    >
      {props.pending ? props.pendingLabel : props.children}
    </button>
  )
}

export default function OrderPage() {
  const params = useParams(paths.orders)
  const [token, setToken] = createSignal<string>()
  const [state, setState] = createSignal<OrderViewState>({ type: 'hydrating' })
  const [notice, setNotice] = createSignal<ActionNotice>()
  const [refreshingStatus, setRefreshingStatus] = createSignal(false)
  const [claiming, setClaiming] = createSignal(false)
  const [refreshingQPay, setRefreshingQPay] = createSignal(false)
  let pollTimer: ReturnType<typeof setTimeout> | undefined
  let statusInFlight = false
  let claimInFlight = false
  let qpayInFlight = false

  const readyOrder = () => {
    const current = state()
    return current.type === 'ready' ? current.order : undefined
  }

  const clearPoll = () => {
    if (pollTimer) clearTimeout(pollTimer)
    pollTimer = undefined
  }

  const schedulePoll = (order: PublicOrder, accessToken: string) => {
    clearPoll()
    if (!shouldPoll(order) || document.hidden) return
    pollTimer = setTimeout(() => void loadOrder(accessToken, false), pollDelay)
  }

  async function loadOrder(accessToken: string, showPending: boolean) {
    if (statusInFlight) return
    statusInFlight = true
    clearPoll()
    if (showPending) setRefreshingStatus(true)
    if (state().type !== 'ready') setState({ type: 'loading' })

    try {
      const result = await getPrivateOrder({ orderId: params.id, statusToken: accessToken })
      if (!result.ok) {
        setState({ type: 'invalid-token' })
        return
      }
      setState({ type: 'ready', order: result.order })
      schedulePoll(result.order, accessToken)
    } catch {
      setState({ type: 'transport-error' })
    } finally {
      statusInFlight = false
      if (showPending) setRefreshingStatus(false)
    }
  }

  const refreshStatus = () => {
    const accessToken = token()
    if (accessToken) void loadOrder(accessToken, true)
  }

  const claimBankTransfer = async () => {
    const accessToken = token()
    if (!accessToken || claimInFlight) return
    claimInFlight = true
    setClaiming(true)
    setNotice()

    try {
      const result = await claimPrivateBankTransfer({
        orderId: params.id,
        statusToken: accessToken,
      })
      if (!result.ok) {
        if (result.failure.error._tag === 'InvalidStatusToken') {
          setState({ type: 'invalid-token' })
          return
        }
        setNotice({ type: 'domain', message: claimErrorMessage(result.failure.error) })
      } else {
        const message =
          result.value.paymentStatus === 'paid'
            ? 'Төлбөр баталгаажлаа.'
            : result.value.paymentStatus === 'claimed'
              ? 'Төлбөрийн мэдэгдэл хүлээн авлаа. Ажилтан баталгаажуулна.'
              : 'Төлбөрийн мэдэгдэл одоогоор хүлээгдэж байна.'
        setNotice({ type: 'success', message })
      }
      await loadOrder(accessToken, false)
    } catch {
      setNotice({
        type: 'transport',
        message: 'Сүлжээний алдаа гарлаа. Төлбөрийн мэдэгдлээ дахин илгээнэ үү.',
      })
    } finally {
      claimInFlight = false
      setClaiming(false)
    }
  }

  const refreshQPay = async () => {
    const accessToken = token()
    if (!accessToken || qpayInFlight) return
    qpayInFlight = true
    setRefreshingQPay(true)
    setNotice()

    try {
      const result = await refreshPrivateQPay({
        orderId: params.id,
        statusToken: accessToken,
      })
      if (!result.ok) {
        if (result.failure.error._tag === 'InvalidStatusToken') {
          setState({ type: 'invalid-token' })
          return
        }
        setNotice({ type: 'domain', message: qpayErrorMessage(result.failure.error) })
      } else if (result.value.paymentStatus === 'pending') {
        setNotice({ type: 'success', message: 'QPay төлбөр одоогоор хүлээгдэж байна.' })
      } else if (result.value.needsStaffAction) {
        setNotice({
          type: 'domain',
          message: 'Төлбөр орсон. Барааны үлдэгдлийг ажилтан гараар шалгаж, тантай холбогдоно.',
        })
      } else {
        setNotice({ type: 'success', message: 'QPay төлбөр баталгаажлаа.' })
      }
      await loadOrder(accessToken, false)
    } catch {
      setNotice({
        type: 'transport',
        message: 'Сүлжээний алдаа гарлаа. QPay төлбөрөө дахин шалгана уу.',
      })
    } finally {
      qpayInFlight = false
      setRefreshingQPay(false)
    }
  }

  onSettled(() => {
    const storageKey = `dund:order-token:${params.id}`
    const fragment = new URLSearchParams(location.hash.slice(1))
    const fragmentToken = fragment.get('token')
    if (fragmentToken) sessionStorage.setItem(storageKey, fragmentToken)
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search)

    const accessToken = fragmentToken ?? sessionStorage.getItem(storageKey) ?? ''
    setToken(accessToken)
    if (accessToken) void loadOrder(accessToken, false)
    else setState({ type: 'missing-token' })

    const onVisibilityChange = () => {
      clearPoll()
      const order = readyOrder()
      if (!document.hidden && order && shouldPoll(order)) void loadOrder(accessToken, false)
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearPoll()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  })

  return (
    <main
      id="main-content"
      tabindex="-1"
      class="min-h-[70svh] bg-surface px-[clamp(1rem,4vw,4rem)] py-[clamp(3rem,7vw,6rem)]"
    >
      <Show when={state().type === 'hydrating' || state().type === 'loading'}>
        <div
          class="mx-auto grid min-h-[55svh] max-w-2xl place-content-center text-center"
          role="status"
        >
          <p class="font-bold text-cobalt">PRIVATE ORDER</p>
          <h1 class="mt-3 text-[clamp(2.5rem,8vw,5rem)] leading-none font-extrabold">
            Захиалгыг шалгаж байна…
          </h1>
        </div>
      </Show>

      <Show when={state().type === 'missing-token'}>
        <div class="mx-auto grid min-h-[55svh] max-w-2xl place-content-center text-center">
          <p class="font-bold text-alert">PRIVATE LINK / MISSING</p>
          <h1 class="mt-3 text-[clamp(2.5rem,8vw,5rem)] leading-none font-extrabold">
            Хувийн холбоос дутуу байна
          </h1>
          <p class="mt-5 text-lg">Захиалга үүсгэсний дараа авсан бүтэн холбоосоо нээнэ үү.</p>
          <a class="mt-6 font-bold text-cobalt" href="/">
            Нүүр рүү буцах
          </a>
        </div>
      </Show>

      <Show when={state().type === 'invalid-token'}>
        <div class="mx-auto grid min-h-[55svh] max-w-2xl place-content-center text-center">
          <p class="font-bold text-alert">PRIVATE LINK / INVALID</p>
          <h1 class="mt-3 text-[clamp(2.5rem,8vw,5rem)] leading-none font-extrabold">
            Захиалга олдсонгүй
          </h1>
          <p class="mt-5 text-lg">Хувийн холбоосоо шалгана уу.</p>
          <a class="mt-6 font-bold text-cobalt" href="/">
            Нүүр рүү буцах
          </a>
        </div>
      </Show>

      <Show when={state().type === 'transport-error'}>
        <div class="mx-auto grid min-h-[55svh] max-w-2xl place-content-center border-3 border-ink bg-white p-6 text-center">
          <p class="font-bold text-alert">CONNECTION / RETRY</p>
          <h1 class="mt-3 text-[clamp(2.25rem,7vw,4rem)] leading-none font-extrabold">
            Төлөв татаж чадсангүй
          </h1>
          <p class="mt-5">Хувийн холбоос session storage-д хадгалагдсан.</p>
          <div class="mt-6">
            <PendingButton
              pending={refreshingStatus()}
              pendingLabel="Дахин шалгаж байна…"
              onClick={refreshStatus}
            >
              Дахин шалгах
            </PendingButton>
          </div>
        </div>
      </Show>

      <Show when={readyOrder()}>
        {order => (
          <article class="mx-auto max-w-6xl">
            <header class="border-3 border-ink bg-amber p-[clamp(1.25rem,4vw,3rem)]">
              <div class="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p class="font-bold text-cobalt">PRIVATE ORDER / STATUS</p>
                  <h1 class="mt-3 text-[clamp(2.5rem,8vw,5rem)] leading-none font-extrabold wrap-break-word">
                    {order().number}
                  </h1>
                  <p class="mt-4 inline-flex min-h-11 items-center border-2 border-ink bg-white px-3 text-lg font-extrabold">
                    {orderLabels[order().status]}
                  </p>
                </div>
                <PendingButton
                  pending={refreshingStatus()}
                  pendingLabel="Шинэчилж байна…"
                  onClick={refreshStatus}
                >
                  Төлөв шинэчлэх
                </PendingButton>
              </div>

              <Show
                when={order().status === 'cancelled'}
                fallback={
                  <ol class="mt-8 grid gap-2 sm:grid-cols-5" aria-label="Захиалгын үе шат">
                    <For each={orderStages}>
                      {(stage, index) => {
                        const reached = () => index() <= orderStageIndex(order().status)
                        return (
                          <li
                            class={
                              reached()
                                ? 'min-h-20 border-t-4 border-cobalt pt-2 font-bold text-cobalt'
                                : 'min-h-20 border-t-4 border-ink/25 pt-2 text-ink/45'
                            }
                            aria-current={
                              index() === orderStageIndex(order().status) ? 'step' : undefined
                            }
                          >
                            <span class="block text-2xl" aria-hidden="true">
                              0{index() + 1}
                            </span>
                            {stage.label}
                          </li>
                        )
                      }}
                    </For>
                  </ol>
                }
              >
                <p
                  class="mt-7 border-3 border-alert bg-white p-4 font-bold text-alert"
                  role="status"
                >
                  Энэ захиалга цуцлагдсан.
                </p>
              </Show>
            </header>

            <div class="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div class="grid gap-8">
                <section
                  class="border-3 border-ink bg-white p-[clamp(1rem,4vw,2rem)]"
                  aria-labelledby="payment-title"
                >
                  <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p class="font-bold text-cobalt">PAYMENT TIMELINE</p>
                      <h2 id="payment-title" class="mt-2 text-3xl font-extrabold">
                        Төлбөр
                      </h2>
                    </div>
                    <Show when={order().payment}>
                      {payment => <strong>{paymentLabels[payment().status]}</strong>}
                    </Show>
                  </div>

                  <Show
                    when={order().payment}
                    fallback={<p class="mt-4">Төлбөрийн мэдээлэл алга.</p>}
                  >
                    {payment => (
                      <>
                        <p class="mt-3 text-lg">
                          {payment().method === 'qpay' ? 'QPay' : 'Дансаар шилжүүлэх'} ·{' '}
                          {formatMnt(payment().amountMnt)}
                        </p>
                        <ol class="mt-6 grid gap-2 sm:grid-cols-3" aria-label="Төлбөрийн үе шат">
                          <For each={paymentStages}>
                            {(stage, index) => {
                              const reached = () => index() <= paymentStageIndex(payment().status)
                              return (
                                <li
                                  class={
                                    reached()
                                      ? 'min-h-18 border-t-4 border-coral pt-2 font-bold text-alert'
                                      : 'min-h-18 border-t-4 border-ink/25 pt-2 text-ink/45'
                                  }
                                  aria-current={
                                    index() === paymentStageIndex(payment().status)
                                      ? 'step'
                                      : undefined
                                  }
                                >
                                  <span class="block text-2xl" aria-hidden="true">
                                    0{index() + 1}
                                  </span>
                                  {stage}
                                </li>
                              )
                            }}
                          </For>
                        </ol>
                        <Show when={payment().status === 'failed'}>
                          <p
                            class="mt-5 border-3 border-alert p-4 font-bold text-alert"
                            role="status"
                          >
                            Төлбөр амжилтгүй болсон. Дэлгүүртэй холбогдоно уу.
                          </p>
                        </Show>
                        <Show when={payment().status === 'paid' && order().status === 'new'}>
                          <p
                            class="mt-5 border-3 border-alert p-4 font-bold text-alert"
                            role="alert"
                          >
                            Төлбөр орсон боловч үлдэгдлийг ажилтан гараар шалгаж байна. Дэлгүүр
                            тантай холбогдоно.
                          </p>
                        </Show>
                        <Show when={notice()}>
                          {message => (
                            <p
                              class={
                                message().type === 'success'
                                  ? 'mt-5 border-3 border-cobalt bg-surface p-4 font-bold text-cobalt'
                                  : 'mt-5 border-3 border-alert bg-surface p-4 font-bold text-alert'
                              }
                              role="status"
                              aria-live="polite"
                            >
                              {message().message}
                            </p>
                          )}
                        </Show>
                        <div class="mt-5 flex flex-wrap gap-3">
                          <Show when={payment().method === 'qpay' && payment().status !== 'paid'}>
                            <PendingButton
                              pending={refreshingQPay()}
                              pendingLabel="QPay шалгаж байна…"
                              onClick={() => void refreshQPay()}
                            >
                              QPay төлбөр шалгах
                            </PendingButton>
                          </Show>
                          <Show
                            when={
                              payment().method === 'bank_transfer' && payment().status === 'pending'
                            }
                          >
                            <PendingButton
                              pending={claiming()}
                              pendingLabel="Мэдэгдэж байна…"
                              onClick={() => void claimBankTransfer()}
                            >
                              Би төлбөр шилжүүлсэн
                            </PendingButton>
                          </Show>
                        </div>
                        <Show when={payment().claimedAt}>
                          {claimedAt => (
                            <p class="mt-4 text-sm text-ink/60">
                              Мэдэгдсэн: {formatDateTime(claimedAt())}
                            </p>
                          )}
                        </Show>
                        <Show when={payment().paidAt}>
                          {paidAt => (
                            <p class="mt-1 text-sm text-ink/60">
                              Батлагдсан: {formatDateTime(paidAt())}
                            </p>
                          )}
                        </Show>
                      </>
                    )}
                  </Show>
                </section>

                <section
                  class="border-3 border-ink bg-white p-[clamp(1rem,4vw,2rem)]"
                  aria-labelledby="items-title"
                >
                  <p class="font-bold text-cobalt">ITEM SNAPSHOTS</p>
                  <h2 id="items-title" class="mt-2 text-3xl font-extrabold">
                    Бараа
                  </h2>
                  <div class="mt-5 divide-y divide-ink/25 border-y border-ink/25">
                    <For each={order().lines}>
                      {line => (
                        <article class="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 py-5 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center">
                          <Show
                            when={line.image}
                            fallback={<div class="aspect-square bg-surface" aria-hidden="true" />}
                          >
                            {image => (
                              <img
                                class="aspect-square h-18 w-18 object-cover sm:h-22 sm:w-22"
                                src={image().url}
                                width={image().width}
                                height={image().height}
                                alt={image().alt}
                                loading="lazy"
                              />
                            )}
                          </Show>
                          <div class="min-w-0">
                            <h3 class="m-0 text-lg font-extrabold">{line.productName}</h3>
                            <p class="mt-1 text-sm text-ink/65">
                              {line.variantName} · {line.quantity} ш
                            </p>
                            <p class="mt-1 text-xs wrap-break-word text-ink/55">{line.sku}</p>
                          </div>
                          <strong class="col-start-2 sm:col-auto">
                            {formatMnt(line.lineTotalMnt)}
                          </strong>
                        </article>
                      )}
                    </For>
                  </div>
                  <dl class="mt-5 grid gap-2">
                    <div class="flex justify-between gap-4">
                      <dt>Барааны дүн</dt>
                      <dd class="font-bold">{formatMnt(order().subtotalMnt)}</dd>
                    </div>
                    <div class="flex justify-between gap-4">
                      <dt>Хүргэлт</dt>
                      <dd class="font-bold">{formatMnt(order().deliveryFeeMnt)}</dd>
                    </div>
                    <div class="flex justify-between gap-4 border-t-2 border-ink pt-3 text-xl">
                      <dt>Нийт</dt>
                      <dd class="font-extrabold">{formatMnt(order().totalMnt)}</dd>
                    </div>
                  </dl>
                </section>
              </div>

              <aside class="grid gap-6 lg:sticky lg:top-24">
                <section class="border-3 border-ink bg-white p-5" aria-labelledby="delivery-title">
                  <p class="font-bold text-cobalt">DELIVERY</p>
                  <h2 id="delivery-title" class="mt-2 text-2xl font-extrabold">
                    Хүргэлт
                  </h2>
                  <p class="mt-4 font-bold">
                    {order().district}, {order().khoroo}
                  </p>
                  <p class="mt-2">{order().address}</p>
                  <Show when={order().deliveryNotes}>
                    {notes => <p class="mt-3 border-l-4 border-amber pl-3 text-sm">{notes()}</p>}
                  </Show>
                </section>
                <section class="border-3 border-ink bg-white p-5" aria-labelledby="customer-title">
                  <p class="font-bold text-cobalt">CUSTOMER</p>
                  <h2 id="customer-title" class="mt-2 text-2xl font-extrabold">
                    Холбоо барих
                  </h2>
                  <p class="mt-4 font-bold">{order().customerName}</p>
                  <a
                    class="mt-2 inline-flex min-h-11 items-center font-bold text-cobalt"
                    href={`tel:+976${order().customerPhone}`}
                  >
                    {order().customerPhone}
                  </a>
                </section>
                <section class="border-3 border-ink bg-ink p-5 text-white">
                  <h2 class="text-xl font-extrabold">Захиалгын хугацаа</h2>
                  <p class="mt-3 text-sm text-white/75">
                    Үүссэн: {formatDateTime(order().createdAt)}
                  </p>
                  <p class="mt-1 text-sm text-white/75">
                    Шинэчлэгдсэн: {formatDateTime(order().updatedAt)}
                  </p>
                  <p class="mt-4 text-sm text-amber">
                    Төлбөр батлагдсаны дараа захиалгыг бэлтгэнэ.
                  </p>
                </section>
              </aside>
            </div>
          </article>
        )}
      </Show>
    </main>
  )
}
