import type {
  AdminCatalogProductDetail,
  AdminProductCreate,
} from '@store-kit/contracts/admin-catalog'
import { createId } from '@store-kit/db/ids'
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vite-plus/test'

import { commerce } from '~/index'
import fixtureDataUrl from '~/test/fixtures/catalog-upload.jpg?inline'

const fixtureBytes = Uint8Array.from(
  atob(fixtureDataUrl.slice(fixtureDataUrl.indexOf(',') + 1)),
  character => character.charCodeAt(0),
)

const unique = (label: string) => `${label}-${crypto.randomUUID()}`

const productInput = (
  slug: string,
  sku: string,
  overrides: Partial<AdminProductCreate> = {},
): AdminProductCreate => ({
  name: 'Catalog integration product',
  slug,
  shortDescription: 'Short description',
  description: 'Long description',
  status: 'draft',
  featured: false,
  brandId: null,
  categoryId: null,
  initialVariant: {
    sku,
    name: 'Default',
    options: { color: 'Graphite' },
    priceMnt: 120_000,
    compareAtPriceMnt: 140_000,
    stockQuantity: 8,
    sortOrder: 0,
  },
  ...overrides,
})

const expectOk = <Value, Error>(
  result:
    | {
        status: 'ok'
        value: Value
      }
    | {
        status: 'error'
        error: Error
      },
) => {
  if (result.status === 'error')
    throw new Error(`Expected Result.ok: ${JSON.stringify(result.error)}`)
  expect(result.status).toBe('ok')
  return result.value
}

const expectErrorTag = <Value, Error extends { _tag: string }>(
  result: { status: 'ok'; value: Value } | { status: 'error'; error: Error },
  tag: Error['_tag'],
) => {
  expect(result).toMatchObject({ status: 'error', error: { _tag: tag } })
}

const insertReferences = async () => {
  const now = Date.now()
  const brandId = createId('brand')
  const categoryId = createId('category')
  await env.DB.batch([
    env.DB.prepare(
      `insert into brand (id, slug, name, created_at, updated_at) values (?, ?, ?, ?, ?)`,
    ).bind(brandId, unique('brand'), 'Integration brand', now, now),
    env.DB.prepare(
      `insert into category
        (id, slug, name, sort_order, active, created_at, updated_at)
       values (?, ?, ?, 0, 1, ?, ?)`,
    ).bind(categoryId, unique('category'), 'Integration category', now, now),
  ])
  return { brandId, categoryId }
}

const installCheckoutSettings = async () => {
  const now = Date.now()
  await env.DB.prepare(
    `insert or replace into checkout_settings
      (id, delivery_fee_mnt, bank_name, bank_account_name, bank_account_number, updated_at)
     values ('cfg_00000000000000000000000001', 5000, 'Bank', 'Store', '001', ?)`,
  )
    .bind(now)
    .run()
}

const checkoutInput = (variantId: string) => ({
  items: [{ variantId, quantity: 1 }],
  customer: { name: 'Catalog customer', phone: '99112233' },
  delivery: {
    district: 'Сүхбаатар' as const,
    khoroo: '1-р хороо',
    address: 'Integration address',
  },
  paymentMethod: 'bank_transfer' as const,
})

const fileFixture = () => new File([fixtureBytes], 'catalog-upload.jpg', { type: 'image/jpeg' })

const productWriteInput = (
  product: AdminCatalogProductDetail,
  overrides: Partial<{
    name: string
    slug: string
    shortDescription: string | null
    description: string | null
    status: 'draft' | 'active'
    featured: boolean
    brandId: string | null
    categoryId: string | null
  }> = {},
) => ({
  expectedUpdatedAt: product.updatedAt,
  name: product.name,
  slug: product.slug,
  shortDescription: product.shortDescription,
  description: product.description,
  status: product.status === 'active' ? ('active' as const) : ('draft' as const),
  featured: product.featured,
  brandId: product.brand?.id ?? null,
  categoryId: product.category?.id ?? null,
  ...overrides,
})

