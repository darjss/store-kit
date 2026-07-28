import type {
  AdminCatalogError,
  AdminCatalogProductDetail,
  AdminCatalogProductList,
  AdminCatalogProductListFilters,
  AdminProductUpdate,
  AdminStockUpdate,
  AdminVariantUpdate,
} from '@store-kit/contracts/admin-catalog'
import type { ProductListFilters, ProductNotFound } from '@store-kit/contracts/catalog'
import { database } from '@store-kit/db'
import { Result } from 'better-result'

import { createProductNotFound } from '~/errors/catalog'

export type ProductDetail = NonNullable<
  Awaited<ReturnType<typeof database.query.catalog.findPublishedProductBySlug>>
>

export const listCatalogProducts = async (filters: ProductListFilters = {}) => {
  const normalizedFilters = {
    ...filters,
    query: filters.query?.trim() || undefined,
    limit: filters.limit ?? 24,
    offset: filters.offset ?? 0,
  } satisfies ProductListFilters
  if (
    normalizedFilters.minPrice !== undefined &&
    normalizedFilters.maxPrice !== undefined &&
    normalizedFilters.minPrice > normalizedFilters.maxPrice
  ) {
    throw new Error('Minimum price cannot exceed maximum price.')
  }
  return Result.ok(await database.query.catalog.listPublishedProducts(normalizedFilters))
}

export const getCatalogProduct = async (slug: string) => {
  const product = await database.query.catalog.findPublishedProductBySlug(slug)

  return product
    ? Result.ok<ProductDetail, ProductNotFound>(product)
    : Result.err<ProductDetail, ProductNotFound>(createProductNotFound(slug))
}

export const listCatalogBrands = database.query.catalog.listBrands
export const listCatalogCategories = database.query.catalog.listPublishedCategories

const nextVersion = (expectedUpdatedAt: number) => Math.max(Date.now(), expectedUpdatedAt + 1)

const toAdminProductDetail = (
  record: NonNullable<Awaited<ReturnType<typeof database.query.catalog.findAdminProduct>>>,
): AdminCatalogProductDetail => ({
  id: record.id,
  name: record.name,
  slug: record.slug,
  status: record.status,
  featured: record.featured,
  brandName: record.brand?.name ?? null,
  categoryName: record.category?.name ?? null,
  updatedAt: record.updatedAt,
  variants: record.variants.map(variant => ({
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    name: variant.name,
    options: variant.options,
    priceMnt: variant.priceMnt,
    compareAtPriceMnt: variant.compareAtPriceMnt,
    stockQuantity: variant.stockQuantity,
    active: variant.active,
    updatedAt: variant.updatedAt,
  })),
})

const productNotFound = (productId: string) => ({
  _tag: 'AdminCatalogProductNotFound' as const,
  productId,
  message: 'The product no longer exists.',
})

const variantNotFound = (productId: string, variantId: string) => ({
  _tag: 'AdminCatalogVariantNotFound' as const,
  productId,
  variantId,
  message: 'The product variant no longer exists.',
})

const catalogConflict = (productId: string, variantId?: string) => ({
  _tag: 'AdminCatalogConflict' as const,
  productId,
  ...(variantId ? { variantId } : {}),
  message: 'This catalog record changed. Reload the current data and try again.',
})

export const listAdminCatalogProducts = async (filters: AdminCatalogProductListFilters = {}) => {
  const normalized = {
    ...filters,
    query: filters.query?.trim() || undefined,
    inventory: filters.inventory ?? 'all',
    limit: filters.limit ?? 24,
    offset: filters.offset ?? 0,
  } satisfies AdminCatalogProductListFilters
  return Result.ok<AdminCatalogProductList, AdminCatalogError>(
    await database.query.catalog.listAdminProducts(normalized),
  )
}

