import { Value } from 'typebox/value'
import { describe, expect, it } from 'vite-plus/test'

import {
  adminCatalogImageMaxBytes,
  adminProductCreateSchema,
  adminProductImageOrderSchema,
  adminProductImageUploadSchema,
  adminProductUpdateSchema,
  adminVariantCreateSchema,
  convertMultipartContract,
} from './admin-catalog'

const brandId = 'brd_00000000000000000000000000'
const categoryId = 'cat_00000000000000000000000000'
const imageId = 'img_00000000000000000000000000'
const variantId = 'var_00000000000000000000000000'

const initialVariant = {
  sku: 'SKU-1',
  name: 'Default',
  options: { color: 'Graphite' },
  priceMnt: 100_000,
  compareAtPriceMnt: 120_000,
  stockQuantity: 3,
  sortOrder: 0,
}

const product = {
  name: 'Product',
  slug: 'product',
  shortDescription: null,
  description: 'Description',
  status: 'draft',
  featured: false,
  brandId,
  categoryId,
  initialVariant,
}

describe('admin catalog write contracts', () => {
  it('accepts complete strict product, variant, and image inputs', () => {
    expect(Value.Check(adminProductCreateSchema, product)).toBe(true)
    expect(
      Value.Check(adminProductUpdateSchema, {
        ...product,
        initialVariant: undefined,
        expectedUpdatedAt: 1,
      }),
    ).toBe(false)
    expect(
      Value.Check(adminProductUpdateSchema, {
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription,
        description: product.description,
        status: product.status,
        featured: product.featured,
        brandId,
        categoryId,
        expectedUpdatedAt: 1,
      }),
    ).toBe(true)
    expect(
      Value.Check(adminVariantCreateSchema, {
        ...initialVariant,
        active: true,
        expectedProductUpdatedAt: 1,
      }),
    ).toBe(true)
    expect(
      Value.Check(adminProductImageOrderSchema, {
        imageIds: [imageId],
        expectedUpdatedAt: 1,
      }),
    ).toBe(true)
  })

  it('rejects malformed IDs, partial writes, unknown fields, bad slugs, and invalid numbers', () => {
    expect(Value.Check(adminProductCreateSchema, { ...product, slug: 'Bad Slug' })).toBe(false)
    expect(Value.Check(adminProductCreateSchema, { ...product, name: ' Product' })).toBe(false)
    expect(Value.Check(adminProductCreateSchema, { ...product, brandId: 'brand_1' })).toBe(false)
    expect(
      Value.Check(adminProductCreateSchema, {
        ...product,
        initialVariant: { ...initialVariant, stockQuantity: -1 },
      }),
    ).toBe(false)
    expect(
      Value.Check(adminProductCreateSchema, {
        ...product,
        initialVariant: { ...initialVariant, extra: true },
      }),
    ).toBe(false)
    expect(Value.Check(adminProductUpdateSchema, { expectedUpdatedAt: 1 })).toBe(false)
    expect(
      Value.Check(adminProductImageOrderSchema, {
        imageIds: [imageId, imageId],
        expectedUpdatedAt: 1,
      }),
    ).toBe(false)
    expect(
      Value.Check(adminVariantCreateSchema, {
        ...initialVariant,
        options: Object.fromEntries(
          Array.from({ length: 21 }, (_, index) => [`option-${index}`, `${index}`]),
        ),
        active: true,
        expectedProductUpdatedAt: 1,
      }),
    ).toBe(false)
  })

  it('converts multipart scalars without replacing the File', () => {
    const file = new File(['image'], 'image.jpg', { type: 'image/jpeg' })
    const converted = convertMultipartContract(adminProductImageUploadSchema, {
      file,
      alt: 'Product image',
      variantIds: [variantId],
      expectedUpdatedAt: '42',
    })

    expect(converted).toMatchObject({
      file,
      alt: 'Product image',
      variantIds: [variantId],
      expectedUpdatedAt: 42,
    })
    expect((converted as { file: File }).file).toBe(file)
    expect(Value.Check(adminProductImageUploadSchema, converted)).toBe(true)
  })

  it('rejects oversized and unsupported multipart files after conversion', () => {
    const base = { alt: 'Product image', expectedUpdatedAt: '42' }
    const oversized = convertMultipartContract(adminProductImageUploadSchema, {
      ...base,
      file: new File([new Uint8Array(adminCatalogImageMaxBytes + 1)], 'large.jpg', {
        type: 'image/jpeg',
      }),
    })
    const unsupported = convertMultipartContract(adminProductImageUploadSchema, {
      ...base,
      file: new File(['image'], 'image.gif', { type: 'image/gif' }),
    })

    expect(Value.Check(adminProductImageUploadSchema, oversized)).toBe(false)
    expect(Value.Check(adminProductImageUploadSchema, unsupported)).toBe(false)
  })
})
