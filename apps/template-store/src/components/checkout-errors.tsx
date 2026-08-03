/* oxlint-disable tailwindcss/no-unknown-classes */
import type { CheckoutCorrectionAction, CheckoutDomainError } from '@store-kit/storefront/checkout'
import { Alert, AlertAction, Button } from '@store-kit/ui'
import { match } from 'dismatch'
import { For, Show } from 'solid-js'
import type { ParentProps } from 'solid-js'

export function ErrorNotice(props: ParentProps<{ title: string }>) {
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

export function DomainErrorNotice(props: {
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
