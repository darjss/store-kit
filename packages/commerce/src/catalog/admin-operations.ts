import {
  adminCatalogImageMaxBytes,
  adminCatalogImageMediaTypes,
} from '@store-kit/contracts/admin-catalog'
import type {
  AdminCatalogError,
  AdminCatalogProductDetail,
  AdminCatalogProductList,
  AdminCatalogProductListFilters,
  AdminExpectedProductVersion,
  AdminProductCreate,
  AdminProductDeleteOutcome,
  AdminProductImageDelete,
  AdminProductImageOrder,
  AdminProductImageUpdate,
  AdminProductImageUpload,
  AdminProductUpdate,
  AdminStockUpdate,
  AdminVariantActivation,
  AdminVariantCreate,
  AdminVariantDelete,
  AdminVariantDeleteOutcome,
  AdminVariantUpdate,
  MediaCleanup,
} from '@store-kit/contracts/admin-catalog'
import { remoteMediaUrl } from '@store-kit/contracts/media'
import { database } from '@store-kit/db'
import { createId } from '@store-kit/db/ids'
import { Result } from 'better-result'
import { env } from 'cloudflare:workers'
import { match } from 'dismatch'

type AdminProductRecord = NonNullable<
  Awaited<ReturnType<typeof database.query.catalog.findAdminProduct>>
>

const imageFormats = {
  'image/jpeg': { extension: 'jpg', contentType: 'image/jpeg' },
  'jpeg': { extension: 'jpg', contentType: 'image/jpeg' },
  'jpg': { extension: 'jpg', contentType: 'image/jpeg' },
  'image/png': { extension: 'png', contentType: 'image/png' },
  'png': { extension: 'png', contentType: 'image/png' },
  'image/webp': { extension: 'webp', contentType: 'image/webp' },
  'webp': { extension: 'webp', contentType: 'image/webp' },
  'image/avif': { extension: 'avif', contentType: 'image/avif' },
  'avif': { extension: 'avif', contentType: 'image/avif' },
} as const
const acceptedUploadTypes = new Set<string>(adminCatalogImageMediaTypes)

const nextVersion = (expectedUpdatedAt: number) => Math.max(Date.now(), expectedUpdatedAt + 1)

const toAdminProductDetail = (record: AdminProductRecord): AdminCatalogProductDetail => ({
  id: record.id,
  name: record.name,
  slug: record.slug,
  shortDescription: record.shortDescription,
  description: record.description,
  status: record.status,
  featured: record.featured,
  brand: record.brand
    ? { id: record.brand.id, slug: record.brand.slug, name: record.brand.name }
    : null,
  category: record.category
    ? {
        id: record.category.id,
        slug: record.category.slug,
        name: record.category.name,
        active: record.category.active,
      }
    : null,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  images: record.images.map(image => ({
    id: image.id,
    productId: image.productId,
    url: remoteMediaUrl(env.PUBLIC_MEDIA_BASE_URL, image.r2Key),
    width: image.width,
    height: image.height,
    alt: image.alt,
    sortOrder: image.sortOrder,
    variantIds: [...new Set(image.variantLinks.map(({ variantId }) => variantId))],
  })),
  variants: record.variants.map(variant => ({
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    name: variant.name,
    options: variant.options,
    priceMnt: variant.priceMnt,
    compareAtPriceMnt: variant.compareAtPriceMnt,
    stockQuantity: variant.stockQuantity,
    active: variant.active,
    sortOrder: variant.sortOrder,
    createdAt: variant.createdAt,
    updatedAt: variant.updatedAt,
  })),
})

const productNotFound = (productId: string) => ({
  _tag: 'AdminCatalogProductNotFound' as const,
  productId,
  message: 'The product no longer exists.',
})

const variantNotFound = (productId: string, variantId: string) => ({
  _tag: 'AdminCatalogVariantNotFound' as const,
  productId,
  variantId,
  message: 'The product variant no longer exists.',
})

const imageNotFound = (productId: string, imageId: string) => ({
  _tag: 'AdminCatalogImageNotFound' as const,
  productId,
  imageId,
  message: 'The product image no longer exists.',
})

const catalogConflict = (productId: string, variantId?: string) => ({
  _tag: 'AdminCatalogConflict' as const,
  productId,
  ...(variantId ? { variantId } : {}),
  message: 'This catalog record changed. Reload the current data and try again.',
})

