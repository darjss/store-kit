import type { ProductListFilters } from '@store-kit/contracts/catalog'

import { api } from '~/client'

import { resultQueryOptions } from './result'

export type { ProductListFilters } from '@store-kit/contracts/catalog'

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

const mapPublicProduct = <
  Product extends { images: { url: string; width: number; height: number; alt: string }[] },
>(
  product: Product,
) => ({ ...product, images: product.images.map(image => image) })

const findAllProducts = (filters: ProductListFilters = {}) => {
  const normalizedFilters = normalizeProductListFilters(filters)

  return resultQueryOptions({
    queryKey: ['catalog', 'products', 'list', normalizedFilters] as const,
    request: () => api.api.products.get({ query: normalizedFilters }),
    mapValue: catalog => ({
      ...catalog,
      items: catalog.items.map(mapPublicProduct),
    }),
  })
}

const findProductBySlug = (slug: string) =>
  resultQueryOptions({
    queryKey: ['catalog', 'products', 'detail', slug] as const,
    request: () => api.api.products({ slug }).get(),
    mapValue: mapPublicProduct,
  })

const findAllCategories = () =>
  resultQueryOptions({
    queryKey: ['catalog', 'categories', 'list'] as const,
    request: () => api.api.categories.get(),
    mapValue: value => value,
  })

const findAllBrands = () =>
  resultQueryOptions({
    queryKey: ['catalog', 'brands', 'list'] as const,
    request: () => api.api.brands.get(),
    mapValue: value => value,
  })

export const catalogQuery = {
  findAllProducts,
  findProductBySlug,
  findAllCategories,
  findAllBrands,
}
