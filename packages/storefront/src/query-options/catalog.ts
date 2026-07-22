import { queryOptions } from '@tanstack/solid-query'
import { Result, ResultDeserializationError } from 'better-result'
import type { SerializedResult } from 'better-result'

import { api } from '../client'

type ResponseParts<Response> = Response extends {
  data: SerializedResult<infer Value, infer Failure> | null
}
  ? [Value, Failure]
  : never
type ResponseValue<Response> = ResponseParts<Response>[0]
type ResponseFailure<Response> = ResponseParts<Response>[1]

type ProductListRequest = NonNullable<Parameters<typeof api.api.products.get>[0]>
export type ProductListFilters = NonNullable<ProductListRequest['query']>

const normalizeProductListFilters = (filters: ProductListFilters) => {
  const query = filters.query?.trim()

  return {
    ...(filters.category === undefined ? {} : { category: filters.category }),
    ...(filters.brand === undefined ? {} : { brand: filters.brand }),
    ...(filters.featured === undefined ? {} : { featured: filters.featured }),
    ...(query ? { query } : {}),
    ...(filters.minPrice === undefined ? {} : { minPrice: filters.minPrice }),
    ...(filters.maxPrice === undefined ? {} : { maxPrice: filters.maxPrice }),
    ...(filters.sort === undefined ? {} : { sort: filters.sort }),
    limit: filters.limit ?? 24,
    offset: filters.offset ?? 0,
  }
}

const findAllProducts = (filters: ProductListFilters = {}) => {
  const normalizedFilters = normalizeProductListFilters(filters)

  return queryOptions({
    queryKey: ['catalog', 'products', 'list', normalizedFilters] as const,
    queryFn: async () => {
      const response = await api.api.products.get({ query: normalizedFilters })
      const { data } = response
      if (data === null) throw new Error('Eden response did not include result data.')

      const result = Result.deserialize<
        ResponseValue<typeof response>,
        ResponseFailure<typeof response>
      >(data)
      if (result.status === 'ok') return Result.ok(result.value)
      if (ResultDeserializationError.is(result.error)) throw result.error
      return result
    },
  })
}

const findProductBySlug = (slug: string) =>
  queryOptions({
    queryKey: ['catalog', 'products', 'detail', slug] as const,
    queryFn: async () => {
      const response = await api.api.products({ slug }).get()
      const { data } = response
      if (data === null) throw new Error('Eden response did not include result data.')

      const result = Result.deserialize<
        ResponseValue<typeof response>,
        ResponseFailure<typeof response>
      >(data)
      if (result.status === 'ok') return Result.ok(result.value)
      if (ResultDeserializationError.is(result.error)) throw result.error
      return result
    },
  })

const findAllCategories = () =>
  queryOptions({
    queryKey: ['catalog', 'categories', 'list'] as const,
    queryFn: async () => {
      const response = await api.api.categories.get()
      const { data } = response
      if (data === null) throw new Error('Eden response did not include result data.')

      const result = Result.deserialize<
        ResponseValue<typeof response>,
        ResponseFailure<typeof response>
      >(data)
      if (result.status === 'ok') return Result.ok(result.value)
      if (ResultDeserializationError.is(result.error)) throw result.error
      return result
    },
  })

const findAllBrands = () =>
  queryOptions({
    queryKey: ['catalog', 'brands', 'list'] as const,
    queryFn: async () => {
      const response = await api.api.brands.get()
      const { data } = response
      if (data === null) throw new Error('Eden response did not include result data.')

      const result = Result.deserialize<
        ResponseValue<typeof response>,
        ResponseFailure<typeof response>
      >(data)
      if (result.status === 'ok') return Result.ok(result.value)
      if (ResultDeserializationError.is(result.error)) throw result.error
      return result
    },
  })

export const catalogQuery = {
  findAllProducts,
  findProductBySlug,
  findAllCategories,
  findAllBrands,
}
