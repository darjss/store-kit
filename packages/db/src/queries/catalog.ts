import type {
  AdminCatalogProductListFilters,
  AdminProductCreate,
  AdminProductImageOrder,
  AdminProductImageUpdate,
  AdminProductUpdate,
  AdminStockUpdate,
  AdminVariantActivation,
  AdminVariantCreate,
  AdminVariantUpdate,
} from '@store-kit/contracts/admin-catalog'
import { env } from 'cloudflare:workers'
import { and, asc, count, desc, eq, exists, inArray, ne, notInArray, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'

import { db } from '../client'
import { createId } from '../ids'
import {
  brand,
  category,
  product,
  productImage,
  productVariant,
  productVariantImage,
} from '../schema/catalog'
import { order as customerOrder, orderLine } from '../schema/shopping'
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
const primaryImageR2Key = sql<string | null>`(
  select ${productImage.r2Key} from ${productImage}
  where ${productImage.productId} = ${product.id}
  order by ${productImage.sortOrder}, ${productImage.id}
  limit 1
)`
const primaryImageWidth = sql<number | null>`(
  select ${productImage.width} from ${productImage}
  where ${productImage.productId} = ${product.id}
  order by ${productImage.sortOrder}, ${productImage.id}
  limit 1
)`
const primaryImageHeight = sql<number | null>`(
  select ${productImage.height} from ${productImage}
  where ${productImage.productId} = ${product.id}
  order by ${productImage.sortOrder}, ${productImage.id}
  limit 1
)`
const primaryImageAlt = sql<string | null>`(
  select ${productImage.alt} from ${productImage}
  where ${productImage.productId} = ${product.id}
  order by ${productImage.sortOrder}, ${productImage.id}
  limit 1
)`

export const listAdminProducts = async (filters: AdminCatalogProductListFilters = {}) => {
  const limit = Math.min(filters.limit ?? 24, 100)
  const offset = filters.offset ?? 0
  const conditions: SQL[] = []

  if (filters.status) conditions.push(eq(product.status, filters.status))
  if (filters.inventory === 'low')
    conditions.push(
      exists(
        db
          .select({ value: sql`1` })
          .from(productVariant)
          .where(
            and(
              eq(productVariant.productId, product.id),
              eq(productVariant.active, true),
              sql`${productVariant.stockQuantity} between 1 and 3`,
            ),
          ),
      ),
    )
  if (filters.inventory === 'out')
    conditions.push(
      exists(
        db
          .select({ value: sql`1` })
          .from(productVariant)
          .where(
            and(
              eq(productVariant.productId, product.id),
              eq(productVariant.active, true),
              eq(productVariant.stockQuantity, 0),
            ),
          ),
      ),
    )
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
      primaryImageR2Key: primaryImageR2Key.as('admin_primary_image_r2_key'),
      primaryImageWidth: primaryImageWidth.as('admin_primary_image_width'),
      primaryImageHeight: primaryImageHeight.as('admin_primary_image_height'),
      primaryImageAlt: primaryImageAlt.as('admin_primary_image_alt'),
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
  const [rows, totalRows] = await db.batch([list, total])
  const items = rows.map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    featured: row.featured,
    brandName: row.brandName,
    categoryName: row.categoryName,
    primaryImage:
      row.primaryImageR2Key &&
      row.primaryImageWidth &&
      row.primaryImageHeight &&
      row.primaryImageAlt
        ? {
            r2Key: row.primaryImageR2Key,
            width: row.primaryImageWidth,
            height: row.primaryImageHeight,
            alt: row.primaryImageAlt,
          }
        : null,
    activeVariantCount: row.activeVariantCount,
    totalStockQuantity: row.totalStockQuantity,
    minimumPriceMnt: row.minimumPriceMnt,
    maximumPriceMnt: row.maximumPriceMnt,
    updatedAt: row.updatedAt,
  }))

  return { items, total: totalRows[0]?.value ?? 0, limit, offset }
}

export const listAdminSelectors = async () => {
  const [brands, categories] = await db.batch([
    db.query.brand.findMany({ orderBy: { name: 'asc', id: 'asc' } }),
    db.query.category.findMany({ orderBy: { name: 'asc', id: 'asc' } }),
  ])
  return {
    brands: brands.map(({ id, slug, name }) => ({ id, slug, name })),
    categories: categories.map(({ id, slug, name, active }) => ({ id, slug, name, active })),
  }
}

