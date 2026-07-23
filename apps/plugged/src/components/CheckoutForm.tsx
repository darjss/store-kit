/* oxlint-disable tailwindcss/no-unknown-classes, eslint/no-underscore-dangle */
import type { CheckoutCreated, CheckoutError } from '@store-kit/contracts/checkout'
import { cartItems, cartLineInputs, clearCart, openCart } from '@store-kit/storefront/cart/store'
import { createStorefrontQueryClient } from '@store-kit/storefront/query-client'
import { cartQuery } from '@store-kit/storefront/query-options/cart'
import { checkoutMutation } from '@store-kit/storefront/query-options/checkout'
import { createForm } from '@tanstack/solid-form'
import { QueryClientProvider, createMutation, createQuery } from '@tanstack/solid-query'
import { For, Match, Show, Switch, createSignal, onMount } from 'solid-js'

const districts = [
  'Багануур',
  'Багахангай',
  'Баянгол',
  'Баянзүрх',
  'Налайх',
  'Сонгинохайрхан',
  'Сүхбаатар',
  'Хан-Уул',
  'Чингэлтэй',
] as const
const money = new Intl.NumberFormat('mn-MN')
const fieldErrorId = (name: string) => `${name}-error`
const actionClass =
  'inline-flex min-h-12.5 cursor-pointer items-center justify-center border-3 border-ink bg-orange px-4 py-3 font-black text-ink no-underline transition-transform duration-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'
const formBandClass =
  "mb-4 border-4 border-ink bg-paper-clean p-[clamp(1rem,2vw,2rem)] [&>h2]:font-display [&>h2]:text-[2.5rem] [&>h2]:leading-[0.8] [&_label]:mb-4 [&_label]:grid [&_label]:gap-1 [&_label]:font-extrabold [&_input:not([type='radio'])]:min-h-12.5 [&_input:not([type='radio'])]:w-full [&_input:not([type='radio'])]:rounded-none [&_input:not([type='radio'])]:border-3 [&_input:not([type='radio'])]:border-ink [&_input:not([type='radio'])]:bg-white [&_input:not([type='radio'])]:p-3 [&_select]:min-h-12.5 [&_select]:w-full [&_select]:rounded-none [&_select]:border-3 [&_select]:border-ink [&_select]:bg-white [&_select]:p-3 [&_textarea]:min-h-25 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-none [&_textarea]:border-3 [&_textarea]:border-ink [&_textarea]:bg-white [&_textarea]:p-3"
const errorPanelClass =
  'mb-4 border-4 border-warning bg-paper-clean p-4 [&_button]:min-h-11 [&_button]:cursor-pointer [&_button]:border-3 [&_button]:border-ink [&_button]:bg-acid [&_button]:px-3 [&_button]:py-2 [&_button]:font-black'

type TransportError = { _tag: 'TransportError'; message: string }

const qpayAction = (order: CheckoutCreated) =>
  order.nextAction.type === 'qpay' ? order.nextAction : undefined
const bankAction = (order: CheckoutCreated) =>
  order.nextAction.type === 'bank_transfer' ? order.nextAction : undefined

