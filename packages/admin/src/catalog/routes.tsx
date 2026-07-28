import { createRoute, useParams, useRouter } from '@tanstack/solid-router'
import type { AnyRootRoute } from '@tanstack/solid-router'

import { CatalogDetailPage } from './detail'
import type { CatalogListSearch } from './list'
import { CatalogListPage } from './list'
import type { CatalogRequests } from './query-options'

const integerSearchValue = (value: unknown, fallback: number, minimum: number, maximum: number) => {
  const candidate =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isInteger(candidate) && candidate >= minimum && candidate <= maximum
    ? candidate
    : fallback
}

export const normalizeCatalogSearch = (search: Record<string, unknown>): CatalogListSearch => {
  const query = typeof search.query === 'string' ? search.query.trim() : ''
  const status = search.status
  const inventory = search.inventory

  return {
    ...(query ? { query } : {}),
    ...(status === 'draft' || status === 'active' || status === 'archived' ? { status } : {}),
    inventory: inventory === 'low' || inventory === 'out' ? inventory : 'all',
    limit: integerSearchValue(search.limit, 24, 1, 100),
    offset: integerSearchValue(search.offset, 0, 0, Number.MAX_SAFE_INTEGER),
  }
}

const catalogPath = (basepath: string) => `${basepath === '/' ? '' : basepath}/catalog`

const catalogListHref = (basepath: string, search: CatalogListSearch) => {
  const parameters = new URLSearchParams()
  if (search.query) parameters.set('query', search.query)
  if (search.status) parameters.set('status', search.status)
  if (search.inventory !== 'all') parameters.set('inventory', search.inventory)
  if (search.limit !== 24) parameters.set('limit', String(search.limit))
  if (search.offset > 0) parameters.set('offset', String(search.offset))
  const query = parameters.toString()
  return `${catalogPath(basepath)}${query ? `?${query}` : ''}`
}

const productIdFromParams = (params: unknown) => {
  if (
    typeof params === 'object' &&
    params !== null &&
    'productId' in params &&
    typeof params.productId === 'string'
  )
    return params.productId
  return ''
}

export const createCatalogRoutes = (parentRoute: AnyRootRoute, requests: CatalogRequests) => {
  const catalogListRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/catalog',
    validateSearch: normalizeCatalogSearch,
    component: CatalogListRoute,
  })

  const catalogDetailRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/catalog/$productId',
    component: CatalogDetailRoute,
  })

  function CatalogListRoute() {
    const search = catalogListRoute.useSearch()
    const router = useRouter()

    return (
      <CatalogListPage
        productHref={productId => `${catalogPath(router.basepath)}/${productId}`}
        requests={requests}
        search={search()}
        onSearchChange={nextSearch =>
          void router.navigate({
            href: catalogListHref(router.basepath, nextSearch),
            replace: true,
          })
        }
      />
    )
  }

  function CatalogDetailRoute() {
    const params = useParams({ strict: false })
    const router = useRouter()

    return (
      <CatalogDetailPage
        productId={productIdFromParams(params())}
        requests={requests}
        onBack={() => void router.navigate({ href: catalogPath(router.basepath) })}
      />
    )
  }

  return {
    catalogListRoute,
    catalogDetailRoute,
    routes: [catalogListRoute, catalogDetailRoute] as const,
  }
}
