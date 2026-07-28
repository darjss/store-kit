import { createRoute, useParams, useRouter } from '@tanstack/solid-router'
import type { AnyRootRoute } from '@tanstack/solid-router'

import { OrderDetailPage } from './detail'
import type { OrderListSearch } from './list'
import { OrderListPage } from './list'
import type { OrderRequests } from './query-options'

const integerSearchValue = (value: unknown, fallback: number, minimum: number, maximum: number) => {
  const candidate =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isInteger(candidate) && candidate >= minimum && candidate <= maximum
    ? candidate
    : fallback
}

export const normalizeOrderSearch = (search: Record<string, unknown>): OrderListSearch => {
  const query = typeof search.query === 'string' ? search.query.trim() : ''
  const status = search.status
  const paymentStatus = search.paymentStatus

  return {
    ...(query ? { query } : {}),
    ...(status === 'new' ||
    status === 'confirmed' ||
    status === 'preparing' ||
    status === 'delivering' ||
    status === 'completed' ||
    status === 'cancelled'
      ? { status }
      : {}),
    ...(paymentStatus === 'pending' ||
    paymentStatus === 'claimed' ||
    paymentStatus === 'confirming' ||
    paymentStatus === 'paid' ||
    paymentStatus === 'failed'
      ? { paymentStatus }
      : {}),
    limit: integerSearchValue(search.limit, 25, 1, 100),
    offset: integerSearchValue(search.offset, 0, 0, Number.MAX_SAFE_INTEGER),
  }
}

const ordersPath = (basepath: string) => `${basepath === '/' ? '' : basepath}/orders`

const orderListHref = (basepath: string, search: OrderListSearch) => {
  const parameters = new URLSearchParams()
  if (search.query) parameters.set('query', search.query)
  if (search.status) parameters.set('status', search.status)
  if (search.paymentStatus) parameters.set('paymentStatus', search.paymentStatus)
  if (search.limit !== 25) parameters.set('limit', String(search.limit))
  if (search.offset > 0) parameters.set('offset', String(search.offset))
  const query = parameters.toString()
  return `${ordersPath(basepath)}${query ? `?${query}` : ''}`
}

const orderIdFromParams = (params: unknown) => {
  if (
    typeof params === 'object' &&
    params !== null &&
    'orderId' in params &&
    typeof params.orderId === 'string'
  )
    return params.orderId
  return ''
}

export const createOrderRoutes = (parentRoute: AnyRootRoute, requests: OrderRequests) => {
  const orderListRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/orders',
    validateSearch: normalizeOrderSearch,
    component: OrderListRoute,
  })

  const orderDetailRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/orders/$orderId',
    component: OrderDetailRoute,
  })

  function OrderListRoute() {
    const search = orderListRoute.useSearch()
    const router = useRouter()

    return (
      <OrderListPage
        requests={requests}
        search={search()}
        onOpenOrder={orderId =>
          void router.navigate({ href: `${ordersPath(router.basepath)}/${orderId}` })
        }
        onSearchChange={nextSearch =>
          void router.navigate({
            href: orderListHref(router.basepath, nextSearch),
            replace: true,
          })
        }
      />
    )
  }

  function OrderDetailRoute() {
    const params = useParams({ strict: false })
    const router = useRouter()

    return (
      <OrderDetailPage
        orderId={orderIdFromParams(params())}
        requests={requests}
        onBack={() => void router.navigate({ href: ordersPath(router.basepath) })}
      />
    )
  }

  return {
    orderListRoute,
    orderDetailRoute,
    routes: [orderListRoute, orderDetailRoute] as const,
  }
}
