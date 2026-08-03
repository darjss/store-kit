import type { AdminCatalogProductListItem } from '@store-kit/contracts/admin-catalog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@store-kit/ui'
import { Link, useNavigate } from '@tanstack/solid-router'
import {
  createColumnHelper,
  createSolidTable,
  flexRender,
  getCoreRowModel,
} from '@tanstack/solid-table'
import { Image } from '@unpic/solid/base'
import { For, Show, createSignal } from 'solid-js'
import { generate as cloudflare } from 'unpic/providers/cloudflare'

import { StatusBadge } from '../components/foundation'
import { activeTableRowId, handleTableNavigation, tableRowId } from '../components/table-navigation'
import { formatMnt } from '../format'

const priceRange = (product: AdminCatalogProductListItem) => {
  if (product.minimumPriceMnt === null || product.maximumPriceMnt === null)
    return 'Идэвхтэй үнэ байхгүй'
  if (product.minimumPriceMnt === product.maximumPriceMnt) return formatMnt(product.minimumPriceMnt)
  return `${formatMnt(product.minimumPriceMnt)} – ${formatMnt(product.maximumPriceMnt)}`
}

const statusLabel = (status: AdminCatalogProductListItem['status']) => {
  if (status === 'active') return 'Идэвхтэй'
  if (status === 'archived') return 'Архивласан'
  return 'Ноорог'
}

function InventoryBadge(props: { quantity: number }) {
  if (props.quantity === 0) return <StatusBadge tone="destructive">Дууссан</StatusBadge>
  if (props.quantity <= 3) return <StatusBadge tone="warning">Цөөн · {props.quantity}</StatusBadge>
  return <StatusBadge>Бэлэн · {props.quantity}</StatusBadge>
}

const columnHelper = createColumnHelper<AdminCatalogProductListItem>()
const productColumns = [
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
        <Link
          class="min-w-0 font-medium whitespace-normal text-primary underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          params={{ productId: info.row.original.id }}
          to="/catalog/$productId"
        >
          {info.getValue()}
        </Link>
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
    cell: info => <StatusBadge>{statusLabel(info.getValue())}</StatusBadge>,
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

export function CatalogTable(props: { products: AdminCatalogProductListItem[] }) {
  const navigate = useNavigate()
  const [activeRow, setActiveRow] = createSignal<number>()
  const table = createSolidTable({
    get data() {
      return props.products
    },
    columns: productColumns,
    getCoreRowModel: getCoreRowModel(),
  })
  const rowIds = () => table.getRowModel().rows.map(row => row.original.id)

  return (
    <div
      aria-activedescendant={activeTableRowId('catalog-products', rowIds(), activeRow())}
      aria-label="Барааны хүснэгт. Сумтай товчоор мөр сонгож, Enter товчоор нээнэ."
      class="hidden rounded-lg border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring/70 lg:block"
      onKeyDown={event =>
        handleTableNavigation(event, rowIds(), activeRow(), setActiveRow, productId => {
          void navigate({ to: '/catalog/$productId', params: { productId } })
        })
      }
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
                        ['activeVariantCount', 'totalStockQuantity', 'price'].includes(
                          header.column.id,
                        )
                          ? 'text-right'
                          : undefined
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
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
                        ['activeVariantCount', 'totalStockQuantity', 'price'].includes(
                          cell.column.id,
                        )
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
  )
}