describe('catalog product and variant operations', () => {
  it('creates a product and initial variant atomically and maps authoritative uniqueness errors', async () => {
    const slug = unique('atomic-product')
    const sku = unique('ATOMIC-SKU')
    const created = expectOk(
      await commerce.catalog.createAdminProduct(
        productInput(slug, sku, { status: 'active', featured: true }),
      ),
    )

    expect(created).toMatchObject({
      name: 'Catalog integration product',
      slug,
      shortDescription: 'Short description',
      description: 'Long description',
      status: 'active',
      featured: true,
      brand: null,
      category: null,
      images: [],
      variants: [
        {
          sku,
          name: 'Default',
          options: { color: 'Graphite' },
          priceMnt: 120_000,
          compareAtPriceMnt: 140_000,
          stockQuantity: 8,
          active: true,
          sortOrder: 0,
        },
      ],
    })
    expect(created.id).toMatch(/^prod_[0-7][0-9a-hjkmnp-tv-z]{25}$/u)
    expect(created.variants[0]?.id).toMatch(/^var_[0-7][0-9a-hjkmnp-tv-z]{25}$/u)

    const published = expectOk(await commerce.catalog.getProduct(slug))
    expect(published.id).toBe(created.id)
    expect(published.details).toEqual({})
    expect(published.useCases).toEqual([])

    const duplicateSlug = await commerce.catalog.createAdminProduct(
      productInput(slug, unique('UNIQUE-SKU')),
    )
    expectErrorTag(duplicateSlug, 'ProductSlugTaken')
    const duplicateSkuSlug = unique('duplicate-sku-product')
    const duplicateSku = await commerce.catalog.createAdminProduct(
      productInput(duplicateSkuSlug, sku),
    )
    expectErrorTag(duplicateSku, 'VariantSkuTaken')

    const [{ count: duplicateSlugProducts }] = await env.DB.prepare(
      'select count(*) as count from product where slug = ?',
    )
      .bind(slug)
      .all<{ count: number }>()
      .then(result => result.results)
    const partial = await env.DB.prepare(
      `select
         (select count(*) from product where slug = ?) as products,
         (select count(*) from product_variant where sku = ?) as variants`,
    )
      .bind(duplicateSkuSlug, sku)
      .first<{ products: number; variants: number }>()
    expect(duplicateSlugProducts).toBe(1)
    expect(partial).toEqual({ products: 0, variants: 1 })
  })

  it('filters inventory by individual active variants instead of product totals', async () => {
    const lowProduct = expectOk(
      await commerce.catalog.createAdminProduct(
        productInput(unique('low-stock-product'), unique('LOW-STOCK-HIGH'), {
          initialVariant: {
            ...productInput('unused', 'unused').initialVariant,
            sku: unique('LOW-STOCK-HIGH'),
            stockQuantity: 10,
          },
        }),
      ),
    )
    await commerce.catalog.createAdminVariant(lowProduct.id, {
      expectedProductUpdatedAt: lowProduct.updatedAt,
      sku: unique('LOW-STOCK-LOW'),
      name: 'Low stock option',
      options: { color: 'Silver' },
      priceMnt: 120_000,
      compareAtPriceMnt: null,
      stockQuantity: 2,
      active: true,
      sortOrder: 10,
    })

    const outProduct = expectOk(
      await commerce.catalog.createAdminProduct(
        productInput(unique('out-stock-product'), unique('OUT-STOCK-HIGH'), {
          initialVariant: {
            ...productInput('unused', 'unused').initialVariant,
            sku: unique('OUT-STOCK-HIGH'),
            stockQuantity: 10,
          },
        }),
      ),
    )
    await commerce.catalog.createAdminVariant(outProduct.id, {
      expectedProductUpdatedAt: outProduct.updatedAt,
      sku: unique('OUT-STOCK-OUT'),
      name: 'Out of stock option',
      options: { color: 'Silver' },
      priceMnt: 120_000,
      compareAtPriceMnt: null,
      stockQuantity: 0,
      active: true,
      sortOrder: 10,
    })

    const low = expectOk(await commerce.catalog.listAdminProducts({ inventory: 'low' }))
    const out = expectOk(await commerce.catalog.listAdminProducts({ inventory: 'out' }))

    expect(low.items.map(item => item.id)).toContain(lowProduct.id)
    expect(out.items.map(item => item.id)).toContain(outProduct.id)
  })

  it('edits lifecycle and variants with optimistic versions and catalog invariants', async () => {
    const references = await insertReferences()
    const created = expectOk(
      await commerce.catalog.createAdminProduct(
        productInput(unique('lifecycle-product'), unique('LIFECYCLE-SKU'), {
          ...references,
        }),
      ),
    )
    await env.DB.batch([
      env.DB.prepare(`update product set details = ?, use_cases = ? where id = ?`).bind(
        JSON.stringify({ driver: 'dynamic' }),
        JSON.stringify(['daily-carry']),
        created.id,
      ),
      env.DB.prepare('update category set active = 0 where id = ?').bind(references.categoryId),
    ])
    const selectors = expectOk(await commerce.catalog.listAdminSelectors())
    expect(selectors.categories).toContainEqual(
      expect.objectContaining({ id: references.categoryId, active: false }),
    )
    expectErrorTag(
      await commerce.catalog.createAdminProduct(
        productInput(unique('inactive-category-product'), unique('INACTIVE-CATEGORY-SKU'), {
          categoryId: references.categoryId,
        }),
      ),
      'CatalogReferenceNotFound',
    )

    const activated = expectOk(
      await commerce.catalog.updateAdminProduct(
        created.id,
        productWriteInput(created, {
          name: 'Edited product',
          shortDescription: null,
          description: null,
          status: 'active',
          featured: true,
        }),
      ),
    )
    expect(activated).toMatchObject({
      name: 'Edited product',
      shortDescription: null,
      description: null,
      status: 'active',
      brand: { id: references.brandId },
      category: { id: references.categoryId, active: false },
    })
    const preserved = await env.DB.prepare('select details, use_cases from product where id = ?')
      .bind(created.id)
      .first<{ details: string; use_cases: string }>()
    expect(preserved).toEqual({
      details: JSON.stringify({ driver: 'dynamic' }),
      use_cases: JSON.stringify(['daily-carry']),
    })

    const second = expectOk(
      await commerce.catalog.createAdminVariant(created.id, {
        expectedProductUpdatedAt: activated.updatedAt,
        sku: unique('SECOND-SKU'),
        name: 'Blue',
        options: { color: 'Blue' },
        priceMnt: 130_000,
        compareAtPriceMnt: 150_000,
        stockQuantity: 5,
        active: true,
        sortOrder: 10,
      }),
    )
    const secondVariant = second.variants.find(variant => variant.name === 'Blue')!
    expectErrorTag(
      await commerce.catalog.createAdminVariant(created.id, {
        expectedProductUpdatedAt: second.updatedAt,
        sku: secondVariant.sku,
        name: 'Duplicate SKU',
        options: {},
        priceMnt: 100_000,
        compareAtPriceMnt: null,
        stockQuantity: 1,
        active: true,
        sortOrder: 30,
      }),
      'VariantSkuTaken',
    )
    const editedVariant = expectOk(
      await commerce.catalog.updateAdminVariant(created.id, secondVariant.id, {
        expectedUpdatedAt: secondVariant.updatedAt,
        sku: secondVariant.sku,
        name: 'Ocean blue',
        options: { color: 'Ocean blue', connector: 'USB-C' },
        priceMnt: 135_000,
        compareAtPriceMnt: 160_000,
        stockQuantity: 7,
        active: true,
        sortOrder: 20,
      }),
    )
    expect(editedVariant.variants.find(variant => variant.id === secondVariant.id)).toMatchObject({
      name: 'Ocean blue',
      options: { color: 'Ocean blue', connector: 'USB-C' },
      priceMnt: 135_000,
      compareAtPriceMnt: 160_000,
      stockQuantity: 7,
      sortOrder: 20,
    })

    const initial = editedVariant.variants.find(variant => variant.id !== secondVariant.id)!
    const initialInactive = expectOk(
      await commerce.catalog.updateAdminVariantActivation(created.id, initial.id, {
        expectedUpdatedAt: initial.updatedAt,
        active: false,
      }),
    )
    const currentSecond = initialInactive.variants.find(variant => variant.id === secondVariant.id)!
    expectErrorTag(
      await commerce.catalog.updateAdminVariantActivation(created.id, currentSecond.id, {
        expectedUpdatedAt: currentSecond.updatedAt,
        active: false,
      }),
      'LastActiveVariantBlocked',
    )

    const stocked = expectOk(
      await commerce.catalog.updateAdminStock(created.id, currentSecond.id, {
        expectedUpdatedAt: currentSecond.updatedAt,
        stockQuantity: 11,
      }),
    )
    expectErrorTag(
      await commerce.catalog.updateAdminStock(created.id, currentSecond.id, {
        expectedUpdatedAt: currentSecond.updatedAt,
        stockQuantity: 99,
      }),
      'AdminCatalogConflict',
    )
    expectErrorTag(
      await commerce.catalog.deleteAdminVariant(created.id, currentSecond.id, {
        expectedProductUpdatedAt: stocked.updatedAt,
        expectedVariantUpdatedAt: stocked.variants.find(variant => variant.id === currentSecond.id)!
          .updatedAt,
      }),
      'VariantMustBeInactive',
    )

    const draft = expectOk(
      await commerce.catalog.updateAdminProduct(
        created.id,
        productWriteInput(stocked, { status: 'draft', featured: false }),
      ),
    )
    const activeSecond = draft.variants.find(variant => variant.id === currentSecond.id)!
    const allInactive = expectOk(
      await commerce.catalog.updateAdminVariantActivation(created.id, activeSecond.id, {
        expectedUpdatedAt: activeSecond.updatedAt,
        active: false,
      }),
    )
    const inactiveSecond = allInactive.variants.find(variant => variant.id === currentSecond.id)!
    const deletedVariant = expectOk(
      await commerce.catalog.deleteAdminVariant(created.id, inactiveSecond.id, {
        expectedProductUpdatedAt: allInactive.updatedAt,
        expectedVariantUpdatedAt: inactiveSecond.updatedAt,
      }),
    )
    expect(deletedVariant.variantId).toBe(inactiveSecond.id)

    const afterVariantDelete = expectOk(await commerce.catalog.getAdminProduct(created.id))
    expectErrorTag(
      await commerce.catalog.deleteAdminProduct(created.id, {
        expectedUpdatedAt: afterVariantDelete.updatedAt,
      }),
      'ProductMustBeArchived',
    )
    const archived = expectOk(
      await commerce.catalog.archiveAdminProduct(created.id, {
        expectedUpdatedAt: afterVariantDelete.updatedAt,
      }),
    )
    expect(archived).toMatchObject({ status: 'archived', featured: false })
    const restored = expectOk(
      await commerce.catalog.restoreAdminProduct(created.id, {
        expectedUpdatedAt: archived.updatedAt,
      }),
    )
    expect(restored).toMatchObject({ status: 'draft', featured: false })
    const archivedAgain = expectOk(
      await commerce.catalog.archiveAdminProduct(created.id, {
        expectedUpdatedAt: restored.updatedAt,
      }),
    )
    const deleted = expectOk(
      await commerce.catalog.deleteAdminProduct(created.id, {
        expectedUpdatedAt: archivedAgain.updatedAt,
      }),
    )
    expect(deleted).toEqual({ productId: created.id, mediaCleanup: 'complete' })
    expect(
      await env.DB.prepare('select id from product where id = ?').bind(created.id).first(),
    ).toBeNull()
  })
})

