import { Type } from 'typebox'
import type { Static, TSchema } from 'typebox'
import { Value } from 'typebox/value'

import {
  brandIdSchema,
  categoryIdSchema,
  editableProductStatusSchema,
  imageIdSchema,
  mntAmountSchema,
  nonNegativeIntegerSchema,
  nullableTrimmedTextSchema,
  productIdSchema,
  productStatusSchema,
  publicImageSchema,
  slugSchema,
  sortOrderSchema,
  stockQuantitySchema,
  trimmedNonBlankTextSchema,
  variantIdSchema,
  variantOptionsSchema,
} from './common'

const nullableBrandIdSchema = Type.Union([brandIdSchema, Type.Null()])
const nullableCategoryIdSchema = Type.Union([categoryIdSchema, Type.Null()])
const nullableMntAmountSchema = Type.Union([mntAmountSchema, Type.Null()])
const variantIdsSchema = Type.Array(variantIdSchema, { uniqueItems: true })
const imageIdsSchema = Type.Array(imageIdSchema, { uniqueItems: true })

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

export const adminCatalogBrandSchema = Type.Object(
  {
    id: brandIdSchema,
    slug: slugSchema,
    name: trimmedNonBlankTextSchema,
  },
  { additionalProperties: false },
)

export const adminCatalogCategorySchema = Type.Object(
  {
    id: categoryIdSchema,
    slug: slugSchema,
    name: trimmedNonBlankTextSchema,
    active: Type.Boolean(),
  },
  { additionalProperties: false },
)

export const adminCatalogSelectorsSchema = Type.Object(
  {
    brands: Type.Array(adminCatalogBrandSchema),
    categories: Type.Array(adminCatalogCategorySchema),
  },
  { additionalProperties: false },
)

