import { adminOrderStatusUpdateSchema } from '@store-kit/contracts/admin-orders'
import type {
  AdminOrderDetail,
  AdminOrderError,
  AdminOrderStatusUpdate,
} from '@store-kit/contracts/admin-orders'
import { toStandardSchema } from '@store-kit/contracts/standard-schema'
import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  NativeSelect,
  NativeSelectOption,
  Spinner,
} from '@store-kit/ui'
import { createForm } from '@tanstack/solid-form'
import type { Result } from 'better-result'
import { match } from 'dismatch'
import { For, Show, createSignal } from 'solid-js'

import { InlineAlert, StatusBadge } from '../components/foundation'
import type { StatusTone } from '../components/foundation'

type OrderStatus = AdminOrderDetail['status']
type PaymentStatus = AdminOrderDetail['payment']['status']
type PaymentMethod = AdminOrderDetail['payment']['method']
type SaveResult = Result<AdminOrderDetail, AdminOrderError>

type StatusDisplay = {
  label: string
  tone: StatusTone
}

type TaggedStatus<Status extends string> = Status extends string ? { status: Status } : never
type TaggedMethod<Method extends string> = Method extends string ? { method: Method } : never

const taggedStatus = <Status extends string>(status: Status) => ({ status }) as TaggedStatus<Status>
const taggedMethod = <Method extends string>(method: Method) => ({ method }) as TaggedMethod<Method>

export const orderStatusDisplay = (status: OrderStatus) =>
  match(
    taggedStatus(status),
    'status',
  )<StatusDisplay>({
    new: () => ({ label: 'New', tone: 'information' }),
    confirmed: () => ({ label: 'Confirmed', tone: 'information' }),
    preparing: () => ({ label: 'Preparing', tone: 'warning' }),
    delivering: () => ({ label: 'Delivering', tone: 'information' }),
    completed: () => ({ label: 'Completed', tone: 'success' }),
    cancelled: () => ({ label: 'Cancelled', tone: 'destructive' }),
  })

export const paymentStatusDisplay = (status: PaymentStatus) =>
  match(
    taggedStatus(status),
    'status',
  )<StatusDisplay>({
    pending: () => ({ label: 'Pending', tone: 'neutral' }),
    claimed: () => ({ label: 'Claimed', tone: 'warning' }),
    confirming: () => ({ label: 'Confirming', tone: 'warning' }),
    paid: () => ({ label: 'Paid', tone: 'success' }),
    failed: () => ({ label: 'Failed', tone: 'destructive' }),
  })

export const paymentMethodLabel = (method: PaymentMethod) =>
  match(
    taggedMethod(method),
    'method',
  )<string>({
    qpay: () => 'QPay',
    bank_transfer: () => 'Bank transfer',
  })

const transitionActionLabel = (status: OrderStatus) =>
  match(
    taggedStatus(status),
    'status',
  )<string>({
    new: () => 'Update status',
    confirmed: () => 'Update status',
    preparing: () => 'Start preparing',
    delivering: () => 'Start delivery',
    completed: () => 'Complete order',
    cancelled: () => 'Cancel order',
  })

const noTransitionMessage = (order: AdminOrderDetail) =>
  match(
    taggedStatus(order.status),
    'status',
  )<string>({
    new: () =>
      `Payment is ${paymentStatusDisplay(order.payment.status).label.toLowerCase()}. The payment workflow controls confirmation, so no manual status change is available.`,
    confirmed: () => 'The server has not provided a manual transition for this confirmed order.',
    preparing: () => 'The server has not provided a manual transition for this preparing order.',
    delivering: () => 'The server has not provided a manual transition for this delivery.',
    completed: () => 'This order is completed and has no further status changes.',
    cancelled: () => 'This order is cancelled and has no further status changes.',
  })

export function OrderStatusBadge(props: { status: OrderStatus }) {
  const display = () => orderStatusDisplay(props.status)
  return <StatusBadge tone={display().tone}>{display().label}</StatusBadge>
}

export function PaymentStatusBadge(props: { status: PaymentStatus }) {
  const display = () => paymentStatusDisplay(props.status)
  return <StatusBadge tone={display().tone}>{display().label}</StatusBadge>
}