const catalogDeletionBlocked = (productId: string, variantId?: string) => ({
  _tag: 'CatalogDeletionBlocked' as const,
  productId,
  ...(variantId ? { variantId } : {}),
  message: 'Resolve or cancel active orders before permanently deleting this catalog record.',
})

const productSlugTaken = (slug: string) => ({
  _tag: 'ProductSlugTaken' as const,
  slug,
  message: 'Another product already uses this slug.',
})

const variantSkuTaken = (sku: string) => ({
  _tag: 'VariantSkuTaken' as const,
  sku,
  message: 'Another variant already uses this SKU.',
})

const invalidCompareAtPrice = (productId?: string, variantId?: string) => ({
  _tag: 'InvalidCompareAtPrice' as const,
  ...(productId ? { productId } : {}),
  ...(variantId ? { variantId } : {}),
  message: 'Compare-at price must be greater than the current price.',
})

const imageUploadRejected = (message = 'The image could not be accepted.') => ({
  _tag: 'ImageUploadRejected' as const,
  message,
})

const mediaStorageUnavailable = () => ({
  _tag: 'MediaStorageUnavailable' as const,
  message: 'Media storage is unavailable. Try again.',
})

const normalizeProduct = <Input extends AdminProductCreate | AdminProductUpdate>(input: Input) => ({
  ...input,
  name: input.name.trim(),
  slug: input.slug.trim(),
  shortDescription: input.shortDescription?.trim() || null,
  description: input.description?.trim() || null,
})

const normalizeVariant = <Input extends AdminVariantCreate | AdminVariantUpdate>(input: Input) => ({
  ...input,
  sku: input.sku.trim(),
  name: input.name.trim(),
  options: Object.fromEntries(
    Object.entries(input.options).map(([key, value]) => [key.trim(), value.trim()]),
  ),
})

const validateReferences = async (input: {
  productId?: string
  brandId: string | null
  categoryId: string | null
}) => {
  const references = await database.query.catalog.findCatalogReferences(input)
  if (input.brandId && !references.brand)
    return {
      _tag: 'CatalogReferenceNotFound' as const,
      referenceType: 'brand' as const,
      referenceId: input.brandId,
      message: 'The selected brand no longer exists.',
    }
  const existingInactiveCategory =
    references.category &&
    !references.category.active &&
    references.product?.categoryId === input.categoryId
  if (
    input.categoryId &&
    (!references.category || (!references.category.active && !existingInactiveCategory))
  )
    return {
      _tag: 'CatalogReferenceNotFound' as const,
      referenceType: 'category' as const,
      referenceId: input.categoryId,
      message: 'The selected category is unavailable.',
    }
  return undefined
}

const validateVariantReferences = async (productId: string, variantIds: string[]) => {
  const [missing] = await database.query.catalog.findMissingVariantIds(productId, variantIds)
  return missing
    ? {
        _tag: 'CatalogReferenceNotFound' as const,
        referenceType: 'variant' as const,
        referenceId: missing,
        message: 'A selected variant no longer exists for this product.',
      }
    : undefined
}

const tryCatalogWrite = async <Value>(
  write: () => Promise<Value>,
  input: {
    slug?: string
    sku?: string
    productId?: string
    variantId?: string
    brandId?: string | null
    categoryId?: string | null
  },
) => {
  const attempted = await Result.tryPromise({ try: write, catch: cause => cause })
  if (attempted.status === 'ok') return Result.ok<Value, AdminCatalogError>(attempted.value)

  if (input.slug) {
    const existing = await database.query.catalog.findProductBySlug(input.slug)
    if (existing && existing.id !== input.productId)
      return Result.err<Value, AdminCatalogError>(productSlugTaken(input.slug))
  }
  if (input.sku) {
    const existing = await database.query.catalog.findVariantBySku(input.sku)
    if (existing && existing.id !== input.variantId)
      return Result.err<Value, AdminCatalogError>(variantSkuTaken(input.sku))
  }
  if (input.brandId !== undefined || input.categoryId !== undefined) {
    const referenceError = await validateReferences({
      productId: input.productId,
      brandId: input.brandId ?? null,
      categoryId: input.categoryId ?? null,
    })
    if (referenceError) return Result.err<Value, AdminCatalogError>(referenceError)
  }
  throw attempted.error
}

