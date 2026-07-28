import type {
  AdminCatalogProductListFilters,
  AdminProductUpdate,
  AdminStockUpdate,
  AdminVariantUpdate,
} from '@store-kit/contracts/admin-catalog'
import { and, asc, count, desc, eq, exists, gt, gte, isNull, lte, ne, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'

import { db } from '../client'
import {
  brand,
  category,
  product,
  productImage,
  productVariant,
  productVariantImage,
} from '../schema/catalog'
import type { ProductListFilters } from '../schemas/catalog'

export type PublishedProduct = typeof product.$inferSelect & {
  brand: typeof brand.$inferSelect | null
  category: typeof category.$inferSelect | null
  images: (typeof productImage.$inferSelect)[]
  variants: (typeof productVariant.$inferSelect & {
    imageLinks: (typeof productVariantImage.$inferSelect)[]
  })[]
}

type PublishedProductList = {
  items: PublishedProduct[]
  total: number
  limit: number
  offset: number
}

export const listPublishedProducts = async (
  filters: ProductListFilters = {},
): Promise<PublishedProductList> => {
  const limit = Math.min(filters.limit ?? 24, 100)
  const offset = filters.offset ?? 0
  const conditions = [eq(product.status, 'active')]

  if (filters.category) conditions.push(eq(category.slug, filters.category))
  if (filters.brand) conditions.push(eq(brand.slug, filters.brand))
  if (filters.featured !== undefined) conditions.push(eq(product.featured, filters.featured))
  if (filters.useCase) {
    conditions.push(
      sql`exists (select 1 from json_each(${product.useCases}) where json_each.value = ${filters.useCase})`,
    )
  }

  if (filters.query) {
    const search = `%${filters.query
      .toLowerCase()
      .replaceAll('\\', '\\\\')
      .replaceAll('%', '\\%')
      .replaceAll('_', '\\_')}%`
    conditions.push(sql`(
      lower(${product.name}) like ${search} escape '\\'
      or lower(coalesce(${product.description}, '')) like ${search} escape '\\'
      or lower(coalesce(${brand.name}, '')) like ${search} escape '\\'
    )`)
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    conditions.push(sql`exists (
      select 1 from ${productVariant}
      where ${productVariant.productId} = ${product.id}
        and ${productVariant.active} = 1
        ${filters.minPrice === undefined ? sql`` : sql`and ${productVariant.priceMnt} >= ${filters.minPrice}`}
        ${filters.maxPrice === undefined ? sql`` : sql`and ${productVariant.priceMnt} <= ${filters.maxPrice}`}
    )`)
  }

  const where = and(...conditions)
  const minimumActivePrice = sql<number>`(
    select min(${productVariant.priceMnt}) from ${productVariant}
    where ${productVariant.productId} = ${product.id} and ${productVariant.active} = 1
  )`

  const publishedProductIds = db
    .select({ id: product.id })
    .from(product)
    .leftJoin(category, eq(product.categoryId, category.id))
    .leftJoin(brand, eq(product.brandId, brand.id))
    .where(where)

  if (filters.sort === 'recent') {
    publishedProductIds.orderBy(desc(product.createdAt), desc(product.id))
  } else if (filters.sort === 'price-asc') {
    publishedProductIds.orderBy(asc(minimumActivePrice), desc(product.createdAt), desc(product.id))
  } else if (filters.sort === 'price-desc') {
    publishedProductIds.orderBy(desc(minimumActivePrice), desc(product.createdAt), desc(product.id))
  } else {
    publishedProductIds.orderBy(desc(product.featured), desc(product.createdAt), desc(product.id))
  }
  publishedProductIds.limit(limit).offset(offset)

  const itemOrder = (table: typeof product, operators: { asc: typeof asc; desc: typeof desc }) => {
    const minimumPrice = sql<number>`(
      select min(${productVariant.priceMnt}) from ${productVariant}
      where ${productVariant.productId} = ${table.id} and ${productVariant.active} = 1
    )`
    if (filters.sort === 'recent')
      return [operators.desc(table.createdAt), operators.desc(table.id)]
    if (filters.sort === 'price-asc') {
      return [
        operators.asc(minimumPrice),
        operators.desc(table.createdAt),
        operators.desc(table.id),
      ]
    }
    if (filters.sort === 'price-desc') {
      return [
        operators.desc(minimumPrice),
        operators.desc(table.createdAt),
        operators.desc(table.id),
      ]
    }
    return [
      operators.desc(table.featured),
      operators.desc(table.createdAt),
      operators.desc(table.id),
    ]
  }

  const itemsQuery = db.query.product.findMany({
    where: {
      RAW: (product, { inArray }) => inArray(product.id, publishedProductIds),
    },
    with: {
      brand: true,
      category: { where: { active: true } },
      images: { orderBy: { sortOrder: 'asc' } },
      variants: {
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
        with: { imageLinks: true },
      },
    },
    orderBy: itemOrder,
  })
  const countQuery = db
    .select({ total: count() })
    .from(product)
    .leftJoin(category, eq(product.categoryId, category.id))
    .leftJoin(brand, eq(product.brandId, brand.id))
    .where(where)

  const [items, [{ total }]] = await db.batch([itemsQuery, countQuery])
  return { items, total, limit, offset }
}

export const findPublishedProductBySlug = (slug: string): Promise<PublishedProduct | undefined> =>
  db.query.product.findFirst({
    where: { slug, status: 'active' },
    with: {
      brand: true,
      category: { where: { active: true } },
      images: { orderBy: { sortOrder: 'asc' } },
      variants: {
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
        with: { imageLinks: true },
      },
    },
  })

export const listPublishedCategories = (): Promise<(typeof category.$inferSelect)[]> =>
  db.query.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc', name: 'asc' },
  })

