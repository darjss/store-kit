import { AddCircle, Archive, ArrowLeft, Restart, TrashBinTrash } from '@solar-icons/solid/Linear'
import type {
  AdminCatalogError,
  AdminCatalogProductDetail,
  AdminCatalogSelectors,
  AdminCatalogVariant,
  AdminExpectedProductVersion,
  MediaCleanup,
} from '@store-kit/contracts/admin-catalog'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Skeleton,
  Spinner,
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
import { Result } from 'better-result'
import { match } from 'dismatch'
import { For, Show, createSignal } from 'solid-js'
import type { JSX } from 'solid-js'
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
import { CatalogFailure, ProductEditor, transportMessage } from './forms'
import { ProductGallery } from './gallery'
import type { CatalogRequests } from './query-options'
import { catalogKeys, catalogMutation, catalogQuery } from './query-options'
import { VariantInspector } from './variant-sheet'

const mnt = new Intl.NumberFormat('mn-MN', {
  style: 'currency',
  currency: 'MNT',
  maximumFractionDigits: 0,
})

const dateTime = new Intl.DateTimeFormat('mn-MN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const optionsLabel = (variant: AdminCatalogVariant) => {
  const entries = Object.entries(variant.options)
  return entries.length > 0 ? entries.map(([name, value]) => `${name}: ${value}`).join(' · ') : '—'
}

type TaggedStatus<Status extends string> = Status extends string ? { status: Status } : never
const taggedStatus = <Status extends string>(status: Status) => ({ status }) as TaggedStatus<Status>

const productStatusLabel = (status: AdminCatalogProductDetail['status']) =>
  match(
    taggedStatus(status),
    'status',
  )<string>({
    draft: () => 'Draft',
    active: () => 'Active',
    archived: () => 'Archived',
  })

const columnHelper = createColumnHelper<AdminCatalogVariant>()

