/* oxlint-disable tailwindcss/no-unknown-classes, eslint/no-underscore-dangle */
import type { CheckoutCreated } from '@store-kit/contracts/checkout'
import { cartItems, openCart } from '@store-kit/storefront/cart/store'
import { Checkout, useCheckout } from '@store-kit/storefront/checkout'
import { PendingSubmitButton, jsonPointerToFieldName } from '@store-kit/storefront/form'
import { formatMnt } from '@store-kit/storefront/format'
import { createStorefrontQueryClient } from '@store-kit/storefront/query-client'
import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  NativeSelectOption,
  RadioGroupItem,
} from '@store-kit/ui'
import { QueryClientProvider } from '@tanstack/solid-query'
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
const fieldErrorId = (name: string) => `${name}-error`
const actionClass =
  'inline-flex min-h-12.5 cursor-pointer items-center justify-center border-3 border-ink bg-orange px-4 py-3 font-black text-ink no-underline transition-transform duration-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'
const formBandClass =
  'mb-4 border-4 border-ink bg-paper-clean p-[clamp(1rem,2vw,2rem)] [&>h2]:font-display [&>h2]:text-[2.5rem] [&>h2]:leading-[0.8] [&_[data-slot=field]]:mb-4'
const errorPanelClass =
  'mb-4 border-4 border-warning bg-paper-clean p-4 [&_button]:min-h-11 [&_button]:cursor-pointer [&_button]:border-3 [&_button]:border-ink [&_button]:bg-acid [&_button]:px-3 [&_button]:py-2 [&_button]:font-black'

const qpayAction = (order: CheckoutCreated) =>
  order.nextAction.type === 'qpay' ? order.nextAction : undefined
const bankAction = (order: CheckoutCreated) =>
  order.nextAction.type === 'bank_transfer' ? order.nextAction : undefined

const fieldMessage = (hasDomainError: boolean, validationErrors: unknown[], message: string) =>
  hasDomainError || validationErrors.length > 0 ? message : undefined

