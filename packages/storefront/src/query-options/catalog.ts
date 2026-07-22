import { queryOptions } from '@tanstack/solid-query'

import { api } from '../client'
import { deserializeResult } from '../result'

type ProductListRequest = NonNullable<Parameters<typeof api.api.products.get>[0]>
export type ProductListFilters = NonNullable<ProductListRequest['query']>

const normalizeProductListFilters = (filters: ProductListFilters) => {
  const query = filters.query?.trim()

  return {
    ...(filters.category === undefined ? {} : { category: filters.category }),
    ...(filters.brand === undefined ? {} : { brand: filters.brand }),
    ...(filters.featured === undefined ? {} : { featured: filters.featured }),
    ...(query ? { query } : {}),
    limit: filters.limit ?? 24,
    offset: filters.offset ?? 0,
  }
}

export const productListOptions = (filters: ProductListFilters) => {
  const normalizedFilters = normalizeProductListFilters(filters)

  return queryOptions({
    queryKey: ['catalog', 'products', 'list', normalizedFilters] as const,
    queryFn: async () => {
      const response = await api.api.products.get({ query: normalizedFilters })

      if (response.error) {
        throw response.error
      }

      return deserializeResult(response.data)
    },
  })
}

export const productDetailOptions = (slug: string) =>
  queryOptions({
    queryKey: ['catalog', 'products', 'detail', slug] as const,
    queryFn: async () => {
      const response = await api.api.products({ slug }).get()

      if (response.error) {
        throw response.error
      }

      return deserializeResult(response.data)
    },
  })

export const categoryListOptions = () =>
  queryOptions({
    queryKey: ['catalog', 'categories', 'list'] as const,
    queryFn: async () => {
      const response = await api.api.categories.get()

      if (response.error) {
        throw response.error
      }

      return deserializeResult(response.data)
    },
  })

export const brandListOptions = () =>
  queryOptions({
    queryKey: ['catalog', 'brands', 'list'] as const,
    queryFn: async () => {
      const response = await api.api.brands.get()

      if (response.error) {
        throw response.error
      }

      return deserializeResult(response.data)
    },
  })
