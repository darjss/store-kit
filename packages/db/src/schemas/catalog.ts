import { productListFiltersSchema, productUseCaseSchema } from '@store-kit/contracts/catalog'
import type { ProductListFilters, ProductUseCase } from '@store-kit/contracts/catalog'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/typebox'
import { Type } from 'typebox'
import type { Static } from 'typebox'

import {
  brandIdSchema,
  categoryIdSchema,
  productIdSchema,
  productImageIdSchema,
  productVariantIdSchema,
} from '../ids.ts'
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

export { productListFiltersSchema, productUseCaseSchema }
export type { ProductListFilters, ProductUseCase }

export const productUseCasesSchema = Type.Array(productUseCaseSchema, { uniqueItems: true })
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
  id: () => brandIdSchema,
  slug: () => slugSchema,
  websiteUrl: () => urlSchema,
}

const categoryRefinements = {
  id: () => categoryIdSchema,
  slug: () => slugSchema,
}

const productRefinements = {
  id: () => productIdSchema,
  brandId: () => Type.Union([brandIdSchema, Type.Null()]),
  categoryId: () => Type.Union([categoryIdSchema, Type.Null()]),
  slug: () => slugSchema,
  status: () => productStatusSchema,
  details: () => productDetailsSchema,
  useCases: () => productUseCasesSchema,
}

const productVariantRefinements = {
  id: () => productVariantIdSchema,
  productId: () => productIdSchema,
  options: () => variantOptionsSchema,
  priceMnt: () => nonNegativeIntegerSchema,
  compareAtPriceMnt: () => nonNegativeIntegerSchema,
  stockQuantity: () => nonNegativeIntegerSchema,
}

const productImageRefinements = {
  id: () => productImageIdSchema,
  productId: () => productIdSchema,
}

const productVariantImageRefinements = {
  productId: () => productIdSchema,
  variantId: () => productVariantIdSchema,
  imageId: () => productImageIdSchema,
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

export const selectProductImageSchema = createSelectSchema(productImage, productImageRefinements)
export const insertProductImageSchema = createInsertSchema(productImage, productImageRefinements)
export const updateProductImageSchema = createUpdateSchema(productImage, productImageRefinements)

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

export const selectProductVariantImageSchema = createSelectSchema(
  productVariantImage,
  productVariantImageRefinements,
)
export const insertProductVariantImageSchema = createInsertSchema(
  productVariantImage,
  productVariantImageRefinements,
)
export const updateProductVariantImageSchema = createUpdateSchema(
  productVariantImage,
  productVariantImageRefinements,
)

export type ProductStatus = Static<typeof productStatusSchema>

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
