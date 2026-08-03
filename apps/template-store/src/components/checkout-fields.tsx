/* oxlint-disable tailwindcss/no-unknown-classes */
import { Checkout } from '@store-kit/storefront/checkout'
import type { FieldErrorState } from '@store-kit/storefront/form'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  NativeSelectOption,
  RadioGroupItem,
} from '@store-kit/ui'
import { For } from 'solid-js'
import type { Accessor } from 'solid-js'

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
const fieldMessage = (state: Accessor<FieldErrorState>, message: string) =>
  state().visible ? message : undefined

export function ContactFields(props: { inputClass: string }) {
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

export function DeliveryFields(props: { inputClass: string }) {
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

export function PaymentFields() {
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
