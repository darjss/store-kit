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
  AdminEmptyState,
  InlineAlert,
  PageHeader,
  RetryState,
  StatusBadge,
  TableSkeleton,
} from '../components/foundation'
import { activeTableRowId, handleTableNavigation, tableRowId } from '../components/table-navigation'
import { useQueryResult } from '../query-options/result'
import type { CatalogRequests } from './query-options'
import { catalogQuery } from './query-options'

const mnt = new Intl.NumberFormat('mn-MN', {
  style: 'currency',
  currency: 'MNT',
  maximumFractionDigits: 0,
})

const priceRange = (product: AdminCatalogProductListItem) => {
  if (product.minimumPriceMnt === null || product.maximumPriceMnt === null) return 'No active price'
  if (product.minimumPriceMnt === product.maximumPriceMnt)
    return mnt.format(product.minimumPriceMnt)
  return `${mnt.format(product.minimumPriceMnt)} – ${mnt.format(product.maximumPriceMnt)}`
}

const titleCase = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`

const updatedTime = new Intl.DateTimeFormat('mn-MN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function InventoryBadge(props: { quantity: number }) {
  if (props.quantity === 0) return <StatusBadge tone="destructive">Out of stock</StatusBadge>
  if (props.quantity <= 3) return <StatusBadge tone="warning">Low · {props.quantity}</StatusBadge>
  return <StatusBadge>Available · {props.quantity}</StatusBadge>
}

const columnHelper = createColumnHelper<AdminCatalogProductListItem>()

const productColumnLabel: Record<string, string> = {
  status: 'Status',
  activeVariantCount: 'Variants',
  totalStockQuantity: 'Inventory',
  price: 'Active price',
  featured: 'Featured',
  updatedAt: 'Updated',
}

const mobileCellClass = (columnId: string) =>
  columnId === 'name' || columnId === 'classification'
    ? 'max-md:col-span-2 max-md:block max-md:px-3 max-md:py-2'
    : `${columnId === 'totalStockQuantity' || columnId === 'price' ? 'max-md:col-span-2' : ''} max-md:flex max-md:min-h-9 max-md:items-center max-md:justify-between max-md:gap-3 max-md:px-3 max-md:py-2`

const productColumns = (productHref: (productId: string) => string) => [
  columnHelper.accessor('name', {
    header: 'Product',
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
        <div class="min-w-0">
          <a
            class="font-medium whitespace-normal text-primary underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href={productHref(info.row.original.id)}
          >
            {info.getValue()}
          </a>
          <div class="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            /{info.row.original.slug}
          </div>
        </div>
      </div>
    ),
  }),
  columnHelper.display({
    id: 'classification',
    header: 'Brand / category',
    cell: info => (
      <div class="min-w-36 text-sm">
        <div>{info.row.original.brandName ?? 'No brand'}</div>
        <div class="text-xs text-muted-foreground">
          {info.row.original.categoryName ?? 'No category'}
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: info => <StatusBadge>{titleCase(info.getValue())}</StatusBadge>,
  }),
  columnHelper.accessor('activeVariantCount', {
    header: 'Variants',
    cell: info => <span class="tabular-nums">{info.getValue()}</span>,
  }),
  columnHelper.accessor('totalStockQuantity', {
    header: 'Inventory',
    cell: info => <InventoryBadge quantity={info.getValue()} />,
  }),
  columnHelper.display({
    id: 'price',
    header: 'Active price',
    cell: info => (
      <span class="whitespace-nowrap tabular-nums">{priceRange(info.row.original)}</span>
    ),
  }),
  columnHelper.accessor('featured', {
    header: 'Featured',
    cell: info => <span class="text-sm">{info.getValue() ? 'Yes' : '—'}</span>,
  }),
  columnHelper.accessor('updatedAt', {
    header: 'Updated',
    cell: info => (
      <time
        class="text-xs whitespace-nowrap text-muted-foreground tabular-nums"
        datetime={new Date(info.getValue()).toISOString()}
      >
        {updatedTime.format(info.getValue())}
      </time>
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
  const [activeRow, setActiveRow] = createSignal(0)
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
    props.onSearchChange({ inventory: 'all', limit: props.search.limit, offset: 0 })
  const rowIds = () => table.getRowModel().rows.map(row => row.original.id)
  const onTableKeyDown = (
    event: KeyboardEvent & { currentTarget: HTMLDivElement; target: Element },
  ) =>
    handleTableNavigation(event, rowIds(), activeRow(), setActiveRow, productId =>
      window.location.assign(props.productHref(productId)),
    )

  return (
    <section class="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-7">
      <PageHeader
        actions={
          <Button onClick={() => props.onNewProduct()} type="button">
            <AddCircle aria-hidden="true" />
            New product
          </Button>
        }
        description="Review product visibility, commercial details, and current inventory."
        title="Catalog"
        titleId="catalog-title"
      />

      <div class="mt-4 flex flex-col gap-2 border-y bg-card px-3 py-3 sm:px-4 lg:flex-row lg:items-end">
        <label class="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium" for="catalog-search">
          Search catalog
          <div class="relative">
            <span
              aria-hidden="true"
              class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            >
              <Magnifer size={16} />
            </span>
            <Input
              class="pl-9!"
              data-admin-list-search
              id="catalog-search"
              placeholder="Product, slug, brand, or SKU"
              type="search"
              value={props.search.query ?? ''}
              onInput={event => setSearch({ query: event.currentTarget.value || undefined })}
            />
          </div>
        </label>
        <label class="flex flex-col gap-1 text-xs font-medium" for="catalog-status-filter">
          Status
          <NativeSelect
            class="w-full lg:w-40"
            id="catalog-status-filter"
            value={props.search.status ?? 'all'}
            onChange={event => {
              const value = event.currentTarget.value
              setSearch({
                status:
                  value === 'draft' || value === 'active' || value === 'archived'
                    ? value
                    : undefined,
              })
            }}
          >
            <NativeSelectOption value="all">All statuses</NativeSelectOption>
            <NativeSelectOption value="draft">Draft</NativeSelectOption>
            <NativeSelectOption value="active">Active</NativeSelectOption>
            <NativeSelectOption value="archived">Archived</NativeSelectOption>
          </NativeSelect>
        </label>
        <label class="flex flex-col gap-1 text-xs font-medium" for="catalog-inventory-filter">
          Inventory
          <NativeSelect
            class="w-full lg:w-40"
            id="catalog-inventory-filter"
            value={props.search.inventory}
            onChange={event => {
              const value = event.currentTarget.value
              setSearch({ inventory: value === 'low' || value === 'out' ? value : 'all' })
            }}
          >
            <NativeSelectOption value="all">All inventory</NativeSelectOption>
            <NativeSelectOption value="low">Low stock</NativeSelectOption>
            <NativeSelectOption value="out">Out of stock</NativeSelectOption>
          </NativeSelect>
        </label>
        <Button onClick={clearFilters} type="button" variant="outline">
          Clear filters
        </Button>
      </div>

      <div class="mt-4">
        <Show
          when={!query.isPending}
          fallback={
            <TableSkeleton
              columns={[
                { label: 'Product' },
                { label: 'Brand / category' },
                { label: 'Status' },
                { label: 'Variants' },
                { label: 'Inventory' },
                { label: 'Active price' },
                { label: 'Featured' },
                { label: 'Updated' },
              ]}
              rows={8}
            />
          }
        >
          <Show
            when={!query.isError}
            fallback={
              <RetryState
                message="The catalog could not be loaded."
                onRetry={() => void query.refetch()}
                pending={query.isFetching}
              />
            }
          >
            <Show
              when={!expectedError()}
              fallback={
                <InlineAlert title="Could not load catalog" tone="destructive">
                  {expectedError()?.message ?? 'The catalog request failed.'}
                </InlineAlert>
              }
            >
              <Show
                when={(data()?.items.length ?? 0) > 0}
                fallback={
                  <Show
                    when={Boolean(
                      props.search.query || props.search.status || props.search.inventory !== 'all',
                    )}
                    fallback={
                      <AdminEmptyState
                        action={
                          <Button onClick={() => props.onNewProduct()} type="button">
                            <AddCircle aria-hidden="true" />
                            New product
                          </Button>
                        }
                        description="Create the first product with its required initial variant."
                        title="No products yet"
                      />
                    }
                  >
                    <AdminEmptyState
                      action={
                        <Button onClick={clearFilters} type="button" variant="outline">
                          Clear filters
                        </Button>
                      }
                      description="No products match the current search and filters."
                      title="No catalog results"
                    />
                  </Show>
                }
              >
                <div
                  aria-activedescendant={activeTableRowId(
                    'catalog-products',
                    rowIds(),
                    activeRow(),
                  )}
                  aria-label="Catalog products. Use Up and Down arrow keys to select a row and Enter to open it."
                  class="rounded-lg border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                  onKeyDown={onTableKeyDown}
                  role="group"
                  tabIndex={0}
                >
                  <Table aria-label="Catalog products" class="max-md:block">
                    <TableHeader class="max-md:hidden">
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
                    <TableBody class="max-md:block">
                      <For each={table.getRowModel().rows}>
                        {(row, index) => (
                          <TableRow
                            aria-selected={activeRow() === index()}
                            class="max-md:grid max-md:grid-cols-2 max-md:py-1"
                            data-state={activeRow() === index() ? 'selected' : undefined}
                            id={tableRowId('catalog-products', row.original.id)}
                            onMouseEnter={() => setActiveRow(index())}
                          >
                            <For each={row.getVisibleCells()}>
                              {cell => (
                                <TableCell
                                  class={`${mobileCellClass(cell.column.id)} ${
                                    cell.column.id === 'activeVariantCount' ||
                                    cell.column.id === 'totalStockQuantity' ||
                                    cell.column.id === 'price'
                                      ? 'md:text-right'
                                      : ''
                                  }`}
                                >
                                  <Show when={productColumnLabel[cell.column.id]}>
                                    {label => (
                                      <span class="text-xs text-muted-foreground md:hidden">
                                        {label()}
                                      </span>
                                    )}
                                  </Show>
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
                <div class="mt-3 flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    Showing {data()!.offset + 1}–
                    {Math.min(data()!.offset + data()!.items.length, data()!.total)} of{' '}
                    {data()!.total}
                  </p>
                  <div class="flex gap-2">
                    <Button
                      disabled={data()!.offset === 0 || query.isFetching}
                      onClick={() =>
                        setSearch({ offset: Math.max(0, data()!.offset - data()!.limit) })
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Previous
                    </Button>
                    <Button
                      disabled={
                        data()!.offset + data()!.items.length >= data()!.total || query.isFetching
                      }
                      onClick={() => setSearch({ offset: data()!.offset + data()!.limit })}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Next
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
