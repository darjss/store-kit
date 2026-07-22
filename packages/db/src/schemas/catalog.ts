import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/typebox'
import { Type } from 'typebox'
import type { Static } from 'typebox'

import {
  brand,
  category,
  product,
  productImage,
  productVariant,
  productVariantImage,
} from '../schema/catalog.ts'

export const slugSchema = Type.String({ pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' })
const urlSchema = Type.String({ format: 'uri' })
export const nonNegativeIntegerSchema = Type.Integer({ minimum: 0 })

export const productStatusSchema = Type.Union([
  Type.Literal('draft'),
  Type.Literal('active'),
  Type.Literal('archived'),
])
export const productDetailValueSchema = Type.Union([
  Type.String(),
  Type.Number(),
  Type.Boolean(),
  Type.Array(Type.String()),
])
export const productDetailsSchema = Type.Record(Type.String(), productDetailValueSchema)
export const variantOptionsSchema = Type.Record(Type.String(), Type.String())

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

export const productListFiltersSchema = Type.Object({
  category: Type.Optional(slugSchema),
  brand: Type.Optional(slugSchema),
  featured: Type.Optional(Type.Boolean()),
  query: Type.Optional(Type.String()),
  minPrice: Type.Optional(nonNegativeIntegerSchema),
  maxPrice: Type.Optional(nonNegativeIntegerSchema),
  sort: Type.Optional(
    Type.Union([
      Type.Literal('featured'),
      Type.Literal('recent'),
      Type.Literal('price-asc'),
      Type.Literal('price-desc'),
    ]),
  ),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  offset: Type.Optional(nonNegativeIntegerSchema),
})

export type ProductStatus = Static<typeof productStatusSchema>
export type ProductListFilters = Static<typeof productListFiltersSchema>

export type Brand = Static<typeof selectBrandSchema>
export type NewBrand = typeof brand.$inferInsert
export type BrandUpdate = Static<typeof updateBrandSchema>

export type Category = Static<typeof selectCategorySchema>
export type NewCategory = typeof category.$inferInsert
export type CategoryUpdate = Static<typeof updateCategorySchema>

export type Product = Static<typeof selectProductSchema>
export type NewProduct = typeof product.$inferInsert
export type ProductUpdate = Static<typeof updateProductSchema>

export type ProductImage = Static<typeof selectProductImageSchema>
export type NewProductImage = typeof productImage.$inferInsert
export type ProductImageUpdate = Static<typeof updateProductImageSchema>

export type ProductVariant = Static<typeof selectProductVariantSchema>
export type NewProductVariant = typeof productVariant.$inferInsert
export type ProductVariantUpdate = Static<typeof updateProductVariantSchema>

export type ProductVariantImage = Static<typeof selectProductVariantImageSchema>
export type NewProductVariantImage = typeof productVariantImage.$inferInsert
export type ProductVariantImageUpdate = Static<typeof updateProductVariantImageSchema>
