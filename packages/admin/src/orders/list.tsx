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
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@store-kit/ui'
import { Link, useNavigate } from '@tanstack/solid-router'
import {
  createColumnHelper,
  createSolidTable,
  flexRender,
  getCoreRowModel,
} from '@tanstack/solid-table'
import { For, Show, createSignal } from 'solid-js'

import { InlineAlert, PageHeader, RetryState } from '../components/foundation'
import { activeTableRowId, handleTableNavigation, tableRowId } from '../components/table-navigation'
import { formatMnt } from '../format'
import { useQueryResult } from '../query-options/result'
import { orderQuery } from './query-options'
import { OrderStatusBadge, PaymentStatusBadge, paymentMethodLabel } from './status'

const dateFormatter = new Intl.DateTimeFormat('mn-MN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const formatMoney = formatMnt
const formatDate = (value: number) => dateFormatter.format(new Date(value))
const dateTime = (value: number) => new Date(value).toISOString()

const columnHelper = createColumnHelper<AdminOrderListItem>()

const orderColumns = [
  columnHelper.accessor('number', {
    header: 'Захиалга',
    cell: info => (
      <div class="min-w-32">
        <Link
          class="font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          params={{ orderId: info.row.original.id }}
          to="/orders/$orderId"
        >
          {info.getValue()}
        </Link>
        <p class="mt-0.5 text-xs text-muted-foreground">
          <time dateTime={dateTime(info.row.original.createdAt)}>
            {formatDate(info.row.original.createdAt)}
          </time>
        </p>
      </div>
    ),
  }),
  columnHelper.accessor('customerName', {
    header: 'Хэрэглэгч',
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
    header: 'Захиалгын төлөв',
    cell: info => <OrderStatusBadge status={info.getValue()} />,
  }),
  columnHelper.display({
    id: 'payment',
    header: 'Төлбөр',
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
    header: 'Бараа',
    cell: info => <span class="tabular-nums">{info.getValue()}</span>,
  }),
  columnHelper.accessor('totalMnt', {
    header: 'Нийт',
    cell: info => (
      <span class="font-medium whitespace-nowrap tabular-nums">{formatMoney(info.getValue())}</span>
    ),
  }),
]

export type OrderListSearch = AdminOrderListFilters & {
  limit: number
  offset: number
}

type FilterFieldsProps = {
  idSuffix: string
  search: OrderListSearch
  setSearch: (patch: Partial<OrderListSearch>) => void
  clearFilters: () => void
  hasFilters: boolean
}

function FilterFields(props: FilterFieldsProps) {
  return (
    <div class="flex flex-col gap-3 lg:w-fit lg:flex-row lg:flex-wrap lg:items-end">
      <label
        class="flex flex-col gap-1.5 text-sm font-medium lg:flex-none"
        for={`order-status-filter-${props.idSuffix}`}
      >
        Захиалгын төлөв
        <NativeSelect
          class="min-h-12! w-full lg:min-h-8! lg:w-48"
          id={`order-status-filter-${props.idSuffix}`}
          value={props.search.status ?? 'all'}
          onChange={event => {
            const value = event.currentTarget.value
            props.setSearch({
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
          <NativeSelectOption value="all">Бүх төлөв</NativeSelectOption>
          <NativeSelectOption value="new">Шинэ</NativeSelectOption>
          <NativeSelectOption value="confirmed">Баталгаажсан</NativeSelectOption>
          <NativeSelectOption value="preparing">Бэлтгэж байна</NativeSelectOption>
          <NativeSelectOption value="delivering">Хүргэж байна</NativeSelectOption>
          <NativeSelectOption value="completed">Дууссан</NativeSelectOption>
          <NativeSelectOption value="cancelled">Цуцалсан</NativeSelectOption>
        </NativeSelect>
      </label>
      <label
        class="flex flex-col gap-1.5 text-sm font-medium lg:flex-none"
        for={`payment-status-filter-${props.idSuffix}`}
      >
        Төлбөрийн төлөв
        <NativeSelect
          class="min-h-12! w-full lg:min-h-8! lg:w-48"
          id={`payment-status-filter-${props.idSuffix}`}
          value={props.search.paymentStatus ?? 'all'}
          onChange={event => {
            const value = event.currentTarget.value
            props.setSearch({
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
          <NativeSelectOption value="all">Бүх төлөв</NativeSelectOption>
          <NativeSelectOption value="pending">Хүлээгдэж байна</NativeSelectOption>
          <NativeSelectOption value="claimed">Шилжүүлсэн гэж мэдэгдсэн</NativeSelectOption>
          <NativeSelectOption value="confirming">Шалгаж байна</NativeSelectOption>
          <NativeSelectOption value="paid">Төлөгдсөн</NativeSelectOption>
          <NativeSelectOption value="failed">Амжилтгүй</NativeSelectOption>
        </NativeSelect>
      </label>
      <Show when={props.hasFilters}>
        <Button
          class="min-h-12! lg:min-h-8!"
          onClick={props.clearFilters}
          type="button"
          variant="outline"
        >
          Шүүлтүүр арилгах
        </Button>
      </Show>
    </div>
  )
}

function OrderListSkeleton() {
  return (
    <div aria-busy="true" class="-mx-4 divide-y border-y sm:mx-0 sm:rounded-lg sm:border-x">
      <span class="sr-only" role="status">
        Захиалгуудыг ачаалж байна…
      </span>
      <For each={[0, 1, 2, 3, 4]}>
        {() => (
          <div class="min-h-28 px-4 py-4">
            <div class="flex justify-between gap-4">
              <Skeleton class="h-4 w-28" />
              <Skeleton class="h-4 w-24" />
            </div>
            <Skeleton class="mt-2 h-4 w-40" />
            <div class="mt-3 flex gap-2">
              <Skeleton class="h-5 w-20" />
              <Skeleton class="h-5 w-24" />
            </div>
          </div>
        )}
      </For>
    </div>
  )
}

function MobileOrderList(props: { orders: AdminOrderListItem[] }) {
  return (
    <ol
      aria-label="Дэлгүүрийн захиалгууд"
      class="divide-y divide-(--border) border border-(--border) bg-card lg:hidden"
    >
      <For each={props.orders}>
        {order => (
          <li>
            <Link
              aria-label={`${order.number}, ${order.customerName}, ${formatMoney(order.totalMnt)}`}
              class="block min-h-28 px-4 py-4 transition-colors outline-none hover:bg-background focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              params={{ orderId: order.id }}
              to="/orders/$orderId"
            >
              <span class="flex items-start justify-between gap-4">
                <span class="min-w-0">
                  <span class="block text-base font-semibold tabular-nums">{order.number}</span>
                  <span class="mt-1 block truncate text-base">{order.customerName}</span>
                </span>
                <span class="shrink-0 text-base font-semibold tabular-nums">
                  {formatMoney(order.totalMnt)}
                </span>
              </span>
              <span class="mt-3 flex flex-wrap items-center gap-2">
                <PaymentStatusBadge status={order.paymentStatus} />
                <OrderStatusBadge status={order.status} />
                <time
                  class="ml-auto text-xs text-muted-foreground tabular-nums"
                  dateTime={dateTime(order.createdAt)}
                >
                  {formatDate(order.createdAt)}
                </time>
              </span>
            </Link>
          </li>
        )}
      </For>
    </ol>
  )
}

type OrderListPageProps = {
  search: OrderListSearch
  onSearchChange: (search: OrderListSearch) => void
}

export function OrderListPage(props: OrderListPageProps) {
  const navigate = useNavigate()
  const query = useQueryResult(() => orderQuery.list(props.search))
  const data = () => query.data?.match({ ok: value => value, err: () => undefined })
  const expectedError = () =>
    query.data?.match<AdminOrderError | undefined>({ ok: () => undefined, err: error => error })
  const [activeRow, setActiveRow] = createSignal<number>()
  const table = createSolidTable({
    get data() {
      return data()?.items ?? []
    },
    columns: orderColumns,
    getCoreRowModel: getCoreRowModel(),
  })
  const setSearch = (patch: Partial<OrderListSearch>) =>
    props.onSearchChange({ ...props.search, ...patch, offset: patch.offset ?? 0 })
  const clearFilters = () => props.onSearchChange({ limit: props.search.limit, offset: 0 })
  const hasFilters = () =>
    Boolean(props.search.query || props.search.status || props.search.paymentStatus)
  const filterCount = () =>
    Number(Boolean(props.search.status)) + Number(Boolean(props.search.paymentStatus))
  const rowIds = () => table.getRowModel().rows.map(row => row.original.id)
  const onTableKeyDown = (
    event: KeyboardEvent & { currentTarget: HTMLDivElement; target: Element },
  ) =>
    handleTableNavigation(event, rowIds(), activeRow(), setActiveRow, orderId => {
      void navigate({ to: '/orders/$orderId', params: { orderId } })
    })

  return (
    <section class="mx-auto w-full max-w-365 px-4 py-6 sm:px-7 lg:px-10 lg:py-8 xl:px-14">
      <PageHeader
        description="Төлбөр, бэлтгэл, хүргэлтийн явцаар захиалгаа хурдан олж ажиллана."
        title="Захиалга"
        titleId="orders-title"
      />

      <div class="mt-6 border border-(--border) bg-card px-4 py-4">
        <label class="flex min-w-0 flex-col gap-1.5 text-sm font-medium" for="order-search">
          Захиалга хайх
          <div class="relative">
            <span
              aria-hidden="true"
              class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            >
              <Magnifer size={18} />
            </span>
            <Input
              class="min-h-12! pl-10! text-base! lg:min-h-8! lg:text-sm!"
              data-admin-list-search
              id="order-search"
              placeholder="Дугаар, хэрэглэгч эсвэл утас"
              type="search"
              value={props.search.query ?? ''}
              onInput={event => setSearch({ query: event.currentTarget.value || undefined })}
            />
          </div>
        </label>

        <details class="mt-3 lg:hidden">
          <summary class="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-md border px-3 text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span>Шүүлтүүр</span>
            <span class="text-sm text-muted-foreground">
              {filterCount() > 0 ? `${filterCount()} сонгосон` : 'Бүгд'}
            </span>
          </summary>
          <div class="pt-3">
            <FilterFields
              clearFilters={clearFilters}
              hasFilters={hasFilters()}
              idSuffix="mobile"
              search={props.search}
              setSearch={setSearch}
            />
          </div>
        </details>

        <div class="mt-3 hidden lg:block">
          <FilterFields
            clearFilters={clearFilters}
            hasFilters={hasFilters()}
            idSuffix="desktop"
            search={props.search}
            setSearch={setSearch}
          />
        </div>
      </div>

      <div class="mt-5">
        <Show when={!query.isPending} fallback={<OrderListSkeleton />}>
          <Show
            when={!query.isError}
            fallback={
              <RetryState
                message="Захиалгын жагсаалтыг ачаалж чадсангүй."
                onRetry={() => void query.refetch()}
                pending={query.isFetching}
              />
            }
          >
            <Show
              when={!expectedError()}
              fallback={
                <InlineAlert title="Захиалга ачаалж чадсангүй" tone="destructive">
                  {expectedError()?.message ?? 'Захиалгын хүсэлт амжилтгүй боллоо.'}
                </InlineAlert>
              }
            >
              <Show
                when={(data()?.items.length ?? 0) > 0}
                fallback={
                  <div class="-mx-4 border-y bg-card px-4 py-6 sm:mx-0 sm:rounded-lg sm:border-x">
                    <h2 class="text-base font-semibold">
                      {hasFilters() ? 'Илэрц олдсонгүй' : 'Захиалга хараахан алга'}
                    </h2>
                    <p class="mt-1 max-w-xl text-sm leading-5 text-muted-foreground">
                      {hasFilters()
                        ? 'Хайлт эсвэл шүүлтүүрээ өөрчлөөд дахин шалгана уу.'
                        : 'Хэрэглэгч анхны захиалгаа өгөхөд энд автоматаар гарч ирнэ.'}
                    </p>
                  </div>
                }
              >
                <MobileOrderList orders={data()?.items ?? []} />

                <div
                  aria-activedescendant={activeTableRowId('store-orders', rowIds(), activeRow())}
                  aria-label="Дэлгүүрийн захиалгууд. Дээш, доош сумын товчоор мөр сонгоод Enter дарж нээнэ."
                  class="hidden border border-(--border) bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring/70 lg:block"
                  onKeyDown={onTableKeyDown}
                  role="group"
                  tabIndex={0}
                >
                  <Table aria-label="Дэлгүүрийн захиалгууд">
                    <TableHeader>
                      <For each={table.getHeaderGroups()}>
                        {headerGroup => (
                          <TableRow>
                            <For each={headerGroup.headers}>
                              {header => (
                                <TableHead
                                  class={
                                    header.column.id === 'lineCount' ||
                                    header.column.id === 'totalMnt'
                                      ? 'text-right'
                                      : undefined
                                  }
                                >
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
                        {(row, index) => (
                          <TableRow
                            aria-selected={activeRow() === index()}
                            data-state={activeRow() === index() ? 'selected' : undefined}
                            id={tableRowId('store-orders', row.original.id)}
                          >
                            <For each={row.getVisibleCells()}>
                              {cell => (
                                <TableCell
                                  class={
                                    cell.column.id === 'lineCount' || cell.column.id === 'totalMnt'
                                      ? 'text-right'
                                      : undefined
                                  }
                                >
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
                    <div class="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <p class="tabular-nums">
                        {orders.total} захиалгын {orders.offset + 1}–
                        {Math.min(orders.offset + orders.items.length, orders.total)}-г харуулж
                        байна
                      </p>
                      <div class="flex gap-2">
                        <Button
                          class="min-h-11! min-w-28 lg:min-h-8!"
                          disabled={orders.offset === 0 || query.isFetching}
                          onClick={() =>
                            setSearch({ offset: Math.max(0, orders.offset - orders.limit) })
                          }
                          type="button"
                          variant="outline"
                        >
                          Өмнөх
                        </Button>
                        <Button
                          class="min-h-11! min-w-28 lg:min-h-8!"
                          disabled={
                            orders.offset + orders.items.length >= orders.total || query.isFetching
                          }
                          onClick={() => setSearch({ offset: orders.offset + orders.limit })}
                          type="button"
                          variant="outline"
                        >
                          Дараах
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