export const findAdminProduct = (productId: string) =>
  db.query.product.findFirst({
    where: { id: productId },
    with: {
      brand: true,
      category: true,
      images: {
        orderBy: { sortOrder: 'asc', id: 'asc' },
        with: { variantLinks: true },
      },
      variants: { orderBy: { sortOrder: 'asc', id: 'asc' } },
    },
  })

export const findProductBySlug = (slug: string) =>
  db.query.product.findFirst({ where: { slug }, columns: { id: true } })

export const findVariantBySku = (sku: string) =>
  db.query.productVariant.findFirst({ where: { sku }, columns: { id: true } })

export const findAdminVariant = (productId: string, variantId: string) =>
  db.query.productVariant.findFirst({ where: { id: variantId, productId } })

export const findAdminImage = (productId: string, imageId: string) =>
  db.query.productImage.findFirst({
    where: { id: imageId, productId },
    with: { variantLinks: true },
  })

export const findCatalogReferences = async (input: {
  brandId: string | null
  categoryId: string | null
  productId?: string
}) => {
  const [brandRecord, categoryRecord, productRecord] = await Promise.all([
    input.brandId
      ? db.query.brand.findFirst({ where: { id: input.brandId }, columns: { id: true } })
      : undefined,
    input.categoryId
      ? db.query.category.findFirst({
          where: { id: input.categoryId },
          columns: { id: true, active: true },
        })
      : undefined,
    input.productId
      ? db.query.product.findFirst({
          where: { id: input.productId },
          columns: { categoryId: true },
        })
      : undefined,
  ])
  return { brand: brandRecord, category: categoryRecord, product: productRecord }
}

export const findMissingVariantIds = async (productId: string, variantIds: string[]) => {
  if (variantIds.length === 0) return []
  const records = await db
    .select({ id: productVariant.id })
    .from(productVariant)
    .where(and(eq(productVariant.productId, productId), inArray(productVariant.id, variantIds)))
  const found = new Set(records.map(({ id }) => id))
  return variantIds.filter(id => !found.has(id))
}

export const isR2KeyReferenced = async (r2Key: string) => {
  const reference = await db
    .select({ value: sql<number>`1` })
    .from(orderLine)
    .where(eq(orderLine.imageR2Key, r2Key))
    .limit(1)
  return reference.length === 1
}

const findReferencedR2Keys = async (r2Keys: string[]) => {
  if (r2Keys.length === 0) return new Set<string>()
  const references = await db
    .selectDistinct({ r2Key: orderLine.imageR2Key })
    .from(orderLine)
    .where(inArray(orderLine.imageR2Key, r2Keys))
  return new Set(references.flatMap(({ r2Key }) => (r2Key ? [r2Key] : [])))
}

export type AdminProductCreateWrite = AdminProductCreate & { createdAt: number }

