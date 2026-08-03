import { ArrowLeft } from '@solar-icons/solid/Linear'
import type {
  AdminCatalogError,
  AdminCatalogProductDetail,
  AdminCatalogSelectors,
  MediaCleanup,
} from '@store-kit/contracts/admin-catalog'
import { Button, Skeleton } from '@store-kit/ui'
import { match } from 'dismatch'
import { Show, createSignal } from 'solid-js'

import {
  AdminEmptyState,
  InlineAlert,
  PageHeader,
  RetryState,
  StatusBadge,
  TableSkeleton,
} from '../components/foundation'
import { UnsavedChangesGuard } from '../components/unsaved-changes'
import { useQueryResult } from '../query-options/result'
import { ArchivedProduct, DeletedProductState } from './archived-product'
import { ProductGallery } from './gallery'
import { ProductEditor } from './product-editor'
import { LifecycleActions } from './product-lifecycle'
import type { CatalogRequests } from './query-options'
import { catalogQuery } from './query-options'
import { VariantInspector } from './variant-inspector'
import { VariantTable } from './variant-table'

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

type CatalogDetailPageProps = {
  productId: string
  requests: CatalogRequests
  variantSelection: string | undefined
  onBack: () => void
  onVariantSelectionChange: (selection: string | undefined) => void
}

export function CatalogDetailPage(props: CatalogDetailPageProps) {
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
  onReload: () => Promise<AdminCatalogProductDetail | undefined>
  onDeleted: (cleanup: MediaCleanup) => void
  onVariantSelectionChange: (selection: string | undefined) => void
}

function CatalogDetailContent(props: CatalogDetailContentProps) {
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
                onReload={props.onReload}
              />
            )}
            requests={props.requests}
            selectors={props.selectors}
            onDirtyChange={setProductDirty}
            onReload={props.onReload}
          />
          <VariantInspector
            product={props.product}
            requests={props.requests}
            selection={props.variantSelection}
            onClose={() => props.onVariantSelectionChange(undefined)}
            onReload={props.onReload}
          />
        </Show>
      </div>
    </>
  )
}