export const listAdminCatalogProducts = async (filters: AdminCatalogProductListFilters = {}) => {
  const normalized = {
    ...filters,
    query: filters.query?.trim() || undefined,
    inventory: filters.inventory ?? 'all',
    limit: filters.limit ?? 24,
    offset: filters.offset ?? 0,
  } satisfies AdminCatalogProductListFilters
  const list = await database.query.catalog.listAdminProducts(normalized)
  return Result.ok<AdminCatalogProductList, AdminCatalogError>({
    ...list,
    items: list.items.map(item => ({
      ...item,
      primaryImage: item.primaryImage
        ? {
            url: remoteMediaUrl(env.PUBLIC_MEDIA_BASE_URL, item.primaryImage.r2Key),
            width: item.primaryImage.width,
            height: item.primaryImage.height,
            alt: item.primaryImage.alt,
          }
        : null,
    })),
  })
}

export const listAdminCatalogSelectors = async () =>
  Result.ok(await database.query.catalog.listAdminSelectors())

export const getAdminCatalogProduct = async (productId: string) => {
  const record = await database.query.catalog.findAdminProduct(productId)
  return record
    ? Result.ok<AdminCatalogProductDetail, AdminCatalogError>(toAdminProductDetail(record))
    : Result.err<AdminCatalogProductDetail, AdminCatalogError>(productNotFound(productId))
}

export const createAdminCatalogProduct = async (input: AdminProductCreate) => {
  const normalized = {
    ...normalizeProduct(input),
    initialVariant: {
      ...input.initialVariant,
      sku: input.initialVariant.sku.trim(),
      name: input.initialVariant.name.trim(),
      options: Object.fromEntries(
        Object.entries(input.initialVariant.options).map(([key, value]) => [
          key.trim(),
          value.trim(),
        ]),
      ),
    },
  }
  if (
    normalized.initialVariant.compareAtPriceMnt !== null &&
    normalized.initialVariant.compareAtPriceMnt <= normalized.initialVariant.priceMnt
  )
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(invalidCompareAtPrice())

  const referenceError = await validateReferences(normalized)
  if (referenceError)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(referenceError)

  const write = await tryCatalogWrite(
    () =>
      database.query.catalog.createAdminProduct({
        ...normalized,
        createdAt: Date.now(),
      }),
    {
      slug: normalized.slug,
      sku: normalized.initialVariant.sku,
      brandId: normalized.brandId,
      categoryId: normalized.categoryId,
    },
  )
  if (write.status === 'error') return write
  if (!write.value.persisted) throw new Error('Created product could not be read from D1.')
  return Result.ok<AdminCatalogProductDetail, AdminCatalogError>(
    toAdminProductDetail(write.value.persisted),
  )
}

export const updateAdminCatalogProduct = async (productId: string, input: AdminProductUpdate) => {
  const normalized = normalizeProduct(input)
  const referenceError = await validateReferences({ productId, ...normalized })
  if (referenceError)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(referenceError)

  const attempted = await tryCatalogWrite(
    () =>
      database.query.catalog.updateAdminProduct({
        productId,
        ...normalized,
        updatedAt: nextVersion(input.expectedUpdatedAt),
      }),
    {
      slug: normalized.slug,
      productId,
      brandId: normalized.brandId,
      categoryId: normalized.categoryId,
    },
  )
  if (attempted.status === 'error') return attempted
  const write = attempted.value
  if (!write.persisted)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(productNotFound(productId))
  if (write.persisted.updatedAt !== input.expectedUpdatedAt && !write.updated)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(catalogConflict(productId))
  if (normalized.status === 'active' && !write.persisted.variants.some(variant => variant.active))
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>({
      _tag: 'ProductActivationBlocked',
      productId,
      message: 'An active product must have at least one active variant.',
    })
  if (!write.updated)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(catalogConflict(productId))
  return Result.ok<AdminCatalogProductDetail, AdminCatalogError>(
    toAdminProductDetail(write.persisted),
  )
}

export const archiveAdminCatalogProduct = async (
  productId: string,
  input: AdminExpectedProductVersion,
) => {
  const write = await database.query.catalog.archiveAdminProduct({
    productId,
    expectedUpdatedAt: input.expectedUpdatedAt,
    updatedAt: nextVersion(input.expectedUpdatedAt),
  })
  if (!write.persisted)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(productNotFound(productId))
  if (!write.updated)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(catalogConflict(productId))
  return Result.ok<AdminCatalogProductDetail, AdminCatalogError>(
    toAdminProductDetail(write.persisted),
  )
}

