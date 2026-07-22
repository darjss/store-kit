import {
  findPublishedProductBySlug,
  listBrands,
  listPublishedCategories,
  listPublishedProducts,
} from '@store-kit/db/queries'
import { productListFiltersSchema } from '@store-kit/db/schemas'
import type { ProductListFilters } from '@store-kit/db/schemas'
import { Result } from 'better-result'
import { Value } from 'typebox/value'

import { createProductNotFound } from './errors'
import type { ProductNotFound } from './errors'

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof findPublishedProductBySlug>>>

export const listCatalogProducts = async (filters: ProductListFilters = {}) => {
  const normalizedFilters = Value.Parse(productListFiltersSchema, {
    ...filters,
    query: filters.query?.trim() || undefined,
    limit: filters.limit ?? 24,
    offset: filters.offset ?? 0,
  })
  if (
    normalizedFilters.minPrice !== undefined &&
    normalizedFilters.maxPrice !== undefined &&
    normalizedFilters.minPrice > normalizedFilters.maxPrice
  ) {
    throw new Error('Minimum price cannot exceed maximum price.')
  }
  return Result.ok(await listPublishedProducts(normalizedFilters))
}

export const getCatalogProduct = async (slug: string) => {
  const product = await findPublishedProductBySlug(slug)

  return product
    ? Result.ok<ProductDetail, ProductNotFound>(product)
    : Result.err<ProductDetail, ProductNotFound>(createProductNotFound(slug))
}

export { listBrands as listCatalogBrands, listPublishedCategories as listCatalogCategories }
export type { ProductListFilters } from '@store-kit/db/schemas'
export type { ProductNotFound } from './errors'
