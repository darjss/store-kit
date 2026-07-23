/* oxlint-disable tailwindcss/no-unknown-classes, eslint/no-underscore-dangle */
import type { CheckoutCreated, CheckoutError, CheckoutInput } from '@store-kit/contracts/checkout'
import { checkoutInputSchema } from '@store-kit/contracts/checkout'
import { cartItems, cartLineInputs, clearCart, openCart } from '@store-kit/storefront/cart/store'
import { createStorefrontQueryClient } from '@store-kit/storefront/query-client'
import { cartQuery } from '@store-kit/storefront/query-options/cart'
import { checkoutMutation } from '@store-kit/storefront/query-options/checkout'
import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  NativeSelect,
  NativeSelectOption,
  RadioGroup,
  RadioGroupItem,
  Textarea,
} from '@store-kit/ui'
import { createForm } from '@tanstack/solid-form'
import { QueryClientProvider, createMutation, createQuery } from '@tanstack/solid-query'
import { For, Match, Show, Switch, createSignal, onMount } from 'solid-js'
import { Value } from 'typebox/value'

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
  'mb-4 border-4 border-ink bg-paper-clean p-[clamp(1rem,2vw,2rem)] [&>h2]:font-display [&>h2]:text-[2.5rem] [&>h2]:leading-[0.8] [&_[data-slot=field]]:mb-4'
const errorPanelClass =
  'mb-4 border-4 border-warning bg-paper-clean p-4 [&_button]:min-h-11 [&_button]:cursor-pointer [&_button]:border-3 [&_button]:border-ink [&_button]:bg-acid [&_button]:px-3 [&_button]:py-2 [&_button]:font-black'
const formFieldByContractPath = {
  '/customer/name': 'name',
  '/customer/phone': 'phone',
  '/delivery/district': 'district',
  '/delivery/khoroo': 'khoroo',
  '/delivery/address': 'address',
  '/delivery/notes': 'notes',
  '/paymentMethod': 'paymentMethod',
} as const
const validationMessageByContractPath: Record<keyof typeof formFieldByContractPath, string> = {
  '/customer/name': 'Нэрээ оруулна уу.',
  '/customer/phone': 'Утасны дугаараа шалгана уу.',
  '/delivery/district': 'Дүүргээ сонгоно уу.',
  '/delivery/khoroo': 'Хороогоо оруулна уу.',
  '/delivery/address': 'Дэлгэрэнгүй хаягаа оруулна уу.',
  '/delivery/notes': 'Нэмэлт тайлбар 500 тэмдэгтээс ихгүй байна.',
  '/paymentMethod': 'Төлбөрийн аргаа сонгоно уу.',
}

type CheckoutFormValues = Omit<CheckoutInput, 'items' | 'customer' | 'delivery'> &
  CheckoutInput['customer'] &
  CheckoutInput['delivery']

type TransportError = { _tag: 'TransportError'; message: string }

const qpayAction = (order: CheckoutCreated) =>
  order.nextAction.type === 'qpay' ? order.nextAction : undefined
const bankAction = (order: CheckoutCreated) =>
  order.nextAction.type === 'bank_transfer' ? order.nextAction : undefined