export const restoreAdminCatalogProduct = async (
  productId: string,
  input: AdminExpectedProductVersion,
) => {
  const write = await database.query.catalog.restoreAdminProduct({
    productId,
    expectedUpdatedAt: input.expectedUpdatedAt,
    updatedAt: nextVersion(input.expectedUpdatedAt),
  })
  if (!write.persisted)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(productNotFound(productId))
  if (write.persisted.updatedAt !== input.expectedUpdatedAt && !write.updated)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(catalogConflict(productId))
  if (write.persisted.status !== 'archived' && !write.updated)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>({
      _tag: 'ProductMustBeArchived',
      productId,
      message: 'Only an archived product can be restored.',
    })
  if (!write.updated)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(catalogConflict(productId))
  return Result.ok<AdminCatalogProductDetail, AdminCatalogError>(
    toAdminProductDetail(write.persisted),
  )
}

const cleanupMedia = async (
  media: { r2Key: string; referenced: boolean }[],
): Promise<MediaCleanup> => {
  const removals = await Promise.all(
    media
      .filter(item => !item.referenced)
      .map(async item => ({
        item,
        result: await Result.tryPromise({
          try: () => env.MEDIA.delete(item.r2Key),
          catch: cause => cause,
        }),
      })),
  )
  const failed = removals.filter(({ result }) => result.status === 'error')
  for (const { item } of failed)
    console.error(JSON.stringify({ message: 'Catalog media cleanup failed.', r2Key: item.r2Key }))

  if (failed.length > 0) return 'pending'
  return media.some(item => item.referenced) ? 'retained-for-orders' : 'complete'
}

const productDeleteOutcome = (
  write: Awaited<ReturnType<typeof database.query.catalog.deleteAdminProduct>>,
  expectedUpdatedAt: number,
) => {
  if (write.deleted) return { type: 'deleted' as const, media: write.media }
  if (write.blocked) return { type: 'blocked' as const }
  if (!write.persisted) return { type: 'not-found' as const }
  if (write.persisted.updatedAt !== expectedUpdatedAt) return { type: 'conflict' as const }
  if (write.persisted.status !== 'archived') return { type: 'must-be-archived' as const }
  return { type: 'conflict' as const }
}

export const deleteAdminCatalogProduct = async (
  productId: string,
  input: AdminExpectedProductVersion,
) => {
  const write = await database.query.catalog.deleteAdminProduct({
    productId,
    expectedUpdatedAt: input.expectedUpdatedAt,
  })
  return match(productDeleteOutcome(write, input.expectedUpdatedAt))({
    deleted: async ({ media }) =>
      Result.ok<AdminProductDeleteOutcome, AdminCatalogError>({
        productId,
        mediaCleanup: await cleanupMedia(media),
      }),
    blocked: () =>
      Result.err<AdminProductDeleteOutcome, AdminCatalogError>(catalogDeletionBlocked(productId)),
    'not-found': () =>
      Result.err<AdminProductDeleteOutcome, AdminCatalogError>(productNotFound(productId)),
    conflict: () =>
      Result.err<AdminProductDeleteOutcome, AdminCatalogError>(catalogConflict(productId)),
    'must-be-archived': () =>
      Result.err<AdminProductDeleteOutcome, AdminCatalogError>({
        _tag: 'ProductMustBeArchived',
        productId,
        message: 'Archive the product before deleting it permanently.',
      }),
  })
}

export const createAdminCatalogVariant = async (productId: string, input: AdminVariantCreate) => {
  const normalized = normalizeVariant(input)
  if (normalized.compareAtPriceMnt !== null && normalized.compareAtPriceMnt <= normalized.priceMnt)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(
      invalidCompareAtPrice(productId),
    )

  const attempted = await tryCatalogWrite(
    () =>
      database.query.catalog.createAdminVariant({
        productId,
        ...normalized,
        createdAt: Date.now(),
        updatedAt: nextVersion(input.expectedProductUpdatedAt),
      }),
    { sku: normalized.sku },
  )
  if (attempted.status === 'error') return attempted
  const write = attempted.value
  if (!write.persisted)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(productNotFound(productId))
  if (!write.created)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(catalogConflict(productId))
  return Result.ok<AdminCatalogProductDetail, AdminCatalogError>(
    toAdminProductDetail(write.persisted),
  )
}

