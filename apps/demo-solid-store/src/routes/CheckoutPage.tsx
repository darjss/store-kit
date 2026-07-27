import { useSubmissions } from '@solidjs/router'
import type { CartValidationError } from '@store-kit/contracts/cart'
import { checkoutDetailsSchema, ulaanbaatarDistrictSchema } from '@store-kit/contracts/checkout'
import type {
  CheckoutCreated,
  CheckoutDetails,
  CheckoutError,
  UlaanbaatarDistrict,
} from '@store-kit/contracts/checkout'
import type { ValidationIssue } from '@store-kit/contracts/common'
import {
  For,
  Show,
  createOptimistic,
  createSignal,
  createStore,
  onSettled,
  snapshot,
} from 'solid-js'
import { Value } from 'typebox/value'

import { useCart } from '~/cart/CartProvider'
import { formatMnt } from '~/catalog/format'
import { checkoutAction } from '~/server/checkout'

const districts = ulaanbaatarDistrictSchema.anyOf.map(district => district.const)

const fieldLabels: Record<string, string> = {
  '/customer/name': 'Нэр',
  '/customer/phone': 'Утас',
  '/delivery/district': 'Дүүрэг',
  '/delivery/khoroo': 'Хороо',
  '/delivery/address': 'Дэлгэрэнгүй хаяг',
  '/delivery/notes': 'Нэмэлт тайлбар',
  '/paymentMethod': 'Төлбөрийн арга',
  '/items': 'Сагс',
}

const fieldNames: Record<string, string> = {
  '/customer/name': 'customer.name',
  '/customer/phone': 'customer.phone',
  '/delivery/district': 'delivery.district',
  '/delivery/khoroo': 'delivery.khoroo',
  '/delivery/address': 'delivery.address',
  '/delivery/notes': 'delivery.notes',
  '/paymentMethod': 'paymentMethod',
}

const fieldMessages: Record<string, string> = {
  '/customer/name': 'Нэрээ оруулна уу.',
  '/customer/phone': 'Монгол утасны дугаараа шалгана уу.',
  '/delivery/district': 'Улаанбаатарын дүүргээ сонгоно уу.',
  '/delivery/khoroo': 'Хороогоо оруулна уу.',
  '/delivery/address': 'Дэлгэрэнгүй хаягаа оруулна уу.',
  '/delivery/notes': 'Нэмэлт тайлбар 500 тэмдэгтээс ихгүй байна.',
  '/paymentMethod': 'Төлбөрийн аргаа сонгоно уу.',
}

const normalizePhone = (phone: string) => phone.replace(/\D/g, '').replace(/^976/, '')

const normalizeDetails = (details: CheckoutDetails): CheckoutDetails => {
  const notes = details.delivery.notes?.trim()
  return {
    customer: {
      name: details.customer.name.trim(),
      phone: normalizePhone(details.customer.phone),
    },
    delivery: {
      district: details.delivery.district,
      khoroo: details.delivery.khoroo.trim(),
      address: details.delivery.address.trim(),
      ...(notes ? { notes } : {}),
    },
    paymentMethod: details.paymentMethod,
  }
}

const validationIssues = (details: CheckoutDetails): ValidationIssue[] => [
  ...new Map(
    Value.Errors(checkoutDetailsSchema, details).map(error => {
      const issue = { path: error.instancePath || '/', code: 'invalid' as const }
      return [issue.path, issue] as const
    }),
  ).values(),
]

type CheckoutDomainFailure = CheckoutError | CartValidationError

type CheckoutFailure =
  | { type: 'field'; fields: ValidationIssue[] }
  | { type: 'domain'; error: CheckoutDomainFailure }
  | { type: 'transport'; message: string }

const actionTransportMessage = (value: unknown) =>
  value &&
  typeof value === 'object' &&
  'code' in value &&
  'message' in value &&
  typeof value.message === 'string'
    ? value.message
    : undefined

