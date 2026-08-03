import { ArrowLeft } from '@solar-icons/solid/Linear'
import type { AdminCatalogError } from '@store-kit/contracts/admin-catalog'
import { Button, Skeleton } from '@store-kit/ui'
import { Show } from 'solid-js'

import { InlineAlert, PageHeader, RetryState } from '../components/foundation'
import { useQueryResult } from '../query-options/result'
import { CreateProductForm } from './create-form'
import { catalogQuery } from './query-options'

type CatalogCreatePageProps = {
  onBack: () => void
  onCreated: (productId: string) => void
}

export function CatalogCreatePage(props: CatalogCreatePageProps) {
  const selectorsQuery = useQueryResult(() => catalogQuery.selectors())
  const selectors = () => selectorsQuery.data?.match({ ok: value => value, err: () => undefined })
  const expectedError = () =>
    selectorsQuery.data?.match<AdminCatalogError | undefined>({
      ok: () => undefined,
      err: error => error,
    })

  return (
    <section class="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-7">
      <div class="mb-3">
        <Button
          class="min-h-11! px-2! md:h-8!"
          onClick={props.onBack}
          type="button"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" />
          Барааны жагсаалт руу буцах
        </Button>
      </div>
      <PageHeader
        description="Эхлээд худалдахад хэрэгтэй үндсэн мэдээллээ оруулна уу."
        title="Шинэ бараа"
        titleId="new-product-title"
      />

      <div class="mt-5">
        <Show
          when={!selectorsQuery.isPending}
          fallback={
            <div aria-busy="true" class="space-y-5" role="status">
              <span class="sr-only">Барааны маягтыг ачаалж байна…</span>
              <Skeleton class="h-12 w-full" />
              <Skeleton class="h-40 w-full" />
              <Skeleton class="h-40 w-full" />
            </div>
          }
        >
          <Show
            when={!selectorsQuery.isError}
            fallback={
              <RetryState
                message="Брэнд, ангиллын сонголтыг ачаалж чадсангүй."
                onRetry={() => void selectorsQuery.refetch()}
                pending={selectorsQuery.isFetching}
              />
            }
          >
            <Show
              when={!expectedError()}
              fallback={
                <InlineAlert title="Маягт нээгдсэнгүй" tone="destructive">
                  {expectedError()?.message ?? 'Сонголтуудыг ачаалж чадсангүй.'}
                </InlineAlert>
              }
            >
              <Show when={selectors()} keyed>
                {value => <CreateProductForm onCreated={props.onCreated} selectors={value} />}
              </Show>
            </Show>
          </Show>
        </Show>
      </div>
    </section>
  )
}