const variantWriteOutcome = (
  variantId: string,
  expectedUpdatedAt: number,
  write: Awaited<ReturnType<typeof database.query.catalog.updateAdminVariant>>,
  nextActive?: boolean,
) => {
  if (!write.persisted) return { type: 'product-not-found' as const }
  const variant = write.persisted.variants.find(candidate => candidate.id === variantId)
  if (!variant) return { type: 'variant-not-found' as const }
  if (variant.updatedAt !== expectedUpdatedAt && !write.updated)
    return { type: 'conflict' as const }
  if (
    nextActive === false &&
    variant.active &&
    write.persisted.status === 'active' &&
    write.persisted.variants.filter(candidate => candidate.active).length === 1
  )
    return { type: 'last-active-variant' as const }
  if (!write.updated) return { type: 'conflict' as const }
  return { type: 'updated' as const, product: write.persisted }
}

const classifyVariantWrite = (
  productId: string,
  variantId: string,
  expectedUpdatedAt: number,
  write: Awaited<ReturnType<typeof database.query.catalog.updateAdminVariant>>,
  nextActive?: boolean,
) =>
  match(variantWriteOutcome(variantId, expectedUpdatedAt, write, nextActive))({
    'product-not-found': () =>
      Result.err<AdminCatalogProductDetail, AdminCatalogError>(productNotFound(productId)),
    'variant-not-found': () =>
      Result.err<AdminCatalogProductDetail, AdminCatalogError>(
        variantNotFound(productId, variantId),
      ),
    conflict: () =>
      Result.err<AdminCatalogProductDetail, AdminCatalogError>(
        catalogConflict(productId, variantId),
      ),
    'last-active-variant': () =>
      Result.err<AdminCatalogProductDetail, AdminCatalogError>({
        _tag: 'LastActiveVariantBlocked',
        productId,
        variantId,
        message: 'An active product must retain at least one active variant.',
      }),
    updated: ({ product }) =>
      Result.ok<AdminCatalogProductDetail, AdminCatalogError>(toAdminProductDetail(product)),
  })

export const updateAdminCatalogVariant = async (
  productId: string,
  variantId: string,
  input: AdminVariantUpdate,
) => {
  const normalized = normalizeVariant(input)
  if (normalized.compareAtPriceMnt !== null && normalized.compareAtPriceMnt <= normalized.priceMnt)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(
      invalidCompareAtPrice(productId, variantId),
    )

  const attempted = await tryCatalogWrite(
    () =>
      database.query.catalog.updateAdminVariant({
        productId,
        variantId,
        ...normalized,
        updatedAt: nextVersion(input.expectedUpdatedAt),
      }),
    { sku: normalized.sku, variantId },
  )
  if (attempted.status === 'error') return attempted
  return classifyVariantWrite(
    productId,
    variantId,
    input.expectedUpdatedAt,
    attempted.value,
    normalized.active,
  )
}

export const updateAdminCatalogVariantActivation = async (
  productId: string,
  variantId: string,
  input: AdminVariantActivation,
) => {
  const write = await database.query.catalog.updateAdminVariantActivation({
    productId,
    variantId,
    ...input,
    updatedAt: nextVersion(input.expectedUpdatedAt),
  })
  return classifyVariantWrite(productId, variantId, input.expectedUpdatedAt, write, input.active)
}

export const updateAdminCatalogStock = async (
  productId: string,
  variantId: string,
  input: AdminStockUpdate,
) => {
  const write = await database.query.catalog.updateAdminStock({
    productId,
    variantId,
    ...input,
    updatedAt: nextVersion(input.expectedUpdatedAt),
  })
  return classifyVariantWrite(productId, variantId, input.expectedUpdatedAt, write)
}