export const getAdminCatalogProduct = async (productId: string) => {
  const record = await database.query.catalog.findAdminProduct(productId)
  return record
    ? Result.ok<AdminCatalogProductDetail, AdminCatalogError>(toAdminProductDetail(record))
    : Result.err<AdminCatalogProductDetail, AdminCatalogError>(productNotFound(productId))
}

export const updateAdminCatalogProduct = async (productId: string, input: AdminProductUpdate) => {
  const write = await database.query.catalog.updateAdminProduct({
    productId,
    ...input,
    updatedAt: nextVersion(input.expectedUpdatedAt),
  })
  if (!write.persisted)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(productNotFound(productId))
  if (write.persisted.updatedAt !== input.expectedUpdatedAt && !write.updated)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(catalogConflict(productId))
  if (input.status === 'active' && !write.persisted.variants.some(variant => variant.active))
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>({
      _tag: 'ProductActivationBlocked',
      productId,
      message: 'An active product must have at least one active variant.',
    })
  if (!write.updated)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(catalogConflict(productId))
  return Result.ok<AdminCatalogProductDetail, AdminCatalogError>(
    toAdminProductDetail(write.persisted),
  )
}

export const updateAdminCatalogVariant = async (
  productId: string,
  variantId: string,
  input: AdminVariantUpdate,
) => {
  const write = await database.query.catalog.updateAdminVariant({
    productId,
    variantId,
    ...input,
    updatedAt: nextVersion(input.expectedUpdatedAt),
  })
  if (!write.persisted)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(productNotFound(productId))
  const variant = write.persisted.variants.find(candidate => candidate.id === variantId)
  if (!variant)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(
      variantNotFound(productId, variantId),
    )
  if (variant.updatedAt !== input.expectedUpdatedAt && !write.updated)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(
      catalogConflict(productId, variantId),
    )

  const nextPrice = input.priceMnt ?? variant.priceMnt
  const nextCompareAt =
    input.compareAtPriceMnt === undefined ? variant.compareAtPriceMnt : input.compareAtPriceMnt
  if (nextCompareAt !== null && nextCompareAt <= nextPrice)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>({
      _tag: 'InvalidCompareAtPrice',
      productId,
      variantId,
      message: 'Compare-at price must be greater than the current price.',
    })

  const activeVariantCount = write.persisted.variants.filter(candidate => candidate.active).length
  if (
    input.active === false &&
    variant.active &&
    write.persisted.status === 'active' &&
    activeVariantCount === 1
  )
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>({
      _tag: 'LastActiveVariantBlocked',
      productId,
      variantId,
      message: 'An active product must retain at least one active variant.',
    })

  if (!write.updated)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(
      catalogConflict(productId, variantId),
    )
  return Result.ok<AdminCatalogProductDetail, AdminCatalogError>(
    toAdminProductDetail(write.persisted),
  )
}

export const updateAdminCatalogStock = async (
  productId: string,
  variantId: string,
  input: AdminStockUpdate,
) => {
  const write = await database.query.catalog.updateAdminStock({
    productId,
    variantId,
    ...input,
    updatedAt: nextVersion(input.expectedUpdatedAt),
  })
  if (!write.persisted)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(productNotFound(productId))
  const variant = write.persisted.variants.find(candidate => candidate.id === variantId)
  if (!variant)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(
      variantNotFound(productId, variantId),
    )
  if (!write.updated)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(
      catalogConflict(productId, variantId),
    )
  return Result.ok<AdminCatalogProductDetail, AdminCatalogError>(
    toAdminProductDetail(write.persisted),
  )
}

export const catalogOperations = {
  listProducts: listCatalogProducts,
  getProduct: getCatalogProduct,
  listBrands: listCatalogBrands,
  listCategories: listCatalogCategories,
  listAdminProducts: listAdminCatalogProducts,
  getAdminProduct: getAdminCatalogProduct,
  updateAdminProduct: updateAdminCatalogProduct,
  updateAdminVariant: updateAdminCatalogVariant,
  updateAdminStock: updateAdminCatalogStock,
}