function FormOwner() {
  const checkout = createMutation(() => checkoutMutation.create())
  const validation = createQuery(() => ({
    ...cartQuery.validate([...cartItems()]),
    enabled: false,
  }))
  const [domainError, setDomainError] = createSignal<CheckoutError | TransportError>()
  const [created, setCreated] = createSignal<CheckoutCreated>()

  const form = createForm(() => ({
    defaultValues: {
      name: '',
      phone: '',
      district: 'Баянзүрх' as (typeof districts)[number],
      khoroo: '',
      address: '',
      notes: '',
      paymentMethod: 'qpay' as 'qpay' | 'bank_transfer',
    },
    onSubmit: async ({ value }) => {
      setDomainError()
      try {
        const cart = await validation.refetch()
        if (cart.data?.status !== 'ok') {
          setDomainError({
            _tag: 'TransportError',
            message: 'Сагсыг шалгаж чадсангүй. Мэдээллээ хадгалсан тул дахин оролдоно уу.',
          })
          return
        }
        if (cart.data.value.corrections.length > 0) {
          setDomainError({
            _tag: 'CartChanged',
            message: 'Сагсны бараа өөрчлөгдсөн байна.',
            corrections: cart.data.value.corrections,
          })
          requestAnimationFrame(() =>
            document.querySelector<HTMLElement>('#cart-correction')?.focus(),
          )
          return
        }
        const result = await checkout.mutateAsync({
          items: cartLineInputs(),
          customer: { name: value.name, phone: value.phone },
          delivery: {
            district: value.district,
            khoroo: value.khoroo,
            address: value.address,
            ...(value.notes ? { notes: value.notes } : {}),
          },
          paymentMethod: value.paymentMethod,
        })
        if (result.status === 'ok') {
          clearCart()
          setCreated(result.value)
          return
        }
        setDomainError(result.error)
        if (result.error._tag === 'InvalidCheckoutDetails') {
          const first = result.error.fields[0]?.path.split('/').at(-1)
          requestAnimationFrame(() =>
            document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(),
          )
        } else if (result.error._tag === 'CartChanged') {
          requestAnimationFrame(() =>
            document.querySelector<HTMLElement>('#cart-correction')?.focus(),
          )
        }
      } catch {
        setDomainError({
          _tag: 'TransportError',
          message: 'Сүлжээний алдаа гарлаа. Мэдээллээ хадгалсан тул дахин оролдоно уу.',
        })
      }
    },
  }))

  const error = () =>
    domainError() as
      | {
          _tag?: string
          message?: string
          canUseBankTransfer?: boolean
          fields?: { path: string; message: string }[]
          corrections?: { message: string }[]
        }
      | undefined
  const fieldError = (name: string) =>
    error()?.fields?.find(item => item.path.endsWith(`/${name}`))?.message
  const clearFieldError = (name: string) => {
    const current = domainError()
    if (current?._tag !== 'InvalidCheckoutDetails') return
    const fields = current.fields.filter(item => !item.path.endsWith(`/${name}`))
    setDomainError(fields.length > 0 ? { ...current, fields } : undefined)
  }

  return (
    <Switch>
      <Match when={created()}>
        {order => (
          <section class="border-ink bg-paper-clean [&>h1]:font-display mx-auto w-[min(760px,100%)] border-[5px] p-[clamp(1rem,4vw,3rem)] [&>h1]:text-[5rem] [&>h1]:leading-[0.8] max-md:[&>h1]:text-[3.8rem]">
            <p class="text-success inline-block -rotate-2 border-3 border-current px-2 py-1 font-black">
              ЗАХИАЛГА ҮҮСЛЭЭ
            </p>
            <h1>{order().orderNumber}</h1>
            <Show when={qpayAction(order())}>
              {action => (
                <div class="border-ink my-4 border-y-4 py-4">
                  <h2>QPay-аар төлөх</h2>
                  <img
                    class="border-ink w-[min(320px,100%)] border-4"
                    src={action().qrImage}
                    alt="QPay төлбөрийн QR код"
                  />
                  <div class="mt-4 flex flex-wrap gap-2">
                    <For each={action().urls}>
                      {bank => (
                        <a class="bg-cobalt text-paper p-3 font-extrabold" href={bank.link}>
                          {bank.name}-аар нээх
                        </a>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </Show>
            <Show when={bankAction(order())}>
              {action => (
                <div class="border-ink my-4 border-y-4 py-4 [&>strong]:block [&>strong]:text-[clamp(1.5rem,5vw,3rem)] [&>strong]:tracking-[0.04em]">
                  <h2>Дансаар шилжүүлэх</h2>
                  <p>{action().bankName}</p>
                  <strong>{action().accountNumber}</strong>
                  <p>{action().accountName}</p>
                  <small>Гүйлгээний утгад {order().orderNumber} гэж бичнэ үү.</small>
                </div>
              )}
            </Show>
            <a
              class={actionClass}
              href={`/orders/${order().orderId}#token=${encodeURIComponent(order().statusToken)}`}
            >
              Захиалгын төлөв харах →
            </a>
          </section>
        )}
      </Match>
      <Match when={true}>
        <Show when={cartItems().length === 0}>
          <section class="grid min-h-[60vh] place-content-center text-center">
            <h1 class="font-display text-[5rem] leading-[0.8]">Сагс хоосон.</h1>
            <a href="/products">Дэлгүүр рүү буцах →</a>
          </section>
        </Show>
        <Show when={cartItems().length > 0}>
          <form
            class="grid grid-cols-12 items-start gap-8 max-md:flex max-md:flex-col"
            aria-busy={checkout.isPending || validation.isFetching}
            onSubmit={event => {
              event.preventDefault()
              void form.handleSubmit()
            }}
          >
            <div class="col-[1/8] max-md:w-full">
              <h1 class="font-display text-[clamp(4rem,9vw,6rem)] leading-[0.75] max-md:text-[4.5rem]">
                ЗАХИАЛГА
              </h1>
              <Show when={error()?._tag === 'CartChanged'}>
                <section class={errorPanelClass} id="cart-correction" tabIndex={-1}>
                  <h2 class="m-0">Сагсаа засна уу</h2>
                  <p>{error()?.message}</p>
                  <For each={error()?.corrections}>{correction => <p>{correction.message}</p>}</For>
                  <button type="button" onClick={openCart}>
                    Сагс нээж засах →
                  </button>
                </section>
              </Show>
              <Show when={error()?._tag === 'CartEmpty'}>
                <section class={errorPanelClass} role="alert">
                  <strong>Сагс хоосон.</strong>
                  <p>{error()?.message}</p>
                  <a href="/products">Бараа сонгох →</a>
                </section>
              </Show>
              <Show when={error()?._tag === 'InvalidCheckoutDetails'}>
                <section class={errorPanelClass} role="alert">
                  <strong>Мэдээллээ шалгана уу.</strong>
                  <p>{error()?.message}</p>
                </section>
              </Show>
              <Show when={error()?._tag === 'TransportError'}>
                <section class={errorPanelClass} role="alert">
                  <strong>Холболт амжилтгүй.</strong>
                  <p>{error()?.message}</p>
                  <button type="submit">Дахин оролдох</button>
                </section>
              </Show>
              <section class={formBandClass}>
                <h2>Холбоо барих</h2>
                <form.Field name="name">
                  {field => (
                    <label>
                      Нэр <span aria-hidden="true">*</span>
                      <input
                        name="name"
                        required
                        value={field().state.value}
                        aria-invalid={Boolean(fieldError('name'))}
                        aria-describedby={fieldError('name') ? fieldErrorId('name') : undefined}
                        onInput={e => {
                          field().handleChange(e.currentTarget.value)
                          clearFieldError('name')
                        }}
                        onBlur={() => field().handleBlur()}
                        autocomplete="name"
                      />
                      <small
                        class="text-warning min-h-[1.2em] font-extrabold"
                        id={fieldErrorId('name')}
                      >
                        {fieldError('name')}
                      </small>
                    </label>
                  )}
                </form.Field>
                <form.Field name="phone">
                  {field => (
                    <label>
                      Утас <span aria-hidden="true">*</span>
                      <input
                        name="phone"
                        inputmode="tel"
                        required
                        value={field().state.value}
                        aria-invalid={Boolean(fieldError('phone'))}
                        aria-describedby={fieldError('phone') ? fieldErrorId('phone') : undefined}
                        onInput={e => {
                          field().handleChange(e.currentTarget.value)
                          clearFieldError('phone')
                        }}
                        onBlur={() => field().handleBlur()}
                        placeholder="9911 2233"
                        autocomplete="tel"
                      />
                      <small
                        class="text-warning min-h-[1.2em] font-extrabold"
                        id={fieldErrorId('phone')}
                      >
                        {fieldError('phone')}
                      </small>
                    </label>
                  )}
                </form.Field>
              </section>
              <section class={formBandClass}>
                <h2>Улаанбаатар хүргэлт</h2>
                <form.Field name="district">
                  {field => (
                    <label>
                      Дүүрэг <span aria-hidden="true">*</span>
                      <select
                        name="district"
                        required
                        value={field().state.value}
                        onChange={e =>
                          field().handleChange(e.currentTarget.value as (typeof districts)[number])
                        }
                      >
                        <For each={districts}>{district => <option>{district}</option>}</For>
                      </select>
                    </label>
                  )}
                </form.Field>
                <form.Field name="khoroo">
                  {field => (
                    <label>
                      Хороо <span aria-hidden="true">*</span>
                      <input
                        name="khoroo"
                        required
                        value={field().state.value}
                        aria-invalid={Boolean(fieldError('khoroo'))}
                        aria-describedby={fieldError('khoroo') ? fieldErrorId('khoroo') : undefined}
                        onInput={e => {
                          field().handleChange(e.currentTarget.value)
                          clearFieldError('khoroo')
                        }}
                      />
                      <small
                        class="text-warning min-h-[1.2em] font-extrabold"
                        id={fieldErrorId('khoroo')}
                      >
                        {fieldError('khoroo')}
                      </small>
                    </label>
                  )}
                </form.Field>
                <form.Field name="address">
                  {field => (
                    <label>
                      Дэлгэрэнгүй хаяг <span aria-hidden="true">*</span>
                      <textarea
                        name="address"
                        required
                        value={field().state.value}
                        aria-invalid={Boolean(fieldError('address'))}
                        aria-describedby={
                          fieldError('address') ? fieldErrorId('address') : undefined
                        }
                        onInput={e => {
                          field().handleChange(e.currentTarget.value)
                          clearFieldError('address')
                        }}
                      />
                      <small
                        class="text-warning min-h-[1.2em] font-extrabold"
                        id={fieldErrorId('address')}
                      >
                        {fieldError('address')}
                      </small>
                    </label>
                  )}
                </form.Field>
                <form.Field name="notes">
                  {field => (
                    <label>
                      Нэмэлт тайлбар <small>(заавал биш)</small>
                      <textarea
                        name="notes"
                        value={field().state.value}
                        onInput={e => field().handleChange(e.currentTarget.value)}
                      />
                    </label>
                  )}
                </form.Field>
                <Show when={error()?._tag === 'DeliveryUnavailable'}>
                  <div class={errorPanelClass}>
                    <strong>Хүргэлт боломжгүй.</strong>
                    <p>{error()?.message}</p>
                  </div>
                </Show>
              </section>
              <section
                class={`${formBandClass} [&_[role=radiogroup]>label]:border-ink [&_[role=radiogroup]]:grid [&_[role=radiogroup]]:grid-cols-2 [&_[role=radiogroup]]:gap-3 max-md:[&_[role=radiogroup]]:grid-cols-1 [&_[role=radiogroup]_small]:col-2 [&_[role=radiogroup]>label]:min-h-22.5 [&_[role=radiogroup]>label]:grid-cols-[auto_1fr] [&_[role=radiogroup]>label]:items-center [&_[role=radiogroup]>label]:border-3 [&_[role=radiogroup]>label]:p-4`}
              >
                <h2>Төлбөр</h2>
                <form.Field name="paymentMethod">
                  {field => (
                    <div role="radiogroup">
                      <label>
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={field().state.value === 'qpay'}
                          onChange={() => field().handleChange('qpay')}
                        />{' '}
                        QPay <small>QR болон банкны апп</small>
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={field().state.value === 'bank_transfer'}
                          onChange={() => field().handleChange('bank_transfer')}
                        />{' '}
                        Дансаар шилжүүлэх <small>Ажилтан баталгаажуулна</small>
                      </label>
                    </div>
                  )}
                </form.Field>
                <Show when={error()?._tag === 'PaymentSetupFailed'}>
                  <div class={errorPanelClass}>
                    <p>{error()?.message}</p>
                    <button type="submit">Дахин оролдох</button>
                    <Show when={error()?.canUseBankTransfer}>
                      <button
                        type="button"
                        onClick={() => form.setFieldValue('paymentMethod', 'bank_transfer')}
                      >
                        Дансаар төлөх
                      </button>
                    </Show>
                  </div>
                </Show>
              </section>
            </div>
            <aside class="border-ink bg-acid sticky top-4 col-[9/13] min-w-0 border-4 p-4 max-md:relative max-md:top-auto max-md:w-full">
              <h2 class="font-display text-[3rem] leading-[0.8]">Таны сагс</h2>
              <For each={cartItems()}>
                {item => (
                  <div class="border-ink flex flex-wrap justify-between gap-4 border-b-2 py-3">
                    <span>
                      {item.productName} × {item.quantity}
                    </span>
                    <strong>{money.format(item.unitPriceMnt * item.quantity)} ₮</strong>
                  </div>
                )}
              </For>
              <div class="py-4">Хүргэлтийн төлбөрийг сервер баталгаажуулж нийт дүнд нэмнэ.</div>
              <button
                class={`${actionClass} bg-ink text-paper w-full`}
                type="submit"
                disabled={checkout.isPending}
              >
                {checkout.isPending ? 'Баталгаажуулж байна…' : 'Захиалга үүсгэх →'}
              </button>
            </aside>
          </form>
        </Show>
      </Match>
    </Switch>
  )
}

export function CheckoutForm() {
  const [mounted, setMounted] = createSignal(false)
  onMount(() => setMounted(true))

  return (
    <Show
      when={mounted()}
      fallback={
        <div class="grid min-h-[60vh] place-content-center text-center">Сагсыг шалгаж байна…</div>
      }
    >
      {_mounted => {
        const client = createStorefrontQueryClient()
        return (
          <QueryClientProvider client={client}>
            <FormOwner />
          </QueryClientProvider>
        )
      }}
    </Show>
  )
}
