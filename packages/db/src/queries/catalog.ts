import { and, count, desc, eq, sql } from 'drizzle-orm'

import { db } from '../client'
import { brand, category, product } from '../schema/catalog'
import type { ProductListFilters } from '../schemas/catalog'

export const listPublishedProducts = async (filters: ProductListFilters = {}) => {
  const limit = Math.min(filters.limit ?? 24, 100)
  const offset = filters.offset ?? 0
  const conditions = [eq(product.status, 'active')]

  if (filters.category) {
    conditions.push(eq(category.slug, filters.category))
  }

  if (filters.brand) {
    conditions.push(eq(brand.slug, filters.brand))
  }

  if (filters.featured !== undefined) {
    conditions.push(eq(product.featured, filters.featured))
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

  const where = and(...conditions)
  const publishedProductIds = db
    .select({ id: product.id })
    .from(product)
    .leftJoin(category, eq(product.categoryId, category.id))
    .leftJoin(brand, eq(product.brandId, brand.id))
    .where(where)
    .orderBy(desc(product.featured), desc(product.createdAt))
    .limit(limit)
    .offset(offset)

  const [items, [{ total }]] = await Promise.all([
    db.query.product.findMany({
      where: {
        RAW: (product, { inArray }) => inArray(product.id, publishedProductIds),
      },
      with: {
        brand: true,
        category: {
          where: { active: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
          with: {
            imageLinks: true,
          },
        },
      },
      orderBy: {
        featured: 'desc',
        createdAt: 'desc',
      },
    }),
    db
      .select({ total: count() })
      .from(product)
      .leftJoin(category, eq(product.categoryId, category.id))
      .leftJoin(brand, eq(product.brandId, brand.id))
      .where(where),
  ])

  return { items, total, limit, offset }
}

export const findPublishedProductBySlug = async (slug: string) =>
  db.query.product.findFirst({
    where: {
      slug,
      status: 'active',
    },
    with: {
      brand: true,
      category: {
        where: { active: true },
      },
      images: {
        orderBy: { sortOrder: 'asc' },
      },
      variants: {
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
        with: {
          imageLinks: true,
        },
      },
    },
  })

export const listPublishedCategories = async () =>
  db.query.category.findMany({
    where: { active: true },
    orderBy: {
      sortOrder: 'asc',
      name: 'asc',
    },
  })

export const listBrands = async () =>
  db.query.brand.findMany({
    where: {
      products: { status: 'active' },
    },
    orderBy: { name: 'asc' },
  })
