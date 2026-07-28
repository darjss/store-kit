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
const fieldMessage = (state: Accessor<FieldErrorState>, message: string) =>
  state().visible ? message : undefined
const qpayAction = (order: CheckoutCreated) =>
  order.nextAction.type === 'qpay' ? order.nextAction : undefined
const bankAction = (order: CheckoutCreated) =>
  order.nextAction.type === 'bank_transfer' ? order.nextAction : undefined

function ErrorNotice(props: ParentProps<{ title: string }>) {
  return (
    <Alert
      class="border-line bg-surface rounded-action mb-5 border-l-4 border-l-accent p-4"
      variant="destructive"
    >
      <h2 class="m-0 text-base font-bold">{props.title}</h2>
      <div class="mt-2 text-muted">{props.children}</div>
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
              type="button"
              variant="outline"
              class="border-line bg-panel rounded-action mt-3 min-h-11 font-bold"
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
          <Button
            type="button"
            variant="outline"
            class="border-line bg-panel rounded-action min-h-11 font-bold"
            onClick={() => props.correct('open-cart')}
          >
            Сагс нээх →
          </Button>
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
        <div class="mt-3 flex flex-wrap gap-2">
          <Show when={props.actions.includes('retry')}>
            <Button
              type="button"
              variant="outline"
              class="border-line bg-panel rounded-action min-h-11 font-bold"
              onClick={() => props.correct('retry')}
            >
              Дахин оролдох
            </Button>
          </Show>
          <Show when={props.actions.includes('use-bank-transfer')}>
            <Button
              type="button"
              class="text-on-accent hover:bg-accent-strong rounded-action min-h-11 bg-accent font-bold"
              onClick={() => props.correct('use-bank-transfer')}
            >
              Дансаар төлөх
            </Button>
          </Show>
        </div>
      </ErrorNotice>
    ),
  })
}

