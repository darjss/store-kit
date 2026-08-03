import { createRoute, useNavigate } from '@tanstack/solid-router'
import type { AnyRootRoute } from '@tanstack/solid-router'

import { CatalogCreatePage } from './create'
import { CatalogDetailPage } from './detail'
import type { CatalogListSearch } from './list'
import { CatalogListPage } from './list'

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

function CatalogCreateRoute() {
  const navigate = useNavigate()

  return (
    <CatalogCreatePage
      onBack={() => void navigate({ to: '/catalog' })}
      onCreated={productId =>
        void navigate({
          to: '/catalog/$productId',
          params: { productId },
          search: { variant: undefined },
          replace: true,
        })
      }
    />
  )
}

export const createCatalogRoutes = (parentRoute: AnyRootRoute) => {
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
    const navigate = useNavigate()

    return (
      <CatalogListPage
        search={search()}
        onSearchChange={nextSearch =>
          void navigate({ to: '/catalog', search: nextSearch, replace: true })
        }
      />
    )
  }

  function CatalogDetailRoute() {
    const params = catalogDetailRoute.useParams()
    const search = catalogDetailRoute.useSearch()
    const navigate = useNavigate()

    return (
      <CatalogDetailPage
        productId={params().productId}
        variantSelection={search().variant}
        onBack={() => void navigate({ to: '/catalog' })}
        onVariantSelectionChange={variant =>
          void navigate({
            to: '/catalog/$productId',
            params: { productId: params().productId },
            search: { variant },
            replace: true,
          })
        }
      />
    )
  }

  return {
    routes: [catalogListRoute, catalogCreateRoute, catalogDetailRoute] as const,
  }
}