function FormOwner() {
  const checkout = useCheckout()
  const created = checkout.created
  const error = () =>
    checkout.domainError() as
      | {
          _tag?: string
          message?: string
          canUseBankTransfer?: boolean
          fields?: { path: string }[]
          corrections?: { message: string }[]
        }
      | undefined
  const fieldError = (name: string) =>
    Boolean(error()?.fields?.some(item => jsonPointerToFieldName(item.path) === name))

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
          <Checkout.Form class="grid grid-cols-12 items-start gap-8 max-md:flex max-md:flex-col">
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
              <Show when={checkout.transportError()}>
                <section class={errorPanelClass} role="alert">
                  <strong>Холболт амжилтгүй.</strong>
                  <p>Сүлжээний алдаа гарлаа. Мэдээллээ хадгалсан тул дахин оролдоно уу.</p>
                  <Button type="submit" variant="outline">
                    Дахин оролдох
                  </Button>
                </section>
              </Show>
              <section class={formBandClass}>
                <h2>Холбоо барих</h2>
                <Checkout.Field name="customer.name">
                  {field => {
                    const message = () =>
                      fieldMessage(
                        fieldError('customer.name'),
                        field().state.meta.errors,
                        'Нэрээ оруулна уу.',
                      )
                    return (
                      <Field>
                        <FieldLabel for={field().name}>
                          Нэр <span aria-hidden="true">*</span>
                        </FieldLabel>
                        <field.Input
                          id={field().name}
                          required
                          aria-invalid={Boolean(message())}
                          aria-describedby={message() ? fieldErrorId('name') : undefined}
                          autocomplete="name"
                        />
                        <FieldError id={fieldErrorId('name')}>{message()}</FieldError>
                      </Field>
                    )
                  }}
                </Checkout.Field>
                <Checkout.Field name="customer.phone">
                  {field => {
                    const message = () =>
                      fieldMessage(
                        fieldError('customer.phone'),
                        field().state.meta.errors,
                        'Утасны дугаараа шалгана уу.',
                      )
                    return (
                      <Field>
                        <FieldLabel for={field().name}>
                          Утас <span aria-hidden="true">*</span>
                        </FieldLabel>
                        <field.Input
                          id={field().name}
                          inputmode="tel"
                          required
                          aria-invalid={Boolean(message())}
                          aria-describedby={message() ? fieldErrorId('phone') : undefined}
                          placeholder="9911 2233"
                          autocomplete="tel"
                        />
                        <FieldError id={fieldErrorId('phone')}>{message()}</FieldError>
                      </Field>
                    )
                  }}
                </Checkout.Field>
              </section>
              <section class={formBandClass}>
                <h2>Улаанбаатар хүргэлт</h2>
                <Checkout.Field name="delivery.district">
                  {field => (
                    <Field>
                      <FieldLabel for={field().name}>
                        Дүүрэг <span aria-hidden="true">*</span>
                      </FieldLabel>
                      <field.NativeSelect class="w-full" id={field().name} required>
                        <For each={districts}>
                          {district => (
                            <NativeSelectOption value={district}>{district}</NativeSelectOption>
                          )}
                        </For>
                      </field.NativeSelect>
                    </Field>
                  )}
                </Checkout.Field>
                <Checkout.Field name="delivery.khoroo">
                  {field => {
                    const message = () =>
                      fieldMessage(
                        fieldError('delivery.khoroo'),
                        field().state.meta.errors,
                        'Хороогоо оруулна уу.',
                      )
                    return (
                      <Field>
                        <FieldLabel for={field().name}>
                          Хороо <span aria-hidden="true">*</span>
                        </FieldLabel>
                        <field.Input
                          id={field().name}
                          required
                          aria-invalid={Boolean(message())}
                          aria-describedby={message() ? fieldErrorId('khoroo') : undefined}
                        />
                        <FieldError id={fieldErrorId('khoroo')}>{message()}</FieldError>
                      </Field>
                    )
                  }}
                </Checkout.Field>
                <Checkout.Field name="delivery.address">
                  {field => {
                    const message = () =>
                      fieldMessage(
                        fieldError('delivery.address'),
                        field().state.meta.errors,
                        'Дэлгэрэнгүй хаягаа оруулна уу.',
                      )
                    return (
                      <Field>
                        <FieldLabel for={field().name}>
                          Дэлгэрэнгүй хаяг <span aria-hidden="true">*</span>
                        </FieldLabel>
                        <field.Textarea
                          id={field().name}
                          required
                          aria-invalid={Boolean(message())}
                          aria-describedby={message() ? fieldErrorId('address') : undefined}
                        />
                        <FieldError id={fieldErrorId('address')}>{message()}</FieldError>
                      </Field>
                    )
                  }}
                </Checkout.Field>
                <Checkout.Field name="delivery.notes">
                  {field => {
                    const message = () =>
                      fieldMessage(
                        fieldError('delivery.notes'),
                        field().state.meta.errors,
                        'Нэмэлт тайлбар 500 тэмдэгтээс ихгүй байна.',
                      )
                    return (
                      <Field>
                        <FieldLabel for={field().name}>Нэмэлт тайлбар</FieldLabel>
                        <FieldDescription>Заавал биш</FieldDescription>
                        <field.Textarea
                          id={field().name}
                          aria-invalid={Boolean(message())}
                          aria-describedby={message() ? fieldErrorId('notes') : undefined}
                        />
                        <FieldError id={fieldErrorId('notes')}>{message()}</FieldError>
                      </Field>
                    )
                  }}
                </Checkout.Field>
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
                <Checkout.Field name="paymentMethod">
                  {field => {
                    const message = () =>
                      fieldMessage(
                        fieldError('paymentMethod'),
                        field().state.meta.errors,
                        'Төлбөрийн аргаа сонгоно уу.',
                      )
                    return (
                      <Field>
                        <field.RadioGroup
                          aria-invalid={Boolean(message())}
                          aria-describedby={message() ? fieldErrorId('paymentMethod') : undefined}
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
                        </field.RadioGroup>
                        <FieldError id={fieldErrorId('paymentMethod')}>{message()}</FieldError>
                      </Field>
                    )
                  }}
                </Checkout.Field>
                <Show when={error()?._tag === 'PaymentSetupFailed'}>
                  <div class={errorPanelClass}>
                    <p>{error()?.message}</p>
                    <Button type="submit" variant="outline">
                      Дахин оролдох
                    </Button>
                    <Show when={error()?.canUseBankTransfer}>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          checkout.form.setFieldValue('paymentMethod', 'bank_transfer')
                        }
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
                    <strong>{formatMnt(item.unitPriceMnt * item.quantity)}</strong>
                  </div>
                )}
              </For>
              <div class="py-4">Хүргэлтийн төлбөрийг сервер баталгаажуулж нийт дүнд нэмнэ.</div>
              <Checkout.Submit>
                {state => (
                  <PendingSubmitButton
                    class={`${actionClass} bg-ink text-paper w-full`}
                    pending={state().pending}
                    pendingChildren="Баталгаажуулж байна…"
                    busyLabel="Захиалгыг баталгаажуулж байна"
                    disabled={!state().canSubmit}
                  >
                    Захиалга үүсгэх →
                  </PendingSubmitButton>
                )}
              </Checkout.Submit>
            </aside>
          </Checkout.Form>
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
            <Checkout.Root>
              <FormOwner />
            </Checkout.Root>
          </QueryClientProvider>
        )
      }}
    </Show>
  )
}