const unreachableFailure = (failure: never): never => {
  throw new Error(`Unsupported checkout failure: ${JSON.stringify(failure)}`)
}

function FailureNotice(props: {
  failure: CheckoutFailure
  retry: () => void
  useBankTransfer: () => void
  openCart: () => void
  noticeRef: (element: HTMLDivElement) => void
}) {
  const content = () => {
    const failure = props.failure
    switch (failure.type) {
      case 'field':
        return (
          <>
            <h2 class="m-0 text-2xl font-extrabold">Мэдээллээ шалгана уу</h2>
            <p class="mt-2">Тодруулсан талбаруудыг засаад дахин оролдоно уу.</p>
            <ul class="mt-3 list-disc pl-5">
              <For each={failure.fields}>
                {field => <li>{fieldLabels[field.path] ?? 'Оруулсан мэдээлэл'}</li>}
              </For>
            </ul>
          </>
        )
      case 'transport':
        return (
          <>
            <h2 class="m-0 text-2xl font-extrabold">Холболт амжилтгүй</h2>
            <p class="mt-2">{failure.message}</p>
            <button
              class="mt-4 min-h-11 border-2 border-ink px-4 font-bold"
              type="button"
              onClick={props.retry}
            >
              Дахин оролдох
            </button>
          </>
        )
      case 'domain': {
        const error = failure.error
        switch (error._tag) {
          case 'CartChanged':
            return (
              <>
                <h2 class="m-0 text-2xl font-extrabold">Сагсаа засна уу</h2>
                <For each={error.corrections}>
                  {correction => <p class="mt-2">{correction.message}</p>}
                </For>
                <button
                  class="mt-4 min-h-11 bg-alert px-4 font-bold text-white"
                  type="button"
                  onClick={props.openCart}
                >
                  Сагсны засварыг нээх
                </button>
              </>
            )
          case 'CartEmpty':
            return (
              <>
                <h2 class="m-0 text-2xl font-extrabold">Сагс хоосон байна</h2>
                <p class="mt-2">{error.message}</p>
                <a
                  class="mt-4 inline-flex min-h-11 items-center font-bold text-cobalt"
                  href="/products"
                >
                  Бараа сонгох →
                </a>
              </>
            )
          case 'InvalidCart':
            return (
              <>
                <h2 class="m-0 text-2xl font-extrabold">Сагсны мэдээлэл буруу байна</h2>
                <button
                  class="mt-4 min-h-11 border-2 border-ink px-4 font-bold"
                  type="button"
                  onClick={props.openCart}
                >
                  Сагсаа шалгах
                </button>
              </>
            )
          case 'PaymentSetupFailed':
            return (
              <>
                <h2 class="m-0 text-2xl font-extrabold">Төлбөр үүсгэж чадсангүй</h2>
                <p class="mt-2">{error.message}</p>
                <div class="mt-4 flex flex-wrap gap-3">
                  <button
                    class="min-h-11 border-2 border-ink px-4 font-bold"
                    type="button"
                    onClick={props.retry}
                  >
                    Дахин оролдох
                  </button>
                  <Show when={error.canUseBankTransfer}>
                    <button
                      class="min-h-11 bg-cobalt px-4 font-bold text-white"
                      type="button"
                      onClick={props.useBankTransfer}
                    >
                      Дансаар төлөх
                    </button>
                  </Show>
                </div>
              </>
            )
          case 'DeliveryUnavailable':
            return (
              <>
                <h2 class="m-0 text-2xl font-extrabold">Захиалга үүсгэж чадсангүй</h2>
                <p class="mt-2">{error.message}</p>
              </>
            )
          case 'InvalidCheckoutDetails':
            return (
              <>
                <h2 class="m-0 text-2xl font-extrabold">Мэдээллээ шалгана уу</h2>
                <p class="mt-2">Тодруулсан талбаруудыг засаад дахин оролдоно уу.</p>
              </>
            )
          default:
            return unreachableFailure(error)
        }
      }
      default:
        return unreachableFailure(failure)
    }
  }

  return (
    <div
      ref={props.noticeRef}
      class="mt-6 border-3 border-alert bg-white p-5 outline-offset-2 focus:outline-3 focus:outline-alert"
      role="alert"
      tabindex="-1"
    >
      {content()}
    </div>
  )
}