describe('catalog media and order references', () => {
  it('uses real Images, R2, and D1 bindings for upload, edit, reorder, and unreferenced removal', async () => {
    const created = expectOk(
      await commerce.catalog.createAdminProduct(
        productInput(unique('media-product'), unique('MEDIA-SKU'), { status: 'active' }),
      ),
    )
    const variantId = created.variants[0]!.id
    const first = expectOk(
      await commerce.catalog.uploadAdminImage(created.id, {
        file: fileFixture(),
        alt: 'Front product image',
        variantIds: [variantId],
        expectedUpdatedAt: created.updatedAt,
      }),
    )
    const firstImage = first.images[0]!
    const firstRecord = await env.DB.prepare(
      `select r2_key, width, height, alt, sort_order from product_image where id = ?`,
    )
      .bind(firstImage.id)
      .first<{
        r2_key: string
        width: number
        height: number
        alt: string
        sort_order: number
      }>()
    expect(firstRecord).toMatchObject({
      width: firstImage.width,
      height: firstImage.height,
      alt: 'Front product image',
      sort_order: 10,
    })
    const firstObject = await env.MEDIA.get(firstRecord!.r2_key)
    expect(firstObject).not.toBeNull()
    expect(firstObject?.httpMetadata).toMatchObject({
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000, immutable',
    })
    expect(new Uint8Array(await firstObject!.arrayBuffer())).toEqual(fixtureBytes)

    const second = expectOk(
      await commerce.catalog.uploadAdminImage(created.id, {
        file: fileFixture(),
        alt: 'Detail product image',
        expectedUpdatedAt: first.updatedAt,
      }),
    )
    const secondImage = second.images.find(image => image.id !== firstImage.id)!
    const edited = expectOk(
      await commerce.catalog.updateAdminImage(created.id, secondImage.id, {
        alt: 'Variant detail image',
        variantIds: [variantId],
        expectedUpdatedAt: second.updatedAt,
      }),
    )
    expect(edited.images.find(image => image.id === secondImage.id)).toMatchObject({
      alt: 'Variant detail image',
      variantIds: [variantId],
    })

    const reordered = expectOk(
      await commerce.catalog.reorderAdminImages(created.id, {
        imageIds: [secondImage.id, firstImage.id],
        expectedUpdatedAt: edited.updatedAt,
      }),
    )
    expect(reordered.images.map(image => image.id)).toEqual([secondImage.id, firstImage.id])
    expect(reordered.images.map(image => image.sortOrder)).toEqual([10, 20])
    const published = expectOk(await commerce.catalog.getProduct(created.slug))
    expect(published.images.map(image => image.id)).toEqual([secondImage.id, firstImage.id])
    expect(published.variants[0]?.imageLinks.map(link => link.imageId)).toEqual(
      expect.arrayContaining([firstImage.id, secondImage.id]),
    )

    const removed = expectOk(
      await commerce.catalog.removeAdminImage(created.id, firstImage.id, {
        expectedUpdatedAt: reordered.updatedAt,
      }),
    )
    expect(removed.mediaCleanup).toBe('complete')
    expect(await env.MEDIA.get(firstRecord!.r2_key)).toBeNull()
    expect(
      await env.DB.prepare('select id from product_image where id = ?').bind(firstImage.id).first(),
    ).toBeNull()
  })

  it('rejects invalid bytes and compensates R2 when a stale product version blocks attachment', async () => {
    const created = expectOk(
      await commerce.catalog.createAdminProduct(
        productInput(unique('media-failure-product'), unique('MEDIA-FAILURE-SKU')),
      ),
    )
    const prefix = `products/${created.id}/`
    const invalid = await commerce.catalog.uploadAdminImage(created.id, {
      file: new File([new TextEncoder().encode('not an image')], 'invalid.jpg', {
        type: 'image/jpeg',
      }),
      alt: 'Invalid image',
      expectedUpdatedAt: created.updatedAt,
    })
    expectErrorTag(invalid, 'ImageUploadRejected')
    expect((await env.MEDIA.list({ prefix })).objects).toEqual([])
    expect(
      await env.DB.prepare('select count(*) as count from product_image where product_id = ?')
        .bind(created.id)
        .first(),
    ).toEqual({ count: 0 })
    expectErrorTag(
      await commerce.catalog.uploadAdminImage(created.id, {
        file: fileFixture(),
        alt: 'Foreign variant image',
        variantIds: [createId('productVariant')],
        expectedUpdatedAt: created.updatedAt,
      }),
      'CatalogReferenceNotFound',
    )
    expect((await env.MEDIA.list({ prefix })).objects).toEqual([])

    const changed = expectOk(
      await commerce.catalog.updateAdminProduct(
        created.id,
        productWriteInput(created, { name: 'Changed before upload' }),
      ),
    )
    const stale = await commerce.catalog.uploadAdminImage(created.id, {
      file: fileFixture(),
      alt: 'Stale image',
      variantIds: [created.variants[0]!.id],
      expectedUpdatedAt: created.updatedAt,
    })
    expectErrorTag(stale, 'AdminCatalogConflict')
    expect((await env.MEDIA.list({ prefix })).objects).toEqual([])
    expect(changed.images).toEqual([])

    const missingImage = await commerce.catalog.updateAdminImage(
      created.id,
      createId('productImage'),
      {
        alt: 'Missing image',
        variantIds: [created.variants[0]!.id],
        expectedUpdatedAt: changed.updatedAt,
      },
    )
    expectErrorTag(missingImage, 'AdminCatalogImageNotFound')
  })

  it('retains R2 media when removing a single image referenced by an order snapshot', async () => {
    await installCheckoutSettings()
    const created = expectOk(
      await commerce.catalog.createAdminProduct(
        productInput(unique('single-image-reference'), unique('SINGLE-IMAGE-REFERENCE'), {
          status: 'active',
        }),
      ),
    )
    const withImage = expectOk(
      await commerce.catalog.uploadAdminImage(created.id, {
        file: fileFixture(),
        alt: 'Referenced product image',
        variantIds: [created.variants[0]!.id],
        expectedUpdatedAt: created.updatedAt,
      }),
    )
    const image = await env.DB.prepare('select id, r2_key from product_image where id = ?')
      .bind(withImage.images[0]!.id)
      .first<{ id: string; r2_key: string }>()
    const checkout = expectOk(
      await commerce.checkout.createOrder(checkoutInput(created.variants[0]!.id)),
    )

    const removed = expectOk(
      await commerce.catalog.removeAdminImage(created.id, image!.id, {
        expectedUpdatedAt: withImage.updatedAt,
      }),
    )
    const line = await env.DB.prepare('select image_r2_key from order_line where order_id = ?')
      .bind(checkout.orderId)
      .first<{ image_r2_key: string | null }>()

    expect(removed.mediaCleanup).toBe('retained-for-orders')
    expect(line?.image_r2_key).toBe(image!.r2_key)
    expect(await env.MEDIA.get(image!.r2_key)).not.toBeNull()
    expect(
      await env.DB.prepare('select id from product_image where id = ?').bind(image!.id).first(),
    ).toBeNull()
  })

  it('keeps concurrent checkout snapshots and image cleanup consistent in real D1 and R2', async () => {
    await installCheckoutSettings()
    const created = expectOk(
      await commerce.catalog.createAdminProduct(
        productInput(unique('concurrent-image-reference'), unique('CONCURRENT-IMAGE-REFERENCE'), {
          status: 'active',
        }),
      ),
    )
    const withImage = expectOk(
      await commerce.catalog.uploadAdminImage(created.id, {
        file: fileFixture(),
        alt: 'Concurrent checkout image',
        variantIds: [created.variants[0]!.id],
        expectedUpdatedAt: created.updatedAt,
      }),
    )
    const image = await env.DB.prepare('select id, r2_key from product_image where id = ?')
      .bind(withImage.images[0]!.id)
      .first<{ id: string; r2_key: string }>()

    const [checkoutResult, removalResult] = await Promise.all([
      commerce.checkout.createOrder(checkoutInput(created.variants[0]!.id)),
      commerce.catalog.removeAdminImage(created.id, image!.id, {
        expectedUpdatedAt: withImage.updatedAt,
      }),
    ])
    const checkout = expectOk(checkoutResult)
    const removal = expectOk(removalResult)
    const line = await env.DB.prepare('select image_r2_key from order_line where order_id = ?')
      .bind(checkout.orderId)
      .first<{ image_r2_key: string | null }>()
    const object = await env.MEDIA.get(image!.r2_key)

    if (line?.image_r2_key === image!.r2_key) {
      expect(removal.mediaCleanup).toBe('retained-for-orders')
      expect(object).not.toBeNull()
    } else {
      expect(line?.image_r2_key).toBeNull()
      expect(removal.mediaCleanup).toBe('complete')
      expect(object).toBeNull()
    }
  })

  it('blocks active-order references, then retains completed snapshots after deletion', async () => {
    await installCheckoutSettings()
    const created = expectOk(
      await commerce.catalog.createAdminProduct(
        productInput(unique('order-reference-product'), unique('ORDER-REFERENCE-SKU'), {
          status: 'active',
        }),
      ),
    )
    const withImage = expectOk(
      await commerce.catalog.uploadAdminImage(created.id, {
        file: fileFixture(),
        alt: 'Order snapshot image',
        variantIds: [created.variants[0]!.id],
        expectedUpdatedAt: created.updatedAt,
      }),
    )
    const image = await env.DB.prepare(
      `select id, r2_key, width, height, alt from product_image where id = ?`,
    )
      .bind(withImage.images[0]!.id)
      .first<{
        id: string
        r2_key: string
        width: number
        height: number
        alt: string
      }>()
    const checkout = expectOk(
      await commerce.checkout.createOrder(checkoutInput(created.variants[0]!.id)),
    )
    const before = await env.DB.prepare(
      `select l.product_id, l.variant_id, l.product_name, l.variant_name, l.sku, l.options,
              l.image_r2_key, l.image_width, l.image_height, l.image_alt, l.unit_price_mnt,
              l.quantity, l.line_total_mnt, o.subtotal_mnt, o.delivery_fee_mnt, o.total_mnt,
              p.method, p.status as payment_status, p.amount_mnt
       from order_line l
       join customer_order o on o.id = l.order_id
       join payment p on p.order_id = o.id
       where o.id = ?`,
    )
      .bind(checkout.orderId)
      .first<Record<string, string | number | null>>()

    const draft = expectOk(
      await commerce.catalog.updateAdminProduct(
        created.id,
        productWriteInput(withImage, { status: 'draft', featured: false }),
      ),
    )
    const variant = draft.variants[0]!
    const inactive = expectOk(
      await commerce.catalog.updateAdminVariantActivation(created.id, variant.id, {
        expectedUpdatedAt: variant.updatedAt,
        active: false,
      }),
    )
    expectErrorTag(
      await commerce.catalog.deleteAdminVariant(created.id, variant.id, {
        expectedProductUpdatedAt: inactive.updatedAt,
        expectedVariantUpdatedAt: inactive.variants[0]!.updatedAt,
      }),
      'CatalogDeletionBlocked',
    )

    const archived = expectOk(
      await commerce.catalog.archiveAdminProduct(created.id, {
        expectedUpdatedAt: inactive.updatedAt,
      }),
    )
    expectErrorTag(
      await commerce.catalog.deleteAdminProduct(created.id, {
        expectedUpdatedAt: archived.updatedAt,
      }),
      'CatalogDeletionBlocked',
    )

    await env.DB.prepare("update customer_order set status = 'cancelled' where id = ?")
      .bind(checkout.orderId)
      .run()
    const deleted = expectOk(
      await commerce.catalog.deleteAdminProduct(created.id, {
        expectedUpdatedAt: archived.updatedAt,
      }),
    )
    expect(deleted.mediaCleanup).toBe('retained-for-orders')

    const after = await env.DB.prepare(
      `select l.product_id, l.variant_id, l.product_name, l.variant_name, l.sku, l.options,
              l.image_r2_key, l.image_width, l.image_height, l.image_alt, l.unit_price_mnt,
              l.quantity, l.line_total_mnt, o.subtotal_mnt, o.delivery_fee_mnt, o.total_mnt,
              p.method, p.status as payment_status, p.amount_mnt
       from order_line l
       join customer_order o on o.id = l.order_id
       join payment p on p.order_id = o.id
       where o.id = ?`,
    )
      .bind(checkout.orderId)
      .first<Record<string, string | number | null>>()
    expect(after).toEqual({ ...before, product_id: null, variant_id: null })
    expect(after).toMatchObject({
      image_r2_key: image!.r2_key,
      image_width: image!.width,
      image_height: image!.height,
      image_alt: image!.alt,
      payment_status: 'pending',
    })
    expect(await env.MEDIA.get(image!.r2_key)).not.toBeNull()
    expect(
      await env.DB.prepare('select id from product_image where id = ?').bind(image!.id).first(),
    ).toBeNull()

    const customerOrder = expectOk(
      await commerce.orders.getPrivateStatus(checkout.orderId, checkout.statusToken),
    )
    expect(customerOrder.lines[0]).toMatchObject({
      productId: null,
      variantId: null,
      productName: before!.product_name,
      variantName: before!.variant_name,
      sku: before!.sku,
      imageR2Key: image!.r2_key,
      imageWidth: image!.width,
      imageHeight: image!.height,
      imageAlt: image!.alt,
    })
    expect(customerOrder.payment).toMatchObject({
      status: 'pending',
      amountMnt: before!.amount_mnt,
    })
  })
})