export const adminCatalogProductListItemSchema = Type.Object(
  {
    id: productIdSchema,
    name: trimmedNonBlankTextSchema,
    slug: slugSchema,
    status: productStatusSchema,
    featured: Type.Boolean(),
    brandName: Type.Union([trimmedNonBlankTextSchema, Type.Null()]),
    categoryName: Type.Union([trimmedNonBlankTextSchema, Type.Null()]),
    primaryImage: Type.Union([publicImageSchema, Type.Null()]),
    activeVariantCount: nonNegativeIntegerSchema,
    totalStockQuantity: stockQuantitySchema,
    minimumPriceMnt: nullableMntAmountSchema,
    maximumPriceMnt: nullableMntAmountSchema,
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

export const adminCatalogImageSchema = Type.Object(
  {
    id: imageIdSchema,
    productId: productIdSchema,
    url: Type.String({ format: 'uri' }),
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    alt: trimmedNonBlankTextSchema,
    sortOrder: sortOrderSchema,
    variantIds: variantIdsSchema,
  },
  { additionalProperties: false },
)

export const adminCatalogVariantSchema = Type.Object(
  {
    id: variantIdSchema,
    productId: productIdSchema,
    sku: trimmedNonBlankTextSchema,
    name: trimmedNonBlankTextSchema,
    options: variantOptionsSchema,
    priceMnt: mntAmountSchema,
    compareAtPriceMnt: nullableMntAmountSchema,
    stockQuantity: stockQuantitySchema,
    active: Type.Boolean(),
    sortOrder: sortOrderSchema,
    createdAt: nonNegativeIntegerSchema,
    updatedAt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const adminCatalogProductDetailSchema = Type.Object(
  {
    id: productIdSchema,
    name: trimmedNonBlankTextSchema,
    slug: slugSchema,
    shortDescription: nullableTrimmedTextSchema,
    description: nullableTrimmedTextSchema,
    status: productStatusSchema,
    featured: Type.Boolean(),
    brand: Type.Union([adminCatalogBrandSchema, Type.Null()]),
    category: Type.Union([adminCatalogCategorySchema, Type.Null()]),
    brandName: Type.Union([trimmedNonBlankTextSchema, Type.Null()]),
    categoryName: Type.Union([trimmedNonBlankTextSchema, Type.Null()]),
    createdAt: nonNegativeIntegerSchema,
    updatedAt: nonNegativeIntegerSchema,
    images: Type.Array(adminCatalogImageSchema),
    variants: Type.Array(adminCatalogVariantSchema),
  },
  { additionalProperties: false },
)

const initialVariantSchema = Type.Object(
  {
    sku: trimmedNonBlankTextSchema,
    name: trimmedNonBlankTextSchema,
    options: variantOptionsSchema,
    priceMnt: mntAmountSchema,
    compareAtPriceMnt: nullableMntAmountSchema,
    stockQuantity: stockQuantitySchema,
    sortOrder: sortOrderSchema,
  },
  { additionalProperties: false },
)

export const adminProductCreateSchema = Type.Object(
  {
    name: trimmedNonBlankTextSchema,
    slug: slugSchema,
    shortDescription: nullableTrimmedTextSchema,
    description: nullableTrimmedTextSchema,
    status: editableProductStatusSchema,
    featured: Type.Boolean(),
    brandId: nullableBrandIdSchema,
    categoryId: nullableCategoryIdSchema,
    initialVariant: initialVariantSchema,
  },
  { additionalProperties: false },
)

export const adminProductUpdateSchema = Type.Object(
  {
    expectedUpdatedAt: nonNegativeIntegerSchema,
    name: trimmedNonBlankTextSchema,
    slug: slugSchema,
    shortDescription: nullableTrimmedTextSchema,
    description: nullableTrimmedTextSchema,
    status: editableProductStatusSchema,
    featured: Type.Boolean(),
    brandId: nullableBrandIdSchema,
    categoryId: nullableCategoryIdSchema,
  },
  { additionalProperties: false },
)

export const adminExpectedProductVersionSchema = Type.Object(
  { expectedUpdatedAt: nonNegativeIntegerSchema },
  { additionalProperties: false },
)

const variantFields = {
  sku: trimmedNonBlankTextSchema,
  name: trimmedNonBlankTextSchema,
  options: variantOptionsSchema,
  priceMnt: mntAmountSchema,
  compareAtPriceMnt: nullableMntAmountSchema,
  stockQuantity: stockQuantitySchema,
  active: Type.Boolean(),
  sortOrder: sortOrderSchema,
}

export const adminVariantCreateSchema = Type.Object(
  {
    expectedProductUpdatedAt: nonNegativeIntegerSchema,
    ...variantFields,
  },
  { additionalProperties: false },
)

export const adminVariantUpdateSchema = Type.Object(
  {
    expectedUpdatedAt: nonNegativeIntegerSchema,
    ...variantFields,
  },
  { additionalProperties: false },
)

export const adminVariantActivationSchema = Type.Object(
  {
    expectedUpdatedAt: nonNegativeIntegerSchema,
    active: Type.Boolean(),
  },
  { additionalProperties: false },
)

export const adminStockUpdateSchema = Type.Object(
  {
    expectedUpdatedAt: nonNegativeIntegerSchema,
    stockQuantity: stockQuantitySchema,
  },
  { additionalProperties: false },
)

export const adminVariantDeleteSchema = Type.Object(
  {
    expectedProductUpdatedAt: nonNegativeIntegerSchema,
    expectedVariantUpdatedAt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

const adminUploadFileSchema = Type.Unsafe<File>({
  type: 'object',
  required: ['name', 'size', 'type', 'lastModified'],
  properties: {
    name: Type.String({ minLength: 1 }),
    size: Type.Integer({ minimum: 1, maximum: 10 * 1024 * 1024 }),
    type: Type.Union([
      Type.Literal('image/jpeg'),
      Type.Literal('image/png'),
      Type.Literal('image/webp'),
      Type.Literal('image/avif'),
    ]),
    lastModified: nonNegativeIntegerSchema,
  },
})

export const adminProductImageUploadSchema = Type.Object(
  {
    file: adminUploadFileSchema,
    alt: Type.String({ minLength: 1, maxLength: 300, pattern: '^\\S(?:[\\s\\S]*\\S)?$' }),
    variantIds: Type.Optional(variantIdsSchema),
    expectedUpdatedAt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const adminProductImageUpdateSchema = Type.Object(
  {
    alt: Type.String({ minLength: 1, maxLength: 300, pattern: '^\\S(?:[\\s\\S]*\\S)?$' }),
    variantIds: variantIdsSchema,
    expectedUpdatedAt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const adminProductImageOrderSchema = Type.Object(
  {
    imageIds: imageIdsSchema,
    expectedUpdatedAt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const adminProductImageDeleteSchema = adminExpectedProductVersionSchema

export const convertMultipartContract = <Schema extends TSchema>(
  schema: Schema,
  value: unknown,
  fileFields: string[] = ['file'],
) => {
  if (typeof value !== 'object' || value === null) return Value.Convert(schema, value)
  const source = value as Record<string, unknown>
  const files = Object.fromEntries(
    fileFields.filter(field => field in source).map(field => [field, source[field]]),
  )
  const converted = Value.Convert(schema, value)
  return typeof converted === 'object' && converted !== null
    ? { ...converted, ...files }
    : converted
}

export const mediaCleanupSchema = Type.Union([
  Type.Literal('complete'),
  Type.Literal('retained-for-orders'),
  Type.Literal('pending'),
])

export const adminProductDeleteOutcomeSchema = Type.Object(
  {
    productId: productIdSchema,
    mediaCleanup: mediaCleanupSchema,
  },
  { additionalProperties: false },
)

export const adminVariantDeleteOutcomeSchema = Type.Object(
  {
    productId: productIdSchema,
    variantId: variantIdSchema,
    updatedAt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const adminProductImageMutationOutcomeSchema = Type.Object(
  {
    product: adminCatalogProductDetailSchema,
    mediaCleanup: Type.Optional(mediaCleanupSchema),
  },
  { additionalProperties: false },
)

export const adminCatalogProductNotFoundSchema = Type.Object(
  {
    _tag: Type.Literal('AdminCatalogProductNotFound'),
    productId: productIdSchema,
    message: trimmedNonBlankTextSchema,
  },
  { additionalProperties: false },
)

export const adminCatalogVariantNotFoundSchema = Type.Object(
  {
    _tag: Type.Literal('AdminCatalogVariantNotFound'),
    productId: productIdSchema,
    variantId: variantIdSchema,
    message: trimmedNonBlankTextSchema,
  },
  { additionalProperties: false },
)

export const adminCatalogImageNotFoundSchema = Type.Object(
  {
    _tag: Type.Literal('AdminCatalogImageNotFound'),
    productId: productIdSchema,
    imageId: imageIdSchema,
    message: trimmedNonBlankTextSchema,
  },
  { additionalProperties: false },
)

export const adminCatalogConflictSchema = Type.Object(
  {
    _tag: Type.Literal('AdminCatalogConflict'),
    productId: productIdSchema,
    variantId: Type.Optional(variantIdSchema),
    message: trimmedNonBlankTextSchema,
  },
  { additionalProperties: false },
)

export const productActivationBlockedSchema = Type.Object(
  {
    _tag: Type.Literal('ProductActivationBlocked'),
    productId: productIdSchema,
    message: trimmedNonBlankTextSchema,
  },
  { additionalProperties: false },
)

export const lastActiveVariantBlockedSchema = Type.Object(
  {
    _tag: Type.Literal('LastActiveVariantBlocked'),
    productId: productIdSchema,
    variantId: variantIdSchema,
    message: trimmedNonBlankTextSchema,
  },
  { additionalProperties: false },
)

export const invalidCompareAtPriceSchema = Type.Object(
  {
    _tag: Type.Literal('InvalidCompareAtPrice'),
    productId: Type.Optional(productIdSchema),
    variantId: Type.Optional(variantIdSchema),
    message: trimmedNonBlankTextSchema,
  },
  { additionalProperties: false },
)

export const productSlugTakenSchema = Type.Object(
  {
    _tag: Type.Literal('ProductSlugTaken'),
    slug: slugSchema,
    message: trimmedNonBlankTextSchema,
  },
  { additionalProperties: false },
)

export const variantSkuTakenSchema = Type.Object(
  {
    _tag: Type.Literal('VariantSkuTaken'),
    sku: trimmedNonBlankTextSchema,
    message: trimmedNonBlankTextSchema,
  },
  { additionalProperties: false },
)

export const catalogReferenceNotFoundSchema = Type.Object(
  {
    _tag: Type.Literal('CatalogReferenceNotFound'),
    referenceType: Type.Union([
      Type.Literal('brand'),
      Type.Literal('category'),
      Type.Literal('variant'),
    ]),
    referenceId: Type.String({ minLength: 1 }),
    message: trimmedNonBlankTextSchema,
  },
  { additionalProperties: false },
)

export const productMustBeArchivedSchema = Type.Object(
  {
    _tag: Type.Literal('ProductMustBeArchived'),
    productId: productIdSchema,
    message: trimmedNonBlankTextSchema,
  },
  { additionalProperties: false },
)

export const variantMustBeInactiveSchema = Type.Object(
  {
    _tag: Type.Literal('VariantMustBeInactive'),
    productId: productIdSchema,
    variantId: variantIdSchema,
    message: trimmedNonBlankTextSchema,
  },
  { additionalProperties: false },
)

export const imageUploadRejectedSchema = Type.Object(
  {
    _tag: Type.Literal('ImageUploadRejected'),
    message: trimmedNonBlankTextSchema,
  },
  { additionalProperties: false },
)

export const mediaStorageUnavailableSchema = Type.Object(
  {
    _tag: Type.Literal('MediaStorageUnavailable'),
    message: trimmedNonBlankTextSchema,
  },
  { additionalProperties: false },
)

export const adminCatalogErrorSchema = Type.Union([
  adminCatalogProductNotFoundSchema,
  adminCatalogVariantNotFoundSchema,
  adminCatalogImageNotFoundSchema,
  adminCatalogConflictSchema,
  productActivationBlockedSchema,
  lastActiveVariantBlockedSchema,
  invalidCompareAtPriceSchema,
  productSlugTakenSchema,
  variantSkuTakenSchema,
  catalogReferenceNotFoundSchema,
  productMustBeArchivedSchema,
  variantMustBeInactiveSchema,
  imageUploadRejectedSchema,
  mediaStorageUnavailableSchema,
])

export type AdminInventoryState = Static<typeof adminInventoryStateSchema>
export type AdminCatalogProductListFilters = Static<typeof adminCatalogProductListFiltersSchema>
export type AdminCatalogBrand = Static<typeof adminCatalogBrandSchema>
export type AdminCatalogCategory = Static<typeof adminCatalogCategorySchema>
export type AdminCatalogSelectors = Static<typeof adminCatalogSelectorsSchema>
export type AdminCatalogProductListItem = Static<typeof adminCatalogProductListItemSchema>
export type AdminCatalogProductList = Static<typeof adminCatalogProductListSchema>
export type AdminCatalogImage = Static<typeof adminCatalogImageSchema>
export type AdminCatalogVariant = Static<typeof adminCatalogVariantSchema>
export type AdminCatalogProductDetail = Static<typeof adminCatalogProductDetailSchema>
export type AdminProductCreate = Static<typeof adminProductCreateSchema>
export type AdminProductUpdate = Static<typeof adminProductUpdateSchema>
export type AdminExpectedProductVersion = Static<typeof adminExpectedProductVersionSchema>
export type AdminVariantCreate = Static<typeof adminVariantCreateSchema>
export type AdminVariantUpdate = Static<typeof adminVariantUpdateSchema>
export type AdminVariantActivation = Static<typeof adminVariantActivationSchema>
export type AdminStockUpdate = Static<typeof adminStockUpdateSchema>
export type AdminVariantDelete = Static<typeof adminVariantDeleteSchema>
export type AdminProductImageUpload = Static<typeof adminProductImageUploadSchema>
export type AdminProductImageUpdate = Static<typeof adminProductImageUpdateSchema>
export type AdminProductImageOrder = Static<typeof adminProductImageOrderSchema>
export type AdminProductImageDelete = Static<typeof adminProductImageDeleteSchema>
export type MediaCleanup = Static<typeof mediaCleanupSchema>
export type AdminProductDeleteOutcome = Static<typeof adminProductDeleteOutcomeSchema>
export type AdminVariantDeleteOutcome = Static<typeof adminVariantDeleteOutcomeSchema>
export type AdminProductImageMutationOutcome = Static<typeof adminProductImageMutationOutcomeSchema>
export type AdminCatalogProductNotFound = Static<typeof adminCatalogProductNotFoundSchema>
export type AdminCatalogVariantNotFound = Static<typeof adminCatalogVariantNotFoundSchema>
export type AdminCatalogImageNotFound = Static<typeof adminCatalogImageNotFoundSchema>
export type AdminCatalogConflict = Static<typeof adminCatalogConflictSchema>
export type ProductActivationBlocked = Static<typeof productActivationBlockedSchema>
export type LastActiveVariantBlocked = Static<typeof lastActiveVariantBlockedSchema>
export type InvalidCompareAtPrice = Static<typeof invalidCompareAtPriceSchema>
export type ProductSlugTaken = Static<typeof productSlugTakenSchema>
export type VariantSkuTaken = Static<typeof variantSkuTakenSchema>
export type CatalogReferenceNotFound = Static<typeof catalogReferenceNotFoundSchema>
export type ProductMustBeArchived = Static<typeof productMustBeArchivedSchema>
export type VariantMustBeInactive = Static<typeof variantMustBeInactiveSchema>
export type ImageUploadRejected = Static<typeof imageUploadRejectedSchema>
export type MediaStorageUnavailable = Static<typeof mediaStorageUnavailableSchema>
export type AdminCatalogError = Static<typeof adminCatalogErrorSchema>
