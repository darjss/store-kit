import { AddCircle, Magnifer } from '@solar-icons/solid/Linear'
import type {
  AdminCatalogError,
  AdminCatalogProductListFilters,
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
} from '@store-kit/ui'
import { useNavigate } from '@tanstack/solid-router'
import { Show, createSignal } from 'solid-js'

import { InlineAlert, PageHeader, RetryState, TableSkeleton } from '../components/foundation'
import { useQueryResult } from '../query-options/result'
import { CatalogMobileList } from './list-mobile'
import { CatalogTable } from './list-table'
import { catalogQuery } from './query-options'

const productStatusLabel = (status: 'draft' | 'active' | 'archived') => {
  if (status === 'active') return 'Идэвхтэй'
  if (status === 'archived') return 'Архивласан'
  return 'Ноорог'
}

export type CatalogListSearch = AdminCatalogProductListFilters & {
  inventory: AdminInventoryState
  limit: number
  offset: number
}

type CatalogListPageProps = {
  search: CatalogListSearch
  onSearchChange: (search: CatalogListSearch) => void
}

export function CatalogListPage(props: CatalogListPageProps) {
  const navigate = useNavigate()
  const query = useQueryResult(() => catalogQuery.list(props.search))
  const data = () => query.data?.match({ ok: value => value, err: () => undefined })
  const expectedError = () =>
    query.data?.match<AdminCatalogError | undefined>({ ok: () => undefined, err: error => error })
  const [filtersOpen, setFiltersOpen] = createSignal(false)
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
    <section class="mx-auto w-full max-w-365 px-4 py-6 pb-28 sm:px-7 md:pb-8 lg:px-10 lg:py-8 xl:px-14">
      <div>
        <PageHeader
          actions={
            <Button
              class="min-h-12! w-full px-5! sm:w-auto lg:h-9!"
              onClick={() => void navigate({ to: '/catalog/new' })}
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

      <div class="mt-6 border border-(--border) bg-card p-3">
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

      <div class="mt-3 lg:hidden">
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

      <div class="mt-3 hidden items-end gap-2 border border-(--border) bg-secondary px-4 py-3 lg:flex">
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

      <div class="mt-5">
        <Show
          when={!query.isPending}
          fallback={
            <div>
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
              <div>
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
                <div>
                  <InlineAlert title="Барааны жагсаалт нээгдсэнгүй" tone="destructive">
                    {expectedError()?.message ?? 'Хүсэлтийг гүйцэтгэж чадсангүй.'}
                  </InlineAlert>
                </div>
              }
            >
              <Show
                when={(data()?.items.length ?? 0) > 0}
                fallback={
                  <div>
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
                <CatalogMobileList products={data()!.items} />
                <CatalogTable products={data()!.items} />

                <div class="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
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
