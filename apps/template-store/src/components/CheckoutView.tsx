/* oxlint-disable tailwindcss/no-unknown-classes, eslint/no-underscore-dangle */
import { cartItems } from '@store-kit/storefront/cart/store'
import { Checkout, useCheckout } from '@store-kit/storefront/checkout'
import { PendingSubmitButton } from '@store-kit/storefront/form'
import { formatMnt } from '@store-kit/storefront/format'
import { createStorefrontQueryClient } from '@store-kit/storefront/query-client'
import { Button } from '@store-kit/ui'
import { QueryClientProvider } from '@tanstack/solid-query'
import { For, Match, Show, Switch, createSignal, onMount } from 'solid-js'

import { CheckoutCreatedOrder } from './checkout-created-order'
import { DomainErrorNotice, ErrorNotice } from './checkout-errors'
import { ContactFields, DeliveryFields, PaymentFields } from './checkout-fields'

const fieldLabels: Record<string, string> = {
  'customer.name': 'Нэр',
  'customer.phone': 'Утас',
  'delivery.district': 'Дүүрэг',
  'delivery.khoroo': 'Хороо',
  'delivery.address': 'Дэлгэрэнгүй хаяг',
  'delivery.notes': 'Нэмэлт тайлбар',
  'paymentMethod': 'Төлбөрийн арга',
}

function FormOwner() {
  const checkout = useCheckout()
  const created = checkout.created
  const inputClass = 'min-h-12 rounded-action border-line border bg-panel px-4 font-medium'

  return (
    <Switch>
      <Match when={created()}>{order => <CheckoutCreatedOrder order={order()} />}</Match>
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
              <Checkout.Errors
                domain={(failure, correct) => (
                  <DomainErrorNotice
                    error={failure.error}
                    actions={failure.actions}
                    correct={correct}
                  />
                )}
                transport={(failure, correct) => (
                  <ErrorNotice title="Холболт амжилтгүй.">
                    <p>Сүлжээний алдаа гарлаа. Мэдээллээ хадгалсан тул дахин оролдоно уу.</p>
                    <Show when={failure.actions.includes('retry')}>
                      <Button
                        type="button"
                        variant="outline"
                        class="border-line bg-panel rounded-action min-h-11 font-bold"
                        onClick={() => correct('retry')}
                      >
                        Дахин оролдох
                      </Button>
                    </Show>
                  </ErrorNotice>
                )}
              />
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
