import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/valibot'
import * as v from 'valibot'

import {
  brand,
  category,
  product,
  productImage,
  productVariant,
  productVariantImage,
} from '../schema/catalog'

const slugSchema = v.pipe(v.string(), v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))
const urlSchema = v.pipe(v.string(), v.url())
const nonNegativeIntegerSchema = v.pipe(v.number(), v.integer(), v.minValue(0))
const jsonRecordSchema = v.custom<Record<string, unknown>>(
  input => typeof input === 'object' && input !== null && !Array.isArray(input),
)

export const productStatusSchema = v.picklist(['draft', 'active', 'archived'])
export const productDetailValueSchema = v.union([
  v.string(),
  v.number(),
  v.boolean(),
  v.array(v.string()),
])
export const productDetailsSchema = v.intersect([
  jsonRecordSchema,
  v.record(v.string(), productDetailValueSchema),
])
export const variantOptionsSchema = v.intersect([
  jsonRecordSchema,
  v.record(v.string(), v.string()),
])

const brandRefinements = {
  slug: () => slugSchema,
  websiteUrl: () => urlSchema,
}

const categoryRefinements = {
  slug: () => slugSchema,
}

const productRefinements = {
  slug: () => slugSchema,
  status: () => productStatusSchema,
  details: () => productDetailsSchema,
}

const productVariantRefinements = {
  options: () => variantOptionsSchema,
  priceMnt: () => nonNegativeIntegerSchema,
  compareAtPriceMnt: () => nonNegativeIntegerSchema,
  stockQuantity: () => nonNegativeIntegerSchema,
}

export const selectBrandSchema = createSelectSchema(brand, brandRefinements)
export const insertBrandSchema = createInsertSchema(brand, brandRefinements)
export const updateBrandSchema = createUpdateSchema(brand, brandRefinements)

export const selectCategorySchema = createSelectSchema(category, categoryRefinements)
export const insertCategorySchema = createInsertSchema(category, categoryRefinements)
export const updateCategorySchema = createUpdateSchema(category, categoryRefinements)

export const selectProductSchema = createSelectSchema(product, productRefinements)
export const insertProductSchema = createInsertSchema(product, productRefinements)
export const updateProductSchema = createUpdateSchema(product, productRefinements)

export const selectProductImageSchema = createSelectSchema(productImage)
export const insertProductImageSchema = createInsertSchema(productImage)
export const updateProductImageSchema = createUpdateSchema(productImage)

export const selectProductVariantSchema = createSelectSchema(
  productVariant,
  productVariantRefinements,
)
export const insertProductVariantSchema = createInsertSchema(
  productVariant,
  productVariantRefinements,
)
export const updateProductVariantSchema = createUpdateSchema(
  productVariant,
  productVariantRefinements,
)

export const selectProductVariantImageSchema = createSelectSchema(productVariantImage)
export const insertProductVariantImageSchema = createInsertSchema(productVariantImage)
export const updateProductVariantImageSchema = createUpdateSchema(productVariantImage)

export const productListFiltersSchema = v.object({
  category: v.optional(slugSchema),
  brand: v.optional(slugSchema),
  featured: v.optional(v.boolean()),
  query: v.optional(v.string()),
  limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))),
  offset: v.optional(nonNegativeIntegerSchema),
})

export type ProductStatus = v.InferOutput<typeof productStatusSchema>
export type ProductListFilters = v.InferOutput<typeof productListFiltersSchema>

export type Brand = v.InferOutput<typeof selectBrandSchema>
export type NewBrand = typeof brand.$inferInsert
export type BrandUpdate = v.InferOutput<typeof updateBrandSchema>

export type Category = v.InferOutput<typeof selectCategorySchema>
export type NewCategory = typeof category.$inferInsert
export type CategoryUpdate = v.InferOutput<typeof updateCategorySchema>

export type Product = v.InferOutput<typeof selectProductSchema>
export type NewProduct = typeof product.$inferInsert
export type ProductUpdate = v.InferOutput<typeof updateProductSchema>

export type ProductImage = v.InferOutput<typeof selectProductImageSchema>
export type NewProductImage = typeof productImage.$inferInsert
export type ProductImageUpdate = v.InferOutput<typeof updateProductImageSchema>

export type ProductVariant = v.InferOutput<typeof selectProductVariantSchema>
export type NewProductVariant = typeof productVariant.$inferInsert
export type ProductVariantUpdate = v.InferOutput<typeof updateProductVariantSchema>

export type ProductVariantImage = v.InferOutput<typeof selectProductVariantImageSchema>
export type NewProductVariantImage = typeof productVariantImage.$inferInsert
export type ProductVariantImageUpdate = v.InferOutput<typeof updateProductVariantImageSchema>
