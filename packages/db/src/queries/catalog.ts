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
import {
  aliasedColumn,
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  inArray,
  lte,
  max,
  min,
  ne,
  notExists,
  notInArray,
  or,
  sql,
  sum,
} from 'drizzle-orm'
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
  if (filters.useCase)
    conditions.push(
      sql`exists (select 1 from json_each(${product.useCases}) where json_each.value = ${filters.useCase})`,
    )

  if (filters.query) {
    const search = `%${filters.query
      .toLowerCase()
      .replaceAll('\\', '\\\\')
      .replaceAll('%', '\\%')
      .replaceAll('_', '\\_')}%`
    conditions.push(sql`(
      lower(${product.name}) like ${search} escape '\\'
      or lower(${product.description}) like ${search} escape '\\'
      or lower(${brand.name}) like ${search} escape '\\'
    )`)
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const priceConditions = [
      eq(productVariant.productId, product.id),
      eq(productVariant.active, true),
    ]
    if (filters.minPrice !== undefined)
      priceConditions.push(gte(productVariant.priceMnt, filters.minPrice))
    if (filters.maxPrice !== undefined)
      priceConditions.push(lte(productVariant.priceMnt, filters.maxPrice))
    conditions.push(
      exists(
        db
          .select({ id: productVariant.id })
          .from(productVariant)
          .where(and(...priceConditions)),
      ),
    )
  }

  const activePrices = db
    .select({
      productId: productVariant.productId,
      minimumPriceMnt: min(productVariant.priceMnt).as('minimum_price_mnt'),
    })
    .from(productVariant)
    .where(eq(productVariant.active, true))
    .groupBy(productVariant.productId)
    .as('active_prices')
  const where = and(...conditions)
  const productIds = db
    .select({ id: product.id })
    .from(product)
    .leftJoin(category, eq(product.categoryId, category.id))
    .leftJoin(brand, eq(product.brandId, brand.id))
    .leftJoin(activePrices, eq(activePrices.productId, product.id))
    .where(where)

  if (filters.sort === 'recent') {
    productIds.orderBy(desc(product.createdAt), desc(product.id))
  } else if (filters.sort === 'price-asc') {
    productIds.orderBy(asc(activePrices.minimumPriceMnt), desc(product.createdAt), desc(product.id))
  } else if (filters.sort === 'price-desc') {
    productIds.orderBy(
      desc(activePrices.minimumPriceMnt),
      desc(product.createdAt),
      desc(product.id),
    )
  } else {
    productIds.orderBy(desc(product.featured), desc(product.createdAt), desc(product.id))
  }
  productIds.limit(limit).offset(offset)

  const countQuery = db
    .select({ total: count() })
    .from(product)
    .leftJoin(category, eq(product.categoryId, category.id))
    .leftJoin(brand, eq(product.brandId, brand.id))
    .where(where)
  const [idRows, [{ total }]] = await db.batch([productIds, countQuery])
  const ids = idRows.map(({ id }) => id)
  if (ids.length === 0) return { items: [], total, limit, offset }

  const unorderedItems = await db.query.product.findMany({
    where: { id: { in: ids } },
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
  const order = new Map(ids.map((id, index) => [id, index]))
  const items = unorderedItems.toSorted((left, right) => order.get(left.id)! - order.get(right.id)!)
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

const activeVariantSummary = db
  .select({
    productId: productVariant.productId,
    count: count(productVariant.id).as('active_variant_count'),
    stock: sum(productVariant.stockQuantity).mapWith(Number).as('total_stock_quantity'),
    minimumPrice: min(productVariant.priceMnt).as('minimum_price_mnt'),
    maximumPrice: max(productVariant.priceMnt).as('maximum_price_mnt'),
  })
  .from(productVariant)
  .where(eq(productVariant.active, true))
  .groupBy(productVariant.productId)
  .as('active_variant_summary')

const primaryImageOrder = db
  .select({
    productId: productImage.productId,
    sortOrder: min(productImage.sortOrder).as('primary_sort_order'),
  })
  .from(productImage)
  .groupBy(productImage.productId)
  .as('primary_image_order')

const primaryImage = db
  .select({
    productId: productImage.productId,
    r2Key: productImage.r2Key,
    width: productImage.width,
    height: productImage.height,
    alt: productImage.alt,
  })
  .from(productImage)
  .innerJoin(
    primaryImageOrder,
    and(
      eq(primaryImageOrder.productId, productImage.productId),
      eq(primaryImageOrder.sortOrder, productImage.sortOrder),
    ),
  )
  .as('primary_image')

export const listAdminProducts = async (filters: AdminCatalogProductListFilters = {}) => {
  const limit = Math.min(filters.limit ?? 24, 100)
  const offset = filters.offset ?? 0
  const conditions: SQL[] = []

  if (filters.status) conditions.push(eq(product.status, filters.status))
  if (filters.inventory === 'low')
    conditions.push(
      exists(
        db
          .select({ id: productVariant.id })
          .from(productVariant)
          .where(
            and(
              eq(productVariant.productId, product.id),
              eq(productVariant.active, true),
              gte(productVariant.stockQuantity, 1),
              lte(productVariant.stockQuantity, 3),
            ),
          ),
      ),
    )
  if (filters.inventory === 'out')
    conditions.push(
      exists(
        db
          .select({ id: productVariant.id })
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
    const matchingSku = db
      .select({ id: productVariant.id })
      .from(productVariant)
      .where(
        and(
          eq(productVariant.productId, product.id),
          sql`lower(${productVariant.sku}) like ${search} escape '\\'`,
        ),
      )
    conditions.push(
      or(
        sql`lower(${product.name}) like ${search} escape '\\'`,
        sql`lower(${product.slug}) like ${search} escape '\\'`,
        sql`lower(${brand.name}) like ${search} escape '\\'`,
        exists(matchingSku),
      )!,
    )
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined
  const list = db
    .select({
      id: aliasedColumn(product.id, 'admin_product_id'),
      name: aliasedColumn(product.name, 'admin_product_name'),
      slug: aliasedColumn(product.slug, 'admin_product_slug'),
      status: aliasedColumn(product.status, 'admin_product_status'),
      featured: aliasedColumn(product.featured, 'admin_product_featured'),
      brandName: aliasedColumn(brand.name, 'admin_brand_name'),
      categoryName: aliasedColumn(category.name, 'admin_category_name'),
      primaryImageR2Key: aliasedColumn(primaryImage.r2Key, 'admin_primary_image_r2_key'),
      primaryImageWidth: aliasedColumn(primaryImage.width, 'admin_primary_image_width'),
      primaryImageHeight: aliasedColumn(primaryImage.height, 'admin_primary_image_height'),
      primaryImageAlt: aliasedColumn(primaryImage.alt, 'admin_primary_image_alt'),
      activeVariantCount: activeVariantSummary.count,
      totalStockQuantity: activeVariantSummary.stock,
      minimumPriceMnt: activeVariantSummary.minimumPrice,
      maximumPriceMnt: activeVariantSummary.maximumPrice,
      updatedAt: aliasedColumn(product.updatedAt, 'admin_product_updated_at'),
    })
    .from(product)
    .leftJoin(brand, eq(brand.id, product.brandId))
    .leftJoin(category, eq(category.id, product.categoryId))
    .leftJoin(activeVariantSummary, eq(activeVariantSummary.productId, product.id))
    .leftJoin(primaryImage, eq(primaryImage.productId, product.id))
    .where(where)
    .orderBy(desc(product.updatedAt), desc(product.id))
    .limit(limit)
    .offset(offset)
  const total = db
    .select({ value: count() })
    .from(product)
    .leftJoin(brand, eq(brand.id, product.brandId))
    .leftJoin(activeVariantSummary, eq(activeVariantSummary.productId, product.id))
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
    primaryImage: row.primaryImageR2Key
      ? {
          r2Key: row.primaryImageR2Key,
          width: row.primaryImageWidth!,
          height: row.primaryImageHeight!,
          alt: row.primaryImageAlt!,
        }
      : null,
    activeVariantCount: row.activeVariantCount ?? 0,
    totalStockQuantity: row.totalStockQuantity ?? 0,
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
    .select({ id: orderLine.id })
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
  const [products, variants] = await db.batch([
    db
      .insert(product)
      .values({
        id: productId,
        slug: input.slug,
        brandId: input.brandId,
        categoryId: input.categoryId,
        name: input.name,
        shortDescription: input.shortDescription,
        description: input.description,
        status: input.status,
        featured: input.featured,
        details: {},
        useCases: [],
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
      })
      .returning({ id: product.id }),
    db
      .insert(productVariant)
      .values({
        id: variantId,
        productId,
        sku: input.initialVariant.sku,
        name: input.initialVariant.name,
        options: input.initialVariant.options,
        priceMnt: input.initialVariant.priceMnt,
        compareAtPriceMnt: input.initialVariant.compareAtPriceMnt,
        stockQuantity: input.initialVariant.stockQuantity,
        active: true,
        sortOrder: input.initialVariant.sortOrder,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
      })
      .returning({ id: productVariant.id }),
  ])
  return {
    productId,
    variantId,
    created: products.length === 1 && variants.length === 1,
    persisted: await findAdminProduct(productId),
  }
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
            .select({ id: productVariant.id })
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
    .select({ id: orderLine.id })
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
  const unresolvedOrderReference = db
    .select({ id: orderLine.id })
    .from(orderLine)
    .innerJoin(customerOrder, eq(customerOrder.id, orderLine.orderId))
    .where(
      and(
        eq(orderLine.productId, product.id),
        notInArray(customerOrder.status, ['completed', 'cancelled']),
      ),
    )
  const deleted = await db
    .delete(product)
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.updatedAt, input.expectedUpdatedAt),
        eq(product.status, 'archived'),
        notExists(unresolvedOrderReference),
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
  const insert = db
    .insert(productVariant)
    .select(
      db
        .select({
          id: sql<string>`${variantId}`.as('id'),
          productId: product.id,
          sku: sql<string>`${input.sku}`.as('sku'),
          name: sql<string>`${input.name}`.as('name'),
          options: sql<
            typeof input.options
          >`${sql.param(input.options, productVariant.options)}`.as('options'),
          priceMnt: sql<number>`${input.priceMnt}`.as('price_mnt'),
          compareAtPriceMnt: sql<number | null>`${input.compareAtPriceMnt}`.as(
            'compare_at_price_mnt',
          ),
          stockQuantity: sql<number>`${input.stockQuantity}`.as('stock_quantity'),
          active: sql<boolean>`${sql.param(input.active, productVariant.active)}`.as('active'),
          sortOrder: sql<number>`${input.sortOrder}`.as('sort_order'),
          createdAt: sql<number>`${input.createdAt}`.as('created_at'),
          updatedAt: sql<number>`${input.createdAt}`.as('updated_at'),
        })
        .from(product)
        .where(
          and(
            eq(product.id, input.productId),
            eq(product.updatedAt, input.expectedProductUpdatedAt),
            ne(product.status, 'archived'),
          ),
        ),
    )
    .returning({ id: productVariant.id })
  const version = db
    .update(product)
    .set({ updatedAt: input.updatedAt })
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.updatedAt, input.expectedProductUpdatedAt),
        ne(product.status, 'archived'),
        exists(
          db
            .select({ id: productVariant.id })
            .from(productVariant)
            .where(
              and(eq(productVariant.id, variantId), eq(productVariant.productId, input.productId)),
            ),
        ),
      ),
    )
    .returning({ id: product.id })
  const [inserted, versioned] = await db.batch([insert, version])
  return {
    created: inserted.length === 1 && versioned.length === 1,
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
              .select({ id: product.id })
              .from(product)
              .where(and(eq(product.id, productVariant.productId), ne(product.status, 'active'))),
          ),
          exists(
            db
              .select({ id: activeSibling.id })
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
      .select({ id: product.id })
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
      .select({ id: product.id })
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
  const editableProduct = db
    .select({ id: product.id })
    .from(product)
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.updatedAt, input.expectedProductUpdatedAt),
        ne(product.status, 'archived'),
      ),
    )
  const unresolvedOrderReference = db
    .select({ id: orderLine.id })
    .from(orderLine)
    .innerJoin(customerOrder, eq(customerOrder.id, orderLine.orderId))
    .where(
      and(
        eq(orderLine.variantId, productVariant.id),
        notInArray(customerOrder.status, ['completed', 'cancelled']),
      ),
    )
  const remove = db
    .delete(productVariant)
    .where(
      and(
        eq(productVariant.id, input.variantId),
        eq(productVariant.productId, input.productId),
        eq(productVariant.updatedAt, input.expectedVariantUpdatedAt),
        eq(productVariant.active, false),
        exists(editableProduct),
        notExists(unresolvedOrderReference),
      ),
    )
    .returning({ id: productVariant.id })
  const version = db
    .update(product)
    .set({ updatedAt: input.updatedAt })
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.updatedAt, input.expectedProductUpdatedAt),
        ne(product.status, 'archived'),
        notExists(
          db
            .select({ id: productVariant.id })
            .from(productVariant)
            .where(
              and(
                eq(productVariant.id, input.variantId),
                eq(productVariant.productId, input.productId),
              ),
            ),
        ),
      ),
    )
    .returning({ id: product.id })
  const [deleted, versioned] = await db.batch([remove, version])
  return {
    blocked:
      deleted.length === 0 &&
      (await hasUnresolvedOrderReference({
        productId: input.productId,
        variantId: input.variantId,
      })),
    deleted: deleted.length === 1 && versioned.length === 1,
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
  const editableProduct = db
    .select({ id: product.id })
    .from(product)
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.updatedAt, input.expectedUpdatedAt),
        ne(product.status, 'archived'),
      ),
    )
  const validVariantGuards = input.variantIds.map(variantId =>
    exists(
      db
        .select({ id: productVariant.id })
        .from(productVariant)
        .where(
          and(eq(productVariant.id, variantId), eq(productVariant.productId, input.productId)),
        ),
    ),
  )
  const insertImage = db
    .insert(productImage)
    .select(
      db
        .select({
          id: sql<string>`${input.imageId}`.as('id'),
          productId: product.id,
          r2Key: sql<string>`${input.r2Key}`.as('r2_key'),
          width: sql<number>`${input.width}`.as('width'),
          height: sql<number>`${input.height}`.as('height'),
          alt: sql<string>`${input.alt}`.as('alt'),
          sortOrder: sql<number>`${sortOrder}`.as('sort_order'),
          createdAt: sql<number>`${input.createdAt}`.as('created_at'),
        })
        .from(product)
        .where(
          and(
            eq(product.id, input.productId),
            eq(product.updatedAt, input.expectedUpdatedAt),
            ne(product.status, 'archived'),
            ...validVariantGuards,
          ),
        ),
    )
    .returning({ id: productImage.id })
  const insertVariantLinks = input.variantIds.map(variantId =>
    db
      .insert(productVariantImage)
      .select(
        db
          .select({
            productId: productImage.productId,
            variantId: productVariant.id,
            imageId: productImage.id,
          })
          .from(productImage)
          .innerJoin(
            productVariant,
            and(
              eq(productVariant.id, variantId),
              eq(productVariant.productId, productImage.productId),
            ),
          )
          .where(
            and(
              eq(productImage.id, input.imageId),
              eq(productImage.productId, input.productId),
              exists(editableProduct),
              ...validVariantGuards,
            ),
          ),
      )
      .returning({ variantId: productVariantImage.variantId }),
  )
  const attachedLinks = input.variantIds.map(variantId =>
    exists(
      db
        .select({ variantId: productVariantImage.variantId })
        .from(productVariantImage)
        .where(
          and(
            eq(productVariantImage.productId, input.productId),
            eq(productVariantImage.variantId, variantId),
            eq(productVariantImage.imageId, input.imageId),
          ),
        ),
    ),
  )
  const version = db
    .update(product)
    .set({ updatedAt: input.updatedAt })
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.updatedAt, input.expectedUpdatedAt),
        ne(product.status, 'archived'),
        exists(
          db
            .select({ id: productImage.id })
            .from(productImage)
            .where(
              and(eq(productImage.id, input.imageId), eq(productImage.productId, input.productId)),
            ),
        ),
        ...attachedLinks,
      ),
    )
    .returning({ id: product.id })
  const results = await db.batch([insertImage, ...insertVariantLinks, version])
  return {
    attached: results[0]?.length === 1 && results.at(-1)?.length === 1,
    persisted: await findAdminProduct(input.productId),
  }
}