const toCheckoutInput = (value: CheckoutFormValues): CheckoutInput => ({
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

const validateCheckout = ({ value }: { value: CheckoutFormValues }) => {
  const fields = Object.fromEntries(
    Value.Errors(checkoutInputSchema, toCheckoutInput(value)).flatMap(issue => {
      const path = issue.instancePath as keyof typeof formFieldByContractPath
      const field = formFieldByContractPath[path]
      return field ? [[field, validationMessageByContractPath[path]]] : []
    }),
  )
  return Object.keys(fields).length > 0 ? { fields } : undefined
}

const validationError = (errors: unknown[]) =>
  errors.find((item): item is string => typeof item === 'string')

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
    } satisfies CheckoutFormValues,
    validators: { onSubmit: validateCheckout },
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
        const result = await checkout.mutateAsync(toCheckoutInput(value))
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
            aria-busy={form.state.isSubmitting}
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
                  <Button type="button" variant="outline" onClick={openCart}>
                    Сагс нээж засах →
                  </Button>
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
                  <Button type="submit" variant="outline" disabled={form.state.isSubmitting}>
                    Дахин оролдох
                  </Button>
                </section>
              </Show>
              <section class={formBandClass}>
                <h2>Холбоо барих</h2>
                <form.Field name="name">
                  {field => {
                    const message = () =>
                      fieldError('name') ?? validationError(field().state.meta.errors)
                    return (
                      <Field>
                        <FieldLabel for={field().name}>
                          Нэр <span aria-hidden="true">*</span>
                        </FieldLabel>
                        <Input
                          id={field().name}
                          name={field().name}
                          required
                          value={field().state.value}
                          aria-invalid={Boolean(message())}
                          aria-describedby={message() ? fieldErrorId('name') : undefined}
                          onInput={event => {
                            field().handleChange(event.currentTarget.value)
                            clearFieldError('name')
                          }}
                          onBlur={() => field().handleBlur()}
                          autocomplete="name"
                        />
                        <FieldError id={fieldErrorId('name')}>{message()}</FieldError>
                      </Field>
                    )
                  }}
                </form.Field>
                <form.Field name="phone">
                  {field => {
                    const message = () =>
                      fieldError('phone') ?? validationError(field().state.meta.errors)
                    return (
                      <Field>
                        <FieldLabel for={field().name}>
                          Утас <span aria-hidden="true">*</span>
                        </FieldLabel>
                        <Input
                          id={field().name}
                          name={field().name}
                          inputmode="tel"
                          required
                          value={field().state.value}
                          aria-invalid={Boolean(message())}
                          aria-describedby={message() ? fieldErrorId('phone') : undefined}
                          onInput={event => {
                            field().handleChange(event.currentTarget.value)
                            clearFieldError('phone')
                          }}
                          onBlur={() => field().handleBlur()}
                          placeholder="9911 2233"
                          autocomplete="tel"
                        />
                        <FieldError id={fieldErrorId('phone')}>{message()}</FieldError>
                      </Field>
                    )
                  }}
                </form.Field>
              </section>
              <section class={formBandClass}>
                <h2>Улаанбаатар хүргэлт</h2>
                <form.Field name="district">
                  {field => (
                    <Field>
                      <FieldLabel for={field().name}>
                        Дүүрэг <span aria-hidden="true">*</span>
                      </FieldLabel>
                      <NativeSelect
                        class="w-full"
                        id={field().name}
                        name={field().name}
                        required
                        value={field().state.value}
                        onChange={event =>
                          field().handleChange(
                            event.currentTarget.value as (typeof districts)[number],
                          )
                        }
                        onBlur={() => field().handleBlur()}
                      >
                        <For each={districts}>
                          {district => (
                            <NativeSelectOption value={district}>{district}</NativeSelectOption>
                          )}
                        </For>
                      </NativeSelect>
                    </Field>
                  )}
                </form.Field>
                <form.Field name="khoroo">
                  {field => {
                    const message = () =>
                      fieldError('khoroo') ?? validationError(field().state.meta.errors)
                    return (
                      <Field>
                        <FieldLabel for={field().name}>
                          Хороо <span aria-hidden="true">*</span>
                        </FieldLabel>
                        <Input
                          id={field().name}
                          name={field().name}
                          required
                          value={field().state.value}
                          aria-invalid={Boolean(message())}
                          aria-describedby={message() ? fieldErrorId('khoroo') : undefined}
                          onInput={event => {
                            field().handleChange(event.currentTarget.value)
                            clearFieldError('khoroo')
                          }}
                          onBlur={() => field().handleBlur()}
                        />
                        <FieldError id={fieldErrorId('khoroo')}>{message()}</FieldError>
                      </Field>
                    )
                  }}
                </form.Field>
                <form.Field name="address">
                  {field => {
                    const message = () =>
                      fieldError('address') ?? validationError(field().state.meta.errors)
                    return (
                      <Field>
                        <FieldLabel for={field().name}>
                          Дэлгэрэнгүй хаяг <span aria-hidden="true">*</span>
                        </FieldLabel>
                        <Textarea
                          id={field().name}
                          name={field().name}
                          required
                          value={field().state.value}
                          aria-invalid={Boolean(message())}
                          aria-describedby={message() ? fieldErrorId('address') : undefined}
                          onInput={event => {
                            field().handleChange(event.currentTarget.value)
                            clearFieldError('address')
                          }}
                          onBlur={() => field().handleBlur()}
                        />
                        <FieldError id={fieldErrorId('address')}>{message()}</FieldError>
                      </Field>
                    )
                  }}
                </form.Field>
                <form.Field name="notes">
                  {field => {
                    const message = () => validationError(field().state.meta.errors)
                    return (
                      <Field>
                        <FieldLabel for={field().name}>Нэмэлт тайлбар</FieldLabel>
                        <FieldDescription>Заавал биш</FieldDescription>
                        <Textarea
                          id={field().name}
                          name={field().name}
                          value={field().state.value}
                          aria-invalid={Boolean(message())}
                          aria-describedby={message() ? fieldErrorId('notes') : undefined}
                          onInput={event => field().handleChange(event.currentTarget.value)}
                          onBlur={() => field().handleBlur()}
                        />
                        <FieldError id={fieldErrorId('notes')}>{message()}</FieldError>
                      </Field>
                    )
                  }}
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
                  {field => {
                    const message = () => validationError(field().state.meta.errors)
                    return (
                      <Field>
                        <RadioGroup
                          name={field().name}
                          required
                          value={field().state.value}
                          aria-invalid={Boolean(message())}
                          aria-describedby={message() ? fieldErrorId('paymentMethod') : undefined}
                          onChange={value =>
                            field().handleChange(value as CheckoutFormValues['paymentMethod'])
                          }
                          onBlur={() => field().handleBlur()}
                        >
                          <FieldLabel for="payment-qpay">
                            <RadioGroupItem id="payment-qpay" value="qpay" />
                            <span>
                              QPay <small>QR болон банкны апп</small>
                            </span>
                          </FieldLabel>
                          <FieldLabel for="payment-bank-transfer">
                            <RadioGroupItem id="payment-bank-transfer" value="bank_transfer" />
                            <span>
                              Дансаар шилжүүлэх <small>Ажилтан баталгаажуулна</small>
                            </span>
                          </FieldLabel>
                        </RadioGroup>
                        <FieldError id={fieldErrorId('paymentMethod')}>{message()}</FieldError>
                      </Field>
                    )
                  }}
                </form.Field>
                <Show when={error()?._tag === 'PaymentSetupFailed'}>
                  <div class={errorPanelClass}>
                    <p>{error()?.message}</p>
                    <Button type="submit" variant="outline" disabled={form.state.isSubmitting}>
                      Дахин оролдох
                    </Button>
                    <Show when={error()?.canUseBankTransfer}>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={form.state.isSubmitting}
                        onClick={() => form.setFieldValue('paymentMethod', 'bank_transfer')}
                      >
                        Дансаар төлөх
                      </Button>
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
              <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting] as const}>
                {state => (
                  <Button
                    class={`${actionClass} bg-ink text-paper w-full`}
                    type="submit"
                    disabled={!state()[0] || state()[1]}
                  >
                    {state()[1] ? 'Баталгаажуулж байна…' : 'Захиалга үүсгэх →'}
                  </Button>
                )}
              </form.Subscribe>
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