function CheckoutSuccess(props: { order: CheckoutCreated }) {
  return (
    <main
      id="main-content"
      tabindex="-1"
      class="min-h-[70svh] bg-surface px-[clamp(1rem,4vw,4rem)] py-[clamp(3rem,7vw,6rem)]"
    >
      <article class="mx-auto max-w-3xl border-3 border-ink bg-white p-[clamp(1.25rem,4vw,3.5rem)]">
        <p class="font-bold text-cobalt">ЗАХИАЛГА / ҮҮССЭН</p>
        <h1 class="mt-3 text-[clamp(2.5rem,8vw,5rem)] leading-none font-extrabold wrap-break-word">
          {props.order.orderNumber}
        </h1>
        <p class="mt-5 text-lg">Захиалга үүслээ. Төлбөрөө доорх заавраар хийнэ үү.</p>

        <Show when={props.order.nextAction.type === 'qpay'}>
          <section class="mt-8 border-t-3 border-ink pt-6" aria-labelledby="qpay-title">
            <h2 id="qpay-title" class="text-3xl font-extrabold">
              QPay-аар төлөх
            </h2>
            {props.order.nextAction.type === 'qpay' && (
              <>
                <img
                  class="mt-5 aspect-square h-auto w-full max-w-80 border-3 border-ink"
                  src={props.order.nextAction.qrImage}
                  width="320"
                  height="320"
                  alt="QPay төлбөрийн QR код"
                />
                <div class="mt-5 flex flex-wrap gap-3">
                  <For each={props.order.nextAction.urls}>
                    {bank => (
                      <a
                        class="inline-flex min-h-11 items-center bg-cobalt px-4 font-bold text-white no-underline"
                        href={bank.link}
                      >
                        {bank.name}-аар нээх
                      </a>
                    )}
                  </For>
                </div>
              </>
            )}
          </section>
        </Show>

        <Show when={props.order.nextAction.type === 'bank_transfer'}>
          <section class="mt-8 border-t-3 border-ink pt-6" aria-labelledby="bank-title">
            <h2 id="bank-title" class="text-3xl font-extrabold">
              Дансаар шилжүүлэх
            </h2>
            {props.order.nextAction.type === 'bank_transfer' && (
              <dl class="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt class="text-sm font-bold text-ink/60">Банк</dt>
                  <dd class="mt-1 text-xl font-extrabold">{props.order.nextAction.bankName}</dd>
                </div>
                <div>
                  <dt class="text-sm font-bold text-ink/60">Данс эзэмшигч</dt>
                  <dd class="mt-1 text-xl font-extrabold">{props.order.nextAction.accountName}</dd>
                </div>
                <div class="sm:col-span-2">
                  <dt class="text-sm font-bold text-ink/60">Дансны дугаар</dt>
                  <dd class="mt-1 text-3xl font-extrabold break-all">
                    {props.order.nextAction.accountNumber}
                  </dd>
                </div>
              </dl>
            )}
            <p class="mt-5 border-2 border-coral bg-surface p-4 font-bold">
              Гүйлгээний утгад {props.order.orderNumber} гэж бичнэ үү.
            </p>
          </section>
        </Show>

        <a
          class="mt-8 inline-flex min-h-12 items-center bg-ink px-5 font-bold text-white no-underline"
          href={`/orders/${props.order.orderId}#token=${encodeURIComponent(props.order.statusToken)}`}
          target="_self"
        >
          Захиалгын төлөв харах →
        </a>
      </article>
    </main>
  )
}

