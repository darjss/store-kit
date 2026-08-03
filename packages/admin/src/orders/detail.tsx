import { ArrowLeft } from '@solar-icons/solid/Linear'
import type {
  AdminOrderDetail,
  AdminOrderError,
  AdminOrderLine,
  AdminOrderStatusUpdate,
} from '@store-kit/contracts/admin-orders'
import {
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@store-kit/ui'
import { useMutation, useQueryClient } from '@tanstack/solid-query'
import type { Result } from 'better-result'
import { For, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { toast } from 'solid-sonner'

import {
  AdminEmptyState,
  InlineAlert,
  PageHeader,
  RetryState,
  TableSkeleton,
} from '../components/foundation'
import { formatMnt } from '../format'
import { useQueryResult } from '../query-options/result'
import { orderKeys, orderMutation, orderQuery } from './query-options'
import {
  OrderStatusBadge,
  OrderStatusControl,
  PaymentStatusBadge,
  paymentMethodLabel,
} from './status'

const dateFormatter = new Intl.DateTimeFormat('mn-MN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const formatMoney = formatMnt
const formatDate = (value: number) => dateFormatter.format(new Date(value))
const dateTime = (value: number) => new Date(value).toISOString()

const optionsLabel = (line: AdminOrderLine) => {
  const entries = Object.entries(line.options)
  return entries.length > 0 ? entries.map(([name, value]) => `${name}: ${value}`).join(' · ') : '—'
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" role="status">
      <span class="sr-only">Захиалгын мэдээллийг ачаалж байна…</span>
      <Skeleton class="h-8 w-48" />
      <Skeleton class="mt-2 h-4 w-72 max-w-full" />
      <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.72fr)]">
        <div class="space-y-5">
          <Skeleton class="h-10 w-full" />
          <TableSkeleton
            columns={[
              { label: 'Бараа' },
              { label: 'SKU' },
              { label: 'Нэгж үнэ' },
              { label: 'Тоо' },
              { label: 'Дүн' },
            ]}
            rows={4}
          />
        </div>
        <div class="border-y bg-card px-4 py-3">
          <Skeleton class="h-48 w-full" />
          <Skeleton class="mt-4 h-44 w-full" />
        </div>
      </div>
    </div>
  )
}

function DefinitionRow(props: { label: string; children: JSX.Element }) {
  return (
    <div class="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
      <dt class="text-sm font-medium text-muted-foreground">{props.label}</dt>
      <dd class="min-w-0 text-base wrap-break-word sm:text-sm">{props.children}</dd>
    </div>
  )
}

function CustomerDelivery(props: { order: AdminOrderDetail }) {
  return (
    <section aria-labelledby="customer-delivery-title" class="border-b pb-2">
      <h2 class="border-b py-3 text-sm font-semibold" id="customer-delivery-title">
        Хэрэглэгч ба хүргэлт
      </h2>
      <dl>
        <DefinitionRow label="Хэрэглэгч">{props.order.customerName}</DefinitionRow>
        <DefinitionRow label="Утас">{props.order.customerPhone}</DefinitionRow>
        <DefinitionRow label="Дүүрэг">{props.order.district}</DefinitionRow>
        <DefinitionRow label="Хороо">{props.order.khoroo}</DefinitionRow>
        <DefinitionRow label="Хаяг">{props.order.address}</DefinitionRow>
        <DefinitionRow label="Хүргэлтийн тэмдэглэл">
          {props.order.deliveryNotes ?? 'Тэмдэглэлгүй'}
        </DefinitionRow>
      </dl>
    </section>
  )
}