const variantColumns = (onOpen: (variantId: string) => void) => [
  columnHelper.accessor('name', {
    header: 'Variant',
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
    header: 'Options',
    cell: info => (
      <span class="text-xs text-muted-foreground">{optionsLabel(info.row.original)}</span>
    ),
  }),
  columnHelper.accessor('priceMnt', {
    header: 'Price',
    cell: info => <span class="whitespace-nowrap tabular-nums">{mnt.format(info.getValue())}</span>,
  }),
  columnHelper.accessor('stockQuantity', {
    header: 'Stock',
    cell: info => (
      <span class={info.getValue() === 0 ? 'text-destructive tabular-nums' : 'tabular-nums'}>
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('active', {
    header: 'State',
    cell: info => <StatusBadge>{info.getValue() ? 'Active' : 'Inactive'}</StatusBadge>,
  }),
  columnHelper.accessor('sortOrder', {
    header: 'Order',
    cell: info => <span class="tabular-nums">{info.getValue()}</span>,
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: info => (
      <Button onClick={() => onOpen(info.row.original.id)} size="sm" type="button" variant="ghost">
        Inspect
      </Button>
    ),
  }),
]

type CatalogDetailPageProps = {
  productId: string
  requests: CatalogRequests
  variantSelection: string | undefined
  onBack: () => void
  onVariantSelectionChange: (selection: string | undefined) => void
}

export function CatalogDetailPage(props: CatalogDetailPageProps) {
  const queryClient = useQueryClient()
  const query = useQueryResult(() => catalogQuery.detail(props.requests, props.productId))
  const selectorsQuery = useQueryResult(() => catalogQuery.selectors(props.requests))
  const [deletedCleanup, setDeletedCleanup] = createSignal<MediaCleanup>()
  const [mediaWarning, setMediaWarning] = createSignal<string>()
  const data = () => query.data?.match({ ok: value => value, err: () => undefined })
  const selectors = () => selectorsQuery.data?.match({ ok: value => value, err: () => undefined })
  const expectedError = () =>
    query.data?.match<AdminCatalogError | undefined>({ ok: () => undefined, err: error => error })
  const selectorError = () =>
    selectorsQuery.data?.match<AdminCatalogError | undefined>({
      ok: () => undefined,
      err: error => error,
    })

  const installProduct = (product: AdminCatalogProductDetail) => {
    queryClient.setQueryData(catalogKeys.detail(product.id), Result.ok(product))
  }

  const reload = async () => {
    const result = await query.refetch()
    return result.data?.match({ ok: value => value, err: () => undefined })
  }

  const retry = () => {
    void Promise.all([query.refetch(), selectorsQuery.refetch()])
  }

  return (
    <section class="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-7">
      <div class="mb-3">
        <Button onClick={() => props.onBack()} size="sm" type="button" variant="ghost">
          <ArrowLeft aria-hidden="true" />
          Back to catalog
        </Button>
      </div>

      <Show
        when={!deletedCleanup()}
        fallback={
          <DeletedProductState
            cleanup={deletedCleanup()!}
            onBack={() => props.onBack()}
            productId={props.productId}
          />
        }
      >
        <Show
          when={!query.isPending && !selectorsQuery.isPending}
          fallback={<ProductDetailSkeleton />}
        >
          <Show
            when={!query.isError && !selectorsQuery.isError}
            fallback={
              <RetryState
                message="The product editor could not be loaded."
                onRetry={retry}
                pending={query.isFetching || selectorsQuery.isFetching}
              />
            }
          >
            <Show
              when={!expectedError() && !selectorError()}
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
                  <InlineAlert title="Could not load product editor" tone="destructive">
                    {expectedError()?.message ??
                      selectorError()?.message ??
                      'The catalog request failed.'}
                  </InlineAlert>
                </Show>
              }
            >
              <Show when={data()}>
                {product => (
                  <Show when={selectors()}>
                    {catalogSelectors => (
                      <CatalogDetailContent
                        mediaWarning={mediaWarning()}
                        product={product()}
                        requests={props.requests}
                        selectors={catalogSelectors()}
                        variantSelection={props.variantSelection}
                        onCleanupWarning={message => setMediaWarning(message)}
                        onDeleted={cleanup => setDeletedCleanup(cleanup)}
                        onProduct={installProduct}
                        onReload={reload}
                        onVariantSelectionChange={props.onVariantSelectionChange}
                      />
                    )}
                  </Show>
                )}
              </Show>
            </Show>
          </Show>
        </Show>
      </Show>
    </section>
  )
}

function ProductDetailSkeleton() {
  return (
    <div aria-busy="true" role="status">
      <span class="sr-only">Loading product editor…</span>
      <Skeleton class="h-7 w-64" />
      <Skeleton class="mt-2 h-4 w-80 max-w-full" />
      <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div class="space-y-5">
          <Skeleton class="h-52 w-full" />
          <Skeleton class="h-56 w-full" />
          <TableSkeleton
            columns={[
              { label: 'Variant' },
              { label: 'SKU' },
              { label: 'Options' },
              { label: 'Price' },
              { label: 'Stock' },
            ]}
            rows={4}
          />
        </div>
        <Skeleton class="h-80 w-full" />
      </div>
    </div>
  )
}

type CatalogDetailContentProps = {
  product: AdminCatalogProductDetail
  selectors: AdminCatalogSelectors
  requests: CatalogRequests
  mediaWarning: string | undefined
  variantSelection: string | undefined
  onCleanupWarning: (message: string) => void
  onProduct: (product: AdminCatalogProductDetail) => void
  onReload: () => Promise<AdminCatalogProductDetail | undefined>
  onDeleted: (cleanup: MediaCleanup) => void
  onVariantSelectionChange: (selection: string | undefined) => void
}

function CatalogDetailContent(props: CatalogDetailContentProps) {
  const queryClient = useQueryClient()
  const updateProduct = useMutation(() => catalogMutation.updateProduct(props.requests))
  const [galleryDirty, setGalleryDirty] = createSignal(false)

  return (
    <>
      <PageHeader
        actions={<StatusBadge>{productStatusLabel(props.product.status)}</StatusBadge>}
        description={[props.product.brandName, props.product.categoryName, `/${props.product.slug}`]
          .filter(Boolean)
          .join(' · ')}
        title={props.product.name}
        titleId="catalog-product-title"
      />

      <Show when={props.mediaWarning}>
        {message => (
          <div class="mt-4">
            <InlineAlert title="Media cleanup warning" tone="warning">
              {message()}
            </InlineAlert>
          </div>
        )}
      </Show>

      <div class="mt-5">
        <Show
          when={props.product.status !== 'archived'}
          fallback={
            <ArchivedProduct
              product={props.product}
              requests={props.requests}
              onDeleted={props.onDeleted}
              onProduct={props.onProduct}
              onReload={props.onReload}
            />
          }
        >
          <ProductEditor
            lifecycleBlocked={galleryDirty()}
            mainAfter={
              <>
                <ProductGallery
                  product={props.product}
                  requests={props.requests}
                  onCleanupWarning={props.onCleanupWarning}
                  onDirtyChange={setGalleryDirty}
                  onProduct={props.onProduct}
                  onReload={props.onReload}
                />
                <VariantTable product={props.product} onOpen={props.onVariantSelectionChange} />
              </>
            }
            product={props.product}
            railAfter={dirty => (
              <LifecycleActions
                disabled={dirty}
                product={props.product}
                requests={props.requests}
                onDeleted={props.onDeleted}
                onProduct={props.onProduct}
                onReload={props.onReload}
              />
            )}
            selectors={props.selectors}
            onProduct={props.onProduct}
            onReload={props.onReload}
            onSave={async input => {
              const result = await updateProduct.mutateAsync({ productId: props.product.id, input })
              if (result.isOk()) {
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: catalogKeys.lists() }),
                  queryClient.invalidateQueries({ queryKey: catalogKeys.publicProducts }),
                  queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
                ])
                toast.success('Product saved.')
              }
              return result
            }}
          />
          <VariantInspector
            product={props.product}
            requests={props.requests}
            selection={props.variantSelection}
            onClose={() => props.onVariantSelectionChange(undefined)}
            onProduct={props.onProduct}
            onReload={props.onReload}
          />
        </Show>
      </div>
    </>
  )
}

