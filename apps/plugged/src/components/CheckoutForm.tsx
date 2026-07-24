/* oxlint-disable tailwindcss/no-unknown-classes, eslint/no-underscore-dangle */
import type { CheckoutCreated } from '@store-kit/contracts/checkout'
import { cartItems } from '@store-kit/storefront/cart/store'
import { Checkout, useCheckout } from '@store-kit/storefront/checkout'
import type { CheckoutCorrectionAction, CheckoutDomainError } from '@store-kit/storefront/checkout'
import type { FieldErrorState } from '@store-kit/storefront/form'
import { PendingSubmitButton } from '@store-kit/storefront/form'
import { formatMnt } from '@store-kit/storefront/format'
import { createStorefrontQueryClient } from '@store-kit/storefront/query-client'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  NativeSelectOption,
  RadioGroupItem,
} from '@store-kit/ui'
import { QueryClientProvider } from '@tanstack/solid-query'
import { match } from 'dismatch'
import { For, Match, Show, Switch, createSignal, onMount } from 'solid-js'
import type { Accessor, ParentProps } from 'solid-js'

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
const fieldLabels: Record<string, string> = {
  'customer.name': 'Нэр',
  'customer.phone': 'Утас',
  'delivery.district': 'Дүүрэг',
  'delivery.khoroo': 'Хороо',
  'delivery.address': 'Дэлгэрэнгүй хаяг',
  'delivery.notes': 'Нэмэлт тайлбар',
  'paymentMethod': 'Төлбөрийн арга',
}

const qpayAction = (order: CheckoutCreated) =>
  order.nextAction.type === 'qpay' ? order.nextAction : undefined
const bankAction = (order: CheckoutCreated) =>
  order.nextAction.type === 'bank_transfer' ? order.nextAction : undefined

const fieldMessage = (state: Accessor<FieldErrorState>, message: string) =>
  state().visible ? message : undefined

function ErrorNotice(props: ParentProps<{ title: string }>) {
  return (
    <Alert
      class="border-warning bg-paper-clean text-ink mb-5 rotate-[-0.4deg] border-4 p-4 shadow-[0.35rem_0.4rem_0_var(--color-ink)] [&_[data-slot=alert-action]]:static [&_[data-slot=alert-action]]:mt-3 [&_[data-slot=alert-action]]:translate-y-0"
      variant="destructive"
    >
      <AlertTitle>{props.title}</AlertTitle>
      <AlertDescription>{props.children}</AlertDescription>
    </Alert>
  )
}

function DomainErrorNotice(props: {
  error: CheckoutDomainError
  actions: CheckoutCorrectionAction[]
  correct: (action: CheckoutCorrectionAction) => void
}) {
  return match(
    props.error,
    '_tag',
  )({
    CartChanged: error => (
      <ErrorNotice title="Сагсаа засна уу">
        <For each={error.corrections}>{correction => <p>{correction.message}</p>}</For>
        <Show when={props.actions.includes('open-cart')}>
          <AlertAction>
            <Button
              class="min-h-11"
              type="button"
              variant="outline"
              onClick={() => props.correct('open-cart')}
            >
              Сагс нээж засах →
            </Button>
          </AlertAction>
        </Show>
      </ErrorNotice>
    ),
    CartEmpty: error => (
      <ErrorNotice title="Сагс хоосон.">
        <p>{error.message}</p>
        <a href="/products">Бараа сонгох →</a>
      </ErrorNotice>
    ),
    InvalidCart: () => (
      <ErrorNotice title="Сагсаа шалгана уу.">
        <p>Сагсны мэдээлэл буруу байна. Бараагаа дахин сонгоно уу.</p>
        <Show when={props.actions.includes('open-cart')}>
          <AlertAction>
            <Button
              class="min-h-11"
              type="button"
              variant="outline"
              onClick={() => props.correct('open-cart')}
            >
              Сагс нээх →
            </Button>
          </AlertAction>
        </Show>
      </ErrorNotice>
    ),
    InvalidCheckoutDetails: () => (
      <ErrorNotice title="Мэдээллээ шалгана уу.">
        <p>Тодруулсан талбаруудыг засаад дахин оролдоно уу.</p>
      </ErrorNotice>
    ),
    DeliveryUnavailable: error => (
      <ErrorNotice title="Хүргэлт боломжгүй.">
        <p>{error.message}</p>
      </ErrorNotice>
    ),
    PaymentSetupFailed: error => (
      <ErrorNotice title="Төлбөр үүсгэж чадсангүй.">
        <p>{error.message}</p>
        <AlertAction>
          <div class="flex flex-wrap gap-2">
            <Show when={props.actions.includes('retry')}>
              <Button
                class="min-h-11"
                type="button"
                variant="outline"
                onClick={() => props.correct('retry')}
              >
                Дахин оролдох
              </Button>
            </Show>
            <Show when={props.actions.includes('use-bank-transfer')}>
              <Button
                class="min-h-11"
                type="button"
                variant="secondary"
                onClick={() => props.correct('use-bank-transfer')}
              >
                Дансаар төлөх
              </Button>
            </Show>
          </div>
        </AlertAction>
      </ErrorNotice>
    ),
  })
}

