import { ArrowLeft } from '@solar-icons/solid/Linear'
import type {
  AdminCatalogError,
  AdminCatalogProductDetail,
  AdminCatalogVariant,
  AdminProductUpdate,
  AdminStockUpdate,
  AdminVariantUpdate,
} from '@store-kit/contracts/admin-catalog'
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
import {
  createColumnHelper,
  createSolidTable,
  flexRender,
  getCoreRowModel,
} from '@tanstack/solid-table'
import type { Result } from 'better-result'
import { For, Show } from 'solid-js'
import { toast } from 'solid-sonner'

import {
  AdminEmptyState,
  InlineAlert,
  PageHeader,
  RetryState,
  StatusBadge,
  TableSkeleton,
} from '../components/foundation'
import { useQueryResult } from '../query-options/result'
import { ProductVisibilityForm, VariantEditor } from './forms'
import type { CatalogRequests } from './query-options'
import { catalogKeys, catalogMutation, catalogQuery } from './query-options'

const columnHelper = createColumnHelper<AdminCatalogVariant>()

const optionsLabel = (variant: AdminCatalogVariant) => {
  const entries = Object.entries(variant.options)
  return entries.length > 0 ? entries.map(([name, value]) => `${name}: ${value}`).join(' · ') : '—'
}

type CatalogSaveResult = Result<AdminCatalogProductDetail, AdminCatalogError>

type VariantColumnsOptions = {
  saveCommercial: (variantId: string, input: AdminVariantUpdate) => Promise<CatalogSaveResult>
  saveStock: (variantId: string, input: AdminStockUpdate) => Promise<CatalogSaveResult>
  reload: () => void
}