function CreatedOrder(props: { order: CheckoutCreated }) {
  const qpay = qpayAction(props.order)
  const bank = bankAction(props.order)
  return (
    <section class="border-line bg-panel rounded-action mx-auto w-full max-w-2xl border p-6 md:p-8">
      <p class="m-0 text-sm font-bold text-muted">Захиалга үүслээ</p>
      <h1 class="font-number mt-2 mb-6 text-3xl font-extrabold">{props.order.orderNumber}</h1>
      <Show when={qpay}>
        {action => (
          <section class="border-line border-t pt-5">
            <h2 class="m-0 text-xl font-extrabold">QPay-аар төлөх</h2>
            <p class="text-muted">QR кодыг уншуулж эсвэл доорх банкны апп-аар төлнө үү.</p>
            <img
              class="border-line rounded-action w-full max-w-80 border"
              src={action().qrImage}
              alt="QPay төлбөрийн QR код"
              width="320"
              height="320"
            />
            <div class="mt-4 flex flex-wrap gap-2">
              <For each={action().urls}>
                {item => (
                  <a
                    class="text-on-accent hover:bg-accent-strong rounded-action inline-flex min-h-11 items-center bg-accent px-4 font-bold no-underline"
                    href={item.link}
                  >
                    {item.name}-аар нээх
                  </a>
                )}
              </For>
            </div>
          </section>
        )}
      </Show>
      <Show when={bank}>
        {action => (
          <section class="border-line border-t pt-5">
            <h2 class="m-0 text-xl font-extrabold">Дансаар шилжүүлэх</h2>
            <dl class="mt-4 grid gap-3">
              <div>
                <dt class="text-sm text-muted">Банк</dt>
                <dd class="m-0 font-bold">{action().bankName}</dd>
              </div>
              <div>
                <dt class="text-sm text-muted">Дансны дугаар</dt>
                <dd class="font-number m-0 font-bold">{action().accountNumber}</dd>
              </div>
              <div>
                <dt class="text-sm text-muted">Данс эзэмшигч</dt>
                <dd class="m-0 font-bold">{action().accountName}</dd>
              </div>
            </dl>
            <p class="mt-4 text-sm text-muted">
              Гүйлгээний утгад {props.order.orderNumber} гэж бичнэ үү.
            </p>
          </section>
        )}
      </Show>
      <a
        class="border-line hover:bg-surface rounded-action mt-6 inline-flex min-h-11 items-center border px-4 font-bold no-underline"
        href={`/orders/${props.order.orderId}#token=${encodeURIComponent(props.order.statusToken)}`}
      >
        Захиалгын төлөв харах →
      </a>
    </section>
  )
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
  const inputClass = 'min-h-12 rounded-action border-line border bg-panel px-4 font-medium'

  return (
    <Switch>
      <Match when={created()}>{order => <CreatedOrder order={order()} />}</Match>
      <Match when={true}>
        <Show when={cartItems().length === 0}>
          <section class="grid min-h-[60vh] place-content-center text-center">
            <h1 class="text-3xl font-extrabold">Сагс хоосон байна.</h1>
            <a href="/products">Бараа үзэх →</a>
          </section>
        </Show>
        <Show when={cartItems().length > 0}>
          <Checkout.Form class="mx-auto w-full max-w-6xl md:grid md:grid-cols-[minmax(0,1fr)_360px] md:gap-10">
            <div>
              <header class="border-line mb-8 border-b pb-5">
                <p class="text-sm font-bold text-muted">Захиалга</p>
                <h1 class="m-0 text-3xl font-extrabold tracking-tight">Хүргэлтийн мэдээлэл</h1>
                <p class="mb-0 text-muted">Мэдээллээ бөглөж, төлбөрийн аргаа сонгоно уу.</p>
              </header>
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
                    <Button
                      type="button"
                      variant="outline"
                      class="border-line bg-panel rounded-action min-h-11 font-bold"
                      onClick={() => checkout.errors.performAction('retry')}
                    >
                      Дахин оролдох
                    </Button>
                  </Show>
                </ErrorNotice>
              </Show>
              <section class="border-line border-t py-6">
                <h2 class="mb-5 text-xl font-extrabold">Холбоо барих</h2>
                <ContactFields inputClass={inputClass} />
              </section>
              <section class="border-line border-t py-6">
                <h2 class="mb-5 text-xl font-extrabold">Улаанбаатар хүргэлт</h2>
                <DeliveryFields inputClass={inputClass} />
              </section>
              <section class="border-line border-t py-6">
                <h2 class="mb-5 text-xl font-extrabold">Төлбөр</h2>
                <PaymentFields />
              </section>
            </div>
            <aside class="border-line bg-panel rounded-action sticky top-4 mt-8 h-fit border p-5 md:mt-0">
              <h2 class="m-0 text-xl font-extrabold">Захиалгын дүн</h2>
              <For each={cartItems()}>
                {item => (
                  <div class="border-line flex justify-between gap-4 border-b py-3">
                    <span>
                      {item.productName} × {item.quantity}
                    </span>
                    <strong class="font-number whitespace-nowrap">
                      {formatMnt(item.unitPriceMnt * item.quantity)}
                    </strong>
                  </div>
                )}
              </For>
              <p class="text-sm text-muted">
                Хүргэлтийн төлбөрийг сервер баталгаажуулж нийт дүнд нэмнэ.
              </p>
              <Checkout.Submit>
                {state => (
                  <PendingSubmitButton
                    class="text-on-accent hover:bg-accent-strong rounded-action min-h-14 w-full bg-accent font-bold disabled:opacity-55"
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

function ContactFields(props: { inputClass: string }) {
  return (
    <div class="grid gap-5">
      <Checkout.Field name="customer.name">
        {field => (
          <field.ErrorState>
            {error => {
              const message = () => fieldMessage(error, 'Нэрээ оруулна уу.')
              return (
                <Field>
                  <FieldLabel class="text-sm font-bold" for={field().name}>
                    Нэр *
                  </FieldLabel>
                  <field.Input
                    class={props.inputClass}
                    id={field().name}
                    required
                    autocomplete="name"
                    aria-invalid={Boolean(message())}
                    aria-describedby={message() ? fieldErrorId('name') : undefined}
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
                  <FieldLabel class="text-sm font-bold" for={field().name}>
                    Утас *
                  </FieldLabel>
                  <field.Input
                    class={props.inputClass}
                    id={field().name}
                    inputmode="tel"
                    required
                    placeholder="9911 2233"
                    autocomplete="tel"
                    aria-invalid={Boolean(message())}
                    aria-describedby={message() ? fieldErrorId('phone') : undefined}
                  />
                  <FieldError id={fieldErrorId('phone')}>{message()}</FieldError>
                </Field>
              )
            }}
          </field.ErrorState>
        )}
      </Checkout.Field>
    </div>
  )
}
function DeliveryFields(props: { inputClass: string }) {
  return (
    <div class="grid gap-5">
      <Checkout.Field name="delivery.district">
        {field => (
          <Field>
            <FieldLabel class="text-sm font-bold" for={field().name}>
              Дүүрэг *
            </FieldLabel>
            <field.NativeSelect class={`${props.inputClass} w-full`} id={field().name} required>
              <For each={districts}>
                {district => <NativeSelectOption value={district}>{district}</NativeSelectOption>}
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
                  <FieldLabel class="text-sm font-bold" for={field().name}>
                    Хороо *
                  </FieldLabel>
                  <field.Input
                    class={props.inputClass}
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
                  <FieldLabel class="text-sm font-bold" for={field().name}>
                    Дэлгэрэнгүй хаяг *
                  </FieldLabel>
                  <field.Textarea
                    class={props.inputClass}
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
                  <FieldLabel class="text-sm font-bold" for={field().name}>
                    Нэмэлт тайлбар
                  </FieldLabel>
                  <FieldDescription>Заавал биш</FieldDescription>
                  <field.Textarea
                    class={props.inputClass}
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
    </div>
  )
}
function PaymentFields() {
  return (
    <Checkout.Field name="paymentMethod">
      {field => (
        <field.ErrorState>
          {error => {
            const message = () => fieldMessage(error, 'Төлбөрийн аргаа сонгоно уу.')
            return (
              <Field>
                <FieldLabel class="text-sm font-bold">Төлбөрийн арга</FieldLabel>
                <field.RadioGroup
                  class="mt-3 grid gap-3"
                  aria-invalid={Boolean(message())}
                  aria-describedby={message() ? fieldErrorId('paymentMethod') : undefined}
                >
                  <FieldLabel
                    class="border-line hover:bg-panel rounded-action grid min-h-16 grid-cols-[auto_1fr] items-center gap-3 border p-4"
                    for="payment-qpay"
                  >
                    <RadioGroupItem id="payment-qpay" value="qpay" />
                    <span>
                      <b>QPay</b>
                      <small class="block text-muted">QR болон банкны апп</small>
                    </span>
                  </FieldLabel>
                  <FieldLabel
                    class="border-line hover:bg-panel rounded-action grid min-h-16 grid-cols-[auto_1fr] items-center gap-3 border p-4"
                    for="payment-bank-transfer"
                  >
                    <RadioGroupItem id="payment-bank-transfer" value="bank_transfer" />
                    <span>
                      <b>Дансаар шилжүүлэх</b>{' '}
                      <small class="block text-muted">Ажилтан баталгаажуулна</small>
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
  )
}

export function CheckoutView() {
  const [mounted, setMounted] = createSignal(false)
  onMount(() => setMounted(true))
  return (
    <Show
      when={mounted()}
      fallback={
        <div class="grid min-h-[60vh] place-content-center text-muted">Сагсыг шалгаж байна…</div>
      }
    >
      {_mounted => {
        const client = createStorefrontQueryClient()
        return (
          <QueryClientProvider client={client}>
            <Checkout.Root
              defaultValues={{
                customer: { name: '', phone: '' },
                delivery: { district: 'Баянзүрх', khoroo: '', address: '', notes: '' },
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
