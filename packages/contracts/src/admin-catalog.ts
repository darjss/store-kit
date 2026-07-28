import { Type } from 'typebox'
import type { Static } from 'typebox'

import {
  nonNegativeIntegerSchema,
  productIdSchema,
  productStatusSchema,
  variantIdSchema,
  variantOptionsSchema,
} from './common'

export const adminInventoryStateSchema = Type.Union([
  Type.Literal('all'),
  Type.Literal('low'),
  Type.Literal('out'),
])

export const adminCatalogProductListFiltersSchema = Type.Object(
  {
    query: Type.Optional(Type.String()),
    status: Type.Optional(productStatusSchema),
    inventory: Type.Optional(adminInventoryStateSchema),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
    offset: Type.Optional(nonNegativeIntegerSchema),
  },
  { additionalProperties: false },
)

export const adminCatalogProductListItemSchema = Type.Object(
  {
    id: productIdSchema,
    name: Type.String({ minLength: 1 }),
    slug: Type.String({ minLength: 1 }),
    status: productStatusSchema,
    featured: Type.Boolean(),
    brandName: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    categoryName: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    activeVariantCount: nonNegativeIntegerSchema,
    totalStockQuantity: nonNegativeIntegerSchema,
    minimumPriceMnt: Type.Union([nonNegativeIntegerSchema, Type.Null()]),
    maximumPriceMnt: Type.Union([nonNegativeIntegerSchema, Type.Null()]),
    updatedAt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const adminCatalogProductListSchema = Type.Object(
  {
    items: Type.Array(adminCatalogProductListItemSchema),
    total: nonNegativeIntegerSchema,
    limit: Type.Integer({ minimum: 1, maximum: 100 }),
    offset: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const adminCatalogVariantSchema = Type.Object(
  {
    id: variantIdSchema,
    productId: productIdSchema,
    sku: Type.String({ minLength: 1 }),
    name: Type.String({ minLength: 1 }),
    options: variantOptionsSchema,
    priceMnt: nonNegativeIntegerSchema,
    compareAtPriceMnt: Type.Union([nonNegativeIntegerSchema, Type.Null()]),
    stockQuantity: nonNegativeIntegerSchema,
    active: Type.Boolean(),
    updatedAt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const adminCatalogProductDetailSchema = Type.Object(
  {
    id: productIdSchema,
    name: Type.String({ minLength: 1 }),
    slug: Type.String({ minLength: 1 }),
    status: productStatusSchema,
    featured: Type.Boolean(),
    brandName: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    categoryName: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    updatedAt: nonNegativeIntegerSchema,
    variants: Type.Array(adminCatalogVariantSchema),
  },
  { additionalProperties: false },
)

export const adminProductUpdateSchema = Type.Object(
  {
    expectedUpdatedAt: nonNegativeIntegerSchema,
    status: Type.Optional(productStatusSchema),
    featured: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false, minProperties: 2 },
)

export const adminVariantUpdateSchema = Type.Object(
  {
    expectedUpdatedAt: nonNegativeIntegerSchema,
    priceMnt: Type.Optional(nonNegativeIntegerSchema),
    compareAtPriceMnt: Type.Optional(Type.Union([nonNegativeIntegerSchema, Type.Null()])),
    active: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false, minProperties: 2 },
)

export const adminStockUpdateSchema = Type.Object(
  {
    expectedUpdatedAt: nonNegativeIntegerSchema,
    stockQuantity: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const adminCatalogProductNotFoundSchema = Type.Object(
  {
    _tag: Type.Literal('AdminCatalogProductNotFound'),
    productId: productIdSchema,
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export const adminCatalogVariantNotFoundSchema = Type.Object(
  {
    _tag: Type.Literal('AdminCatalogVariantNotFound'),
    productId: productIdSchema,
    variantId: variantIdSchema,
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export const adminCatalogConflictSchema = Type.Object(
  {
    _tag: Type.Literal('AdminCatalogConflict'),
    productId: productIdSchema,
    variantId: Type.Optional(variantIdSchema),
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export const productActivationBlockedSchema = Type.Object(
  {
    _tag: Type.Literal('ProductActivationBlocked'),
    productId: productIdSchema,
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export const lastActiveVariantBlockedSchema = Type.Object(
  {
    _tag: Type.Literal('LastActiveVariantBlocked'),
    productId: productIdSchema,
    variantId: variantIdSchema,
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export const invalidCompareAtPriceSchema = Type.Object(
  {
    _tag: Type.Literal('InvalidCompareAtPrice'),
    productId: productIdSchema,
    variantId: variantIdSchema,
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export const adminCatalogErrorSchema = Type.Union([
  adminCatalogProductNotFoundSchema,
  adminCatalogVariantNotFoundSchema,
  adminCatalogConflictSchema,
  productActivationBlockedSchema,
  lastActiveVariantBlockedSchema,
  invalidCompareAtPriceSchema,
])

export type AdminInventoryState = Static<typeof adminInventoryStateSchema>
export type AdminCatalogProductListFilters = Static<typeof adminCatalogProductListFiltersSchema>
export type AdminCatalogProductListItem = Static<typeof adminCatalogProductListItemSchema>
export type AdminCatalogProductList = Static<typeof adminCatalogProductListSchema>
export type AdminCatalogVariant = Static<typeof adminCatalogVariantSchema>
export type AdminCatalogProductDetail = Static<typeof adminCatalogProductDetailSchema>
export type AdminProductUpdate = Static<typeof adminProductUpdateSchema>
export type AdminVariantUpdate = Static<typeof adminVariantUpdateSchema>
export type AdminStockUpdate = Static<typeof adminStockUpdateSchema>
export type AdminCatalogProductNotFound = Static<typeof adminCatalogProductNotFoundSchema>
export type AdminCatalogVariantNotFound = Static<typeof adminCatalogVariantNotFoundSchema>
export type AdminCatalogConflict = Static<typeof adminCatalogConflictSchema>
export type ProductActivationBlocked = Static<typeof productActivationBlockedSchema>
export type LastActiveVariantBlocked = Static<typeof lastActiveVariantBlockedSchema>
export type InvalidCompareAtPrice = Static<typeof invalidCompareAtPriceSchema>
export type AdminCatalogError = Static<typeof adminCatalogErrorSchema>
