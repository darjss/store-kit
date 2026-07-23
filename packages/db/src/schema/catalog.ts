import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

import {
  createBrandId,
  createCategoryId,
  createProductId,
  createProductImageId,
  createProductVariantId,
  entityIdPrefixes,
} from '../ids.ts'
import { typeIdCheck } from './typeid-check.ts'

export type ProductDetailValue = string | number | boolean | string[]
export type ProductDetails = Record<string, ProductDetailValue>
export type VariantOptions = Record<string, string>
export type ProductUseCase = 'first-iem' | 'bass' | 'vocals' | 'gaming' | 'daily-carry'

export const brand = sqliteTable(
  'brand',
  {
    id: text('id').primaryKey().$defaultFn(createBrandId),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    websiteUrl: text('website_url'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  table => [
    uniqueIndex('brand_slug_unique').on(table.slug),
    check('brand_id_typeid_check', typeIdCheck(table.id, entityIdPrefixes.brand)),
  ],
)

export const category = sqliteTable(
  'category',
  {
    id: text('id').primaryKey().$defaultFn(createCategoryId),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  table => [
    uniqueIndex('category_slug_unique').on(table.slug),
    index('category_active_sort_order_name_index').on(table.active, table.sortOrder, table.name),
    check('category_id_typeid_check', typeIdCheck(table.id, entityIdPrefixes.category)),
  ],
)

export const product = sqliteTable(
  'product',
  {
    id: text('id').primaryKey().$defaultFn(createProductId),
    slug: text('slug').notNull(),
    brandId: text('brand_id').references(() => brand.id, { onDelete: 'set null' }),
    categoryId: text('category_id').references(() => category.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    shortDescription: text('short_description'),
    description: text('description'),
    status: text('status', { enum: ['draft', 'active', 'archived'] })
      .notNull()
      .default('draft'),
    featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
    details: text('details', { mode: 'json' }).$type<ProductDetails>(),
    useCases: text('use_cases', { mode: 'json' }).$type<ProductUseCase[]>().notNull().default([]),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  table => [
    uniqueIndex('product_slug_unique').on(table.slug),
    index('product_status_featured_created_at_index').on(
      table.status,
      table.featured,
      table.createdAt,
    ),
    index('product_category_id_status_featured_created_at_index').on(
      table.categoryId,
      table.status,
      table.featured,
      table.createdAt,
    ),
    index('product_brand_id_status_featured_created_at_index').on(
      table.brandId,
      table.status,
      table.featured,
      table.createdAt,
    ),
    index('product_status_created_at_index').on(table.status, table.createdAt),
    check('product_status_check', sql`${table.status} in ('draft', 'active', 'archived')`),
    check('product_id_typeid_check', typeIdCheck(table.id, entityIdPrefixes.product)),
  ],
)

export const productImage = sqliteTable(
  'product_image',
  {
    id: text('id').primaryKey().$defaultFn(createProductImageId),
    productId: text('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    r2Key: text('r2_key').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    alt: text('alt').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  table => [
    uniqueIndex('product_image_product_id_sort_order_unique').on(table.productId, table.sortOrder),
    uniqueIndex('product_image_id_product_id_unique').on(table.id, table.productId),
    check('product_image_width_check', sql`${table.width} > 0`),
    check('product_image_height_check', sql`${table.height} > 0`),
    check('product_image_alt_check', sql`length(trim(${table.alt})) > 0`),
    check('product_image_id_typeid_check', typeIdCheck(table.id, entityIdPrefixes.productImage)),
  ],
)

export const productVariant = sqliteTable(
  'product_variant',
  {
    id: text('id').primaryKey().$defaultFn(createProductVariantId),
    productId: text('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    options: text('options', { mode: 'json' }).$type<VariantOptions>().notNull().default({}),
    priceMnt: integer('price_mnt').notNull(),
    compareAtPriceMnt: integer('compare_at_price_mnt'),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  table => [
    uniqueIndex('product_variant_sku_unique').on(table.sku),
    uniqueIndex('product_variant_id_product_id_unique').on(table.id, table.productId),
    index('product_variant_product_id_active_sort_order_index').on(
      table.productId,
      table.active,
      table.sortOrder,
    ),
    index('product_variant_product_id_active_price_mnt_index').on(
      table.productId,
      table.active,
      table.priceMnt,
    ),
    check('product_variant_price_mnt_check', sql`${table.priceMnt} >= 0`),
    check(
      'product_variant_compare_at_price_mnt_check',
      sql`${table.compareAtPriceMnt} is null or ${table.compareAtPriceMnt} >= 0`,
    ),
    check('product_variant_stock_quantity_check', sql`${table.stockQuantity} >= 0`),
    check(
      'product_variant_id_typeid_check',
      typeIdCheck(table.id, entityIdPrefixes.productVariant),
    ),
  ],
)

export const productVariantImage = sqliteTable(
  'product_variant_image',
  {
    productId: text('product_id').notNull(),
    variantId: text('variant_id').notNull(),
    imageId: text('image_id').notNull(),
  },
  table => [
    primaryKey({
      name: 'product_variant_image_variant_id_image_id_pk',
      columns: [table.variantId, table.imageId],
    }),
    foreignKey({
      name: 'product_variant_image_variant_product_fk',
      columns: [table.variantId, table.productId],
      foreignColumns: [productVariant.id, productVariant.productId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'product_variant_image_image_product_fk',
      columns: [table.imageId, table.productId],
      foreignColumns: [productImage.id, productImage.productId],
    }).onDelete('cascade'),
  ],
)
