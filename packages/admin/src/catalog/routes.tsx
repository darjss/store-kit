import { createRoute, useParams, useRouter } from '@tanstack/solid-router'
import type { AnyRootRoute } from '@tanstack/solid-router'

import { CatalogCreatePage } from './create'
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

const normalizeCatalogDetailSearch = (search: Record<string, unknown>) => ({
  variant:
    typeof search.variant === 'string' && search.variant.trim() ? search.variant.trim() : undefined,
})

const catalogPath = (basepath: string) => `${basepath === '/' ? '' : basepath}/catalog`
const newProductHref = (basepath: string) => `${catalogPath(basepath)}/new`
const productHref = (basepath: string, productId: string) => `${catalogPath(basepath)}/${productId}`

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

  const catalogCreateRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/catalog/new',
    component: CatalogCreateRoute,
  })

  const catalogDetailRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/catalog/$productId',
    validateSearch: normalizeCatalogDetailSearch,
    component: CatalogDetailRoute,
  })

  function CatalogListRoute() {
    const search = catalogListRoute.useSearch()
    const router = useRouter()

    return (
      <CatalogListPage
        onNewProduct={() => void router.navigate({ href: newProductHref(router.basepath) })}
        productHref={productId => productHref(router.basepath, productId)}
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

  function CatalogCreateRoute() {
    const router = useRouter()

    return (
      <CatalogCreatePage
        requests={requests}
        onBack={() => void router.navigate({ href: catalogPath(router.basepath) })}
        onCreated={productId =>
          void router.navigate({ href: productHref(router.basepath, productId), replace: true })
        }
      />
    )
  }

  function CatalogDetailRoute() {
    const params = useParams({ strict: false })
    const search = catalogDetailRoute.useSearch()
    const router = useRouter()
    const productId = () => productIdFromParams(params())

    return (
      <CatalogDetailPage
        productId={productId()}
        requests={requests}
        variantSelection={search().variant}
        onBack={() => void router.navigate({ href: catalogPath(router.basepath) })}
        onVariantSelectionChange={selection => {
          const parameters = new URLSearchParams()
          if (selection) parameters.set('variant', selection)
          const query = parameters.toString()
          void router.navigate({
            href: `${productHref(router.basepath, productId())}${query ? `?${query}` : ''}`,
            replace: true,
          })
        }}
      />
    )
  }

  return {
    catalogListRoute,
    catalogCreateRoute,
    catalogDetailRoute,
    routes: [catalogListRoute, catalogCreateRoute, catalogDetailRoute] as const,
  }
}
