import { createRoute, useNavigate } from '@tanstack/solid-router'
import type { AnyRootRoute } from '@tanstack/solid-router'

import { OrderDetailPage } from './detail'
import type { OrderListSearch } from './list'
import { OrderListPage } from './list'

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

export const createOrderRoutes = (parentRoute: AnyRootRoute) => {
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
    const navigate = useNavigate()

    return (
      <OrderListPage
        search={search()}
        onSearchChange={nextSearch =>
          void navigate({ to: '/orders', search: nextSearch, replace: true })
        }
      />
    )
  }

  function OrderDetailRoute() {
    const params = orderDetailRoute.useParams()
    const navigate = useNavigate()

    return (
      <OrderDetailPage orderId={params().orderId} onBack={() => void navigate({ to: '/orders' })} />
    )
  }

  return { routes: [orderListRoute, orderDetailRoute] as const }
}
