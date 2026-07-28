import type {
  AdminDashboard,
  AdminDashboardSummary,
  AdminLowStockVariant,
} from '@store-kit/contracts/admin-dashboard'
import type { AdminOrderListItem } from '@store-kit/contracts/admin-orders'
import {
  Skeleton,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@store-kit/ui'
import { For, Match, Switch } from 'solid-js'

import {
  AdminEmptyState,
  InlineAlert,
  PageHeader,
  RetryState,
  StatusBadge,
  TableSkeleton,
} from '../components/foundation'
import type { StatusTone, TableSkeletonColumn } from '../components/foundation'
import { dashboardQuery } from '../query-options/dashboard'
import type { AdminDashboardRequest } from '../query-options/dashboard'
import { useQueryResult } from '../query-options/result'

type OrderStatus = AdminOrderListItem['status']
type PaymentStatus = AdminOrderListItem['paymentStatus']
type PaymentMethod = AdminOrderListItem['paymentMethod']

type StatusDisplay = {
  label: string
  tone: StatusTone
}

const orderStatusDisplay: Record<OrderStatus, StatusDisplay> = {
  new: { label: 'New', tone: 'neutral' },
  confirmed: { label: 'Confirmed', tone: 'information' },
  preparing: { label: 'Preparing', tone: 'warning' },
  delivering: { label: 'Delivering', tone: 'information' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'destructive' },
}

const paymentStatusDisplay: Record<PaymentStatus, StatusDisplay> = {
  pending: { label: 'Pending', tone: 'neutral' },
  claimed: { label: 'Claimed', tone: 'warning' },
  confirming: { label: 'Confirming', tone: 'warning' },
  paid: { label: 'Paid', tone: 'success' },
  failed: { label: 'Failed', tone: 'destructive' },
}

const paymentMethodLabel: Record<PaymentMethod, string> = {
  qpay: 'QPay',
  bank_transfer: 'Bank transfer',
}

const summaryLabels: ReadonlyArray<{
  key: keyof AdminDashboardSummary
  label: string
}> = [
  { key: 'newOrderCount', label: 'New orders' },
  { key: 'confirmedOrderCount', label: 'Confirmed' },
  { key: 'preparingOrderCount', label: 'Preparing' },
  { key: 'deliveringOrderCount', label: 'Delivering' },
  { key: 'lowStockVariantCount', label: 'Low-stock variants' },
]

const recentOrderColumns: readonly TableSkeletonColumn[] = [
  { label: 'Order' },
  { label: 'Order status' },
  { label: 'Payment' },
  { label: 'Items', class: 'text-right' },
  { label: 'Total', class: 'text-right' },
  { label: 'Placed' },
]

const lowStockColumns: readonly TableSkeletonColumn[] = [
  { label: 'Product' },
  { label: 'SKU' },
  { label: 'Inventory' },
  { label: 'Updated' },
]

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

function DashboardSkeleton() {
  return (
    <div aria-busy="true" class="mt-6 space-y-8">
      <span class="sr-only" role="status">
        Loading dashboard…
      </span>
      <section aria-labelledby="work-summary-loading-title">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold" id="work-summary-loading-title">
            Work summary
          </h2>
          <Skeleton class="h-4 w-24" />
        </div>
        <div class="rounded-lg border px-4">
          <For each={summaryLabels}>
            {() => (
              <div class="flex min-h-10 items-center justify-between gap-4 border-b py-2 last:border-b-0">
                <Skeleton class="h-4 w-32" />
                <Skeleton class="h-5 w-8" />
              </div>
            )}
          </For>
        </div>
      </section>
      <section aria-labelledby="recent-orders-loading-title">
        <h2 class="mb-3 text-lg font-semibold" id="recent-orders-loading-title">
          Recent orders
        </h2>
        <TableSkeleton columns={recentOrderColumns} rows={5} />
      </section>
      <section aria-labelledby="low-stock-loading-title">
        <h2 class="mb-3 text-lg font-semibold" id="low-stock-loading-title">
          Low stock
        </h2>
        <TableSkeleton columns={lowStockColumns} rows={5} />
      </section>
    </div>
  )
}

function WorkSummary(props: { summary: AdminDashboardSummary }) {
  return (
    <section aria-labelledby="work-summary-title">
      <div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 class="text-lg font-semibold" id="work-summary-title">
          Work summary
        </h2>
        <p class="text-xs text-muted-foreground">Current order and inventory queues</p>
      </div>
      <dl class="rounded-lg border px-4">
        <For each={summaryLabels}>
          {item => (
            <div class="flex min-h-10 items-center justify-between gap-4 border-b py-2 last:border-b-0">
              <dt class="text-sm text-muted-foreground">{item.label}</dt>
              <dd class="text-base font-semibold tabular-nums">{props.summary[item.key]}</dd>
            </div>
          )}
        </For>
      </dl>
    </section>
  )
}

function RecentOrders(props: {
  orders: AdminOrderListItem[]
  orderHref: (orderId: AdminOrderListItem['id']) => string
}) {
  return (
    <section aria-labelledby="recent-orders-title">
      <div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 class="text-lg font-semibold" id="recent-orders-title">
          Recent orders
        </h2>
        <p class="text-xs text-muted-foreground">
          {props.orders.length} {props.orders.length === 1 ? 'order' : 'orders'}
        </p>
      </div>
      <Switch>
        <Match when={props.orders.length === 0}>
          <AdminEmptyState
            description="New checkouts will appear here when customers place orders."
            title="No orders yet"
          />
        </Match>
        <Match when={props.orders.length > 0}>
          <div class="rounded-lg border">
            <Table>
              <TableCaption class="sr-only">The eight newest store orders</TableCaption>
              <TableHeader>
                <TableRow class="hover:bg-transparent">
                  <TableHead>Order</TableHead>
                  <TableHead>Order status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead class="text-right">Items</TableHead>
                  <TableHead class="text-right">Total</TableHead>
                  <TableHead>Placed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <For each={props.orders}>
                  {order => {
                    const orderStatus = orderStatusDisplay[order.status]
                    const paymentStatus = paymentStatusDisplay[order.paymentStatus]

                    return (
                      <TableRow>
                        <TableCell>
                          <a
                            class="font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            href={props.orderHref(order.id)}
                          >
                            {order.number}
                          </a>
                          <p class="mt-0.5 text-xs text-muted-foreground">{order.customerName}</p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone={orderStatus.tone}>{orderStatus.label}</StatusBadge>
                        </TableCell>
                        <TableCell>
                          <div class="flex items-center gap-2">
                            <StatusBadge tone={paymentStatus.tone}>
                              {paymentStatus.label}
                            </StatusBadge>
                            <span class="text-xs text-muted-foreground">
                              {paymentMethodLabel[order.paymentMethod]}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell class="text-right tabular-nums">{order.lineCount}</TableCell>
                        <TableCell class="text-right font-medium tabular-nums">
                          {formatMoney(order.totalMnt)}
                        </TableCell>
                        <TableCell>
                          <time dateTime={dateTime(order.createdAt)}>
                            {formatDate(order.createdAt)}
                          </time>
                        </TableCell>
                      </TableRow>
                    )
                  }}
                </For>
              </TableBody>
            </Table>
          </div>
        </Match>
      </Switch>
    </section>
  )
}

function InventoryStatus(props: { stockQuantity: number }) {
  return props.stockQuantity === 0 ? (
    <StatusBadge tone="destructive">Out of stock</StatusBadge>
  ) : (
    <StatusBadge tone="warning">Low stock</StatusBadge>
  )
}

function LowStock(props: {
  variants: AdminLowStockVariant[]
  catalogHref: (
    productId: AdminLowStockVariant['productId'],
    variantId: AdminLowStockVariant['variantId'],
  ) => string
}) {
  return (
    <section aria-labelledby="low-stock-title">
      <div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 class="text-lg font-semibold" id="low-stock-title">
          Low stock
        </h2>
        <p class="text-xs text-muted-foreground">Active inventory at 3 units or fewer</p>
      </div>
      <Switch>
        <Match when={props.variants.length === 0}>
          <AdminEmptyState
            description="Inventory is currently above the low-stock threshold."
            title="Inventory is in range"
          />
        </Match>
        <Match when={props.variants.length > 0}>
          <div class="rounded-lg border">
            <Table>
              <TableCaption class="sr-only">
                The eight active variants with the lowest stock
              </TableCaption>
              <TableHeader>
                <TableRow class="hover:bg-transparent">
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <For each={props.variants}>
                  {variant => (
                    <TableRow>
                      <TableCell>
                        <a
                          class="font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          href={props.catalogHref(variant.productId, variant.variantId)}
                        >
                          {variant.productName}
                        </a>
                        <p class="mt-0.5 text-xs text-muted-foreground">{variant.variantName}</p>
                      </TableCell>
                      <TableCell class="font-mono text-xs">{variant.sku}</TableCell>
                      <TableCell>
                        <div class="flex items-center gap-2">
                          <span class="font-medium tabular-nums">{variant.stockQuantity}</span>
                          <InventoryStatus stockQuantity={variant.stockQuantity} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <time dateTime={dateTime(variant.updatedAt)}>
                          {formatDate(variant.updatedAt)}
                        </time>
                      </TableCell>
                    </TableRow>
                  )}
                </For>
              </TableBody>
            </Table>
          </div>
        </Match>
      </Switch>
    </section>
  )
}

function DashboardContent(props: {
  dashboard: AdminDashboard
  orderHref: (orderId: AdminOrderListItem['id']) => string
  catalogHref: (
    productId: AdminLowStockVariant['productId'],
    variantId: AdminLowStockVariant['variantId'],
  ) => string
}) {
  return (
    <div class="mt-6 space-y-8">
      <WorkSummary summary={props.dashboard.summary} />
      <RecentOrders orderHref={props.orderHref} orders={props.dashboard.recentOrders} />
      <LowStock catalogHref={props.catalogHref} variants={props.dashboard.lowStockVariants} />
    </div>
  )
}

export type DashboardPageProps = {
  request: AdminDashboardRequest
  orderHref: (orderId: AdminOrderListItem['id']) => string
  catalogHref: (
    productId: AdminLowStockVariant['productId'],
    variantId: AdminLowStockVariant['variantId'],
  ) => string
}

export function DashboardPage(props: DashboardPageProps) {
  const query = useQueryResult(() => dashboardQuery.overview(props.request))

  return (
    <section class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        description="Review active order queues and inventory that needs attention."
        title="Dashboard"
        titleId="dashboard-title"
      />
      <Switch>
        <Match when={query.isPending}>
          <DashboardSkeleton />
        </Match>
        <Match when={query.isError}>
          <div class="mt-6">
            <RetryState
              message="Check your connection, then retry the dashboard request."
              onRetry={() => {
                void query.refetch()
              }}
              pending={query.isFetching}
            />
          </div>
        </Match>
        <Match when={query.data?.status === 'error' ? query.data.error : undefined}>
          {error => (
            <div class="mt-6">
              <InlineAlert title="Dashboard data is unavailable" tone="destructive">
                {error().message}
              </InlineAlert>
            </div>
          )}
        </Match>
        <Match when={query.data?.status === 'ok' ? query.data.value : undefined}>
          {dashboard => (
            <DashboardContent
              catalogHref={props.catalogHref}
              dashboard={dashboard()}
              orderHref={props.orderHref}
            />
          )}
        </Match>
      </Switch>
    </section>
  )
}