export const deleteAdminCatalogVariant = async (
  productId: string,
  variantId: string,
  input: AdminVariantDelete,
) => {
  const [product, variant] = await Promise.all([
    database.query.catalog.findAdminProduct(productId),
    database.query.catalog.findAdminVariant(productId, variantId),
  ])
  if (!product)
    return Result.err<AdminVariantDeleteOutcome, AdminCatalogError>(productNotFound(productId))
  if (!variant)
    return Result.err<AdminVariantDeleteOutcome, AdminCatalogError>(
      variantNotFound(productId, variantId),
    )
  if (product.status === 'archived')
    return Result.err<AdminVariantDeleteOutcome, AdminCatalogError>(
      catalogConflict(productId, variantId),
    )
  if (
    product.updatedAt !== input.expectedProductUpdatedAt ||
    variant.updatedAt !== input.expectedVariantUpdatedAt
  )
    return Result.err<AdminVariantDeleteOutcome, AdminCatalogError>(
      catalogConflict(productId, variantId),
    )
  if (variant.active)
    return Result.err<AdminVariantDeleteOutcome, AdminCatalogError>({
      _tag: 'VariantMustBeInactive',
      productId,
      variantId,
      message: 'Deactivate the variant before deleting it permanently.',
    })

  const updatedAt = nextVersion(input.expectedProductUpdatedAt)
  const write = await database.query.catalog.deleteAdminVariant({
    productId,
    variantId,
    ...input,
    updatedAt,
  })
  if (write.blocked)
    return Result.err<AdminVariantDeleteOutcome, AdminCatalogError>(
      catalogDeletionBlocked(productId, variantId),
    )
  if (!write.deleted)
    return Result.err<AdminVariantDeleteOutcome, AdminCatalogError>(
      catalogConflict(productId, variantId),
    )
  return Result.ok<AdminVariantDeleteOutcome, AdminCatalogError>({
    productId,
    variantId,
    updatedAt,
  })
}

const compensateUpload = async (r2Key: string) => {
  const removed = await Result.tryPromise({
    try: () => env.MEDIA.delete(r2Key),
    catch: cause => cause,
  })
  if (removed.status === 'error')
    console.error(JSON.stringify({ message: 'Uploaded media compensation failed.', r2Key }))
}

export const uploadAdminCatalogImage = async (
  productId: string,
  input: AdminProductImageUpload,
) => {
  const alt = input.alt.trim()
  const variantIds = input.variantIds ?? []
  if (
    !(input.file instanceof File) ||
    input.file.size === 0 ||
    input.file.size > adminCatalogImageMaxBytes ||
    !acceptedUploadTypes.has(input.file.type)
  )
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(
      imageUploadRejected('Upload a JPEG, PNG, WebP, or AVIF image no larger than 10 MiB.'),
    )

  const referenceError = await validateVariantReferences(productId, variantIds)
  if (referenceError)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(referenceError)

  const inspected = await Result.tryPromise({
    try: () => env.IMAGES.info(input.file.stream()),
    catch: () => imageUploadRejected('The uploaded file is not a supported image.'),
  })
  if (inspected.status === 'error')
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(inspected.error)
  const format = imageFormats[inspected.value.format as keyof typeof imageFormats]
  if (!format || !('width' in inspected.value) || !('height' in inspected.value))
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(
      imageUploadRejected('The uploaded file is not a supported image.'),
    )
  const { width, height } = inspected.value

  const imageId = createId('productImage')
  const r2Key = `products/${productId}/${imageId}.${format.extension}`
  const stored = await Result.tryPromise({
    try: () =>
      env.MEDIA.put(r2Key, input.file, {
        onlyIf: { etagDoesNotMatch: '*' },
        httpMetadata: {
          contentType: format.contentType,
          cacheControl: 'public, max-age=31536000, immutable',
        },
      }),
    catch: () => mediaStorageUnavailable(),
  })
  if (stored.status === 'error')
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(stored.error)
  if (stored.value === null)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(mediaStorageUnavailable())

  const attached = await Result.tryPromise({
    try: () =>
      database.query.catalog.attachAdminImage({
        productId,
        expectedUpdatedAt: input.expectedUpdatedAt,
        updatedAt: nextVersion(input.expectedUpdatedAt),
        imageId,
        r2Key,
        width,
        height,
        alt,
        variantIds,
        createdAt: Date.now(),
      }),
    catch: cause => cause,
  })
  if (attached.status === 'error') {
    await compensateUpload(r2Key)
    const missingVariant = await validateVariantReferences(productId, variantIds)
    if (missingVariant)
      return Result.err<AdminCatalogProductDetail, AdminCatalogError>(missingVariant)
    throw attached.error
  }
  if (!attached.value.attached) {
    await compensateUpload(r2Key)
    if (!attached.value.persisted)
      return Result.err<AdminCatalogProductDetail, AdminCatalogError>(productNotFound(productId))
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(catalogConflict(productId))
  }
  if (!attached.value.persisted)
    throw new Error('Attached image product could not be read from D1.')
  return Result.ok<AdminCatalogProductDetail, AdminCatalogError>(
    toAdminProductDetail(attached.value.persisted),
  )
}