export const updateAdminImage = async (
  productId: string,
  imageId: string,
  input: AdminProductImageUpdate & { updatedAt: number },
) => {
  const editableProduct = db
    .select({ id: product.id })
    .from(product)
    .where(
      and(
        eq(product.id, productId),
        eq(product.updatedAt, input.expectedUpdatedAt),
        ne(product.status, 'archived'),
      ),
    )
  const targetImage = db
    .select({ id: productImage.id })
    .from(productImage)
    .where(and(eq(productImage.id, imageId), eq(productImage.productId, productId)))
  const validVariantGuards = input.variantIds.map(variantId =>
    exists(
      db
        .select({ id: productVariant.id })
        .from(productVariant)
        .where(and(eq(productVariant.id, variantId), eq(productVariant.productId, productId))),
    ),
  )
  const writeGuards = [exists(editableProduct), exists(targetImage), ...validVariantGuards]
  const updateImage = db
    .update(productImage)
    .set({ alt: input.alt })
    .where(and(eq(productImage.id, imageId), eq(productImage.productId, productId), ...writeGuards))
    .returning({ id: productImage.id })
  const removeVariantLinks = db
    .delete(productVariantImage)
    .where(
      and(
        eq(productVariantImage.imageId, imageId),
        eq(productVariantImage.productId, productId),
        ...writeGuards,
      ),
    )
    .returning({ variantId: productVariantImage.variantId })
  const insertVariantLinks = input.variantIds.map(variantId =>
    db
      .insert(productVariantImage)
      .select(
        db
          .select({
            productId: productImage.productId,
            variantId: productVariant.id,
            imageId: productImage.id,
          })
          .from(productImage)
          .innerJoin(
            productVariant,
            and(
              eq(productVariant.id, variantId),
              eq(productVariant.productId, productImage.productId),
            ),
          )
          .where(
            and(
              eq(productImage.id, imageId),
              eq(productImage.productId, productId),
              ...writeGuards,
            ),
          ),
      )
      .returning({ variantId: productVariantImage.variantId }),
  )
  const attachedLinks = input.variantIds.map(variantId =>
    exists(
      db
        .select({ variantId: productVariantImage.variantId })
        .from(productVariantImage)
        .where(
          and(
            eq(productVariantImage.productId, productId),
            eq(productVariantImage.variantId, variantId),
            eq(productVariantImage.imageId, imageId),
          ),
        ),
    ),
  )
  const version = db
    .update(product)
    .set({ updatedAt: input.updatedAt })
    .where(
      and(
        eq(product.id, productId),
        eq(product.updatedAt, input.expectedUpdatedAt),
        ne(product.status, 'archived'),
        exists(targetImage),
        ...attachedLinks,
      ),
    )
    .returning({ id: product.id })
  const results = await db.batch([updateImage, removeVariantLinks, ...insertVariantLinks, version])
  return {
    updated: results[0]?.length === 1 && results.at(-1)?.length === 1,
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

  const editableProduct = exists(
    db
      .select({ id: product.id })
      .from(product)
      .where(
        and(
          eq(product.id, productId),
          eq(product.updatedAt, input.expectedUpdatedAt),
          ne(product.status, 'archived'),
        ),
      ),
  )
  const requestedImageGuards = input.imageIds.map(imageId =>
    exists(
      db
        .select({ id: productImage.id })
        .from(productImage)
        .where(and(eq(productImage.id, imageId), eq(productImage.productId, productId))),
    ),
  )
  const moveAside = db
    .update(productImage)
    .set({ sortOrder: sql`${productImage.sortOrder} + 1000000` })
    .where(and(eq(productImage.productId, productId), editableProduct, ...requestedImageGuards))
    .returning({ id: productImage.id })
  const reorder = input.imageIds.map((imageId, index) =>
    db
      .update(productImage)
      .set({ sortOrder: (index + 1) * 10 })
      .where(
        and(
          eq(productImage.id, imageId),
          eq(productImage.productId, productId),
          editableProduct,
          ...requestedImageGuards,
        ),
      )
      .returning({ id: productImage.id }),
  )
  const orderedImageGuards = input.imageIds.map((imageId, index) =>
    exists(
      db
        .select({ id: productImage.id })
        .from(productImage)
        .where(
          and(
            eq(productImage.id, imageId),
            eq(productImage.productId, productId),
            eq(productImage.sortOrder, (index + 1) * 10),
          ),
        ),
    ),
  )
  const version = db
    .update(product)
    .set({ updatedAt: input.updatedAt })
    .where(
      and(
        eq(product.id, productId),
        eq(product.updatedAt, input.expectedUpdatedAt),
        ne(product.status, 'archived'),
        ...orderedImageGuards,
      ),
    )
    .returning({ id: product.id })
  const results = await db.batch([moveAside, ...reorder, version])
  return {
    updated: results.at(-1)?.length === 1,
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
  const editableProduct = db
    .select({ id: product.id })
    .from(product)
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.updatedAt, input.expectedUpdatedAt),
        ne(product.status, 'archived'),
      ),
    )
  const remove = db
    .delete(productImage)
    .where(
      and(
        eq(productImage.id, input.imageId),
        eq(productImage.productId, input.productId),
        exists(editableProduct),
      ),
    )
    .returning({ id: productImage.id })
  const version = db
    .update(product)
    .set({ updatedAt: input.updatedAt })
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.updatedAt, input.expectedUpdatedAt),
        ne(product.status, 'archived'),
        notExists(
          db
            .select({ id: productImage.id })
            .from(productImage)
            .where(
              and(eq(productImage.id, input.imageId), eq(productImage.productId, input.productId)),
            ),
        ),
      ),
    )
    .returning({ id: product.id })
  const reference = db
    .select({ id: orderLine.id })
    .from(orderLine)
    .where(eq(orderLine.imageR2Key, image.r2Key))
    .limit(1)
  const [removed, versioned, references] = await db.batch([remove, version, reference])
  const didRemove = removed.length === 1 && versioned.length === 1
  return {
    removed: didRemove,
    image,
    persisted: await findAdminProduct(input.productId),
    referenced: didRemove && references.length === 1,
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
