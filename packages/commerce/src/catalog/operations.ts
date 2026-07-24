import { query as dbQuery } from '@store-kit/db'
import { productListFiltersSchema } from '@store-kit/db/schemas'
import type { ProductListFilters } from '@store-kit/db/schemas'
import { Result } from 'better-result'
import { Value } from 'typebox/value'

import { createProductNotFound } from './errors'
import type { ProductNotFound } from './errors'

export type ProductDetail = NonNullable<
  Awaited<ReturnType<typeof dbQuery.catalog.findPublishedProductBySlug>>
>

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
  return Result.ok(await dbQuery.catalog.listPublishedProducts(normalizedFilters))
}

export const getCatalogProduct = async (slug: string) => {
  const product = await dbQuery.catalog.findPublishedProductBySlug(slug)

  return product
    ? Result.ok<ProductDetail, ProductNotFound>(product)
    : Result.err<ProductDetail, ProductNotFound>(createProductNotFound(slug))
}

export const listCatalogBrands = dbQuery.catalog.listBrands
export const listCatalogCategories = dbQuery.catalog.listPublishedCategories

export const catalogOperations = {
  listProducts: listCatalogProducts,
  getProduct: getCatalogProduct,
  listBrands: listCatalogBrands,
  listCategories: listCatalogCategories,
}

export type { ProductListFilters } from '@store-kit/db/schemas'
export type { ProductNotFound } from './errors'
