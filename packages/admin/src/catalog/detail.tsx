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
import { toast } from 'solid-sonner'

import {
  AdminEmptyState,
  InlineAlert,
  PageHeader,
  RetryState,
  StatusBadge,
  TableSkeleton,
} from '../components/foundation'
import { activeTableRowId, handleTableNavigation, tableRowId } from '../components/table-navigation'
import { UnsavedChangesGuard } from '../components/unsaved-changes'
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
    draft: () => 'Ноорог',
    active: () => 'Идэвхтэй',
    archived: () => 'Архивласан',
  })

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
    cell: info => <span class="whitespace-nowrap tabular-nums">{mnt.format(info.getValue())}</span>,
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
        <Button
          class="min-h-11! md:h-8!"
          onClick={() => props.onBack()}
          type="button"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" />
          Барааны жагсаалт руу буцах
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
                message="Барааны мэдээллийг ачаалж чадсангүй."
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
                          Жагсаалт руу буцах
                        </Button>
                      }
                      description="Энэ барааг жагсаалтыг нээснээс хойш устгасан байж болно."
                      title="Бараа олдсонгүй"
                    />
                  }
                >
                  <InlineAlert title="Барааны мэдээлэл нээгдсэнгүй" tone="destructive">
                    {expectedError()?.message ??
                      selectorError()?.message ??
                      'Хүсэлтийг гүйцэтгэж чадсангүй.'}
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
      <span class="sr-only">Барааны мэдээллийг ачаалж байна…</span>
      <Skeleton class="h-7 w-64" />
      <Skeleton class="mt-2 h-4 w-80 max-w-full" />
      <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div class="space-y-5">
          <Skeleton class="h-52 w-full" />
          <Skeleton class="h-56 w-full" />
          <TableSkeleton
            columns={[
              { label: 'Хувилбар' },
              { label: 'SKU' },
              { label: 'Сонголт' },
              { label: 'Үнэ' },
              { label: 'Үлдэгдэл' },
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
  const [productDirty, setProductDirty] = createSignal(false)
  const [galleryDirty, setGalleryDirty] = createSignal(false)

  return (
    <>
      <UnsavedChangesGuard isDirty={() => productDirty() || galleryDirty()} />
      <PageHeader
        actions={<StatusBadge>{productStatusLabel(props.product.status)}</StatusBadge>}
        description={[props.product.brand?.name, props.product.category?.name]
          .filter(Boolean)
          .join(' · ')}
        title={props.product.name}
        titleId="catalog-product-title"
      />

      <Show when={props.mediaWarning}>
        {message => (
          <div class="mt-4">
            <InlineAlert title="Зураг цэвэрлэх анхааруулга" tone="warning">
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
            onDirtyChange={setProductDirty}
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
                toast.success('Барааны өөрчлөлтийг хадгаллаа.')
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
                    {mnt.format(variant.priceMnt)}
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
                  onMouseEnter={() => setActiveRow(index())}
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
      'Барааг архивлалаа.',
    )

  const restore = () =>
    runVersionMutation(
      input => restoreMutation.mutateAsync({ productId: props.product.id, input }),
      'Барааг ноорог төлөвт сэргээв.',
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
      <h2 class="text-base font-semibold" id="lifecycle-title">
        Барааны үйлдэл
      </h2>
      <p class="mt-1 text-sm text-muted-foreground">Архивласан барааг дараа нь сэргээж болно.</p>
      <Show when={props.disabled}>
        <p class="mt-2 text-sm text-(--admin-warning-foreground)">
          Төлөв өөрчлөхөөс өмнө бараа болон зургийн засвараа хадгална уу.
        </p>
      </Show>
      <div class="mt-3 space-y-2">
        <Show
          when={props.product.status === 'archived'}
          fallback={
            <Button
              class="min-h-12! w-full justify-start md:h-9!"
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
              {archiveMutation.isPending ? 'Архивлаж байна…' : 'Барааг архивлах'}
            </Button>
          }
        >
          <Button
            class="min-h-12! w-full justify-start md:h-9!"
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
            {restoreMutation.isPending ? 'Сэргээж байна…' : 'Ноорог төлөвт сэргээх'}
          </Button>
          <Button
            class="min-h-12! w-full justify-start md:h-9!"
            disabled={props.disabled}
            onClick={() => setDeleteOpen(true)}
            type="button"
            variant="destructive"
          >
            <TrashBinTrash aria-hidden="true" />
            Бүрмөсөн устгах
          </Button>
        </Show>
      </div>

      <Show when={failure() || requestError()}>
        <div class="mt-3">
          <CatalogFailure
            failure={failure()}
            onReload={() => void props.onReload()}
            title="Үйлдлийг гүйцэтгэж чадсангүй"
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
            <DialogTitle>Барааг бүрмөсөн устгах уу?</DialogTitle>
            <DialogDescription>
              Бараа каталогоос устна. Өмнөх захиалгын мэдээлэл хэвээр үлдэнэ.
            </DialogDescription>
          </DialogHeader>
          <Field class="mt-4">
            <FieldLabel for="delete-product-confirmation">
              Баталгаажуулахын тулд барааны ID-г оруулна уу
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
              Болих
            </DialogClose>
            <Button
              disabled={confirmation() !== props.product.id || deleteMutation.isPending}
              onClick={() => void remove()}
              type="button"
              variant="destructive"
            >
              {deleteMutation.isPending ? 'Устгаж байна…' : 'Бүрмөсөн устгах'}
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
        <InlineAlert title="Архивласан бараа" tone="warning">
          Энэ барааг одоогоор засах боломжгүй. Засахын тулд ноорог төлөвт сэргээнэ үү.
        </InlineAlert>
        <section aria-labelledby="archived-summary-title" class="mt-5 border-y bg-card">
          <div class="grid gap-4 border-b px-4 py-4 sm:grid-cols-2">
            <div>
              <h2 class="text-sm font-semibold" id="archived-summary-title">
                Барааны хураангуй
              </h2>
              <p class="mt-2 max-w-[70ch] text-sm text-muted-foreground">
                {props.product.shortDescription ?? 'Товч тайлбаргүй.'}
              </p>
            </div>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div>
                <dt class="text-muted-foreground">Брэнд</dt>
                <dd class="mt-0.5">{props.product.brand?.name ?? 'Байхгүй'}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">Ангилал</dt>
                <dd class="mt-0.5">{props.product.category?.name ?? 'Байхгүй'}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">Хувилбар</dt>
                <dd class="mt-0.5 tabular-nums">{props.product.variants.length}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">Зураг</dt>
                <dd class="mt-0.5 tabular-nums">{props.product.images.length}</dd>
              </div>
            </dl>
          </div>
          <dl class="grid gap-3 px-4 py-4 text-xs sm:grid-cols-2">
            <div>
              <dt class="text-muted-foreground">Үүсгэсэн</dt>
              <dd class="mt-0.5 tabular-nums">{dateTime.format(props.product.createdAt)}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Сүүлд шинэчилсэн</dt>
              <dd class="mt-0.5 tabular-nums">{dateTime.format(props.product.updatedAt)}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-muted-foreground">Тайлбар</dt>
              <dd class="mt-1 max-w-[70ch] whitespace-pre-wrap">
                {props.product.description ?? 'Тайлбаргүй.'}
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
      ? 'Бараа устсан боловч зургийн файлыг цэвэрлэх шаардлагатай байна.'
      : props.cleanup === 'retained-for-orders'
        ? 'Өмнөх захиалгад ашигласан зургийг хадгалж үлдээлээ.'
        : undefined

  return (
    <div>
      <PageHeader description={props.productId} title="Бараа устлаа" />
      <Show when={warning()}>
        {message => (
          <div class="mt-4">
            <InlineAlert title="Зургийн файл" tone="warning">
              {message()}
            </InlineAlert>
          </div>
        )}
      </Show>
      <div class="mt-4">
        <Button class="min-h-12! md:h-9!" onClick={() => props.onBack()}>
          Жагсаалт руу буцах
        </Button>
      </div>
    </div>
  )
}