export const listBrands = (): Promise<(typeof brand.$inferSelect)[]> =>
  db.query.brand.findMany({
    where: { products: { status: 'active' } },
    orderBy: { name: 'asc' },
  })

const activeVariantCount = sql<number>`(
  select count(*) from ${productVariant}
  where ${productVariant.productId} = ${product.id} and ${productVariant.active} = 1
)`
const totalActiveStock = sql<number>`(
  select coalesce(sum(${productVariant.stockQuantity}), 0) from ${productVariant}
  where ${productVariant.productId} = ${product.id} and ${productVariant.active} = 1
)`
const minimumActivePrice = sql<number | null>`(
  select min(${productVariant.priceMnt}) from ${productVariant}
  where ${productVariant.productId} = ${product.id} and ${productVariant.active} = 1
)`
const maximumActivePrice = sql<number | null>`(
  select max(${productVariant.priceMnt}) from ${productVariant}
  where ${productVariant.productId} = ${product.id} and ${productVariant.active} = 1
)`

export const listAdminProducts = async (filters: AdminCatalogProductListFilters = {}) => {
  const limit = Math.min(filters.limit ?? 24, 100)
  const offset = filters.offset ?? 0
  const conditions: SQL[] = []

  if (filters.status) conditions.push(eq(product.status, filters.status))
  if (filters.inventory === 'low')
    conditions.push(gte(totalActiveStock, 1), lte(totalActiveStock, 3))
  if (filters.inventory === 'out') conditions.push(eq(totalActiveStock, 0))
  if (filters.query) {
    const search = `%${filters.query
      .toLowerCase()
      .replaceAll('\\', '\\\\')
      .replaceAll('%', '\\%')
      .replaceAll('_', '\\_')}%`
    conditions.push(sql`(
      lower(${product.name}) like ${search} escape '\\'
      or lower(${product.slug}) like ${search} escape '\\'
      or lower(coalesce(${brand.name}, '')) like ${search} escape '\\'
      or exists (
        select 1 from ${productVariant}
        where ${productVariant.productId} = ${product.id}
          and lower(${productVariant.sku}) like ${search} escape '\\'
      )
    )`)
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined
  const list = db
    .select({
      id: sql<string>`${product.id}`.as('admin_product_id'),
      name: sql<string>`${product.name}`.as('admin_product_name'),
      slug: sql<string>`${product.slug}`.as('admin_product_slug'),
      status: sql<(typeof product.$inferSelect)['status']>`${product.status}`.as(
        'admin_product_status',
      ),
      featured: sql<boolean>`${product.featured}`
        .mapWith(product.featured)
        .as('admin_product_featured'),
      brandName: sql<string | null>`${brand.name}`.as('admin_brand_name'),
      categoryName: sql<string | null>`${category.name}`.as('admin_category_name'),
      activeVariantCount: activeVariantCount.as('admin_active_variant_count'),
      totalStockQuantity: totalActiveStock.as('admin_total_stock_quantity'),
      minimumPriceMnt: minimumActivePrice.as('admin_minimum_price_mnt'),
      maximumPriceMnt: maximumActivePrice.as('admin_maximum_price_mnt'),
      updatedAt: sql<number>`${product.updatedAt}`.as('admin_product_updated_at'),
    })
    .from(product)
    .leftJoin(brand, eq(brand.id, product.brandId))
    .leftJoin(category, eq(category.id, product.categoryId))
    .where(where)
    .orderBy(desc(product.updatedAt), desc(product.id))
    .limit(limit)
    .offset(offset)
  const total = db
    .select({ value: count() })
    .from(product)
    .leftJoin(brand, eq(brand.id, product.brandId))
    .leftJoin(category, eq(category.id, product.categoryId))
    .where(where)
  const [items, totalRows] = await db.batch([list, total])

  return { items, total: totalRows[0]?.value ?? 0, limit, offset }
}

export const findAdminProduct = (productId: string) =>
  db.query.product.findFirst({
    where: { id: productId },
    with: {
      brand: true,
      category: true,
      variants: { orderBy: { sortOrder: 'asc', id: 'asc' } },
    },
  })

export type AdminProductWrite = AdminProductUpdate & {
  productId: string
  updatedAt: number
}

export const updateAdminProduct = async (input: AdminProductWrite) => {
  const activationAllowed =
    input.status === 'active'
      ? exists(
          db
            .select({ value: sql`1` })
            .from(productVariant)
            .where(and(eq(productVariant.productId, product.id), eq(productVariant.active, true))),
        )
      : undefined
  const update = db
    .update(product)
    .set({ status: input.status, featured: input.featured, updatedAt: input.updatedAt })
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.updatedAt, input.expectedUpdatedAt),
        activationAllowed,
      ),
    )
    .returning({ id: product.id })
  const [updated] = await db.batch([update])
  const persisted = await findAdminProduct(input.productId)
  return { updated: updated.length === 1, persisted }
}

