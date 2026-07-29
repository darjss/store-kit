import { adminOrderStatusUpdateSchema } from '@store-kit/contracts/admin-orders'
import type {
  AdminOrderDetail,
  AdminOrderError,
  AdminOrderStatusUpdate,
} from '@store-kit/contracts/admin-orders'
import { toStandardSchema } from '@store-kit/contracts/standard-schema'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
    new: () => ({ label: 'Шинэ', tone: 'information' }),
    confirmed: () => ({ label: 'Баталгаажсан', tone: 'information' }),
    preparing: () => ({ label: 'Бэлтгэж байна', tone: 'warning' }),
    delivering: () => ({ label: 'Хүргэж байна', tone: 'information' }),
    completed: () => ({ label: 'Дууссан', tone: 'success' }),
    cancelled: () => ({ label: 'Цуцалсан', tone: 'destructive' }),
  })

export const paymentStatusDisplay = (status: PaymentStatus) =>
  match(
    taggedStatus(status),
    'status',
  )<StatusDisplay>({
    pending: () => ({ label: 'Хүлээгдэж байна', tone: 'neutral' }),
    claimed: () => ({ label: 'Шилжүүлсэн гэж мэдэгдсэн', tone: 'warning' }),
    confirming: () => ({ label: 'Шалгаж байна', tone: 'warning' }),
    paid: () => ({ label: 'Төлөгдсөн', tone: 'success' }),
    failed: () => ({ label: 'Амжилтгүй', tone: 'destructive' }),
  })

export const paymentMethodLabel = (method: PaymentMethod) =>
  match(
    taggedMethod(method),
    'method',
  )<string>({
    qpay: () => 'QPay',
    bank_transfer: () => 'Банкны шилжүүлэг',
  })

const transitionActionLabel = (status: OrderStatus) =>
  match(
    taggedStatus(status),
    'status',
  )<string>({
    new: () => 'Төлөв шинэчлэх',
    confirmed: () => 'Төлөв шинэчлэх',
    preparing: () => 'Бэлтгэж эхлэх',
    delivering: () => 'Хүргэлтэд гаргах',
    completed: () => 'Захиалга дуусгах',
    cancelled: () => 'Захиалга цуцлах',
  })

const noTransitionMessage = (order: AdminOrderDetail) =>
  match(
    taggedStatus(order.status),
    'status',
  )<string>({
    new: () =>
      `Төлбөрийн төлөв: ${paymentStatusDisplay(order.payment.status).label.toLowerCase()}. Төлбөр баталгаажих хүртэл захиалгын төлөвийг гараар өөрчлөх боломжгүй.`,
    confirmed: () => 'Энэ баталгаажсан захиалгад хийх дараагийн өөрчлөлт алга.',
    preparing: () => 'Энэ бэлтгэж буй захиалгад хийх дараагийн өөрчлөлт алга.',
    delivering: () => 'Энэ хүргэлтэд хийх дараагийн өөрчлөлт алга.',
    completed: () => 'Захиалга дууссан тул төлөвийг дахин өөрчлөх боломжгүй.',
    cancelled: () => 'Захиалга цуцлагдсан тул төлөвийг дахин өөрчлөх боломжгүй.',
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
          : 'Зөв төлөв сонгоно уу.',
  }))

type OrderStatusFormProps = {
  order: AdminOrderDetail
  onSave: (input: AdminOrderStatusUpdate) => Promise<SaveResult>
  onReload: () => void
}