const validationMessages = (errors: readonly unknown[]) =>
  errors.map(error => ({
    message:
      typeof error === 'string'
        ? error
        : typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : 'Select a valid status.',
  }))

type OrderStatusFormProps = {
  order: AdminOrderDetail
  onSave: (input: AdminOrderStatusUpdate) => Promise<SaveResult>
  onReload: () => void
}

function OrderStatusForm(props: OrderStatusFormProps) {
  const [failure, setFailure] = createSignal<AdminOrderError>()
  const [transportError, setTransportError] = createSignal<string>()
  const validator = toStandardSchema(adminOrderStatusUpdateSchema)
  const defaultValues: AdminOrderStatusUpdate = {
    expectedUpdatedAt: props.order.updatedAt,
    status: props.order.allowedTransitions[0] ?? props.order.status,
  }
  const form = createForm(() => ({
    defaultValues,
    validators: { onBlur: validator, onSubmit: validator },
    onSubmit: async ({ value }) => {
      setFailure()
      setTransportError()

      try {
        const result = await props.onSave(value)
        if (result.isErr()) setFailure(result.error)
      } catch {
        setTransportError('Check your connection, then try the status update again.')
      }
    },
  }))
  const message = () => failure()?.message ?? transportError()
  const conflict = () => failure()?._tag === 'AdminOrderConflict'

  return (
    <form
      aria-label="Change order status"
      class="rounded-lg border p-4"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div class="mb-4">
        <h2 class="text-lg leading-6 font-semibold">Order status</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Use only the next status supplied by the server. Payment and stock do not change here.
        </p>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
        <form.Field name="status">
          {field => (
            <Field class="sm:max-w-56">
              <FieldLabel for={`${props.order.id}-next-status`}>Next status</FieldLabel>
              <NativeSelect
                class="w-full"
                id={`${props.order.id}-next-status`}
                value={field().state.value}
                aria-invalid={!field().state.meta.isValid}
                onBlur={() => field().handleBlur()}
                onChange={event => {
                  const transition = props.order.allowedTransitions.find(
                    status => status === event.currentTarget.value,
                  )
                  if (transition) field().handleChange(transition)
                }}
              >
                <For each={props.order.allowedTransitions}>
                  {status => (
                    <NativeSelectOption value={status}>
                      {orderStatusDisplay(status).label}
                    </NativeSelectOption>
                  )}
                </For>
              </NativeSelect>
              <FieldDescription>Status changes cannot be reversed in this screen.</FieldDescription>
              <FieldError errors={validationMessages(field().state.meta.errors)} />
            </Field>
          )}
        </form.Field>
        <form.Subscribe
          selector={state => ({
            canSubmit: state.canSubmit,
            pending: state.isSubmitting,
            status: state.values.status,
          })}
        >
          {state => (
            <Button
              class="mt-0 w-40 sm:mt-5"
              disabled={!state().canSubmit || state().pending}
              type="submit"
              variant={state().status === 'cancelled' ? 'destructive' : 'default'}
            >
              <Show when={state().pending}>
                <Spinner aria-hidden="true" />
              </Show>
              {state().pending ? 'Updating…' : transitionActionLabel(state().status)}
            </Button>
          )}
        </form.Subscribe>
      </div>
      <Show when={message()}>
        {text => (
          <div class="mt-4">
            <InlineAlert
              action={
                <Show when={conflict()}>
                  <Button
                    onClick={() => props.onReload()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Reload current data
                  </Button>
                </Show>
              }
              title={conflict() ? 'Order data changed' : 'Could not update order status'}
              tone="destructive"
            >
              {text()}
            </InlineAlert>
          </div>
        )}
      </Show>
    </form>
  )
}

export function OrderStatusControl(props: OrderStatusFormProps) {
  return (
    <Show
      when={props.order.allowedTransitions.length > 0}
      fallback={
        <InlineAlert title="No manual status change">
          {noTransitionMessage(props.order)}
        </InlineAlert>
      }
    >
      <OrderStatusForm order={props.order} onReload={props.onReload} onSave={props.onSave} />
    </Show>
  )
}