export type AdminVariantWrite = AdminVariantUpdate & {
  productId: string
  variantId: string
  updatedAt: number
}

export const updateAdminVariant = async (input: AdminVariantWrite) => {
  const resultingPrice = input.priceMnt ?? productVariant.priceMnt
  const compareAtAllowed =
    input.compareAtPriceMnt === null
      ? undefined
      : input.compareAtPriceMnt === undefined
        ? or(
            isNull(productVariant.compareAtPriceMnt),
            gt(productVariant.compareAtPriceMnt, resultingPrice),
          )
        : sql`${input.compareAtPriceMnt} > ${resultingPrice}`
  const activeSibling = alias(productVariant, 'active_sibling')
  const lastActiveVariantAllowed =
    input.active === false
      ? or(
          eq(productVariant.active, false),
          exists(
            db
              .select({ value: sql`1` })
              .from(product)
              .where(and(eq(product.id, productVariant.productId), ne(product.status, 'active'))),
          ),
          exists(
            db
              .select({ value: sql`1` })
              .from(activeSibling)
              .where(
                and(
                  eq(activeSibling.productId, productVariant.productId),
                  ne(activeSibling.id, productVariant.id),
                  eq(activeSibling.active, true),
                ),
              ),
          ),
        )
      : undefined
  const update = db
    .update(productVariant)
    .set({
      priceMnt: input.priceMnt,
      compareAtPriceMnt: input.compareAtPriceMnt,
      active: input.active,
      updatedAt: input.updatedAt,
    })
    .where(
      and(
        eq(productVariant.id, input.variantId),
        eq(productVariant.productId, input.productId),
        eq(productVariant.updatedAt, input.expectedUpdatedAt),
        compareAtAllowed,
        lastActiveVariantAllowed,
      ),
    )
    .returning({ id: productVariant.id })
  const [updated] = await db.batch([update])
  const persisted = await findAdminProduct(input.productId)
  return { updated: updated.length === 1, persisted }
}

export type AdminStockWrite = AdminStockUpdate & {
  productId: string
  variantId: string
  updatedAt: number
}

export const updateAdminStock = async (input: AdminStockWrite) => {
  const update = db
    .update(productVariant)
    .set({ stockQuantity: input.stockQuantity, updatedAt: input.updatedAt })
    .where(
      and(
        eq(productVariant.id, input.variantId),
        eq(productVariant.productId, input.productId),
        eq(productVariant.updatedAt, input.expectedUpdatedAt),
      ),
    )
    .returning({ id: productVariant.id })
  const [updated] = await db.batch([update])
  const persisted = await findAdminProduct(input.productId)
  return { updated: updated.length === 1, persisted }
}

export const catalogQuery = {
  listPublishedProducts,
  findPublishedProductBySlug,
  listPublishedCategories,
  listBrands,
  listAdminProducts,
  findAdminProduct,
  updateAdminProduct,
  updateAdminVariant,
  updateAdminStock,
}
