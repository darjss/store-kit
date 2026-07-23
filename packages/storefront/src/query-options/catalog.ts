import { api } from '../client'
import { resultQueryOptions } from './result'

type ProductListRequest = NonNullable<Parameters<typeof api.api.products.get>[0]>
export type ProductListFilters = NonNullable<ProductListRequest['query']>

const normalizeProductListFilters = (filters: ProductListFilters) => {
  const query = filters.query?.trim()

  return {
    ...(filters.category === undefined ? {} : { category: filters.category }),
    ...(filters.brand === undefined ? {} : { brand: filters.brand }),
    ...(filters.useCase === undefined ? {} : { useCase: filters.useCase }),
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

  return resultQueryOptions({
    queryKey: ['catalog', 'products', 'list', normalizedFilters] as const,
    request: () => api.api.products.get({ query: normalizedFilters }),
  })
}

const findProductBySlug = (slug: string) =>
  resultQueryOptions({
    queryKey: ['catalog', 'products', 'detail', slug] as const,
    request: () => api.api.products({ slug }).get(),
  })

const findAllCategories = () =>
  resultQueryOptions({
    queryKey: ['catalog', 'categories', 'list'] as const,
    request: () => api.api.categories.get(),
  })

const findAllBrands = () =>
  resultQueryOptions({
    queryKey: ['catalog', 'brands', 'list'] as const,
    request: () => api.api.brands.get(),
  })

export const catalogQuery = {
  findAllProducts,
  findProductBySlug,
  findAllCategories,
  findAllBrands,
}
