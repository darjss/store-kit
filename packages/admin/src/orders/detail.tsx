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
import { useQueryResult } from '../query-options/result'
import type { OrderRequests } from './query-options'
import { orderKeys, orderMutation, orderQuery } from './query-options'
import {
  OrderStatusBadge,
  OrderStatusControl,
  PaymentStatusBadge,
  paymentMethodLabel,
} from './status'

const moneyFormatter = new Intl.NumberFormat('mn-MN', {
  style: 'currency',
  currency: 'MNT',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('mn-MN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const formatMoney = (value: number) => moneyFormatter.format(value)
const formatDate = (value: number) => dateFormatter.format(new Date(value))
const dateTime = (value: number) => new Date(value).toISOString()

const optionsLabel = (line: AdminOrderLine) => {
  const entries = Object.entries(line.options)
  return entries.length > 0 ? entries.map(([name, value]) => `${name}: ${value}`).join(' · ') : '—'
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" role="status">
      <span class="sr-only">Loading order details…</span>
      <Skeleton class="h-8 w-48" />
      <Skeleton class="mt-2 h-4 w-72 max-w-full" />
      <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
        <div class="space-y-6">
          <Skeleton class="h-40 w-full rounded-lg" />
          <TableSkeleton
            columns={[
              { label: 'Product' },
              { label: 'SKU' },
              { label: 'Unit price' },
              { label: 'Quantity' },
              { label: 'Line total' },
            ]}
            rows={4}
          />
        </div>
        <div class="space-y-6">
          <Skeleton class="h-48 w-full rounded-lg" />
          <Skeleton class="h-44 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

function DefinitionRow(props: { label: string; children: JSX.Element }) {
  return (
    <div class="grid gap-1 border-b py-2.5 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <dt class="text-xs font-medium text-muted-foreground">{props.label}</dt>
      <dd class="min-w-0 text-sm wrap-break-word">{props.children}</dd>
    </div>
  )
}

function CustomerDelivery(props: { order: AdminOrderDetail }) {
  return (
    <section aria-labelledby="customer-delivery-title" class="rounded-lg border px-4">
      <h2 class="border-b py-3 text-lg leading-6 font-semibold" id="customer-delivery-title">
        Customer and delivery
      </h2>
      <dl>
        <DefinitionRow label="Customer">{props.order.customerName}</DefinitionRow>
        <DefinitionRow label="Phone">{props.order.customerPhone}</DefinitionRow>
        <DefinitionRow label="District">{props.order.district}</DefinitionRow>
        <DefinitionRow label="Khoroo">{props.order.khoroo}</DefinitionRow>
        <DefinitionRow label="Address">{props.order.address}</DefinitionRow>
        <DefinitionRow label="Delivery notes">
          {props.order.deliveryNotes ?? 'No delivery notes'}
        </DefinitionRow>
      </dl>
    </section>
  )
}

function PaymentDetails(props: { order: AdminOrderDetail }) {
  return (
    <section aria-labelledby="payment-details-title" class="rounded-lg border px-4">
      <div class="flex items-center justify-between gap-3 border-b py-3">
        <h2 class="text-lg leading-6 font-semibold" id="payment-details-title">
          Payment
        </h2>
        <PaymentStatusBadge status={props.order.payment.status} />
      </div>
      <dl>
        <DefinitionRow label="Method">
          {paymentMethodLabel(props.order.payment.method)}
        </DefinitionRow>
        <DefinitionRow label="Amount">{formatMoney(props.order.payment.amountMnt)}</DefinitionRow>
        <Show
          when={
            props.order.payment.claimedAt === null
              ? undefined
              : { value: props.order.payment.claimedAt }
          }
          keyed
        >
          {claimedAt => (
            <DefinitionRow label="Claimed">
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
            <DefinitionRow label="Paid">
              <time dateTime={dateTime(paidAt.value)}>{formatDate(paidAt.value)}</time>
            </DefinitionRow>
          )}
        </Show>
      </dl>
      <p class="border-t py-3 text-xs leading-5 text-muted-foreground">
        Payment status is read-only. Payment confirmation remains with the configured payment flow.
      </p>
    </section>
  )
}

function OrderTiming(props: { order: AdminOrderDetail }) {
  return (
    <section aria-labelledby="order-timing-title" class="rounded-lg border px-4">
      <h2 class="border-b py-3 text-lg leading-6 font-semibold" id="order-timing-title">
        Order record
      </h2>
      <dl>
        <DefinitionRow label="Order ID">{props.order.id}</DefinitionRow>
        <DefinitionRow label="Created">
          <time dateTime={dateTime(props.order.createdAt)}>
            {formatDate(props.order.createdAt)}
          </time>
        </DefinitionRow>
        <DefinitionRow label="Last updated">
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
      <div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 class="text-lg leading-6 font-semibold" id="order-lines-title">
            Order items
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Product and price details are immutable checkout snapshots.
          </p>
        </div>
        <span class="text-sm text-muted-foreground">
          {props.order.lines.length} {props.order.lines.length === 1 ? 'line' : 'lines'}
        </span>
      </div>
      <div class="rounded-lg border">
        <Table aria-label="Order line items">
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead class="text-right">Unit price</TableHead>
              <TableHead class="text-right">Quantity</TableHead>
              <TableHead class="text-right">Line total</TableHead>
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
      <dl class="mt-3 ml-auto w-full max-w-sm rounded-lg border px-4">
        <DefinitionRow label="Subtotal">{formatMoney(props.order.subtotalMnt)}</DefinitionRow>
        <DefinitionRow label="Delivery fee">
          {formatMoney(props.order.deliveryFeeMnt)}
        </DefinitionRow>
        <div class="grid gap-1 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt class="text-sm font-semibold">Total</dt>
          <dd class="text-base font-semibold tabular-nums sm:text-right">
            {formatMoney(props.order.totalMnt)}
          </dd>
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
        description={`Placed ${formatDate(props.order.createdAt)} by ${props.order.customerName}`}
        title={props.order.number}
        titleId="order-detail-title"
      />
      <div class="mt-6">
        <OrderStatusControl
          order={props.order}
          onReload={props.onReload}
          onSave={props.onSaveStatus}
        />
      </div>
      <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
        <div class="min-w-0 space-y-6">
          <CustomerDelivery order={props.order} />
          <OrderLines order={props.order} />
        </div>
        <aside class="space-y-6">
          <PaymentDetails order={props.order} />
          <OrderTiming order={props.order} />
        </aside>
      </div>
    </>
  )
}

type OrderDetailPageProps = {
  orderId: string
  requests: OrderRequests
  onBack: () => void
}

export function OrderDetailPage(props: OrderDetailPageProps) {
  const queryClient = useQueryClient()
  const query = useQueryResult(() => orderQuery.detail(props.requests, props.orderId))
  const updateStatus = useMutation(() => orderMutation.updateStatus(props.requests))
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
      toast.success('Order status updated.')
    }
    return result
  }

  return (
    <section class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div class="mb-4">
        <Button onClick={() => props.onBack()} size="sm" type="button" variant="ghost">
          <ArrowLeft aria-hidden="true" />
          Back to orders
        </Button>
      </div>
      <Show when={!query.isPending} fallback={<DetailSkeleton />}>
        <Show
          when={!query.isError}
          fallback={
            <RetryState
              message="The order details could not be loaded."
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
                        Back to orders
                      </Button>
                    }
                    description="This order may have been removed since the order list was loaded."
                    title="Order not found"
                  />
                }
              >
                <InlineAlert title="Could not load order" tone="destructive">
                  {expectedError()?.message ?? 'The order request failed.'}
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
