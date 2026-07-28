import { Magnifer } from '@solar-icons/solid/Linear'
import type {
  AdminOrderError,
  AdminOrderListFilters,
  AdminOrderListItem,
} from '@store-kit/contracts/admin-orders'
import {
  Button,
  Input,
  NativeSelect,
  NativeSelectOption,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@store-kit/ui'
import {
  createColumnHelper,
  createSolidTable,
  flexRender,
  getCoreRowModel,
} from '@tanstack/solid-table'
import { For, Show } from 'solid-js'

import {
  AdminEmptyState,
  InlineAlert,
  PageHeader,
  RetryState,
  TableSkeleton,
} from '../components/foundation'
import { useQueryResult } from '../query-options/result'
import type { OrderRequests } from './query-options'
import { orderQuery } from './query-options'
import { OrderStatusBadge, PaymentStatusBadge, paymentMethodLabel } from './status'

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

const columnHelper = createColumnHelper<AdminOrderListItem>()

const orderColumns = (orderHref: (orderId: string) => string) => [
  columnHelper.accessor('number', {
    header: 'Order',
    cell: info => (
      <div class="min-w-32">
        <a
          class="font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href={orderHref(info.row.original.id)}
        >
          {info.getValue()}
        </a>
        <p class="mt-0.5 text-xs text-muted-foreground">
          <time dateTime={dateTime(info.row.original.createdAt)}>
            {formatDate(info.row.original.createdAt)}
          </time>
        </p>
      </div>
    ),
  }),
  columnHelper.accessor('customerName', {
    header: 'Customer',
    cell: info => (
      <div class="min-w-40">
        <div class="font-medium">{info.getValue()}</div>
        <div class="mt-0.5 text-xs whitespace-nowrap text-muted-foreground">
          {info.row.original.customerPhone}
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Order status',
    cell: info => <OrderStatusBadge status={info.getValue()} />,
  }),
  columnHelper.display({
    id: 'payment',
    header: 'Payment',
    cell: info => (
      <div class="min-w-32">
        <PaymentStatusBadge status={info.row.original.paymentStatus} />
        <div class="mt-1 text-xs text-muted-foreground">
          {paymentMethodLabel(info.row.original.paymentMethod)}
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('lineCount', {
    header: 'Items',
    cell: info => <span class="tabular-nums">{info.getValue()}</span>,
  }),
  columnHelper.accessor('totalMnt', {
    header: 'Total',
    cell: info => (
      <span class="font-medium whitespace-nowrap tabular-nums">{formatMoney(info.getValue())}</span>
    ),
  }),
]

export type OrderListSearch = AdminOrderListFilters & {
  limit: number
  offset: number
}

type OrderListPageProps = {
  requests: OrderRequests
  search: OrderListSearch
  onSearchChange: (search: OrderListSearch) => void
  orderHref: (orderId: string) => string
}

export function OrderListPage(props: OrderListPageProps) {
  const query = useQueryResult(() => orderQuery.list(props.requests, props.search))
  const data = () => query.data?.match({ ok: value => value, err: () => undefined })
  const expectedError = () =>
    query.data?.match<AdminOrderError | undefined>({ ok: () => undefined, err: error => error })
  const table = createSolidTable({
    get data() {
      return data()?.items ?? []
    },
    columns: orderColumns(orderId => props.orderHref(orderId)),
    getCoreRowModel: getCoreRowModel(),
  })
  const setSearch = (patch: Partial<OrderListSearch>) =>
    props.onSearchChange({ ...props.search, ...patch, offset: patch.offset ?? 0 })
  const clearFilters = () => props.onSearchChange({ limit: props.search.limit, offset: 0 })

  return (
    <section class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        description="Find customer orders, review payment state, and move eligible orders through fulfillment."
        title="Orders"
        titleId="orders-title"
      />

      <div class="mt-5 flex flex-col gap-3 border-b pb-5 lg:flex-row lg:items-end">
        <label class="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium" for="order-search">
          Search orders
          <div class="relative">
            <span
              aria-hidden="true"
              class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            >
              <Magnifer size={16} />
            </span>
            <Input
              class="pl-9"
              id="order-search"
              placeholder="Order number, customer, or phone"
              type="search"
              value={props.search.query ?? ''}
              onInput={event => setSearch({ query: event.currentTarget.value || undefined })}
            />
          </div>
        </label>
        <label class="flex flex-col gap-1 text-sm font-medium" for="order-status-filter">
          Order status
          <NativeSelect
            class="w-full lg:w-44"
            id="order-status-filter"
            value={props.search.status ?? 'all'}
            onChange={event => {
              const value = event.currentTarget.value
              setSearch({
                status:
                  value === 'new' ||
                  value === 'confirmed' ||
                  value === 'preparing' ||
                  value === 'delivering' ||
                  value === 'completed' ||
                  value === 'cancelled'
                    ? value
                    : undefined,
              })
            }}
          >
            <NativeSelectOption value="all">All order statuses</NativeSelectOption>
            <NativeSelectOption value="new">New</NativeSelectOption>
            <NativeSelectOption value="confirmed">Confirmed</NativeSelectOption>
            <NativeSelectOption value="preparing">Preparing</NativeSelectOption>
            <NativeSelectOption value="delivering">Delivering</NativeSelectOption>
            <NativeSelectOption value="completed">Completed</NativeSelectOption>
            <NativeSelectOption value="cancelled">Cancelled</NativeSelectOption>
          </NativeSelect>
        </label>
        <label class="flex flex-col gap-1 text-sm font-medium" for="payment-status-filter">
          Payment status
          <NativeSelect
            class="w-full lg:w-44"
            id="payment-status-filter"
            value={props.search.paymentStatus ?? 'all'}
            onChange={event => {
              const value = event.currentTarget.value
              setSearch({
                paymentStatus:
                  value === 'pending' ||
                  value === 'claimed' ||
                  value === 'confirming' ||
                  value === 'paid' ||
                  value === 'failed'
                    ? value
                    : undefined,
              })
            }}
          >
            <NativeSelectOption value="all">All payment statuses</NativeSelectOption>
            <NativeSelectOption value="pending">Pending</NativeSelectOption>
            <NativeSelectOption value="claimed">Claimed</NativeSelectOption>
            <NativeSelectOption value="confirming">Confirming</NativeSelectOption>
            <NativeSelectOption value="paid">Paid</NativeSelectOption>
            <NativeSelectOption value="failed">Failed</NativeSelectOption>
          </NativeSelect>
        </label>
        <Button onClick={clearFilters} type="button" variant="outline">
          Clear filters
        </Button>
      </div>

      <div class="mt-5">
        <Show
          when={!query.isPending}
          fallback={
            <TableSkeleton
              columns={[
                { label: 'Order' },
                { label: 'Customer' },
                { label: 'Order status' },
                { label: 'Payment' },
                { label: 'Items' },
                { label: 'Total' },
              ]}
              rows={8}
            />
          }
        >
          <Show
            when={!query.isError}
            fallback={
              <RetryState
                message="The order list could not be loaded."
                onRetry={() => void query.refetch()}
                pending={query.isFetching}
              />
            }
          >
            <Show
              when={!expectedError()}
              fallback={
                <InlineAlert title="Could not load orders" tone="destructive">
                  {expectedError()?.message ?? 'The order request failed.'}
                </InlineAlert>
              }
            >
              <Show
                when={(data()?.items.length ?? 0) > 0}
                fallback={
                  <AdminEmptyState
                    action={
                      <Button onClick={clearFilters} type="button" variant="outline">
                        Clear filters
                      </Button>
                    }
                    description="No orders match the current search and status filters."
                    title="No order results"
                  />
                }
              >
                <div class="rounded-lg border">
                  <Table aria-label="Store orders">
                    <TableHeader>
                      <For each={table.getHeaderGroups()}>
                        {headerGroup => (
                          <TableRow>
                            <For each={headerGroup.headers}>
                              {header => (
                                <TableHead>
                                  {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext(),
                                      )}
                                </TableHead>
                              )}
                            </For>
                          </TableRow>
                        )}
                      </For>
                    </TableHeader>
                    <TableBody>
                      <For each={table.getRowModel().rows}>
                        {row => (
                          <TableRow>
                            <For each={row.getVisibleCells()}>
                              {cell => (
                                <TableCell>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              )}
                            </For>
                          </TableRow>
                        )}
                      </For>
                    </TableBody>
                  </Table>
                </div>
                <Show when={data()} keyed>
                  {orders => (
                    <div class="mt-3 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <p>
                        Showing {orders.offset + 1}–
                        {Math.min(orders.offset + orders.items.length, orders.total)} of{' '}
                        {orders.total}
                      </p>
                      <div class="flex gap-2">
                        <Button
                          disabled={orders.offset === 0 || query.isFetching}
                          onClick={() =>
                            setSearch({ offset: Math.max(0, orders.offset - orders.limit) })
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Previous
                        </Button>
                        <Button
                          disabled={
                            orders.offset + orders.items.length >= orders.total || query.isFetching
                          }
                          onClick={() => setSearch({ offset: orders.offset + orders.limit })}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </Show>
              </Show>
            </Show>
          </Show>
        </Show>
      </div>
    </section>
  )
}
