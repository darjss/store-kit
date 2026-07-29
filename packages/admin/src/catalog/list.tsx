import { AddCircle, Magnifer } from '@solar-icons/solid/Linear'
import type {
  AdminCatalogError,
  AdminCatalogProductListFilters,
  AdminCatalogProductListItem,
  AdminInventoryState,
} from '@store-kit/contracts/admin-catalog'
import {
  Button,
  Input,
  NativeSelect,
  NativeSelectOption,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
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
import { Image } from '@unpic/solid/base'
import { For, Show, createSignal } from 'solid-js'
import { generate as cloudflare } from 'unpic/providers/cloudflare'

import {
  InlineAlert,
  PageHeader,
  RetryState,
  StatusBadge,
  TableSkeleton,
} from '../components/foundation'
import { activeTableRowId, handleTableNavigation, tableRowId } from '../components/table-navigation'
import { formatMnt } from '../format'
import { useQueryResult } from '../query-options/result'
import type { CatalogRequests } from './query-options'
import { catalogQuery } from './query-options'

const priceRange = (product: AdminCatalogProductListItem) => {
  if (product.minimumPriceMnt === null || product.maximumPriceMnt === null)
    return 'Идэвхтэй үнэ байхгүй'
  if (product.minimumPriceMnt === product.maximumPriceMnt) return formatMnt(product.minimumPriceMnt)
  return `${formatMnt(product.minimumPriceMnt)} – ${formatMnt(product.maximumPriceMnt)}`
}

const productStatusLabel = (status: AdminCatalogProductListItem['status']) => {
  if (status === 'active') return 'Идэвхтэй'
  if (status === 'archived') return 'Архивласан'
  return 'Ноорог'
}

const inventoryLabel = (quantity: number) => {
  if (quantity === 0) return 'Дууссан'
  if (quantity <= 3) return `Цөөн · ${quantity}`
  return `Бэлэн · ${quantity}`
}

function InventoryBadge(props: { quantity: number }) {
  if (props.quantity === 0)
    return <StatusBadge tone="destructive">{inventoryLabel(props.quantity)}</StatusBadge>
  if (props.quantity <= 3)
    return <StatusBadge tone="warning">{inventoryLabel(props.quantity)}</StatusBadge>
  return <StatusBadge>{inventoryLabel(props.quantity)}</StatusBadge>
}

const columnHelper = createColumnHelper<AdminCatalogProductListItem>()

const productColumns = (productHref: (productId: string) => string) => [
  columnHelper.accessor('name', {
    header: 'Бараа',
    cell: info => (
      <div class="flex min-w-52 items-center gap-2.5">
        <Show
          when={info.row.original.primaryImage}
          fallback={<div aria-hidden="true" class="size-9 shrink-0 rounded-sm border bg-muted" />}
        >
          {image => (
            <Image
              alt=""
              breakpoints={[36, 72]}
              class="size-9 shrink-0 rounded-sm bg-muted object-cover"
              height={image().height}
              layout="fixed"
              operations={{ quality: 75, format: 'auto', fit: 'cover' }}
              options={{ domain: new URL(image().url).hostname }}
              sizes="36px"
              src={image().url}
              transformer={cloudflare}
              unstyled
              width={image().width}
            />
          )}
        </Show>
        <a
          class="min-w-0 font-medium whitespace-normal text-primary underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href={productHref(info.row.original.id)}
        >
          {info.getValue()}
        </a>
      </div>
    ),
  }),
  columnHelper.display({
    id: 'classification',
    header: 'Брэнд / ангилал',
    cell: info => (
      <div class="min-w-36 text-sm">
        <div>{info.row.original.brandName ?? 'Брэндгүй'}</div>
        <div class="text-xs text-muted-foreground">
          {info.row.original.categoryName ?? 'Ангилалгүй'}
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Төлөв',
    cell: info => <StatusBadge>{productStatusLabel(info.getValue())}</StatusBadge>,
  }),
  columnHelper.accessor('activeVariantCount', {
    header: 'Хувилбар',
    cell: info => <span class="tabular-nums">{info.getValue()}</span>,
  }),
  columnHelper.accessor('totalStockQuantity', {
    header: 'Үлдэгдэл',
    cell: info => <InventoryBadge quantity={info.getValue()} />,
  }),
  columnHelper.display({
    id: 'price',
    header: 'Үнэ',
    cell: info => (
      <span class="whitespace-nowrap tabular-nums">{priceRange(info.row.original)}</span>
    ),
  }),
]

export type CatalogListSearch = AdminCatalogProductListFilters & {
  inventory: AdminInventoryState
  limit: number
  offset: number
}

type CatalogListPageProps = {
  requests: CatalogRequests
  search: CatalogListSearch
  onSearchChange: (search: CatalogListSearch) => void
  productHref: (productId: string) => string
  onNewProduct: () => void
}

export function CatalogListPage(props: CatalogListPageProps) {
  const query = useQueryResult(() => catalogQuery.list(props.requests, props.search))
  const data = () => query.data?.match({ ok: value => value, err: () => undefined })
  const expectedError = () =>
    query.data?.match<AdminCatalogError | undefined>({ ok: () => undefined, err: error => error })
  const [activeRow, setActiveRow] = createSignal<number>()
  const [filtersOpen, setFiltersOpen] = createSignal(false)
  const table = createSolidTable({
    get data() {
      return data()?.items ?? []
    },
    columns: productColumns(productId => props.productHref(productId)),
    getCoreRowModel: getCoreRowModel(),
  })
  const setSearch = (patch: Partial<CatalogListSearch>) =>
    props.onSearchChange({ ...props.search, ...patch, offset: patch.offset ?? 0 })
  const clearFilters = () =>
    props.onSearchChange({
      ...(props.search.query ? { query: props.search.query } : {}),
      inventory: 'all',
      limit: props.search.limit,
      offset: 0,
    })
  const clearSearchAndFilters = () =>
    props.onSearchChange({ inventory: 'all', limit: props.search.limit, offset: 0 })
  const hasFilters = () => Boolean(props.search.status || props.search.inventory !== 'all')
  const activeFilterCount = () =>
    Number(Boolean(props.search.status)) + Number(props.search.inventory !== 'all')
  const rowIds = () => table.getRowModel().rows.map(row => row.original.id)
  const onTableKeyDown = (
    event: KeyboardEvent & { currentTarget: HTMLDivElement; target: Element },
  ) =>
    handleTableNavigation(event, rowIds(), activeRow(), setActiveRow, productId =>
      window.location.assign(props.productHref(productId)),
    )

  const statusFilter = (id: string) => (
    <label class="flex flex-col gap-1.5 text-sm font-medium" for={id}>
      Төлөв
      <NativeSelect
        class="min-h-12! w-full lg:h-8! lg:w-40"
        id={id}
        value={props.search.status ?? 'all'}
        onChange={event => {
          const value = event.currentTarget.value
          setSearch({
            status:
              value === 'draft' || value === 'active' || value === 'archived' ? value : undefined,
          })
        }}
      >
        <NativeSelectOption value="all">Бүх төлөв</NativeSelectOption>
        <NativeSelectOption value="draft">Ноорог</NativeSelectOption>
        <NativeSelectOption value="active">Идэвхтэй</NativeSelectOption>
        <NativeSelectOption value="archived">Архивласан</NativeSelectOption>
      </NativeSelect>
    </label>
  )

  const inventoryFilter = (id: string) => (
    <label class="flex flex-col gap-1.5 text-sm font-medium" for={id}>
      Үлдэгдэл
      <NativeSelect
        class="min-h-12! w-full lg:h-8! lg:w-40"
        id={id}
        value={props.search.inventory}
        onChange={event => {
          const value = event.currentTarget.value
          setSearch({ inventory: value === 'low' || value === 'out' ? value : 'all' })
        }}
      >
        <NativeSelectOption value="all">Бүх үлдэгдэл</NativeSelectOption>
        <NativeSelectOption value="low">Цөөн үлдсэн</NativeSelectOption>
        <NativeSelectOption value="out">Дууссан</NativeSelectOption>
      </NativeSelect>
    </label>
  )

  return (
    <section class="mx-auto w-full max-w-7xl pb-28 md:px-6 md:py-5 md:pb-6 lg:px-7">
      <div class="px-4 pt-5 md:px-0 md:pt-0">
        <PageHeader
          actions={
            <Button
              class="fixed right-4 bottom-20 z-30 min-h-12! px-5! shadow-sm lg:static lg:h-8! lg:shadow-none"
              onClick={() => props.onNewProduct()}
              type="button"
            >
              <AddCircle aria-hidden="true" />
              Шинэ бараа
            </Button>
          }
          description="Үнэ, төлөв, үлдэгдлээ нэг дороос удирдана."
          title="Бараа"
          titleId="catalog-title"
        />
      </div>

      <div class="mt-4 px-4 md:px-0">
        <label class="sr-only" for="catalog-search">
          Бараа хайх
        </label>
        <div class="relative">
          <span
            aria-hidden="true"
            class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          >
            <Magnifer size={18} />
          </span>
          <Input
            class="min-h-12! pl-10! text-base! lg:h-8! lg:text-sm!"
            data-admin-list-search
            id="catalog-search"
            placeholder="Нэр, брэнд эсвэл барааны кодоор хайх"
            type="search"
            value={props.search.query ?? ''}
            onInput={event => setSearch({ query: event.currentTarget.value || undefined })}
          />
        </div>
      </div>

      <div class="mt-3 px-4 lg:hidden">
        <div class="flex items-center gap-2 overflow-x-auto pb-1">
          <Button
            class="min-h-11! shrink-0"
            onClick={() => setFiltersOpen(true)}
            type="button"
            variant="outline"
          >
            Шүүлтүүр{activeFilterCount() > 0 ? ` · ${activeFilterCount()}` : ''}
          </Button>
          <Show when={props.search.status}>
            {status => (
              <Button
                aria-label="Төлөвийн шүүлтүүрийг арилгах"
                class="min-h-11! shrink-0"
                onClick={() => setSearch({ status: undefined })}
                type="button"
                variant="secondary"
              >
                {productStatusLabel(status())} ×
              </Button>
            )}
          </Show>
          <Show when={props.search.inventory !== 'all'}>
            <Button
              aria-label="Үлдэгдлийн шүүлтүүрийг арилгах"
              class="min-h-11! shrink-0"
              onClick={() => setSearch({ inventory: 'all' })}
              type="button"
              variant="secondary"
            >
              {props.search.inventory === 'low' ? 'Цөөн үлдсэн' : 'Дууссан'} ×
            </Button>
          </Show>
        </div>
      </div>

      <div class="mt-3 hidden items-end gap-2 border-y bg-card px-4 py-3 lg:flex">
        {statusFilter('catalog-status-filter')}
        {inventoryFilter('catalog-inventory-filter')}
        <Show when={hasFilters()}>
          <Button onClick={clearFilters} type="button" variant="outline">
            Арилгах
          </Button>
        </Show>
      </div>

      <Sheet.Root open={filtersOpen()} onOpenChange={setFiltersOpen}>
        <SheetContent class="max-h-[85dvh] gap-0 rounded-t-xl p-0" side="bottom">
          <SheetHeader class="border-b px-4 py-4 text-left">
            <SheetTitle>Бараа шүүх</SheetTitle>
            <SheetDescription>Харах барааныхаа төлөв, үлдэгдлийг сонгоно уу.</SheetDescription>
          </SheetHeader>
          <div class="space-y-5 overflow-y-auto px-4 py-5">
            {statusFilter('catalog-status-filter-sheet')}
            {inventoryFilter('catalog-inventory-filter-sheet')}
          </div>
          <div class="flex gap-2 border-t px-4 py-4">
            <Button
              class="min-h-12! flex-1"
              disabled={!hasFilters()}
              onClick={clearFilters}
              type="button"
              variant="outline"
            >
              Шүүлтүүр арилгах
            </Button>
            <Button class="min-h-12! flex-1" onClick={() => setFiltersOpen(false)} type="button">
              Барааг харах
            </Button>
          </div>
        </SheetContent>
      </Sheet.Root>

      <div class="mt-4">
        <Show
          when={!query.isPending}
          fallback={
            <div class="px-4 md:px-0">
              <TableSkeleton
                columns={[
                  { label: 'Бараа' },
                  { label: 'Брэнд / ангилал' },
                  { label: 'Төлөв' },
                  { label: 'Хувилбар' },
                  { label: 'Үлдэгдэл' },
                  { label: 'Үнэ' },
                ]}
                rows={8}
              />
            </div>
          }
        >
          <Show
            when={!query.isError}
            fallback={
              <div class="px-4 md:px-0">
                <RetryState
                  message="Барааны жагсаалтыг ачаалж чадсангүй."
                  onRetry={() => void query.refetch()}
                  pending={query.isFetching}
                />
              </div>
            }
          >
            <Show
              when={!expectedError()}
              fallback={
                <div class="px-4 md:px-0">
                  <InlineAlert title="Барааны жагсаалт нээгдсэнгүй" tone="destructive">
                    {expectedError()?.message ?? 'Хүсэлтийг гүйцэтгэж чадсангүй.'}
                  </InlineAlert>
                </div>
              }
            >
              <Show
                when={(data()?.items.length ?? 0) > 0}
                fallback={
                  <div class="px-4 md:px-0">
                    <Show
                      when={Boolean(props.search.query || hasFilters())}
                      fallback={
                        <div class="border-y py-10 text-center">
                          <h2 class="text-base font-semibold">Одоогоор бараа алга</h2>
                          <p class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                            Анхны бараагаа нэмээд үнэ, үлдэгдлээ тохируулна уу.
                          </p>
                        </div>
                      }
                    >
                      <div class="border-y py-10 text-center">
                        <h2 class="text-base font-semibold">Тохирох бараа олдсонгүй</h2>
                        <p class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                          Хайлт эсвэл шүүлтүүрээ өөрчлөөд дахин оролдоно уу.
                        </p>
                        <Button
                          class="mt-4 min-h-11!"
                          onClick={clearSearchAndFilters}
                          type="button"
                          variant="outline"
                        >
                          Хайлт, шүүлтүүр арилгах
                        </Button>
                      </div>
                    </Show>
                  </div>
                }
              >
                <ul aria-label="Барааны жагсаалт" class="divide-y border-y lg:hidden">
                  <For each={data()!.items}>
                    {product => (
                      <li>
                        <a
                          class="grid min-h-24 grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-muted"
                          href={props.productHref(product.id)}
                        >
                          <Show
                            when={product.primaryImage}
                            fallback={
                              <div aria-hidden="true" class="size-16 rounded-md border bg-muted" />
                            }
                          >
                            {image => (
                              <Image
                                alt=""
                                breakpoints={[64, 128]}
                                class="size-16 rounded-md bg-muted object-cover"
                                height={image().height}
                                layout="fixed"
                                operations={{ quality: 78, format: 'auto', fit: 'cover' }}
                                options={{ domain: new URL(image().url).hostname }}
                                sizes="64px"
                                src={image().url}
                                transformer={cloudflare}
                                unstyled
                                width={image().width}
                              />
                            )}
                          </Show>
                          <div class="min-w-0">
                            <div class="line-clamp-2 text-base leading-5 font-semibold">
                              {product.name}
                            </div>
                            <div class="mt-1 text-sm font-medium tabular-nums">
                              {priceRange(product)}
                            </div>
                            <div class="mt-1 text-sm text-muted-foreground">
                              {productStatusLabel(product.status)}
                            </div>
                          </div>
                          <div class="min-w-16 text-right">
                            <div class="text-xs text-muted-foreground">Үлдэгдэл</div>
                            <div
                              class={`mt-1 text-lg font-semibold tabular-nums ${
                                product.totalStockQuantity === 0
                                  ? 'text-destructive'
                                  : product.totalStockQuantity <= 3
                                    ? 'text-(--admin-warning-foreground)'
                                    : ''
                              }`}
                            >
                              {product.totalStockQuantity}
                            </div>
                            <div class="mt-0.5 text-xs text-muted-foreground">
                              {inventoryLabel(product.totalStockQuantity).split(' · ')[0]}
                            </div>
                          </div>
                        </a>
                      </li>
                    )}
                  </For>
                </ul>

                <div
                  aria-activedescendant={activeTableRowId(
                    'catalog-products',
                    rowIds(),
                    activeRow(),
                  )}
                  aria-label="Барааны хүснэгт. Сумтай товчоор мөр сонгож, Enter товчоор нээнэ."
                  class="hidden rounded-lg border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring/70 lg:block"
                  onKeyDown={onTableKeyDown}
                  role="group"
                  tabIndex={0}
                >
                  <Table aria-label="Барааны хүснэгт">
                    <TableHeader>
                      <For each={table.getHeaderGroups()}>
                        {headerGroup => (
                          <TableRow>
                            <For each={headerGroup.headers}>
                              {header => (
                                <TableHead
                                  class={
                                    header.column.id === 'activeVariantCount' ||
                                    header.column.id === 'totalStockQuantity' ||
                                    header.column.id === 'price'
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
                            id={tableRowId('catalog-products', row.original.id)}
                          >
                            <For each={row.getVisibleCells()}>
                              {cell => (
                                <TableCell
                                  class={
                                    cell.column.id === 'activeVariantCount' ||
                                    cell.column.id === 'totalStockQuantity' ||
                                    cell.column.id === 'price'
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

                <div class="mt-4 flex items-center justify-between gap-3 px-4 text-sm text-muted-foreground md:px-0">
                  <p class="tabular-nums">
                    {data()!.offset + 1}–
                    {Math.min(data()!.offset + data()!.items.length, data()!.total)} /{' '}
                    {data()!.total}
                  </p>
                  <div class="flex gap-2">
                    <Button
                      class="min-h-11! lg:h-8!"
                      disabled={data()!.offset === 0 || query.isFetching}
                      onClick={() =>
                        setSearch({ offset: Math.max(0, data()!.offset - data()!.limit) })
                      }
                      type="button"
                      variant="outline"
                    >
                      Өмнөх
                    </Button>
                    <Button
                      class="min-h-11! lg:h-8!"
                      disabled={
                        data()!.offset + data()!.items.length >= data()!.total || query.isFetching
                      }
                      onClick={() => setSearch({ offset: data()!.offset + data()!.limit })}
                      type="button"
                      variant="outline"
                    >
                      Дараах
                    </Button>
                  </div>
                </div>
              </Show>
            </Show>
          </Show>
        </Show>
      </div>
    </section>
  )
}
