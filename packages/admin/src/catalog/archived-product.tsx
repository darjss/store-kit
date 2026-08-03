import type { MediaCleanup } from '@store-kit/contracts/admin-catalog'
import { Button } from '@store-kit/ui'
import { Show } from 'solid-js'

import { InlineAlert, PageHeader } from '../components/foundation'
import { LifecycleActions } from './product-lifecycle'
import type { LifecycleActionsProps } from './product-lifecycle'

const dateTime = new Intl.DateTimeFormat('mn-MN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function ArchivedProduct(props: LifecycleActionsProps) {
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

export function DeletedProductState(props: {
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
        <Button class="min-h-12! md:h-9!" onClick={props.onBack}>
          Жагсаалт руу буцах
        </Button>
      </div>
    </div>
  )
}