function FormOwner() {
  const checkout = useCheckout()
  const created = checkout.created
  const domainFailure = () => {
    const failure = checkout.errors.state()
    return failure.type === 'domain' ? failure : undefined
  }
  const transportFailure = () => {
    const failure = checkout.errors.state()
    return failure.type === 'transport' ? failure : undefined
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
                    class="border-ink aspect-square h-auto w-[min(320px,100%)] border-4"
                    src={action().qrImage}
                    alt="QPay төлбөрийн QR код"
                    width="320"
                    height="320"
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
              class="border-ink bg-orange text-ink inline-flex min-h-12.5 cursor-pointer items-center justify-center border-3 px-4 py-3 font-black no-underline transition-transform duration-100 active:scale-[0.97] motion-reduce:transition-none"
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
          <Checkout.Form class="mx-auto grid max-w-304 grid-cols-12 items-start gap-8 max-md:flex max-md:flex-col">
            <div class="col-[1/8] max-md:w-full">
              <p class="text-cyan m-0 font-black">ORDER DOSSIER / 01—03</p>
              <h1 class="font-body text-[clamp(3rem,8vw,5.5rem)] leading-[0.86] font-black tracking-[-0.035em] max-md:text-[3.6rem]">
                ЗАХИАЛГЫН ХЭРЭГ
              </h1>
              <checkout.form.ErrorSummary>
                {summary => (
                  <Show when={summary().visible}>
                    <ErrorNotice title="Мэдээллээ шалгана уу.">
                      <div
                        ref={checkout.errors.setSummaryElement}
                        tabIndex={-1}
                        data-form-error-summary
                      >
                        <p>Тодруулсан талбаруудыг засаад дахин оролдоно уу.</p>
                        <ul>
                          <For each={summary().items}>
                            {item => <li>{fieldLabels[item.name] ?? item.name}</li>}
                          </For>
                        </ul>
                      </div>
                    </ErrorNotice>
                  </Show>
                )}
              </checkout.form.ErrorSummary>
              <Show when={domainFailure()} keyed>
                {failure => (
                  <DomainErrorNotice
                    error={failure.error}
                    actions={failure.actions}
                    correct={checkout.errors.performAction}
                  />
                )}
              </Show>
              <Show when={transportFailure()}>
                <ErrorNotice title="Холболт амжилтгүй.">
                  <p>Сүлжээний алдаа гарлаа. Мэдээллээ хадгалсан тул дахин оролдоно уу.</p>
                  <Show when={transportFailure()?.actions.includes('retry')}>
                    <AlertAction>
                      <Button
                        class="min-h-11"
                        type="button"
                        variant="outline"
                        onClick={() => checkout.errors.performAction('retry')}
                      >
                        Дахин оролдох
                      </Button>
                    </AlertAction>
                  </Show>
                </ErrorNotice>
              </Show>
              <section class="paper-stack border-ink text-ink relative z-3 mb-5 rotate-[0.25deg] border-4 p-[clamp(1rem,2vw,2rem)] [clip-path:polygon(0_0,96%_0,100%_2.2rem,100%_100%,1%_99%)] [&_[data-slot=field]]:mb-4">
                <h2 class="font-body text-[2rem] leading-none font-black">
                  <span class="text-cyan-deep mr-3">01</span>ХОЛБОО БАРИХ
                </h2>
                <Checkout.Field name="customer.name">
                  {field => (
                    <field.ErrorState>
                      {error => {
                        const message = () => fieldMessage(error, 'Нэрээ оруулна уу.')
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
                    </field.ErrorState>
                  )}
                </Checkout.Field>
                <Checkout.Field name="customer.phone">
                  {field => (
                    <field.ErrorState>
                      {error => {
                        const message = () => fieldMessage(error, 'Утасны дугаараа шалгана уу.')
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
                    </field.ErrorState>
                  )}
                </Checkout.Field>
              </section>
              <section class="paper-stack border-ink text-ink relative z-2 mb-5 -translate-x-1 rotate-[-0.3deg] border-4 p-[clamp(1rem,2vw,2rem)] [clip-path:polygon(0_0,95%_0,100%_2.2rem,99%_100%,0_98%)] [&_[data-slot=field]]:mb-4">
                <h2 class="font-body text-[2rem] leading-none font-black">
                  <span class="text-cyan-deep mr-3">02</span>УЛААНБААТАР ХҮРГЭЛТ
                </h2>
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
                  {field => (
                    <field.ErrorState>
                      {error => {
                        const message = () => fieldMessage(error, 'Хороогоо оруулна уу.')
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
                    </field.ErrorState>
                  )}
                </Checkout.Field>
                <Checkout.Field name="delivery.address">
                  {field => (
                    <field.ErrorState>
                      {error => {
                        const message = () => fieldMessage(error, 'Дэлгэрэнгүй хаягаа оруулна уу.')
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
                    </field.ErrorState>
                  )}
                </Checkout.Field>
                <Checkout.Field name="delivery.notes">
                  {field => (
                    <field.ErrorState>
                      {error => {
                        const message = () =>
                          fieldMessage(error, 'Нэмэлт тайлбар 500 тэмдэгтээс ихгүй байна.')
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
                    </field.ErrorState>
                  )}
                </Checkout.Field>
              </section>
              <section class="paper-stack border-ink text-ink [&_[role=radiogroup]>label]:border-ink relative z-1 mb-4 translate-x-1 rotate-[0.2deg] border-4 p-[clamp(1rem,2vw,2rem)] [clip-path:polygon(0_0,96%_1%,100%_2.2rem,100%_100%,1%_99%)] [&_[data-slot=field]]:mb-4 [&_[role=radiogroup]]:grid [&_[role=radiogroup]]:grid-cols-2 [&_[role=radiogroup]]:gap-3 max-md:[&_[role=radiogroup]]:grid-cols-1 [&_[role=radiogroup]_small]:col-2 [&_[role=radiogroup]>label]:min-h-22.5 [&_[role=radiogroup]>label]:grid-cols-[auto_1fr] [&_[role=radiogroup]>label]:items-center [&_[role=radiogroup]>label]:border-3 [&_[role=radiogroup]>label]:p-4">
                <h2 class="font-body text-[2rem] leading-none font-black">
                  <span class="text-cyan-deep mr-3">03</span>ТӨЛБӨР
                </h2>
                <Checkout.Field name="paymentMethod">
                  {field => (
                    <field.ErrorState>
                      {error => {
                        const message = () => fieldMessage(error, 'Төлбөрийн аргаа сонгоно уу.')
                        return (
                          <Field>
                            <field.RadioGroup
                              aria-invalid={Boolean(message())}
                              aria-describedby={
                                message() ? fieldErrorId('paymentMethod') : undefined
                              }
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
                    </field.ErrorState>
                  )}
                </Checkout.Field>
              </section>
            </div>
            <aside class="paper-stack border-ink text-ink sticky top-4 col-[9/13] min-w-0 border-4 p-4 max-md:sticky max-md:top-auto max-md:bottom-[calc(68px+env(safe-area-inset-bottom))] max-md:z-20 max-md:w-full max-md:[&>div:not(:last-of-type)]:hidden max-md:[&>h2]:text-xl">
              <p class="border-cyan-deep text-cyan-deep m-0 inline-block -rotate-2 border-2 px-2 py-1 font-black">
                БАТАЛГААЖУУЛАХАД БЭЛЭН
              </p>
              <h2 class="font-body text-[2.2rem] leading-[0.9] font-black">ТАНЫ САГС</h2>
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
                    class="bg-ink text-paper inline-flex min-h-12.5 w-full cursor-pointer items-center justify-center border-3 px-4 py-3 font-black no-underline transition-transform duration-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none"
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
            <Checkout.Root
              defaultValues={{
                customer: { name: '', phone: '' },
                delivery: {
                  district: 'Баянзүрх',
                  khoroo: '',
                  address: '',
                  notes: '',
                },
                paymentMethod: 'qpay',
              }}
            >
              <FormOwner />
            </Checkout.Root>
          </QueryClientProvider>
        )
      }}
    </Show>
  )
}
