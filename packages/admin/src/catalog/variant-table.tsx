import { AddCircle } from '@solar-icons/solid/Linear'
import type {
  AdminCatalogProductDetail,
  AdminCatalogVariant,
} from '@store-kit/contracts/admin-catalog'
import {
  Button,
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
import { For, Show, createSignal } from 'solid-js'

import { StatusBadge } from '../components/foundation'
import { activeTableRowId, handleTableNavigation, tableRowId } from '../components/table-navigation'
import { formatMnt } from '../format'

const optionsLabel = (variant: AdminCatalogVariant) => {
  const entries = Object.entries(variant.options)
  return entries.length > 0 ? entries.map(([name, value]) => `${name}: ${value}`).join(' · ') : '—'
}

const columnHelper = createColumnHelper<AdminCatalogVariant>()

const variantColumns = (onOpen: (variantId: string) => void) => [
  columnHelper.accessor('name', {
    header: 'Хувилбар',
    cell: info => (
      <button
        class="text-left font-medium underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onOpen(info.row.original.id)}
        type="button"
      >
        {info.getValue()}
      </button>
    ),
  }),
  columnHelper.accessor('sku', {
    header: 'SKU',
    cell: info => <code class="text-xs whitespace-nowrap">{info.getValue()}</code>,
  }),
  columnHelper.display({
    id: 'options',
    header: 'Сонголт',
    cell: info => (
      <span class="text-xs text-muted-foreground">{optionsLabel(info.row.original)}</span>
    ),
  }),
  columnHelper.accessor('priceMnt', {
    header: 'Үнэ',
    cell: info => <span class="whitespace-nowrap tabular-nums">{formatMnt(info.getValue())}</span>,
  }),
  columnHelper.accessor('stockQuantity', {
    header: 'Үлдэгдэл',
    cell: info => (
      <span class={info.getValue() === 0 ? 'text-destructive tabular-nums' : 'tabular-nums'}>
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('active', {
    header: 'Төлөв',
    cell: info => <StatusBadge>{info.getValue() ? 'Идэвхтэй' : 'Идэвхгүй'}</StatusBadge>,
  }),
  columnHelper.accessor('sortOrder', {
    header: 'Дараалал',
    cell: info => <span class="tabular-nums">{info.getValue()}</span>,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: info => (
      <Button onClick={() => onOpen(info.row.original.id)} size="sm" type="button" variant="ghost">
        Нээх
      </Button>
    ),
  }),
]

type VariantTableProps = {
  product: AdminCatalogProductDetail
  onOpen: (variantId: string) => void
}

export function VariantTable(props: VariantTableProps) {
  const [activeRow, setActiveRow] = createSignal<number>()
  const table = createSolidTable({
    get data() {
      return props.product.variants
    },
    columns: variantColumns(props.onOpen),
    getCoreRowModel: getCoreRowModel(),
  })
  const rowIds = () => table.getRowModel().rows.map(row => row.original.id)
  const onTableKeyDown = (
    event: KeyboardEvent & { currentTarget: HTMLDivElement; target: Element },
  ) => handleTableNavigation(event, rowIds(), activeRow(), setActiveRow, props.onOpen)

  return (
    <section aria-labelledby="variants-title" class="pt-6">
      <div class="flex items-end justify-between gap-3 border-b pb-3">
        <div>
          <h2 class="text-base font-semibold" id="variants-title">
            Хувилбарууд
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Үнэ, үлдэгдэл, сонголт болон борлуулах төлөв.
          </p>
        </div>
        <Button
          class="min-h-11! shrink-0 md:h-8!"
          onClick={() => props.onOpen('new')}
          type="button"
        >
          <AddCircle aria-hidden="true" />
          Хувилбар нэмэх
        </Button>
      </div>

      <ul aria-label="Барааны хувилбарууд" class="divide-y border-y md:hidden">
        <For each={props.product.variants}>
          {variant => (
            <li>
              <button
                class="grid min-h-20 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-muted"
                onClick={() => props.onOpen(variant.id)}
                type="button"
              >
                <div class="min-w-0">
                  <div class="line-clamp-2 text-base font-semibold">{variant.name}</div>
                  <div class="mt-1 truncate font-mono text-sm text-muted-foreground">
                    {variant.sku}
                  </div>
                  <Show when={Object.keys(variant.options).length > 0}>
                    <div class="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {optionsLabel(variant)}
                    </div>
                  </Show>
                </div>
                <div class="text-right">
                  <div class="text-base font-semibold tabular-nums">
                    {formatMnt(variant.priceMnt)}
                  </div>
                  <div
                    class={`mt-1 text-sm tabular-nums ${variant.stockQuantity === 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    Үлдэгдэл {variant.stockQuantity}
                  </div>
                  <div class="mt-1 text-xs text-muted-foreground">
                    {variant.active ? 'Идэвхтэй' : 'Идэвхгүй'}
                  </div>
                </div>
              </button>
            </li>
          )}
        </For>
      </ul>

      <div
        aria-activedescendant={activeTableRowId('product-variants', rowIds(), activeRow())}
        aria-label="Барааны хувилбарын хүснэгт. Сумтай товчоор мөр сонгож, Enter товчоор нээнэ."
        class="mt-3 hidden rounded-lg border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring/70 md:block"
        onKeyDown={onTableKeyDown}
        role="group"
        tabIndex={0}
      >
        <Table aria-label="Барааны хувилбарууд">
          <TableHeader>
            <For each={table.getHeaderGroups()}>
              {headerGroup => (
                <TableRow>
                  <For each={headerGroup.headers}>
                    {header => (
                      <TableHead
                        class={
                          ['priceMnt', 'stockQuantity', 'sortOrder'].includes(header.column.id)
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
                  id={tableRowId('product-variants', row.original.id)}
                >
                  <For each={row.getVisibleCells()}>
                    {cell => (
                      <TableCell
                        class={
                          ['priceMnt', 'stockQuantity', 'sortOrder'].includes(cell.column.id)
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
    </section>
  )
}
