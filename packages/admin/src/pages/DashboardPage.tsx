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
import type { TableSkeletonColumn } from '../components/foundation'
import { orderStatusDisplay, paymentMethodLabel, paymentStatusDisplay } from '../orders/status'
import { dashboardQuery } from '../query-options/dashboard'
import type { AdminDashboardRequest } from '../query-options/dashboard'
import { useQueryResult } from '../query-options/result'

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
    <div aria-busy="true" class="mt-4 space-y-6">
      <span class="sr-only" role="status">
        Loading dashboard…
      </span>
      <section aria-labelledby="work-summary-loading-title">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold" id="work-summary-loading-title">
            Work queues
          </h2>
          <Skeleton class="h-3 w-24" />
        </div>
        <div class="grid grid-cols-2 border-y bg-card sm:grid-cols-5">
          <For each={summaryLabels}>
            {() => (
              <div class="flex min-h-14 flex-col justify-center gap-1 border-b px-3 py-2 last:col-span-2 last:border-b-0 even:border-l sm:border-b-0 sm:border-l first:sm:border-l-0 last:sm:col-span-1">
                <Skeleton class="h-3 w-20 max-w-full" />
                <Skeleton class="h-4 w-7" />
              </div>
            )}
          </For>
        </div>
      </section>
      <section aria-labelledby="recent-orders-loading-title">
        <h2 class="mb-2 text-sm font-semibold" id="recent-orders-loading-title">
          Recent orders
        </h2>
        <TableSkeleton columns={recentOrderColumns} rows={5} />
      </section>
      <section aria-labelledby="low-stock-loading-title">
        <h2 class="mb-2 text-sm font-semibold" id="low-stock-loading-title">
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
      <div class="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 class="text-sm font-semibold" id="work-summary-title">
          Work queues
        </h2>
        <p class="text-xs text-muted-foreground">Current order and inventory queues</p>
      </div>
      <dl class="grid grid-cols-2 border-y bg-card sm:grid-cols-5">
        <For each={summaryLabels}>
          {item => (
            <div class="flex min-h-14 flex-col justify-center gap-0.5 border-b px-3 py-2 last:col-span-2 last:border-b-0 even:border-l sm:border-b-0 sm:border-l first:sm:border-l-0 last:sm:col-span-1">
              <dt class="text-xs text-muted-foreground">{item.label}</dt>
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
      <div class="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 class="text-sm font-semibold" id="recent-orders-title">
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
          <div class="overflow-hidden rounded-lg border bg-card">
            <Table class="max-md:block">
              <TableCaption class="sr-only">The eight newest store orders</TableCaption>
              <TableHeader class="max-md:hidden">
                <TableRow class="hover:bg-transparent">
                  <TableHead>Order</TableHead>
                  <TableHead>Order status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead class="text-right">Items</TableHead>
                  <TableHead class="text-right">Total</TableHead>
                  <TableHead>Placed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody class="max-md:block">
                <For each={props.orders}>
                  {order => {
                    const orderStatus = orderStatusDisplay(order.status)
                    const paymentStatus = paymentStatusDisplay(order.paymentStatus)

                    return (
                      <TableRow class="max-md:grid max-md:grid-cols-2 max-md:py-1">
                        <TableCell class="max-md:col-span-2 max-md:block max-md:px-3 max-md:py-2">
                          <a
                            class="font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            href={props.orderHref(order.id)}
                          >
                            {order.number}
                          </a>
                          <p class="mt-0.5 text-xs text-muted-foreground">{order.customerName}</p>
                        </TableCell>
                        <TableCell class="max-md:col-span-2 max-md:flex max-md:items-center max-md:justify-between max-md:gap-2 max-md:px-3 max-md:py-2">
                          <span class="text-xs text-muted-foreground md:hidden">Order status</span>
                          <StatusBadge tone={orderStatus.tone}>{orderStatus.label}</StatusBadge>
                        </TableCell>
                        <TableCell class="max-md:col-span-2 max-md:flex max-md:items-center max-md:justify-between max-md:gap-2 max-md:px-3 max-md:py-2">
                          <span class="text-xs text-muted-foreground md:hidden">Payment</span>
                          <div class="flex items-center gap-2">
                            <StatusBadge tone={paymentStatus.tone}>
                              {paymentStatus.label}
                            </StatusBadge>
                            <span class="text-xs text-muted-foreground">
                              {paymentMethodLabel(order.paymentMethod)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell class="text-right tabular-nums max-md:flex max-md:items-center max-md:justify-between max-md:px-3 max-md:py-2">
                          <span class="text-xs text-muted-foreground md:hidden">Items</span>
                          {order.lineCount}
                        </TableCell>
                        <TableCell class="text-right font-medium tabular-nums max-md:flex max-md:items-center max-md:justify-between max-md:px-3 max-md:py-2">
                          <span class="text-xs text-muted-foreground md:hidden">Total</span>
                          {formatMoney(order.totalMnt)}
                        </TableCell>
                        <TableCell class="max-md:col-span-2 max-md:flex max-md:items-center max-md:justify-between max-md:px-3 max-md:py-2">
                          <span class="text-xs text-muted-foreground md:hidden">Placed</span>
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
      <div class="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 class="text-sm font-semibold" id="low-stock-title">
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
          <div class="overflow-hidden rounded-lg border bg-card">
            <Table class="max-md:block">
              <TableCaption class="sr-only">
                The eight active variants with the lowest stock
              </TableCaption>
              <TableHeader class="max-md:hidden">
                <TableRow class="hover:bg-transparent">
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody class="max-md:block">
                <For each={props.variants}>
                  {variant => (
                    <TableRow class="max-md:grid max-md:grid-cols-2 max-md:py-1">
                      <TableCell class="max-md:col-span-2 max-md:block max-md:px-3 max-md:py-2">
                        <a
                          class="font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          href={props.catalogHref(variant.productId, variant.variantId)}
                        >
                          {variant.productName}
                        </a>
                        <p class="mt-0.5 text-xs text-muted-foreground">{variant.variantName}</p>
                      </TableCell>
                      <TableCell class="font-mono text-xs max-md:col-span-2 max-md:flex max-md:items-center max-md:justify-between max-md:px-3 max-md:py-2">
                        <span class="font-sans text-muted-foreground md:hidden">SKU</span>
                        {variant.sku}
                      </TableCell>
                      <TableCell class="max-md:col-span-2 max-md:flex max-md:items-center max-md:justify-between max-md:gap-2 max-md:px-3 max-md:py-2">
                        <span class="text-xs text-muted-foreground md:hidden">Inventory</span>
                        <div class="flex items-center gap-2">
                          <span class="font-medium tabular-nums">{variant.stockQuantity}</span>
                          <InventoryStatus stockQuantity={variant.stockQuantity} />
                        </div>
                      </TableCell>
                      <TableCell class="max-md:col-span-2 max-md:flex max-md:items-center max-md:justify-between max-md:gap-2 max-md:px-3 max-md:py-2">
                        <span class="text-xs text-muted-foreground md:hidden">Updated</span>
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
    <div class="mt-4 space-y-6">
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
    <section class="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-7">
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
          <div class="mt-4">
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
            <div class="mt-4">
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