export const updateAdminCatalogImage = async (
  productId: string,
  imageId: string,
  input: AdminProductImageUpdate,
) => {
  const variantError = await validateVariantReferences(productId, input.variantIds)
  if (variantError) return Result.err<AdminCatalogProductDetail, AdminCatalogError>(variantError)
  const attempted = await Result.tryPromise({
    try: () =>
      database.query.catalog.updateAdminImage(productId, imageId, {
        ...input,
        alt: input.alt.trim(),
        updatedAt: nextVersion(input.expectedUpdatedAt),
      }),
    catch: cause => cause,
  })
  if (attempted.status === 'error') {
    const missingVariant = await validateVariantReferences(productId, input.variantIds)
    if (missingVariant)
      return Result.err<AdminCatalogProductDetail, AdminCatalogError>(missingVariant)
    throw attempted.error
  }
  const write = attempted.value
  if (!write.persisted)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(productNotFound(productId))
  if (!write.persisted.images.some(image => image.id === imageId))
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(
      imageNotFound(productId, imageId),
    )
  if (!write.updated)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(catalogConflict(productId))
  return Result.ok<AdminCatalogProductDetail, AdminCatalogError>(
    toAdminProductDetail(write.persisted),
  )
}

export const reorderAdminCatalogImages = async (
  productId: string,
  input: AdminProductImageOrder,
) => {
  const write = await database.query.catalog.reorderAdminImages(productId, {
    ...input,
    updatedAt: nextVersion(input.expectedUpdatedAt),
  })
  if (!write.persisted)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(productNotFound(productId))
  if (!write.updated)
    return Result.err<AdminCatalogProductDetail, AdminCatalogError>(catalogConflict(productId))
  return Result.ok<AdminCatalogProductDetail, AdminCatalogError>(
    toAdminProductDetail(write.persisted),
  )
}

export const removeAdminCatalogImage = async (
  productId: string,
  imageId: string,
  input: AdminProductImageDelete,
) => {
  const write = await database.query.catalog.removeAdminImage({
    productId,
    imageId,
    expectedUpdatedAt: input.expectedUpdatedAt,
    updatedAt: nextVersion(input.expectedUpdatedAt),
  })
  if (!write.persisted && !write.image)
    return Result.err<
      { product: AdminCatalogProductDetail; mediaCleanup: MediaCleanup },
      AdminCatalogError
    >(productNotFound(productId))
  if (!write.image)
    return Result.err<
      { product: AdminCatalogProductDetail; mediaCleanup: MediaCleanup },
      AdminCatalogError
    >(imageNotFound(productId, imageId))
  if (!write.removed || !write.persisted)
    return Result.err<
      { product: AdminCatalogProductDetail; mediaCleanup: MediaCleanup },
      AdminCatalogError
    >(catalogConflict(productId))

  const mediaCleanup = await cleanupMedia([
    { r2Key: write.image.r2Key, referenced: write.referenced },
  ])
  return Result.ok<
    { product: AdminCatalogProductDetail; mediaCleanup: MediaCleanup },
    AdminCatalogError
  >({ product: toAdminProductDetail(write.persisted), mediaCleanup })
}

export const adminCatalogOperations = {
  listAdminProducts: listAdminCatalogProducts,
  listAdminSelectors: listAdminCatalogSelectors,
  getAdminProduct: getAdminCatalogProduct,
  createAdminProduct: createAdminCatalogProduct,
  updateAdminProduct: updateAdminCatalogProduct,
  archiveAdminProduct: archiveAdminCatalogProduct,
  restoreAdminProduct: restoreAdminCatalogProduct,
  deleteAdminProduct: deleteAdminCatalogProduct,
  createAdminVariant: createAdminCatalogVariant,
  updateAdminVariant: updateAdminCatalogVariant,
  updateAdminVariantActivation: updateAdminCatalogVariantActivation,
  updateAdminStock: updateAdminCatalogStock,
  deleteAdminVariant: deleteAdminCatalogVariant,
  uploadAdminImage: uploadAdminCatalogImage,
  updateAdminImage: updateAdminCatalogImage,
  reorderAdminImages: reorderAdminCatalogImages,
  removeAdminImage: removeAdminCatalogImage,
}