const variantColumns = (options: VariantColumnsOptions) => [
  columnHelper.accessor('name', {
    header: 'Variant',
    cell: info => (
      <div class="min-w-32">
        <div class="font-medium">{info.getValue()}</div>
        <div class="mt-0.5 text-xs text-muted-foreground">
          {info.row.original.active ? 'Active' : 'Inactive'}
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('sku', {
    header: 'SKU',
    cell: info => <code class="text-xs whitespace-nowrap">{info.getValue()}</code>,
  }),
  columnHelper.display({
    id: 'options',
    header: 'Options',
    cell: info => (
      <span class="block min-w-32 text-sm text-muted-foreground">
        {optionsLabel(info.row.original)}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'editor',
    header: 'Commercial details and inventory',
    cell: info => (
      <VariantEditor
        variant={info.row.original}
        onReload={() => options.reload()}
        onSaveCommercial={input => options.saveCommercial(info.row.original.id, input)}
        onSaveStock={input => options.saveStock(info.row.original.id, input)}
      />
    ),
  }),
]

type CatalogDetailPageProps = {
  productId: string
  requests: CatalogRequests
  onBack: () => void
}

export function CatalogDetailPage(props: CatalogDetailPageProps) {
  const queryClient = useQueryClient()
  const query = useQueryResult(() => catalogQuery.detail(props.requests, props.productId))
  const updateProduct = useMutation(() => catalogMutation.updateProduct(props.requests))
  const updateVariant = useMutation(() => catalogMutation.updateVariant(props.requests))
  const updateStock = useMutation(() => catalogMutation.updateStock(props.requests))
  const data = () => query.data?.match({ ok: value => value, err: () => undefined })
  const expectedError = () =>
    query.data?.match<AdminCatalogError | undefined>({ ok: () => undefined, err: error => error })

  const finishSave = async (message: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: catalogKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: catalogKeys.detail(props.productId) }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
    ])
    toast.success(message)
  }

  const saveProduct = async (input: AdminProductUpdate) => {
    const result = await updateProduct.mutateAsync({ productId: props.productId, input })
    if (result.isOk()) await finishSave('Product settings saved.')
    return result
  }

  const saveCommercial = async (variantId: string, input: AdminVariantUpdate) => {
    const result = await updateVariant.mutateAsync({ productId: props.productId, variantId, input })
    if (result.isOk()) await finishSave('Variant details saved.')
    return result
  }

  const saveStock = async (variantId: string, input: AdminStockUpdate) => {
    const result = await updateStock.mutateAsync({ productId: props.productId, variantId, input })
    if (result.isOk()) await finishSave('Stock quantity saved.')
    return result
  }

  return (
    <section class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div class="mb-4">
        <Button onClick={() => props.onBack()} size="sm" type="button" variant="ghost">
          <ArrowLeft aria-hidden="true" />
          Back to catalog
        </Button>
      </div>

      <Show
        when={!query.isPending}
        fallback={
          <div aria-busy="true" role="status">
            <span class="sr-only">Loading product details…</span>
            <Skeleton class="h-8 w-64" />
            <Skeleton class="mt-2 h-4 w-80 max-w-full" />
            <div class="mt-6 rounded-lg border p-4">
              <Skeleton class="h-6 w-32" />
              <div class="mt-4 flex flex-wrap gap-3">
                <Skeleton class="h-9 w-48" />
                <Skeleton class="h-9 w-52" />
                <Skeleton class="h-9 w-32" />
              </div>
            </div>
            <div class="mt-6">
              <TableSkeleton
                columns={[
                  { label: 'Variant' },
                  { label: 'SKU' },
                  { label: 'Options' },
                  { label: 'Commercial details and inventory' },
                ]}
                rows={4}
              />
            </div>
          </div>
        }
      >
        <Show
          when={!query.isError}
          fallback={
            <RetryState
              message="The product details could not be loaded."
              onRetry={() => void query.refetch()}
              pending={query.isFetching}
            />
          }
        >
          <Show
            when={!expectedError()}
            fallback={
              <Show
                when={expectedError()?._tag !== 'AdminCatalogProductNotFound'}
                fallback={
                  <AdminEmptyState
                    action={
                      <Button onClick={() => props.onBack()} type="button" variant="outline">
                        Back to catalog
                      </Button>
                    }
                    description="This product may have been removed since the catalog was loaded."
                    title="Product not found"
                  />
                }
              >
                <InlineAlert title="Could not load product" tone="destructive">
                  {expectedError()?.message ?? 'The catalog request failed.'}
                </InlineAlert>
              </Show>
            }
          >
            <Show when={data()} keyed>
              {product => (
                <CatalogDetailContent
                  product={product}
                  onReload={() => void query.refetch()}
                  onSaveCommercial={saveCommercial}
                  onSaveProduct={saveProduct}
                  onSaveStock={saveStock}
                />
              )}
            </Show>
          </Show>
        </Show>
      </Show>
    </section>
  )
}

type CatalogDetailContentProps = {
  product: AdminCatalogProductDetail
  onSaveProduct: (input: AdminProductUpdate) => Promise<CatalogSaveResult>
  onSaveCommercial: (variantId: string, input: AdminVariantUpdate) => Promise<CatalogSaveResult>
  onSaveStock: (variantId: string, input: AdminStockUpdate) => Promise<CatalogSaveResult>
  onReload: () => void
}

function CatalogDetailContent(props: CatalogDetailContentProps) {
  const table = createSolidTable({
    get data() {
      return props.product.variants
    },
    columns: variantColumns({
      saveCommercial: props.onSaveCommercial,
      saveStock: props.onSaveStock,
      reload: props.onReload,
    }),
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <>
      <PageHeader
        actions={<StatusBadge>{props.product.status}</StatusBadge>}
        description={[props.product.brandName, props.product.categoryName, `/${props.product.slug}`]
          .filter(Boolean)
          .join(' · ')}
        title={props.product.name}
        titleId="catalog-product-title"
      />

      <div class="mt-6">
        <ProductVisibilityForm
          product={props.product}
          onReload={() => props.onReload()}
          onSave={props.onSaveProduct}
        />
      </div>

      <div class="mt-7 flex items-end justify-between gap-4 border-b pb-3">
        <div>
          <h2 class="text-lg leading-6 font-semibold">Variants</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Stock is saved separately to protect current inventory versions.
          </p>
        </div>
        <span class="text-sm text-muted-foreground">
          {props.product.variants.length}{' '}
          {props.product.variants.length === 1 ? 'variant' : 'variants'}
        </span>
      </div>

      <div class="mt-4">
        <Show
          when={props.product.variants.length > 0}
          fallback={
            <AdminEmptyState
              description="This product has no variants to manage."
              title="No product variants"
            />
          }
        >
          <div class="rounded-lg border">
            <Table aria-label="Product variants">
              <TableHeader>
                <For each={table.getHeaderGroups()}>
                  {headerGroup => (
                    <TableRow>
                      <For each={headerGroup.headers}>
                        {header => (
                          <TableHead>
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
                  {row => (
                    <TableRow class="align-top">
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
        </Show>
      </div>
    </>
  )
}
