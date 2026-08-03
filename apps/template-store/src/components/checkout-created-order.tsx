/* oxlint-disable tailwindcss/no-unknown-classes */
import type { CheckoutCreated } from '@store-kit/contracts/checkout'
import { For, Show } from 'solid-js'

const qpayAction = (order: CheckoutCreated) =>
  order.nextAction.type === 'qpay' ? order.nextAction : undefined
const bankAction = (order: CheckoutCreated) =>
  order.nextAction.type === 'bank_transfer' ? order.nextAction : undefined

export function CheckoutCreatedOrder(props: { order: CheckoutCreated }) {
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
