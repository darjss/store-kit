import type { AdminCatalogError, AdminCatalogProductList } from '@store-kit/contracts/admin-catalog'
import type {
  AdminDashboard,
  AdminDashboardSummary,
  AdminLowStockVariant,
} from '@store-kit/contracts/admin-dashboard'
import type { AdminOrderListItem } from '@store-kit/contracts/admin-orders'
import { Skeleton } from '@store-kit/ui'
import { For, Match, Show, Switch } from 'solid-js'

import { InlineAlert, PageHeader, RetryState, StatusBadge } from '../components/foundation'
import { formatMnt } from '../format'
import { orderStatusDisplay, paymentStatusDisplay } from '../orders/status'
import { dashboardQuery } from '../query-options/dashboard'
import type {
  AdminDashboardCatalogRequest,
  AdminDashboardRequest,
} from '../query-options/dashboard'
import { useQueryResult } from '../query-options/result'

const dateFormatter = new Intl.DateTimeFormat('mn-MN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const formatMoney = formatMnt
const formatDate = (value: number) => dateFormatter.format(new Date(value))
const dateTime = (value: number) => new Date(value).toISOString()

function DashboardSkeleton() {
  return (
    <div aria-busy="true" class="mt-6 space-y-8" role="status">
      <span class="sr-only">Хяналтын самбарын мэдээллийг ачаалж байна…</span>
      <section>
        <Skeleton class="h-5 w-36" />
        <div class="mt-3 divide-y border-y sm:rounded-lg sm:border-x">
          <For each={[0, 1, 2]}>
            {() => (
              <div class="flex min-h-16 items-center justify-between gap-4 px-4 py-3">
                <div class="min-w-0 flex-1">
                  <Skeleton class="h-4 w-44 max-w-full" />
                  <Skeleton class="mt-2 h-3 w-64 max-w-full" />
                </div>
                <Skeleton class="size-8 rounded-full" />
              </div>
            )}
          </For>
        </div>
      </section>
      <section>
        <Skeleton class="h-5 w-28" />
        <div class="mt-3 divide-y border-y sm:rounded-lg sm:border-x">
          <For each={[0, 1, 2, 3]}>
            {() => (
              <div class="flex min-h-20 items-center justify-between gap-4 px-4 py-3">
                <div class="min-w-0 flex-1">
                  <Skeleton class="h-4 w-32" />
                  <Skeleton class="mt-2 h-3 w-48 max-w-full" />
                </div>
                <Skeleton class="h-4 w-20" />
              </div>
            )}
          </For>
        </div>
      </section>
    </div>
  )
}

type ReadinessSequenceProps = {
  productAction: {
    title: string
    description: string
    href: string
    external?: boolean
  }
  settingsHref: string
  storefrontHref: string
}

function ReadinessSequence(props: ReadinessSequenceProps) {
  const steps = [
    props.productAction,
    {
      title: 'Төлбөр, хүргэлтийн мэдээллээ шалгах',
      description: 'Хүргэлтийн үнэ болон шилжүүлгийн дансыг баталгаажуулна.',
      href: props.settingsHref,
    },
    {
      title: 'Дэлгүүрээ нээж шалгах',
      description: 'Хэрэглэгчийн харах хуудсыг нээгээд захиалгын замыг шалгана.',
      href: props.storefrontHref,
      external: true,
    },
  ]

  return (
    <section aria-labelledby="store-readiness-title">
      <div class="mb-3">
        <h2 class="text-base font-semibold" id="store-readiness-title">
          Дэлгүүрээ ажилд бэлдэх
        </h2>
        <p class="mt-1 text-sm leading-5 text-muted-foreground">
          Эдгээр гурван алхмыг хийсний дараа анхны захиалгаа авахад бэлэн болно.
        </p>
      </div>
      <ol class="-mx-4 divide-y border-y bg-card sm:mx-0 sm:rounded-lg sm:border-x">
        <For each={steps}>
          {(step, index) => (
            <li>
              <a
                class="group flex min-h-20 items-center gap-3 px-4 py-3 transition-colors outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                href={step.href}
                rel={step.external ? 'noreferrer' : undefined}
                target={step.external ? '_blank' : undefined}
              >
                <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular-nums">
                  {index() + 1}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block text-base font-medium">{step.title}</span>
                  <span class="mt-0.5 block text-sm leading-5 text-muted-foreground">
                    {step.description}
                  </span>
                </span>
                <span aria-hidden="true" class="text-xl text-muted-foreground">
                  ›
                </span>
              </a>
            </li>
          )}
        </For>
      </ol>
    </section>
  )
}

type WorkQueueProps = {
  summary: AdminDashboardSummary
  ordersHref: (status: 'new' | 'confirmed' | 'preparing' | 'delivering') => string
  inventoryHref: string
}

function WorkQueue(props: WorkQueueProps) {
  const items = () =>
    [
      {
        count: props.summary.newOrderCount,
        title: 'Шинэ захиалга',
        description: 'Төлбөр болон захиалгын мэдээллийг шалгана.',
        href: props.ordersHref('new'),
      },
      {
        count: props.summary.confirmedOrderCount,
        title: 'Бэлтгэх захиалга',
        description: 'Төлбөр баталгаажсан захиалгыг бэлтгэж эхэлнэ.',
        href: props.ordersHref('confirmed'),
      },
      {
        count: props.summary.preparingOrderCount,
        title: 'Бэлтгэж буй захиалга',
        description: 'Бэлэн болсон захиалгыг хүргэлтэд шилжүүлнэ.',
        href: props.ordersHref('preparing'),
      },
      {
        count: props.summary.deliveringOrderCount,
        title: 'Хүргэлтэд гарсан захиалга',
        description: 'Хүргэгдсэн захиалгыг дуусгана.',
        href: props.ordersHref('delivering'),
      },
      {
        count: props.summary.lowStockVariantCount,
        title: 'Үлдэгдэл багассан бараа',
        description: '3 буюу түүнээс цөөн үлдэгдэлтэй хувилбаруудыг шалгана.',
        href: props.inventoryHref,
      },
    ].filter(item => item.count > 0)

  return (
    <section aria-labelledby="work-queue-title">
      <div class="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 class="text-base font-semibold" id="work-queue-title">
            Одоо хийх ажил
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">Анхаарал шаардаж буй ажлууд.</p>
        </div>
        <Show when={items().length > 0}>
          <span class="text-sm text-muted-foreground">{items().length} төрөл</span>
        </Show>
      </div>
      <Show
        when={items().length > 0}
        fallback={
          <div class="-mx-4 border-y bg-card px-4 py-5 sm:mx-0 sm:rounded-lg sm:border-x">
            <p class="text-base font-medium">Яаралтай ажил алга</p>
            <p class="mt-1 text-sm leading-5 text-muted-foreground">
              Шинэ захиалга болон бага үлдэгдэл гарвал энд шууд харагдана.
            </p>
          </div>
        }
      >
        <ul class="-mx-4 divide-y border-y bg-card sm:mx-0 sm:rounded-lg sm:border-x">
          <For each={items()}>
            {item => (
              <li>
                <a
                  class="flex min-h-20 items-center gap-4 px-4 py-3 transition-colors outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  href={item.href}
                >
                  <span class="min-w-0 flex-1">
                    <span class="block text-base font-medium">{item.title}</span>
                    <span class="mt-0.5 block text-sm leading-5 text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <span class="text-xl font-semibold text-primary tabular-nums">{item.count}</span>
                  <span aria-hidden="true" class="text-xl text-muted-foreground">
                    ›
                  </span>
                </a>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  )
}

function RecentOrders(props: {
  orders: AdminOrderListItem[]
  orderHref: (orderId: AdminOrderListItem['id']) => string
  allOrdersHref: string
}) {
  return (
    <section aria-labelledby="recent-orders-title">
      <div class="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 class="text-base font-semibold" id="recent-orders-title">
            Сүүлийн захиалга
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">Хамгийн сүүлд орсон захиалгууд.</p>
        </div>
        <a
          class="flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
          href={props.allOrdersHref}
        >
          Бүгдийг харах
        </a>
      </div>
      <Show
        when={props.orders.length > 0}
        fallback={
          <div class="-mx-4 border-y bg-card px-4 py-5 sm:mx-0 sm:rounded-lg sm:border-x">
            <p class="text-base font-medium">Захиалга хараахан алга</p>
            <p class="mt-1 text-sm leading-5 text-muted-foreground">
              Хэрэглэгч захиалга өгөхөд энд автоматаар гарч ирнэ.
            </p>
          </div>
        }
      >
        <ul class="-mx-4 divide-y border-y bg-card sm:mx-0 sm:rounded-lg sm:border-x">
          <For each={props.orders}>
            {order => {
              const orderStatus = () => orderStatusDisplay(order.status)
              const paymentStatus = () => paymentStatusDisplay(order.paymentStatus)
              return (
                <li>
                  <a
                    aria-label={`${order.number}, ${order.customerName}, ${formatMoney(order.totalMnt)}`}
                    class="block min-h-24 px-4 py-3 transition-colors outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    href={props.orderHref(order.id)}
                  >
                    <span class="flex items-start justify-between gap-4">
                      <span class="min-w-0">
                        <span class="block text-base font-semibold tabular-nums">
                          {order.number}
                        </span>
                        <span class="mt-0.5 block truncate text-sm text-muted-foreground">
                          {order.customerName}
                        </span>
                      </span>
                      <span class="shrink-0 text-base font-semibold tabular-nums">
                        {formatMoney(order.totalMnt)}
                      </span>
                    </span>
                    <span class="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={paymentStatus().tone}>{paymentStatus().label}</StatusBadge>
                      <StatusBadge tone={orderStatus().tone}>{orderStatus().label}</StatusBadge>
                      <time
                        class="ml-auto text-xs text-muted-foreground tabular-nums"
                        dateTime={dateTime(order.createdAt)}
                      >
                        {formatDate(order.createdAt)}
                      </time>
                    </span>
                  </a>
                </li>
              )
            }}
          </For>
        </ul>
      </Show>
    </section>
  )
}

function InventoryStatus(props: { stockQuantity: number }) {
  return props.stockQuantity === 0 ? (
    <StatusBadge tone="destructive">Дууссан</StatusBadge>
  ) : (
    <StatusBadge tone="warning">Цөөн үлдсэн</StatusBadge>
  )
}

function LowStock(props: {
  variants: AdminLowStockVariant[]
  catalogHref: (
    productId: AdminLowStockVariant['productId'],
    variantId: AdminLowStockVariant['variantId'],
  ) => string
}) {
  return (
    <Show when={props.variants.length > 0}>
      <section aria-labelledby="low-stock-title">
        <div class="mb-3">
          <h2 class="text-base font-semibold" id="low-stock-title">
            Нөөц нөхөх бараа
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">Хамгийн бага үлдэгдэлтэй хувилбарууд.</p>
        </div>
        <ul class="-mx-4 divide-y border-y bg-card sm:mx-0 sm:rounded-lg sm:border-x">
          <For each={props.variants}>
            {variant => (
              <li>
                <a
                  class="flex min-h-20 items-center gap-4 px-4 py-3 transition-colors outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  href={props.catalogHref(variant.productId, variant.variantId)}
                >
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-base font-medium">{variant.productName}</span>
                    <span class="mt-0.5 block truncate text-sm text-muted-foreground">
                      {variant.variantName} · {variant.sku}
                    </span>
                  </span>
                  <span class="shrink-0 text-right">
                    <span class="block text-lg font-semibold tabular-nums">
                      {variant.stockQuantity}
                    </span>
                    <InventoryStatus stockQuantity={variant.stockQuantity} />
                  </span>
                  <span aria-hidden="true" class="text-xl text-muted-foreground">
                    ›
                  </span>
                </a>
              </li>
            )}
          </For>
        </ul>
      </section>
    </Show>
  )
}

type DashboardContentProps = {
  dashboard: AdminDashboard
  isNewStore: boolean
  orderHref: (orderId: AdminOrderListItem['id']) => string
  ordersHref: (status?: 'new' | 'confirmed' | 'preparing' | 'delivering') => string
  inventoryHref: string
  catalogHref: (
    productId: AdminLowStockVariant['productId'],
    variantId: AdminLowStockVariant['variantId'],
  ) => string
  readinessProductAction: ReadinessSequenceProps['productAction']
  settingsHref: string
  storefrontHref: string
}

function DashboardContent(props: DashboardContentProps) {
  return (
    <div class="mt-6 space-y-8">
      <Show when={props.isNewStore}>
        <ReadinessSequence
          productAction={props.readinessProductAction}
          settingsHref={props.settingsHref}
          storefrontHref={props.storefrontHref}
        />
      </Show>
      <WorkQueue
        inventoryHref={props.inventoryHref}
        ordersHref={status => props.ordersHref(status)}
        summary={props.dashboard.summary}
      />
      <RecentOrders
        allOrdersHref={props.ordersHref()}
        orderHref={props.orderHref}
        orders={props.dashboard.recentOrders}
      />
      <LowStock catalogHref={props.catalogHref} variants={props.dashboard.lowStockVariants} />
    </div>
  )
}

export type DashboardPageProps = {
  request: AdminDashboardRequest
  activeCatalogRequest: AdminDashboardCatalogRequest
  draftCatalogRequest: AdminDashboardCatalogRequest
  orderHref: (orderId: AdminOrderListItem['id']) => string
  ordersHref: (status?: 'new' | 'confirmed' | 'preparing' | 'delivering') => string
  inventoryHref: string
  catalogHref: (
    productId: AdminLowStockVariant['productId'],
    variantId?: AdminLowStockVariant['variantId'],
  ) => string
  newProductHref: string
  settingsHref: string
  storefrontHref: string
}

export function DashboardPage(props: DashboardPageProps) {
  const query = useQueryResult(() => dashboardQuery.overview(props.request))
  const activeCatalogQuery = useQueryResult(() =>
    dashboardQuery.catalogReadiness(props.activeCatalogRequest, 'active'),
  )
  const draftCatalogQuery = useQueryResult(() =>
    dashboardQuery.catalogReadiness(props.draftCatalogRequest, 'draft'),
  )
  const activeCatalog = () =>
    activeCatalogQuery.data?.match<AdminCatalogProductList | undefined>({
      ok: value => value,
      err: (_error: AdminCatalogError) => undefined,
    })
  const draftCatalog = () =>
    draftCatalogQuery.data?.match<AdminCatalogProductList | undefined>({
      ok: value => value,
      err: (_error: AdminCatalogError) => undefined,
    })
  const hasActiveSellableProduct = () => (activeCatalog()?.total ?? 0) > 0
  const readinessProductAction = () => {
    const draft = draftCatalog()?.items[0]
    if (draft)
      return {
        title: 'Ноорог бараагаа дуусгах',
        description: 'Үнэ, үлдэгдэл, төлөвийг шалгаад худалдаанд гаргана уу.',
        href: props.catalogHref(draft.id),
      }
    return {
      title: 'Анхны бараагаа нэмэх',
      description: 'Үнэ, үлдэгдэлтэй бараа үүсгээд худалдаанд бэлдэнэ.',
      href: props.newProductHref,
    }
  }

  return (
    <section class="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-7">
      <PageHeader
        description="Захиалга, нөөц болон дэлгүүрийн бэлэн байдлыг нэг дороос шалгана."
        title="Өнөөдрийн ажил"
        titleId="dashboard-title"
      />
      <Switch>
        <Match
          when={query.isPending || activeCatalogQuery.isPending || draftCatalogQuery.isPending}
        >
          <DashboardSkeleton />
        </Match>
        <Match when={query.isError || activeCatalogQuery.isError || draftCatalogQuery.isError}>
          <div class="mt-4">
            <RetryState
              message="Интернэт холболтоо шалгаад хяналтын самбарыг дахин ачаална уу."
              onRetry={() => {
                void query.refetch()
                void activeCatalogQuery.refetch()
                void draftCatalogQuery.refetch()
              }}
              pending={
                query.isFetching || activeCatalogQuery.isFetching || draftCatalogQuery.isFetching
              }
            />
          </div>
        </Match>
        <Match when={query.data?.status === 'error' ? query.data.error : undefined}>
          {error => (
            <div class="mt-4">
              <InlineAlert title="Хяналтын мэдээлэл авах боломжгүй байна" tone="destructive">
                {error().message}
              </InlineAlert>
            </div>
          )}
        </Match>
        <Match when={query.data?.status === 'ok' ? query.data.value : undefined}>
          {dashboard => (
            <DashboardContent
              catalogHref={props.catalogHref}
              dashboard={dashboard()}
              inventoryHref={props.inventoryHref}
              isNewStore={!hasActiveSellableProduct()}
              orderHref={props.orderHref}
              readinessProductAction={readinessProductAction()}
              ordersHref={props.ordersHref}
              settingsHref={props.settingsHref}
              storefrontHref={props.storefrontHref}
            />
          )}
        </Match>
      </Switch>
    </section>
  )
}