export const createAdminProduct = async (input: AdminProductCreateWrite) => {
  const productId = createId('product')
  const variantId = createId('productVariant')
  await env.DB.batch([
    env.DB.prepare(
      `insert into product
        (id, slug, brand_id, category_id, name, short_description, description, status,
         featured, details, use_cases, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', '[]', ?, ?)`,
    ).bind(
      productId,
      input.slug,
      input.brandId,
      input.categoryId,
      input.name,
      input.shortDescription,
      input.description,
      input.status,
      input.featured ? 1 : 0,
      input.createdAt,
      input.createdAt,
    ),
    env.DB.prepare(
      `insert into product_variant
        (id, product_id, sku, name, options, price_mnt, compare_at_price_mnt,
         stock_quantity, active, sort_order, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    ).bind(
      variantId,
      productId,
      input.initialVariant.sku,
      input.initialVariant.name,
      JSON.stringify(input.initialVariant.options),
      input.initialVariant.priceMnt,
      input.initialVariant.compareAtPriceMnt,
      input.initialVariant.stockQuantity,
      input.initialVariant.sortOrder,
      input.createdAt,
      input.createdAt,
    ),
  ])
  return { productId, variantId, persisted: await findAdminProduct(productId) }
}

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
  const updated = await db
    .update(product)
    .set({
      name: input.name,
      slug: input.slug,
      shortDescription: input.shortDescription,
      description: input.description,
      status: input.status,
      featured: input.featured,
      brandId: input.brandId,
      categoryId: input.categoryId,
      updatedAt: input.updatedAt,
    })
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.updatedAt, input.expectedUpdatedAt),
        ne(product.status, 'archived'),
        activationAllowed,
      ),
    )
    .returning({ id: product.id })
  return { updated: updated.length === 1, persisted: await findAdminProduct(input.productId) }
}

export const archiveAdminProduct = async (input: {
  productId: string
  expectedUpdatedAt: number
  updatedAt: number
}) => {
  const updated = await db
    .update(product)
    .set({ status: 'archived', featured: false, updatedAt: input.updatedAt })
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.updatedAt, input.expectedUpdatedAt),
        ne(product.status, 'archived'),
      ),
    )
    .returning({ id: product.id })
  return { updated: updated.length === 1, persisted: await findAdminProduct(input.productId) }
}

export const restoreAdminProduct = async (input: {
  productId: string
  expectedUpdatedAt: number
  updatedAt: number
}) => {
  const updated = await db
    .update(product)
    .set({ status: 'draft', featured: false, updatedAt: input.updatedAt })
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.updatedAt, input.expectedUpdatedAt),
        eq(product.status, 'archived'),
      ),
    )
    .returning({ id: product.id })
  return { updated: updated.length === 1, persisted: await findAdminProduct(input.productId) }
}

const hasUnresolvedOrderReference = async (input: { productId: string; variantId?: string }) => {
  const conditions = [
    eq(orderLine.productId, input.productId),
    notInArray(customerOrder.status, ['completed', 'cancelled']),
  ]
  if (input.variantId) conditions.push(eq(orderLine.variantId, input.variantId))
  const [reference] = await db
    .select({ value: sql`1` })
    .from(orderLine)
    .innerJoin(customerOrder, eq(customerOrder.id, orderLine.orderId))
    .where(and(...conditions))
    .limit(1)
  return reference !== undefined
}

export const deleteAdminProduct = async (input: {
  productId: string
  expectedUpdatedAt: number
}) => {
  const before = await findAdminProduct(input.productId)
  const unresolvedOrderReference = exists(
    db
      .select({ value: sql`1` })
      .from(orderLine)
      .innerJoin(customerOrder, eq(customerOrder.id, orderLine.orderId))
      .where(
        and(
          eq(orderLine.productId, product.id),
          notInArray(customerOrder.status, ['completed', 'cancelled']),
        ),
      ),
  )
  const deleted = await db
    .delete(product)
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.updatedAt, input.expectedUpdatedAt),
        eq(product.status, 'archived'),
        sql`not ${unresolvedOrderReference}`,
      ),
    )
    .returning({ id: product.id })
  if (deleted.length === 0)
    return {
      blocked: await hasUnresolvedOrderReference({ productId: input.productId }),
      deleted: false,
      persisted: await findAdminProduct(input.productId),
      media: [],
    }

  const keys = before?.images.map(({ r2Key }) => r2Key) ?? []
  const referenced = await findReferencedR2Keys(keys)
  return {
    blocked: false,
    deleted: true,
    persisted: undefined,
    media: keys.map(r2Key => ({ r2Key, referenced: referenced.has(r2Key) })),
  }
}

export type AdminVariantCreateWrite = AdminVariantCreate & {
  productId: string
  variantId: string
  createdAt: number
  updatedAt: number
}

export const createAdminVariant = async (input: Omit<AdminVariantCreateWrite, 'variantId'>) => {
  const variantId = createId('productVariant')
  const [inserted, version] = await env.DB.batch([
    env.DB.prepare(
      `insert into product_variant
        (id, product_id, sku, name, options, price_mnt, compare_at_price_mnt,
         stock_quantity, active, sort_order, created_at, updated_at)
       select ?, id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       from product
       where id = ? and updated_at = ? and status != 'archived'`,
    ).bind(
      variantId,
      input.sku,
      input.name,
      JSON.stringify(input.options),
      input.priceMnt,
      input.compareAtPriceMnt,
      input.stockQuantity,
      input.active ? 1 : 0,
      input.sortOrder,
      input.createdAt,
      input.createdAt,
      input.productId,
      input.expectedProductUpdatedAt,
    ),
    env.DB.prepare(
      `update product set updated_at = ?
       where id = ? and updated_at = ? and status != 'archived'`,
    ).bind(input.updatedAt, input.productId, input.expectedProductUpdatedAt),
  ])
  return {
    created: inserted.meta.changes === 1 && version.meta.changes === 1,
    variantId,
    persisted: await findAdminProduct(input.productId),
  }
}

export type AdminVariantWrite = AdminVariantUpdate & {
  productId: string
  variantId: string
  updatedAt: number
}

export const updateAdminVariant = async (input: AdminVariantWrite) => {
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
  const compareAtAllowed =
    input.compareAtPriceMnt === null
      ? undefined
      : sql`${input.compareAtPriceMnt} > ${input.priceMnt}`
  const editableProduct = exists(
    db
      .select({ value: sql`1` })
      .from(product)
      .where(and(eq(product.id, productVariant.productId), ne(product.status, 'archived'))),
  )
  const updated = await db
    .update(productVariant)
    .set({
      sku: input.sku,
      name: input.name,
      options: input.options,
      priceMnt: input.priceMnt,
      compareAtPriceMnt: input.compareAtPriceMnt,
      stockQuantity: input.stockQuantity,
      active: input.active,
      sortOrder: input.sortOrder,
      updatedAt: input.updatedAt,
    })
    .where(
      and(
        eq(productVariant.id, input.variantId),
        eq(productVariant.productId, input.productId),
        eq(productVariant.updatedAt, input.expectedUpdatedAt),
        editableProduct,
        compareAtAllowed,
        lastActiveVariantAllowed,
      ),
    )
    .returning({ id: productVariant.id })
  return { updated: updated.length === 1, persisted: await findAdminProduct(input.productId) }
}

export type AdminVariantActivationWrite = AdminVariantActivation & {
  productId: string
  variantId: string
  updatedAt: number
}

export const updateAdminVariantActivation = async (input: AdminVariantActivationWrite) => {
  const current = await findAdminVariant(input.productId, input.variantId)
  if (!current)
    return {
      updated: false,
      persisted: await findAdminProduct(input.productId),
      variant: undefined,
    }
  return updateAdminVariant({
    productId: input.productId,
    variantId: input.variantId,
    expectedUpdatedAt: input.expectedUpdatedAt,
    sku: current.sku,
    name: current.name,
    options: current.options,
    priceMnt: current.priceMnt,
    compareAtPriceMnt: current.compareAtPriceMnt,
    stockQuantity: current.stockQuantity,
    active: input.active,
    sortOrder: current.sortOrder,
    updatedAt: input.updatedAt,
  })
}

export type AdminStockWrite = AdminStockUpdate & {
  productId: string
  variantId: string
  updatedAt: number
}

export const updateAdminStock = async (input: AdminStockWrite) => {
  const editableProduct = exists(
    db
      .select({ value: sql`1` })
      .from(product)
      .where(and(eq(product.id, productVariant.productId), ne(product.status, 'archived'))),
  )
  const updated = await db
    .update(productVariant)
    .set({ stockQuantity: input.stockQuantity, updatedAt: input.updatedAt })
    .where(
      and(
        eq(productVariant.id, input.variantId),
        eq(productVariant.productId, input.productId),
        eq(productVariant.updatedAt, input.expectedUpdatedAt),
        editableProduct,
      ),
    )
    .returning({ id: productVariant.id })
  return { updated: updated.length === 1, persisted: await findAdminProduct(input.productId) }
}

export const deleteAdminVariant = async (input: {
  productId: string
  variantId: string
  expectedProductUpdatedAt: number
  expectedVariantUpdatedAt: number
  updatedAt: number
}) => {
  const current = await findAdminVariant(input.productId, input.variantId)
  if (!current)
    return {
      blocked: false,
      deleted: false,
      persisted: await findAdminProduct(input.productId),
    }
  const [deleted, version] = await env.DB.batch([
    env.DB.prepare(
      `delete from product_variant
       where id = ? and product_id = ? and updated_at = ? and active = 0
         and not exists (
           select 1 from order_line
           join customer_order on customer_order.id = order_line.order_id
           where order_line.variant_id = product_variant.id
             and customer_order.status not in ('completed', 'cancelled')
         )
         and exists (
           select 1 from product
           where id = ? and updated_at = ? and status != 'archived'
         )`,
    ).bind(
      input.variantId,
      input.productId,
      input.expectedVariantUpdatedAt,
      input.productId,
      input.expectedProductUpdatedAt,
    ),
    env.DB.prepare(
      `update product set updated_at = ?
       where id = ? and updated_at = ? and status != 'archived'
         and not exists (
           select 1 from product_variant where id = ? and product_id = ?
         )`,
    ).bind(
      input.updatedAt,
      input.productId,
      input.expectedProductUpdatedAt,
      input.variantId,
      input.productId,
    ),
  ])
  return {
    blocked:
      deleted.meta.changes === 0 &&
      (await hasUnresolvedOrderReference({
        productId: input.productId,
        variantId: input.variantId,
      })),
    deleted: deleted.meta.changes > 0 && version.meta.changes === 1,
    persisted: await findAdminProduct(input.productId),
  }
}

export const attachAdminImage = async (input: {
  productId: string
  expectedUpdatedAt: number
  updatedAt: number
  imageId: string
  r2Key: string
  width: number
  height: number
  alt: string
  variantIds: string[]
  createdAt: number
}) => {
  const lastImage = await db.query.productImage.findFirst({
    where: { productId: input.productId },
    orderBy: { sortOrder: 'desc', id: 'desc' },
    columns: { sortOrder: true },
  })
  const sortOrder = (lastImage?.sortOrder ?? 0) + 10
  const statements = [
    env.DB.prepare(
      `insert into product_image
        (id, product_id, r2_key, width, height, alt, sort_order, created_at)
       select ?, id, ?, ?, ?, ?, ?, ?
       from product
       where id = ? and updated_at = ? and status != 'archived'`,
    ).bind(
      input.imageId,
      input.r2Key,
      input.width,
      input.height,
      input.alt,
      sortOrder,
      input.createdAt,
      input.productId,
      input.expectedUpdatedAt,
    ),
    ...input.variantIds.map(variantId =>
      env.DB.prepare(
        `insert into product_variant_image (product_id, variant_id, image_id)
         select image.product_id, variant.id, image.id
         from product_image image
         join product_variant variant
           on variant.id = ? and variant.product_id = image.product_id
         where image.id = ? and image.product_id = ?`,
      ).bind(variantId, input.imageId, input.productId),
    ),
    env.DB.prepare(
      `update product set updated_at = ?
       where id = ? and updated_at = ? and status != 'archived'`,
    ).bind(input.updatedAt, input.productId, input.expectedUpdatedAt),
  ]
  const results = await env.DB.batch(statements)
  return {
    attached: results[0]?.meta.changes === 1 && results.at(-1)?.meta.changes === 1,
    persisted: await findAdminProduct(input.productId),
  }
}

export const updateAdminImage = async (
  productId: string,
  imageId: string,
  input: AdminProductImageUpdate & { updatedAt: number },
) => {
  const statements = [
    env.DB.prepare(
      `update product_image set alt = ?
       where id = ? and product_id = ?
         and exists (
           select 1 from product
           where id = ? and updated_at = ? and status != 'archived'
         )`,
    ).bind(input.alt, imageId, productId, productId, input.expectedUpdatedAt),
    env.DB.prepare(
      `delete from product_variant_image
       where image_id = ? and product_id = ?
         and exists (
           select 1 from product
           where id = ? and updated_at = ? and status != 'archived'
         )`,
    ).bind(imageId, productId, productId, input.expectedUpdatedAt),
    ...input.variantIds.map(variantId =>
      env.DB.prepare(
        `insert into product_variant_image (product_id, variant_id, image_id)
         select image.product_id, variant.id, image.id
         from product_image image
         join product_variant variant
           on variant.id = ? and variant.product_id = image.product_id
         where image.id = ? and image.product_id = ?
           and exists (
             select 1 from product
             where id = ? and updated_at = ? and status != 'archived'
           )`,
      ).bind(variantId, imageId, productId, productId, input.expectedUpdatedAt),
    ),
    env.DB.prepare(
      `update product set updated_at = ?
       where id = ? and updated_at = ? and status != 'archived'
         and exists (
           select 1 from product_image where id = ? and product_id = ?
         )`,
    ).bind(input.updatedAt, productId, input.expectedUpdatedAt, imageId, productId),
  ]
  const results = await env.DB.batch(statements)
  return {
    updated: results[0]?.meta.changes === 1 && results.at(-1)?.meta.changes === 1,
    persisted: await findAdminProduct(productId),
  }
}

export const reorderAdminImages = async (
  productId: string,
  input: AdminProductImageOrder & { updatedAt: number },
) => {
  const current = await db
    .select({ id: productImage.id })
    .from(productImage)
    .where(eq(productImage.productId, productId))
  const currentIds = current.map(({ id }) => id).toSorted()
  const requestedIds = input.imageIds.toSorted()
  if (
    currentIds.length !== requestedIds.length ||
    currentIds.some((imageId, index) => imageId !== requestedIds[index])
  )
    return { updated: false, persisted: await findAdminProduct(productId) }

  const statements = [
    env.DB.prepare(
      `update product_image set sort_order = sort_order + 1000000
       where product_id = ?
         and exists (
           select 1 from product
           where id = ? and updated_at = ? and status != 'archived'
         )`,
    ).bind(productId, productId, input.expectedUpdatedAt),
    ...input.imageIds.map((imageId, index) =>
      env.DB.prepare(
        `update product_image set sort_order = ?
         where id = ? and product_id = ?
           and exists (
             select 1 from product
             where id = ? and updated_at = ? and status != 'archived'
           )`,
      ).bind((index + 1) * 10, imageId, productId, productId, input.expectedUpdatedAt),
    ),
    env.DB.prepare(
      `update product set updated_at = ?
       where id = ? and updated_at = ? and status != 'archived'`,
    ).bind(input.updatedAt, productId, input.expectedUpdatedAt),
  ]
  const results = await env.DB.batch(statements)
  return {
    updated: results.at(-1)?.meta.changes === 1,
    persisted: await findAdminProduct(productId),
  }
}

export const removeAdminImage = async (input: {
  productId: string
  imageId: string
  expectedUpdatedAt: number
  updatedAt: number
}) => {
  const image = await findAdminImage(input.productId, input.imageId)
  if (!image)
    return {
      removed: false,
      image: undefined,
      persisted: await findAdminProduct(input.productId),
      referenced: false,
    }
  const [removed, version, reference] = await env.DB.batch([
    env.DB.prepare(
      `delete from product_image
       where id = ? and product_id = ?
         and exists (
           select 1 from product
           where id = ? and updated_at = ? and status != 'archived'
         )`,
    ).bind(input.imageId, input.productId, input.productId, input.expectedUpdatedAt),
    env.DB.prepare(
      `update product set updated_at = ?
       where id = ? and updated_at = ? and status != 'archived'
         and not exists (
           select 1 from product_image where id = ? and product_id = ?
         )`,
    ).bind(
      input.updatedAt,
      input.productId,
      input.expectedUpdatedAt,
      input.imageId,
      input.productId,
    ),
    env.DB.prepare(
      `select exists(
         select 1 from order_line where image_r2_key = ?
       ) as referenced`,
    ).bind(image.r2Key),
  ])
  const didRemove = removed.meta.changes > 0 && version.meta.changes === 1
  const referenceRow = reference.results[0] as { referenced?: number } | undefined
  return {
    removed: didRemove,
    image,
    persisted: await findAdminProduct(input.productId),
    referenced: didRemove && referenceRow?.referenced === 1,
  }
}

export const catalogQuery = {
  listPublishedProducts,
  findPublishedProductBySlug,
  listPublishedCategories,
  listBrands,
  listAdminProducts,
  listAdminSelectors,
  findAdminProduct,
  findProductBySlug,
  findVariantBySku,
  findAdminVariant,
  findAdminImage,
  findCatalogReferences,
  findMissingVariantIds,
  createAdminProduct,
  updateAdminProduct,
  archiveAdminProduct,
  restoreAdminProduct,
  deleteAdminProduct,
  createAdminVariant,
  updateAdminVariant,
  updateAdminVariantActivation,
  updateAdminStock,
  deleteAdminVariant,
  attachAdminImage,
  updateAdminImage,
  reorderAdminImages,
  removeAdminImage,
  isR2KeyReferenced,
}