function PaymentDetails(props: { order: AdminOrderDetail }) {
  return (
    <section aria-labelledby="payment-details-title" class="border-b pb-2">
      <div class="flex items-center justify-between gap-3 border-b py-3">
        <h2 class="text-sm font-semibold" id="payment-details-title">
          Төлбөр
        </h2>
        <PaymentStatusBadge status={props.order.payment.status} />
      </div>
      <dl>
        <DefinitionRow label="Арга">{paymentMethodLabel(props.order.payment.method)}</DefinitionRow>
        <DefinitionRow label="Дүн">{formatMoney(props.order.payment.amountMnt)}</DefinitionRow>
        <Show
          when={
            props.order.payment.claimedAt === null
              ? undefined
              : { value: props.order.payment.claimedAt }
          }
          keyed
        >
          {claimedAt => (
            <DefinitionRow label="Мэдэгдсэн">
              <time dateTime={dateTime(claimedAt.value)}>{formatDate(claimedAt.value)}</time>
            </DefinitionRow>
          )}
        </Show>
        <Show
          when={
            props.order.payment.paidAt === null ? undefined : { value: props.order.payment.paidAt }
          }
          keyed
        >
          {paidAt => (
            <DefinitionRow label="Төлөгдсөн">
              <time dateTime={dateTime(paidAt.value)}>{formatDate(paidAt.value)}</time>
            </DefinitionRow>
          )}
        </Show>
      </dl>
      <p class="border-t py-3 text-sm leading-5 text-muted-foreground">
        Төлбөрийн төлөвийг эндээс өөрчлөхгүй. Төлбөр баталгаажуулах үндсэн үйлдэл хэвээр ажиллана.
      </p>
    </section>
  )
}

function OrderTiming(props: { order: AdminOrderDetail }) {
  return (
    <section aria-labelledby="order-timing-title">
      <h2 class="border-b py-3 text-sm font-semibold" id="order-timing-title">
        Захиалгын бүртгэл
      </h2>
      <dl>
        <DefinitionRow label="Захиалгын ID">{props.order.id}</DefinitionRow>
        <DefinitionRow label="Үүссэн">
          <time dateTime={dateTime(props.order.createdAt)}>
            {formatDate(props.order.createdAt)}
          </time>
        </DefinitionRow>
        <DefinitionRow label="Сүүлд шинэчилсэн">
          <time dateTime={dateTime(props.order.updatedAt)}>
            {formatDate(props.order.updatedAt)}
          </time>
        </DefinitionRow>
      </dl>
    </section>
  )
}