export default function CheckoutPage() {
  const cart = useCart()
  const [details, setDetails] = createStore<CheckoutDetails>({
    customer: { name: '', phone: '' },
    delivery: { district: 'Баянзүрх', khoroo: '', address: '', notes: '' },
    paymentMethod: 'qpay',
  })
  const [localFailure, setLocalFailure] = createSignal<CheckoutFailure>()
  const [blurIssues, setBlurIssues] = createSignal<ValidationIssue[]>([])
  const [activeAttempt, setActiveAttempt] = createSignal<string>()
  const [actionPending, setActionPending] = createOptimistic(false)
  const submissions = useSubmissions(checkoutAction)
  const fieldElements = new Map<string, { focus: () => void }>()
  let checkoutForm: HTMLFormElement | undefined
  let failureNotice: HTMLDivElement | undefined
  let idempotencyInput: HTMLInputElement | undefined
  let itemsInput: HTMLInputElement | undefined
  let checkoutAttempt: { request: string; idempotencyKey: string } | undefined

  const latestSubmission = () => {
    const attempt = activeAttempt()
    return submissions.findLast(
      submission => attempt && submission.input[0].get('idempotencyKey') === attempt,
    )
  }
  const actionFailure = (): CheckoutFailure | undefined => {
    const submission = latestSubmission()
    if (!submission) return undefined
    const transportMessage = actionTransportMessage(submission.result)
    if (submission.error || !submission.result || transportMessage) {
      return {
        type: 'transport',
        message:
          transportMessage ??
          'Сүлжээний алдаа гарлаа. Мэдээлэл тань хадгалагдсан тул дахин оролдоно уу.',
      }
    }
    if (submission.result.ok) return undefined
    const resultFailure = submission.result.failure
    if (resultFailure.type === 'field') return resultFailure
    if (resultFailure.error._tag === 'InvalidCheckoutDetails') {
      return { type: 'field', fields: resultFailure.error.fields }
    }
    return { type: 'domain', error: resultFailure.error }
  }
  const failure = () => localFailure() ?? actionFailure()
  const created = () => {
    const result = latestSubmission()?.result
    return result?.ok ? result.order : undefined
  }
  const fieldIssues = () => {
    const current = failure()
    const submitted = current?.type === 'field' ? current.fields : []
    return [...new Map([...blurIssues(), ...submitted].map(issue => [issue.path, issue])).values()]
  }
  const fieldError = (path: string) => fieldIssues().some(issue => issue.path === path)
  const fieldMessage = (path: string) => (fieldError(path) ? fieldMessages[path] : undefined)
  const registerField = (name: string, element: { focus: () => void }) =>
    fieldElements.set(name, element)
  const focusFirstInvalid = (fields: ValidationIssue[]) => {
    const first = fields.find(field => fieldNames[field.path])
    if (first) queueMicrotask(() => fieldElements.get(fieldNames[first.path]!)?.focus())
  }

  const setFieldFailure = (fields: ValidationIssue[]) => {
    setLocalFailure({ type: 'field', fields })
    focusFirstInvalid(fields)
  }

  const validateField = (path: string) => {
    const issues = validationIssues(normalizeDetails(snapshot(details))).filter(
      issue => issue.path === path,
    )
    setBlurIssues(current => [...current.filter(issue => issue.path !== path), ...issues])
  }

  const prepareSubmission = (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    if (event.currentTarget.hasAttribute('aria-busy') || actionPending()) {
      event.preventDefault()
      return
    }

    const normalized = normalizeDetails(snapshot(details))
    if (!Value.Check(checkoutDetailsSchema, normalized)) {
      event.preventDefault()
      setFieldFailure(validationIssues(normalized))
      return
    }

    const items = snapshot(cart.items).map(item => ({
      variantId: item.variantId,
      quantity: item.quantity,
    }))
    const serializedRequest = JSON.stringify({ ...normalized, items })
    if (checkoutAttempt?.request !== serializedRequest) {
      checkoutAttempt = {
        request: serializedRequest,
        idempotencyKey: `checkout_${crypto.randomUUID()}`,
      }
    }
    if (!idempotencyInput || !itemsInput) {
      event.preventDefault()
      return
    }

    latestSubmission()?.clear()
    setLocalFailure()
    setActiveAttempt(checkoutAttempt.idempotencyKey)
    idempotencyInput.value = checkoutAttempt.idempotencyKey
    itemsInput.value = JSON.stringify(items)
  }

  const submit = () => checkoutForm?.requestSubmit()
  const useBankTransfer = () => {
    setDetails(draft => {
      draft.paymentMethod = 'bank_transfer'
    })
    queueMicrotask(submit)
  }

  checkoutAction
    .onSubmit(() => setActionPending(true))
    .onSettled(submission => {
      const attempt = activeAttempt()
      if (!attempt || submission.input[0].get('idempotencyKey') !== attempt) return

      const result = submission.result
      if (result?.ok) {
        cart.clear()
        queueMicrotask(() => document.querySelector<HTMLElement>('#main-content')?.focus())
        return
      }
      if (actionTransportMessage(result)) {
        queueMicrotask(() => failureNotice?.focus())
        return
      }

      const fields =
        result && !result.ok
          ? result.failure.type === 'field'
            ? result.failure.fields
            : result.failure.error._tag === 'InvalidCheckoutDetails'
              ? result.failure.error.fields
              : undefined
          : undefined
      if (fields) focusFirstInvalid(fields)
      else queueMicrotask(() => failureNotice?.focus())

      if (
        result &&
        !result.ok &&
        result.failure.type === 'domain' &&
        result.failure.error._tag === 'CartChanged'
      ) {
        cart.setOpen(true)
      }
    })

  onSettled(() => {
    for (const submission of submissions) submission.clear()
    if (cart.items.length > 0 && cart.validation().type === 'idle') void cart.validate()
  })

  return (
    <Show
      when={created()}
      fallback={
        <main
          id="main-content"
          tabindex="-1"
          class="min-h-[70svh] bg-surface px-[clamp(1rem,4vw,4rem)] py-[clamp(3rem,7vw,6rem)]"
        >
          <div class="mx-auto max-w-6xl">
            <header class="max-w-3xl">
              <p class="font-bold text-cobalt">ЗАХИАЛГА / УЛААНБААТАР</p>
              <h1 class="mt-3 text-[clamp(2.75rem,8vw,6rem)] leading-none font-extrabold">
                Захиалга
              </h1>
              <p class="mt-5 max-w-2xl text-lg leading-relaxed">
                Хүргэлт зөвхөн Улаанбаатар хотод хийгдэнэ. Үнэ, үлдэгдэл, хүргэлтийн дүнг сервер
                захиалга үүсгэхийн өмнө дахин баталгаажуулна.
              </p>
            </header>

            <noscript>
              <section class="mt-8 border-3 border-alert bg-white p-6" role="alert">
                <h2 class="text-2xl font-extrabold">JavaScript шаардлагатай</h2>
                <p class="mt-2">
                  Сагс зөвхөн энэ хөтчийн localStorage-д хадгалагддаг. JavaScript-гүй үед захиалгын
                  барааг серверт найдвартай илгээх боломжгүй тул төлбөрийн маягт ажиллахгүй.
                </p>
              </section>
            </noscript>

            <Show
              when={cart.items.length > 0}
              fallback={
                <section class="mt-8 border-3 border-ink bg-white p-6">
                  <h2 class="text-3xl font-extrabold">Сагс хоосон байна</h2>
                  <a
                    class="mt-4 inline-flex min-h-11 items-center font-bold text-cobalt"
                    href="/products"
                  >
                    Бараа сонгох →
                  </a>
                </section>
              }
            >
              <Show when={failure()}>
                {current => (
                  <FailureNotice
                    failure={current()}
                    retry={submit}
                    useBankTransfer={useBankTransfer}
                    openCart={() => cart.setOpen(true)}
                    noticeRef={element => {
                      failureNotice = element
                    }}
                  />
                )}
              </Show>

              <form
                ref={element => {
                  checkoutForm = element
                }}
                action={checkoutAction}
                method="post"
                enctype="multipart/form-data"
                class="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]"
                novalidate
                onSubmit={prepareSubmission}
              >
                <input
                  ref={element => {
                    idempotencyInput = element
                  }}
                  type="hidden"
                  name="idempotencyKey"
                />
                <input
                  ref={element => {
                    itemsInput = element
                  }}
                  type="hidden"
                  name="items"
                />
                <div class="grid gap-8">
                  <fieldset class="border-3 border-ink bg-white p-[clamp(1rem,4vw,2rem)]">
                    <legend class="px-2 text-2xl font-extrabold">1. Холбоо барих</legend>
                    <div class="mt-4 grid gap-5 sm:grid-cols-2">
                      <label class="grid gap-2 font-bold" for="customer-name">
                        Нэр <span aria-hidden="true">*</span>
                        <input
                          ref={element => registerField('customer.name', element)}
                          id="customer-name"
                          name="customer.name"
                          class="min-h-12 border-2 border-ink px-3 font-normal outline-offset-2 focus:outline-3 focus:outline-cobalt"
                          value={details.customer.name}
                          required
                          autocomplete="name"
                          aria-invalid={fieldError('/customer/name') ? 'true' : undefined}
                          aria-describedby={
                            fieldError('/customer/name') ? 'customer-name-error' : undefined
                          }
                          onBlur={() => validateField('/customer/name')}
                          onInput={event =>
                            setDetails(draft => {
                              draft.customer.name = event.currentTarget.value
                            })
                          }
                        />
                        <Show when={fieldMessage('/customer/name')}>
                          {message => (
                            <small id="customer-name-error" class="text-alert">
                              {message()}
                            </small>
                          )}
                        </Show>
                      </label>
                      <label class="grid gap-2 font-bold" for="customer-phone">
                        Утас <span aria-hidden="true">*</span>
                        <input
                          ref={element => registerField('customer.phone', element)}
                          id="customer-phone"
                          name="customer.phone"
                          class="min-h-12 border-2 border-ink px-3 font-normal outline-offset-2 focus:outline-3 focus:outline-cobalt"
                          value={details.customer.phone}
                          inputmode="tel"
                          required
                          autocomplete="tel"
                          placeholder="9911 2233"
                          aria-invalid={fieldError('/customer/phone') ? 'true' : undefined}
                          aria-describedby={
                            fieldError('/customer/phone')
                              ? 'customer-phone-error customer-phone-help'
                              : 'customer-phone-help'
                          }
                          onBlur={() => validateField('/customer/phone')}
                          onInput={event =>
                            setDetails(draft => {
                              draft.customer.phone = event.currentTarget.value
                            })
                          }
                        />
                        <small id="customer-phone-help" class="font-normal text-ink/60">
                          +976, зай, зураастай бичиж болно.
                        </small>
                        <Show when={fieldMessage('/customer/phone')}>
                          {message => (
                            <small id="customer-phone-error" class="text-alert">
                              {message()}
                            </small>
                          )}
                        </Show>
                      </label>
                    </div>
                  </fieldset>

                  <fieldset class="border-3 border-ink bg-white p-[clamp(1rem,4vw,2rem)]">
                    <legend class="px-2 text-2xl font-extrabold">2. Хүргэлт</legend>
                    <div class="mt-4 grid gap-5 sm:grid-cols-2">
                      <label class="grid gap-2 font-bold" for="delivery-district">
                        Дүүрэг <span aria-hidden="true">*</span>
                        <select
                          ref={element => registerField('delivery.district', element)}
                          id="delivery-district"
                          name="delivery.district"
                          class="min-h-12 border-2 border-ink bg-white px-3 font-normal outline-offset-2 focus:outline-3 focus:outline-cobalt"
                          value={details.delivery.district}
                          required
                          aria-invalid={fieldError('/delivery/district') ? 'true' : undefined}
                          onBlur={() => validateField('/delivery/district')}
                          onChange={event =>
                            setDetails(draft => {
                              draft.delivery.district = event.currentTarget
                                .value as UlaanbaatarDistrict
                            })
                          }
                        >
                          <For each={districts}>
                            {district => <option value={district}>{district}</option>}
                          </For>
                        </select>
                      </label>
                      <label class="grid gap-2 font-bold" for="delivery-khoroo">
                        Хороо <span aria-hidden="true">*</span>
                        <input
                          ref={element => registerField('delivery.khoroo', element)}
                          id="delivery-khoroo"
                          name="delivery.khoroo"
                          class="min-h-12 border-2 border-ink px-3 font-normal outline-offset-2 focus:outline-3 focus:outline-cobalt"
                          value={details.delivery.khoroo}
                          required
                          placeholder="1-р хороо"
                          aria-invalid={fieldError('/delivery/khoroo') ? 'true' : undefined}
                          aria-describedby={
                            fieldError('/delivery/khoroo') ? 'delivery-khoroo-error' : undefined
                          }
                          onBlur={() => validateField('/delivery/khoroo')}
                          onInput={event =>
                            setDetails(draft => {
                              draft.delivery.khoroo = event.currentTarget.value
                            })
                          }
                        />
                        <Show when={fieldMessage('/delivery/khoroo')}>
                          {message => (
                            <small id="delivery-khoroo-error" class="text-alert">
                              {message()}
                            </small>
                          )}
                        </Show>
                      </label>
                      <label class="grid gap-2 font-bold sm:col-span-2" for="delivery-address">
                        Дэлгэрэнгүй хаяг <span aria-hidden="true">*</span>
                        <textarea
                          ref={element => registerField('delivery.address', element)}
                          id="delivery-address"
                          name="delivery.address"
                          class="min-h-28 resize-y border-2 border-ink p-3 font-normal outline-offset-2 focus:outline-3 focus:outline-cobalt"
                          value={details.delivery.address}
                          required
                          autocomplete="street-address"
                          aria-invalid={fieldError('/delivery/address') ? 'true' : undefined}
                          aria-describedby={
                            fieldError('/delivery/address') ? 'delivery-address-error' : undefined
                          }
                          onBlur={() => validateField('/delivery/address')}
                          onInput={event =>
                            setDetails(draft => {
                              draft.delivery.address = event.currentTarget.value
                            })
                          }
                        />
                        <Show when={fieldMessage('/delivery/address')}>
                          {message => (
                            <small id="delivery-address-error" class="text-alert">
                              {message()}
                            </small>
                          )}
                        </Show>
                      </label>
                      <label class="grid gap-2 font-bold sm:col-span-2" for="delivery-notes">
                        Нэмэлт тайлбар <span class="font-normal text-muted">(заавал биш)</span>
                        <textarea
                          ref={element => registerField('delivery.notes', element)}
                          id="delivery-notes"
                          name="delivery.notes"
                          class="min-h-24 resize-y border-2 border-ink p-3 font-normal outline-offset-2 focus:outline-3 focus:outline-cobalt"
                          value={details.delivery.notes ?? ''}
                          maxlength="500"
                          aria-invalid={fieldError('/delivery/notes') ? 'true' : undefined}
                          aria-describedby={
                            fieldError('/delivery/notes') ? 'delivery-notes-error' : undefined
                          }
                          onBlur={() => validateField('/delivery/notes')}
                          onInput={event =>
                            setDetails(draft => {
                              draft.delivery.notes = event.currentTarget.value
                            })
                          }
                        />
                        <Show when={fieldMessage('/delivery/notes')}>
                          {message => (
                            <small id="delivery-notes-error" class="text-alert">
                              {message()}
                            </small>
                          )}
                        </Show>
                      </label>
                    </div>
                  </fieldset>

                  <fieldset
                    ref={element => registerField('paymentMethod', element)}
                    class="border-3 border-ink bg-white p-[clamp(1rem,4vw,2rem)]"
                    aria-invalid={fieldError('/paymentMethod') ? 'true' : undefined}
                    aria-describedby={
                      fieldError('/paymentMethod') ? 'payment-method-error' : undefined
                    }
                  >
                    <legend class="px-2 text-2xl font-extrabold">3. Төлбөрийн арга</legend>
                    <div class="mt-4 grid gap-3 sm:grid-cols-2">
                      <label class="flex min-h-24 cursor-pointer items-center gap-3 border-2 border-ink p-4 font-bold has-checked:bg-amber">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="qpay"
                          checked={details.paymentMethod === 'qpay'}
                          onChange={() =>
                            setDetails(draft => {
                              draft.paymentMethod = 'qpay'
                            })
                          }
                        />
                        <span>
                          QPay <small class="mt-1 block font-normal">QR болон банкны апп</small>
                        </span>
                      </label>
                      <label class="flex min-h-24 cursor-pointer items-center gap-3 border-2 border-ink p-4 font-bold has-checked:bg-amber">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="bank_transfer"
                          checked={details.paymentMethod === 'bank_transfer'}
                          onChange={() =>
                            setDetails(draft => {
                              draft.paymentMethod = 'bank_transfer'
                            })
                          }
                        />
                        <span>
                          Дансаар шилжүүлэх{' '}
                          <small class="mt-1 block font-normal">Ажилтан баталгаажуулна</small>
                        </span>
                      </label>
                    </div>
                    <Show when={fieldMessage('/paymentMethod')}>
                      {message => (
                        <small id="payment-method-error" class="mt-2 block text-alert">
                          {message()}
                        </small>
                      )}
                    </Show>
                  </fieldset>
                </div>

                <aside class="border-3 border-ink bg-amber p-5 lg:sticky lg:top-24">
                  <p class="font-bold text-cobalt">ЗАХИАЛГЫН ДҮН</p>
                  <h2 class="mt-2 text-3xl font-extrabold">Захиалгын дүн</h2>
                  <div class="mt-4 divide-y divide-ink/30 border-y border-ink/30">
                    <For each={cart.validatedCart()?.lines ?? cart.items}>
                      {line => (
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-4 text-sm">
                          <span>
                            <strong class="block">{line.productName}</strong>
                            <small>
                              {'requestedQuantity' in line ? line.requestedQuantity : line.quantity}{' '}
                              ш
                            </small>
                          </span>
                          <strong>
                            {formatMnt(
                              'lineTotalMnt' in line
                                ? line.lineTotalMnt
                                : line.unitPriceMnt * line.quantity,
                            )}
                          </strong>
                        </div>
                      )}
                    </For>
                  </div>
                  <p class="mt-4 flex justify-between gap-3 text-xl">
                    <span>Барааны дүн</span>
                    <strong>
                      {formatMnt(
                        cart.validatedCart()?.subtotalMnt ??
                          cart.items.reduce(
                            (sum, item) => sum + item.unitPriceMnt * item.quantity,
                            0,
                          ),
                      )}
                    </strong>
                  </p>
                  <p class="mt-3 text-sm leading-relaxed">
                    Хүргэлтийн төлбөр болон нийт дүнг сервер захиалга үүсгэх үед нэмнэ.
                  </p>
                  <button
                    class="mt-5 min-h-14 w-full bg-cobalt px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-55"
                    type="submit"
                    disabled={actionPending()}
                    aria-busy={actionPending() ? 'true' : undefined}
                  >
                    <span aria-live="polite">
                      {actionPending() ? 'Баталгаажуулж байна…' : 'Захиалга үүсгэх →'}
                    </span>
                  </button>
                </aside>
              </form>
            </Show>
          </div>
        </main>
      }
    >
      {order => <CheckoutSuccess order={order()} />}
    </Show>
  )
}
