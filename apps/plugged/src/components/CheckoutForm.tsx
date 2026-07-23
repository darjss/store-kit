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
          <section class="payment-result">
            <p class="stamp success">ЗАХИАЛГА ҮҮСЛЭЭ</p>
            <h1>{order().orderNumber}</h1>
            <Show when={qpayAction(order())}>
              {action => (
                <div class="payment-block">
                  <h2>QPay-аар төлөх</h2>
                  <img class="qpay-qr" src={action().qrImage} alt="QPay төлбөрийн QR код" />
                  <div class="bank-links">
                    <For each={action().urls}>
                      {bank => <a href={bank.link}>{bank.name}-аар нээх</a>}
                    </For>
                  </div>
                </div>
              )}
            </Show>
            <Show when={bankAction(order())}>
              {action => (
                <div class="payment-block bank-instructions">
                  <h2>Дансаар шилжүүлэх</h2>
                  <p>{action().bankName}</p>
                  <strong>{action().accountNumber}</strong>
                  <p>{action().accountName}</p>
                  <small>Гүйлгээний утгад {order().orderNumber} гэж бичнэ үү.</small>
                </div>
              )}
            </Show>
            <a
              class="slam-button"
              href={`/orders/${order().orderId}#token=${encodeURIComponent(order().statusToken)}`}
            >
              Захиалгын төлөв харах →
            </a>
          </section>
        )}
      </Match>
      <Match when={true}>
        <Show when={cartItems().length === 0}>
          <section class="empty-checkout">
            <h1>Сагс хоосон.</h1>
            <a href="/products">Дэлгүүр рүү буцах →</a>
          </section>
        </Show>
        <Show when={cartItems().length > 0}>
          <form
            class="checkout-form"
            aria-busy={checkout.isPending || validation.isFetching}
            onSubmit={event => {
              event.preventDefault()
              void form.handleSubmit()
            }}
          >
            <div class="checkout-fields">
              <h1>ЗАХИАЛГА</h1>
              <Show when={error()?._tag === 'CartChanged'}>
                <section class="correction-panel" id="cart-correction" tabIndex={-1}>
                  <h2>Сагсаа засна уу</h2>
                  <p>{error()?.message}</p>
                  <For each={error()?.corrections}>{correction => <p>{correction.message}</p>}</For>
                  <button type="button" onClick={openCart}>
                    Сагс нээж засах →
                  </button>
                </section>
              </Show>
              <Show when={error()?._tag === 'CartEmpty'}>
                <section class="inline-error" role="alert">
                  <strong>Сагс хоосон.</strong>
                  <p>{error()?.message}</p>
                  <a href="/products">Бараа сонгох →</a>
                </section>
              </Show>
              <Show when={error()?._tag === 'InvalidCheckoutDetails'}>
                <section class="inline-error" role="alert">
                  <strong>Мэдээллээ шалгана уу.</strong>
                  <p>{error()?.message}</p>
                </section>
              </Show>
              <Show when={error()?._tag === 'TransportError'}>
                <section class="inline-error" role="alert">
                  <strong>Холболт амжилтгүй.</strong>
                  <p>{error()?.message}</p>
                  <button type="submit">Дахин оролдох</button>
                </section>
              </Show>
              <section class="form-band">
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
                      <small class="field-error" id={fieldErrorId('name')}>
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
                      <small class="field-error" id={fieldErrorId('phone')}>
                        {fieldError('phone')}
                      </small>
                    </label>
                  )}
                </form.Field>
              </section>
              <section class="form-band">
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
                      <small class="field-error" id={fieldErrorId('khoroo')}>
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
                      <small class="field-error" id={fieldErrorId('address')}>
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
                  <div class="inline-error">
                    <strong>Хүргэлт боломжгүй.</strong>
                    <p>{error()?.message}</p>
                  </div>
                </Show>
              </section>
              <section class="form-band payment-choice">
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
                  <div class="inline-error">
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
            <aside class="order-summary">
              <h2>Таны сагс</h2>
              <For each={cartItems()}>
                {item => (
                  <div class="summary-line">
                    <span>
                      {item.productName} × {item.quantity}
                    </span>
                    <strong>{money.format(item.unitPriceMnt * item.quantity)} ₮</strong>
                  </div>
                )}
              </For>
              <div class="summary-note">
                Хүргэлтийн төлбөрийг сервер баталгаажуулж нийт дүнд нэмнэ.
              </div>
              <button class="slam-button" type="submit" disabled={checkout.isPending}>
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
    <Show when={mounted()} fallback={<div class="status-loading">Сагсыг шалгаж байна…</div>}>
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