function OrderStatusForm(props: OrderStatusFormProps) {
  const [failure, setFailure] = createSignal<AdminOrderError>()
  const [transportError, setTransportError] = createSignal<string>()
  const [cancelOpen, setCancelOpen] = createSignal(false)
  const [cancelConfirmed, setCancelConfirmed] = createSignal(false)
  const validator = toStandardSchema(adminOrderStatusUpdateSchema)
  const defaultValues: AdminOrderStatusUpdate = {
    expectedUpdatedAt: props.order.updatedAt,
    status: props.order.allowedTransitions[0] ?? props.order.status,
  }
  const form = createForm(() => ({
    defaultValues,
    validators: { onBlur: validator, onSubmit: validator },
    onSubmit: async ({ value }) => {
      if (value.status === 'cancelled' && !cancelConfirmed()) {
        setCancelOpen(true)
        return
      }
      setCancelConfirmed(false)
      setFailure()
      setTransportError()

      try {
        const result = await props.onSave(value)
        if (result.isErr()) setFailure(result.error)
      } catch {
        setTransportError('Интернэт холболтоо шалгаад төлөвийг дахин шинэчилнэ үү.')
      }
    },
  }))
  const message = () => failure()?.message ?? transportError()
  const conflict = () => failure()?._tag === 'AdminOrderConflict'

  return (
    <form
      aria-label="Захиалгын төлөв өөрчлөх"
      class="-mx-4 border-y bg-card px-4 py-4 sm:mx-0 sm:rounded-lg sm:border-x"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div class="max-w-xl">
          <h2 class="text-base font-semibold">Захиалгын төлөв</h2>
          <p class="mt-1 text-sm leading-5 text-muted-foreground">
            Энд зөвхөн захиалгын явцыг өөрчилнө. Төлбөр болон барааны үлдэгдэл өөрчлөгдөхгүй.
          </p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-start">
          <form.Field name="status">
            {field => (
              <Field class="sm:max-w-64">
                <FieldLabel for={`${props.order.id}-next-status`}>Дараагийн төлөв</FieldLabel>
                <NativeSelect
                  class="min-h-12! w-full lg:min-h-8!"
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
                <FieldDescription>Энэ дэлгэцээс төлөвийг буцаах боломжгүй.</FieldDescription>
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
                class="mt-0 min-h-12! w-full sm:mt-5 sm:w-48 lg:min-h-8!"
                disabled={!state().canSubmit || state().pending}
                type="submit"
                variant={state().status === 'cancelled' ? 'destructive' : 'default'}
              >
                <Show when={state().pending}>
                  <Spinner aria-hidden="true" />
                </Show>
                {state().pending ? 'Шинэчилж байна…' : transitionActionLabel(state().status)}
              </Button>
            )}
          </form.Subscribe>
        </div>
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
                    Одоогийн мэдээллийг дахин авах
                  </Button>
                </Show>
              }
              title={
                conflict() ? 'Захиалгын мэдээлэл өөрчлөгдсөн' : 'Захиалгын төлөв шинэчилж чадсангүй'
              }
              tone="destructive"
            >
              {text()}
            </InlineAlert>
          </div>
        )}
      </Show>

      <Dialog
        open={cancelOpen()}
        onOpenChange={open => {
          setCancelOpen(open)
          if (open) setCancelConfirmed(false)
        }}
      >
        <DialogContent class="max-w-md rounded-lg border bg-popover p-4">
          <DialogHeader>
            <DialogTitle>Энэ захиалгыг цуцлах уу?</DialogTitle>
            <DialogDescription>
              Цуцалсны дараа энэ дэлгэцээс буцаах боломжгүй. Төлбөр болон барааны үлдэгдэл
              өөрчлөгдөхгүй.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter class="mt-5">
            <DialogClose as={Button} type="button" variant="outline">
              Захиалгыг хэвээр үлдээх
            </DialogClose>
            <Button
              onClick={() => {
                setCancelConfirmed(true)
                setCancelOpen(false)
                void form.handleSubmit()
              }}
              type="button"
              variant="destructive"
            >
              Захиалга цуцлах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}

export function OrderStatusControl(props: OrderStatusFormProps) {
  return (
    <Show
      when={props.order.allowedTransitions.length > 0}
      fallback={
        <InlineAlert title="Гараар өөрчлөх төлөв алга">
          {noTransitionMessage(props.order)}
        </InlineAlert>
      }
    >
      <OrderStatusForm order={props.order} onReload={props.onReload} onSave={props.onSave} />
    </Show>
  )
}