function OrderLines(props: { order: AdminOrderDetail }) {
  return (
    <section aria-labelledby="order-lines-title">
      <div class="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 class="text-base font-semibold" id="order-lines-title">
            Захиалсан бараа
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Захиалга өгөх үеийн нэр, үнэ хадгалагдсан.
          </p>
        </div>
        <span class="shrink-0 text-sm text-muted-foreground tabular-nums">
          {props.order.lines.length} мөр
        </span>
      </div>

      <ul class="-mx-4 divide-y border-y bg-card sm:mx-0 sm:rounded-lg sm:border-x lg:hidden">
        <For each={props.order.lines}>
          {line => (
            <li class="px-4 py-4">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="text-base font-medium wrap-break-word">{line.productName}</p>
                  <p class="mt-1 text-sm wrap-break-word text-muted-foreground">
                    {line.variantName} · {optionsLabel(line)}
                  </p>
                </div>
                <p class="shrink-0 text-base font-semibold tabular-nums">
                  {formatMoney(line.lineTotalMnt)}
                </p>
              </div>
              <div class="mt-3 flex items-center justify-between gap-4 text-sm text-muted-foreground">
                <code class="truncate">{line.sku}</code>
                <span class="shrink-0 tabular-nums">
                  {formatMoney(line.unitPriceMnt)} × {line.quantity}
                </span>
              </div>
            </li>
          )}
        </For>
      </ul>

      <div class="hidden rounded-lg border bg-card lg:block">
        <Table aria-label="Захиалсан бараанууд">
          <TableHeader>
            <TableRow>
              <TableHead>Бараа</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead class="text-right">Нэгж үнэ</TableHead>
              <TableHead class="text-right">Тоо</TableHead>
              <TableHead class="text-right">Дүн</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={props.order.lines}>
              {line => (
                <TableRow>
                  <TableCell>
                    <div class="min-w-48 font-medium">{line.productName}</div>
                    <div class="mt-0.5 text-xs text-muted-foreground">
                      {line.variantName} · {optionsLabel(line)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code class="text-xs whitespace-nowrap">{line.sku}</code>
                  </TableCell>
                  <TableCell class="text-right whitespace-nowrap tabular-nums">
                    {formatMoney(line.unitPriceMnt)}
                  </TableCell>
                  <TableCell class="text-right tabular-nums">{line.quantity}</TableCell>
                  <TableCell class="text-right font-medium whitespace-nowrap tabular-nums">
                    {formatMoney(line.lineTotalMnt)}
                  </TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
      </div>

      <dl class="-mx-4 mt-3 border-y bg-card px-4 sm:mx-0 sm:ml-auto sm:max-w-sm sm:rounded-lg sm:border-x">
        <DefinitionRow label="Барааны дүн">{formatMoney(props.order.subtotalMnt)}</DefinitionRow>
        <DefinitionRow label="Хүргэлтийн үнэ">
          {formatMoney(props.order.deliveryFeeMnt)}
        </DefinitionRow>
        <div class="flex items-center justify-between gap-4 py-4">
          <dt class="text-base font-semibold">Нийт</dt>
          <dd class="text-lg font-semibold tabular-nums">{formatMoney(props.order.totalMnt)}</dd>
        </div>
      </dl>
    </section>
  )
}

type DetailContentProps = {
  order: AdminOrderDetail
  onReload: () => void
  onSaveStatus: (
    input: AdminOrderStatusUpdate,
  ) => Promise<Result<AdminOrderDetail, AdminOrderError>>
}

function DetailContent(props: DetailContentProps) {
  return (
    <>
      <PageHeader
        actions={<OrderStatusBadge status={props.order.status} />}
        description={`${formatDate(props.order.createdAt)} · ${props.order.customerName}`}
        title={props.order.number}
        titleId="order-detail-title"
      />
      <div class="mt-4">
        <OrderStatusControl
          order={props.order}
          onReload={props.onReload}
          onSave={props.onSaveStatus}
        />
      </div>
      <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.72fr)]">
        <div class="min-w-0">
          <OrderLines order={props.order} />
        </div>
        <aside class="-mx-4 border-y bg-card px-4 sm:mx-0 sm:rounded-lg sm:border-x">
          <CustomerDelivery order={props.order} />
          <PaymentDetails order={props.order} />
          <OrderTiming order={props.order} />
        </aside>
      </div>
    </>
  )
}

type OrderDetailPageProps = {
  orderId: string
  onBack: () => void
}

export function OrderDetailPage(props: OrderDetailPageProps) {
  const queryClient = useQueryClient()
  const query = useQueryResult(() => orderQuery.detail(props.orderId))
  const updateStatus = useMutation(() => orderMutation.updateStatus())
  const data = () => query.data?.match({ ok: value => value, err: () => undefined })
  const expectedError = () =>
    query.data?.match<AdminOrderError | undefined>({ ok: () => undefined, err: error => error })

  const saveStatus = async (input: AdminOrderStatusUpdate) => {
    const result = await updateStatus.mutateAsync({ orderId: props.orderId, input })
    if (result.isOk()) {
      queryClient.setQueryData(orderKeys.detail(props.orderId), result)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(props.orderId) }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ])
      toast.success('Захиалгын төлөв шинэчлэгдлээ.')
    }
    return result
  }

  return (
    <section class="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-7">
      <div class="mb-3">
        <Button
          class="min-h-11! lg:min-h-8!"
          onClick={() => props.onBack()}
          type="button"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" />
          Захиалга руу буцах
        </Button>
      </div>
      <Show when={!query.isPending} fallback={<DetailSkeleton />}>
        <Show
          when={!query.isError}
          fallback={
            <RetryState
              message="Захиалгын мэдээллийг ачаалж чадсангүй."
              onRetry={() => void query.refetch()}
              pending={query.isFetching}
            />
          }
        >
          <Show
            when={!expectedError()}
            fallback={
              <Show
                when={expectedError()?._tag !== 'AdminOrderNotFound'}
                fallback={
                  <AdminEmptyState
                    action={
                      <Button onClick={() => props.onBack()} type="button" variant="outline">
                        Захиалга руу буцах
                      </Button>
                    }
                    description="Жагсаалт ачаалснаас хойш энэ захиалга устсан байж магадгүй."
                    title="Захиалга олдсонгүй"
                  />
                }
              >
                <InlineAlert title="Захиалга ачаалж чадсангүй" tone="destructive">
                  {expectedError()?.message ?? 'Захиалгын хүсэлт амжилтгүй боллоо.'}
                </InlineAlert>
              </Show>
            }
          >
            <Show when={data()} keyed>
              {order => (
                <DetailContent
                  order={order}
                  onReload={() => void query.refetch()}
                  onSaveStatus={saveStatus}
                />
              )}
            </Show>
          </Show>
        </Show>
      </Show>
    </section>
  )
}