type VariantTableProps = {
  product: AdminCatalogProductDetail
  onOpen: (variantId: string) => void
}

function VariantTable(props: VariantTableProps) {
  const [activeRow, setActiveRow] = createSignal(0)
  const table = createSolidTable({
    get data() {
      return props.product.variants
    },
    columns: variantColumns(props.onOpen),
    getCoreRowModel: getCoreRowModel(),
  })
  const onTableKeyDown: JSX.EventHandlerUnion<HTMLDivElement, KeyboardEvent> = event => {
    if (event.target !== event.currentTarget) return
    const rows = table.getRowModel().rows
    if (rows.length === 0) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveRow(current =>
        Math.min(rows.length - 1, Math.max(0, current + (event.key === 'ArrowDown' ? 1 : -1))),
      )
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const row = rows[Math.min(activeRow(), rows.length - 1)]
      if (row) props.onOpen(row.original.id)
    }
  }

  return (
    <section aria-labelledby="variants-title" class="pt-6">
      <div class="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 class="text-sm font-semibold" id="variants-title">
            Variants
          </h2>
          <p class="mt-0.5 text-xs text-muted-foreground">
            Prices, stock, options, and sellable state.
          </p>
        </div>
        <Button onClick={() => props.onOpen('new')} size="sm" type="button">
          <AddCircle aria-hidden="true" />
          Add variant
        </Button>
      </div>
      <div
        aria-label="Product variants. Use Up and Down arrow keys to select a row and Enter to inspect it."
        class="mt-3 overflow-hidden rounded-lg border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
        onKeyDown={onTableKeyDown}
        role="group"
        tabIndex={0}
      >
        <Table aria-label="Product variants" class="max-md:block">
          <TableHeader class="max-md:hidden">
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
          <TableBody class="max-md:block">
            <For each={table.getRowModel().rows}>
              {(row, index) => (
                <TableRow
                  class="max-md:grid max-md:grid-cols-2 max-md:py-1"
                  data-state={activeRow() === index() ? 'selected' : undefined}
                  onMouseEnter={() => setActiveRow(index())}
                >
                  <For each={row.getVisibleCells()}>
                    {cell => (
                      <TableCell
                        class={`max-md:flex max-md:min-h-9 max-md:items-center max-md:justify-between max-md:gap-2 max-md:px-3 max-md:py-2 ${
                          ['priceMnt', 'stockQuantity', 'sortOrder'].includes(cell.column.id)
                            ? 'md:text-right'
                            : ''
                        } ${cell.column.id === 'name' || cell.column.id === 'options' ? 'max-md:col-span-2' : ''}`}
                      >
                        <span class="text-xs text-muted-foreground md:hidden">
                          {typeof cell.column.columnDef.header === 'string'
                            ? cell.column.columnDef.header
                            : cell.column.id === 'actions'
                              ? 'Actions'
                              : cell.column.id}
                        </span>
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

type LifecycleActionsProps = {
  product: AdminCatalogProductDetail
  requests: CatalogRequests
  disabled?: boolean
  onProduct: (product: AdminCatalogProductDetail) => void
  onReload: () => Promise<AdminCatalogProductDetail | undefined>
  onDeleted: (cleanup: MediaCleanup) => void
}

function LifecycleActions(props: LifecycleActionsProps) {
  const queryClient = useQueryClient()
  const archiveMutation = useMutation(() => catalogMutation.archiveProduct(props.requests))
  const restoreMutation = useMutation(() => catalogMutation.restoreProduct(props.requests))
  const deleteMutation = useMutation(() => catalogMutation.deleteProduct(props.requests))
  const [failure, setFailure] = createSignal<AdminCatalogError>()
  const [requestError, setRequestError] = createSignal<string>()
  const [deleteOpen, setDeleteOpen] = createSignal(false)
  const [confirmation, setConfirmation] = createSignal('')

  const install = (product: AdminCatalogProductDetail) => {
    queryClient.setQueryData(catalogKeys.detail(product.id), Result.ok(product))
    props.onProduct(product)
    void queryClient.invalidateQueries({ queryKey: catalogKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: catalogKeys.publicProducts })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }

  const runVersionMutation = async (
    action: (
      input: AdminExpectedProductVersion,
    ) => Promise<Result<AdminCatalogProductDetail, AdminCatalogError>>,
    success: string,
  ) => {
    setFailure()
    setRequestError()
    try {
      const result = await action({ expectedUpdatedAt: props.product.updatedAt })
      if (result.isErr()) {
        setFailure(result.error)
        return
      }
      install(result.value)
      toast.success(success)
    } catch (error) {
      setRequestError(transportMessage(error))
    }
  }

  const archive = () =>
    runVersionMutation(
      input => archiveMutation.mutateAsync({ productId: props.product.id, input }),
      'Product archived.',
    )

  const restore = () =>
    runVersionMutation(
      input => restoreMutation.mutateAsync({ productId: props.product.id, input }),
      'Product restored to draft.',
    )

  const remove = async () => {
    setFailure()
    setRequestError()
    try {
      const result = await deleteMutation.mutateAsync({
        productId: props.product.id,
        input: { expectedUpdatedAt: props.product.updatedAt },
      })
      if (result.isErr()) {
        setDeleteOpen(false)
        setFailure(result.error)
        return
      }
      queryClient.removeQueries({ queryKey: catalogKeys.detail(props.product.id) })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: catalogKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: catalogKeys.publicProducts }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ])
      setDeleteOpen(false)
      props.onDeleted(result.value.mediaCleanup)
    } catch (error) {
      setDeleteOpen(false)
      setRequestError(transportMessage(error))
    }
  }

  return (
    <section aria-labelledby="lifecycle-title">
      <h2 class="text-sm font-semibold" id="lifecycle-title">
        Lifecycle
      </h2>
      <p class="mt-1 text-xs text-muted-foreground">
        Archive is the normal reversible removal path.
      </p>
      <Show when={props.disabled}>
        <p class="mt-2 text-xs text-(--admin-warning-foreground)">
          Save or discard local product and gallery edits before changing lifecycle state.
        </p>
      </Show>
      <div class="mt-3 space-y-2">
        <Show
          when={props.product.status === 'archived'}
          fallback={
            <Button
              class="w-full justify-start"
              disabled={props.disabled || archiveMutation.isPending}
              onClick={() => void archive()}
              type="button"
              variant="outline"
            >
              {archiveMutation.isPending ? (
                <Spinner aria-hidden="true" />
              ) : (
                <Archive aria-hidden="true" />
              )}
              {archiveMutation.isPending ? 'Archiving…' : 'Archive product'}
            </Button>
          }
        >
          <Button
            class="w-full justify-start"
            disabled={props.disabled || restoreMutation.isPending}
            onClick={() => void restore()}
            type="button"
            variant="outline"
          >
            {restoreMutation.isPending ? (
              <Spinner aria-hidden="true" />
            ) : (
              <Restart aria-hidden="true" />
            )}
            {restoreMutation.isPending ? 'Restoring…' : 'Restore to draft'}
          </Button>
          <Button
            class="w-full justify-start"
            disabled={props.disabled}
            onClick={() => setDeleteOpen(true)}
            type="button"
            variant="destructive"
          >
            <TrashBinTrash aria-hidden="true" />
            Delete permanently
          </Button>
        </Show>
      </div>

      <Show when={failure() || requestError()}>
        <div class="mt-3">
          <CatalogFailure
            failure={failure()}
            onReload={() => void props.onReload()}
            title="Lifecycle action failed"
            transportError={requestError()}
          />
        </div>
      </Show>

      <Dialog
        open={deleteOpen()}
        onOpenChange={open => {
          setDeleteOpen(open)
          if (!open) setConfirmation('')
        }}
      >
        <DialogContent class="max-w-md rounded-lg border bg-popover p-4">
          <DialogHeader>
            <DialogTitle>Delete product permanently?</DialogTitle>
            <DialogDescription>
              Current catalog data is removed. Historical order snapshots remain unchanged.
            </DialogDescription>
          </DialogHeader>
          <Field class="mt-4">
            <FieldLabel for="delete-product-confirmation">
              Enter the product ID to confirm
            </FieldLabel>
            <Input
              class="font-mono"
              id="delete-product-confirmation"
              value={confirmation()}
              onInput={event => setConfirmation(event.currentTarget.value)}
            />
            <FieldDescription>{props.product.id}</FieldDescription>
          </Field>
          <DialogFooter class="mt-5">
            <DialogClose as={Button} type="button" variant="outline">
              Cancel
            </DialogClose>
            <Button
              disabled={confirmation() !== props.product.id || deleteMutation.isPending}
              onClick={() => void remove()}
              type="button"
              variant="destructive"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function ArchivedProduct(props: LifecycleActionsProps) {
  return (
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-7">
      <main class="min-w-0">
        <InlineAlert title="Archived product" tone="warning">
          This record is read-only. Restore it to draft before editing catalog data.
        </InlineAlert>
        <section aria-labelledby="archived-summary-title" class="mt-5 border-y bg-card">
          <div class="grid gap-4 border-b px-4 py-4 sm:grid-cols-2">
            <div>
              <h2 class="text-sm font-semibold" id="archived-summary-title">
                Product summary
              </h2>
              <p class="mt-2 max-w-[70ch] text-sm text-muted-foreground">
                {props.product.shortDescription ?? 'No short description.'}
              </p>
            </div>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div>
                <dt class="text-muted-foreground">Brand</dt>
                <dd class="mt-0.5">{props.product.brandName ?? 'None'}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">Category</dt>
                <dd class="mt-0.5">{props.product.categoryName ?? 'None'}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">Variants</dt>
                <dd class="mt-0.5 tabular-nums">{props.product.variants.length}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">Images</dt>
                <dd class="mt-0.5 tabular-nums">{props.product.images.length}</dd>
              </div>
            </dl>
          </div>
          <dl class="grid gap-3 px-4 py-4 text-xs sm:grid-cols-2">
            <div>
              <dt class="text-muted-foreground">Created</dt>
              <dd class="mt-0.5 tabular-nums">{dateTime.format(props.product.createdAt)}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Last updated</dt>
              <dd class="mt-0.5 tabular-nums">{dateTime.format(props.product.updatedAt)}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-muted-foreground">Description</dt>
              <dd class="mt-1 max-w-[70ch] whitespace-pre-wrap">
                {props.product.description ?? 'No description.'}
              </dd>
            </div>
          </dl>
        </section>
      </main>
      <aside class="border-t pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        <LifecycleActions {...props} />
      </aside>
    </div>
  )
}

function DeletedProductState(props: {
  productId: string
  cleanup: MediaCleanup
  onBack: () => void
}) {
  const warning = () =>
    props.cleanup === 'pending'
      ? 'Catalog data was deleted, but media cleanup is pending operator attention.'
      : props.cleanup === 'retained-for-orders'
        ? 'Media used by historical orders was retained.'
        : undefined

  return (
    <div>
      <PageHeader description={props.productId} title="Product deleted" />
      <Show when={warning()}>
        {message => (
          <div class="mt-4">
            <InlineAlert title="Media cleanup" tone="warning">
              {message()}
            </InlineAlert>
          </div>
        )}
      </Show>
      <div class="mt-4">
        <Button onClick={() => props.onBack()}>Return to catalog</Button>
      </div>
    </div>
  )
}
