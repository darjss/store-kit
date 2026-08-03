import type { AdminCatalogProductDetail } from '@store-kit/contracts/admin-catalog'
import type { QueryClient } from '@tanstack/solid-query'
import { Result } from 'better-result'

import { catalogKeys } from './query-options'

export const updateCatalogProductCache = async (
  queryClient: QueryClient,
  product: AdminCatalogProductDetail,
) => {
  queryClient.setQueryData(catalogKeys.detail(product.id), Result.ok(product))
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: catalogKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: catalogKeys.publicProducts }),
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
  ])
}
