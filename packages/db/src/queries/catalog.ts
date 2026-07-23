import { and, asc, count, desc, eq, sql } from 'drizzle-orm'

import { db } from '../client'
import { brand, category, product, productVariant } from '../schema/catalog'
import type { ProductListFilters } from '../schemas/catalog'

export const listPublishedProducts = async (filters: ProductListFilters = {}) => {
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

export const findPublishedProductBySlug = async (slug: string) =>
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

export const listPublishedCategories = async () =>
  db.query.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc', name: 'asc' },
  })

export const listBrands = async () =>
  db.query.brand.findMany({
    where: { products: { status: 'active' } },
    orderBy: { name: 'asc' },
  })
