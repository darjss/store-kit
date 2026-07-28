import { commerce } from '@store-kit/commerce'
import type {
  AdminCatalogError,
  AdminCatalogProductDetail,
  AdminCatalogProductList,
} from '@store-kit/contracts/admin-catalog'
import { createId } from '@store-kit/db/ids'
import { Result } from 'better-result'
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vite-plus/test'

import { createAdminSession } from '~/test/admin-session'

import { adminCatalogRoutes } from './admin-catalog'
import { catalogRoutes } from './catalog'

let sequence = 0

const nextSequence = () => ++sequence

type SeedVariant = {
  active?: boolean
  compareAtPriceMnt?: number | null
  name?: string
  priceMnt?: number
  sku?: string
  stockQuantity?: number
}

type SeedProduct = {
  featured?: boolean
  name?: string
  status?: 'draft' | 'active' | 'archived'
  updatedAt?: number
  variants?: SeedVariant[]
  withRelations?: boolean
}

const seedProduct = async ({
  featured = false,
  name,
  status = 'active',
  updatedAt = Date.now() - 60_000,
  variants = [{}],
  withRelations = false,
}: SeedProduct = {}) => {
  const suffix = nextSequence()
  const productId = createId('product')
  const brandId = withRelations ? createId('brand') : null
  const categoryId = withRelations ? createId('category') : null
  const productName = name ?? `Admin API Product ${suffix}`
  const slug = `admin-api-product-${suffix}`
  const statements: D1PreparedStatement[] = []

  if (brandId)
    statements.push(
      env.DB.prepare(
        `insert into brand (id, slug, name, created_at, updated_at)
         values (?, ?, ?, ?, ?)`,
      ).bind(brandId, `admin-brand-${suffix}`, `Admin Brand ${suffix}`, updatedAt, updatedAt),
    )
  if (categoryId)
    statements.push(
      env.DB.prepare(
        `insert into category (id, slug, name, active, sort_order, created_at, updated_at)
         values (?, ?, ?, 1, 0, ?, ?)`,
      ).bind(
        categoryId,
        `admin-category-${suffix}`,
        `Admin Category ${suffix}`,
        updatedAt,
        updatedAt,
      ),
    )

  statements.push(
    env.DB.prepare(
      `insert into product
        (id, slug, brand_id, category_id, name, status, featured, use_cases, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)`,
    ).bind(
      productId,
      slug,
      brandId,
      categoryId,
      productName,
      status,
      featured,
      updatedAt,
      updatedAt,
    ),
  )

  const seededVariants = variants.map((variant, index) => {
    const variantId = createId('productVariant')
    const sku = variant.sku ?? `ADMIN-API-${suffix}-${index}`
    const variantName = variant.name ?? `Variant ${index + 1}`
    statements.push(
      env.DB.prepare(
        `insert into product_variant
          (id, product_id, sku, name, options, price_mnt, compare_at_price_mnt,
           stock_quantity, active, sort_order, created_at, updated_at)
         values (?, ?, ?, ?, '{}', ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        variantId,
        productId,
        sku,
        variantName,
        variant.priceMnt ?? 10_000 + index * 1_000,
        variant.compareAtPriceMnt ?? null,
        variant.stockQuantity ?? 5,
        variant.active ?? true,
        index,
        updatedAt,
        updatedAt,
      ),
    )
    return { id: variantId, name: variantName, sku, updatedAt }
  })

  await env.DB.batch(statements)
  return {
    id: productId,
    name: productName,
    slug,
    updatedAt,
    variants: seededVariants,
    brandName: brandId ? `Admin Brand ${suffix}` : null,
    categoryName: categoryId ? `Admin Category ${suffix}` : null,
  }
}

const requestCatalog = (
  path: string,
  {
    body,
    cookie,
    method = 'GET',
  }: { body?: unknown; cookie?: string; method?: 'GET' | 'PATCH' } = {},
) =>
  adminCatalogRoutes.handle(
    new Request(`https://plugged.mn${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(cookie ? { cookie } : {}),
        origin: 'https://plugged.mn',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  )

const deserializeCatalog = async <Value>(response: Response) =>
  Result.deserialize<Value, AdminCatalogError>(await response.json())

const expectOk = <Value, Error>(result: Result<Value, Error>) => {
  expect(result.status).toBe('ok')
  if (result.status === 'error') throw new Error('Expected a successful Better Result value.')
  return result.value
}

const seedClaimedOrder = async (productId: string, variantId: string) => {
  const suffix = nextSequence()
  const orderId = createId('order')
  const paymentId = createId('payment')
  const lineId = createId('orderLine')
  const now = Date.now() - 30_000
  const telegramMessageId = `catalog-race-${suffix}`
  await env.DB.batch([
    env.DB.prepare(
      `insert into customer_order
        (id, number, status_token_hash, status, customer_name, customer_phone, district, khoroo,
         address, subtotal_mnt, delivery_fee_mnt, total_mnt, created_at, updated_at)
       values (?, ?, ?, 'new', 'Catalog Customer', '99112233', 'Сүхбаатар', '1', 'Address',
         10000, 0, 10000, ?, ?)`,
    ).bind(orderId, `CATALOG-${suffix}`, `catalog-hash-${suffix}`, now, now),
    env.DB.prepare(
      `insert into order_line
        (id, order_id, product_id, variant_id, product_name, variant_name, sku, options,
         unit_price_mnt, quantity, line_total_mnt)
       values (?, ?, ?, ?, 'Race Product', 'Default', ?, '{}', 10000, 1, 10000)`,
    ).bind(lineId, orderId, productId, variantId, `RACE-${suffix}`),
    env.DB.prepare(
      `insert into payment
        (id, order_id, method, status, amount_mnt, claimed_at, telegram_message_id,
         created_at, updated_at)
       values (?, ?, 'bank_transfer', 'claimed', 10000, ?, ?, ?, ?)`,
    ).bind(paymentId, orderId, now, telegramMessageId, now, now),
  ])
  return { orderId, telegramMessageId }
}

describe('admin catalog API', () => {
  it('requires a real approved Better Auth session on every route and method', async () => {
    const productWrite = await seedProduct()
    const variantWrite = await seedProduct()
    const stockWrite = await seedProduct()
    const unapproved = await createAdminSession(false)
    const approved = await createAdminSession(true)
    const requests = [
      { path: '/api/admin/catalog/products' },
      { path: `/api/admin/catalog/products/${productWrite.id}` },
      {
        path: `/api/admin/catalog/products/${productWrite.id}`,
        method: 'PATCH' as const,
        body: { expectedUpdatedAt: productWrite.updatedAt, featured: true },
      },
      {
        path: `/api/admin/catalog/products/${variantWrite.id}/variants/${variantWrite.variants[0]!.id}`,
        method: 'PATCH' as const,
        body: { expectedUpdatedAt: variantWrite.updatedAt, priceMnt: 11_000 },
      },
      {
        path: `/api/admin/catalog/products/${stockWrite.id}/variants/${stockWrite.variants[0]!.id}/stock`,
        method: 'PATCH' as const,
        body: { expectedUpdatedAt: stockWrite.updatedAt, stockQuantity: 8 },
      },
    ]

    const outcomes = await Promise.all(
      requests.map(async request => {
        const [unauthenticatedResponse, unapprovedResponse, approvedResponse] = await Promise.all([
          requestCatalog(request.path, request),
          requestCatalog(request.path, { ...request, cookie: unapproved.cookie }),
          requestCatalog(request.path, { ...request, cookie: approved.cookie }),
        ])
        const [unauthenticatedBody, unapprovedBody, approvedBody] = await Promise.all([
          unauthenticatedResponse.json(),
          unapprovedResponse.json(),
          approvedResponse.json(),
        ])
        return {
          approvedResult: Result.deserialize<unknown, AdminCatalogError>(approvedBody),
          approvedResponse,
          unauthenticatedBody,
          unauthenticatedResponse,
          unapprovedBody,
          unapprovedResponse,
        }
      }),
    )

    for (const outcome of outcomes) {
      expect(outcome.unauthenticatedResponse.status).toBe(401)
      expect(outcome.unauthenticatedBody).toEqual({ _tag: 'Unauthenticated' })
      expect(outcome.unapprovedResponse.status).toBe(403)
      expect(outcome.unapprovedBody).toEqual({ _tag: 'ApprovalRequired' })
      expect(outcome.approvedResponse.status).toBe(200)
      expect(outcome.approvedResult).toMatchObject({ status: 'ok' })
      for (const response of [
        outcome.unauthenticatedResponse,
        outcome.unapprovedResponse,
        outcome.approvedResponse,
      ])
        expect(response.headers.get('cache-control')).toBe('private, no-store')
    }
  })

  it('validates every route at the TypeBox boundary', async () => {
    const product = await seedProduct()
    const approved = await createAdminSession(true)
    const invalidRequests = [
      { path: '/api/admin/catalog/products?limit=0' },
      { path: '/api/admin/catalog/products/not-a-product-id' },
      {
        path: `/api/admin/catalog/products/${product.id}`,
        method: 'PATCH' as const,
        body: { expectedUpdatedAt: product.updatedAt },
      },
      {
        path: `/api/admin/catalog/products/${product.id}/variants/${product.variants[0]!.id}`,
        method: 'PATCH' as const,
        body: { expectedUpdatedAt: product.updatedAt, priceMnt: 9000, unsupported: true },
      },
      {
        path: `/api/admin/catalog/products/${product.id}/variants/${product.variants[0]!.id}/stock`,
        method: 'PATCH' as const,
        body: { expectedUpdatedAt: product.updatedAt, stockQuantity: -1 },
      },
    ]

    const responses = await Promise.all(
      invalidRequests.map(request =>
        requestCatalog(request.path, { ...request, cookie: approved.cookie }),
      ),
    )
    for (const response of responses) {
      expect(response.status).toBe(422)
      expect(response.headers.get('cache-control')).toBe('private, no-store')
    }
  })

  it('lists draft and inactive data with real filters and pagination without changing public catalog behavior', async () => {
    const baseTime = Date.now() - 100_000
    const draft = await seedProduct({
      name: 'Visibility Catalog Hidden Draft',
      status: 'draft',
      updatedAt: baseTime + 1,
      variants: [{ active: false, sku: 'DRAFT-ONLY', stockQuantity: 0 }],
    })
    const low = await seedProduct({
      name: 'Visibility Catalog Low Active',
      updatedAt: baseTime + 3,
      variants: [
        { active: true, sku: 'SPECIAL-LOW-SKU', stockQuantity: 3, priceMnt: 12_000 },
        { active: false, sku: 'HIDDEN-INACTIVE-SKU', stockQuantity: 90, priceMnt: 99_000 },
      ],
      withRelations: true,
    })
    const available = await seedProduct({
      name: 'Visibility Catalog Available Active',
      updatedAt: baseTime + 4,
      variants: [{ stockQuantity: 4, priceMnt: 15_000 }],
    })
    const archived = await seedProduct({
      name: 'Visibility Catalog Low Archived',
      status: 'archived',
      updatedAt: baseTime + 2,
      variants: [{ stockQuantity: 2 }],
    })
    const approved = await createAdminSession(true)

    const pageResult = await deserializeCatalog<AdminCatalogProductList>(
      await requestCatalog(
        '/api/admin/catalog/products?query=Visibility%20Catalog&limit=2&offset=1',
        { cookie: approved.cookie },
      ),
    )
    const page = expectOk(pageResult)
    expect(page).toMatchObject({ total: 4, limit: 2, offset: 1 })
    expect(page.items.map(item => item.id)).toEqual([low.id, archived.id])

    const draftResult = await deserializeCatalog<AdminCatalogProductList>(
      await requestCatalog('/api/admin/catalog/products?query=Visibility%20Catalog&status=draft', {
        cookie: approved.cookie,
      }),
    )
    expect(expectOk(draftResult).items).toEqual([
      expect.objectContaining({ id: draft.id, status: 'draft', activeVariantCount: 0 }),
    ])

    const lowResult = await deserializeCatalog<AdminCatalogProductList>(
      await requestCatalog('/api/admin/catalog/products?query=Visibility%20Catalog&inventory=low', {
        cookie: approved.cookie,
      }),
    )
    expect(expectOk(lowResult).items.map(item => item.id)).toEqual([low.id, archived.id])

    const outResult = await deserializeCatalog<AdminCatalogProductList>(
      await requestCatalog('/api/admin/catalog/products?query=Visibility%20Catalog&inventory=out', {
        cookie: approved.cookie,
      }),
    )
    expect(expectOk(outResult).items.map(item => item.id)).toEqual([draft.id])

    const searchResult = await deserializeCatalog<AdminCatalogProductList>(
      await requestCatalog('/api/admin/catalog/products?query=Special-Low-Sku', {
        cookie: approved.cookie,
      }),
    )
    expect(expectOk(searchResult).items).toEqual([
      expect.objectContaining({
        id: low.id,
        brandName: low.brandName,
        categoryName: low.categoryName,
        activeVariantCount: 1,
        totalStockQuantity: 3,
        minimumPriceMnt: 12_000,
        maximumPriceMnt: 12_000,
      }),
    ])

    const publicResponse = await catalogRoutes.handle(
      new Request('https://plugged.mn/api/products?query=Visibility%20Catalog&limit=100'),
    )
    const publicBody = JSON.stringify(await publicResponse.json())
    expect(publicResponse.status).toBe(200)
    expect(publicBody).toContain(available.id)
    expect(publicBody).toContain(low.id)
    expect(publicBody).not.toContain(draft.id)
    expect(publicBody).not.toContain(archived.id)
    expect(publicBody).not.toContain(low.variants[1]!.id)
    expect(publicBody).toContain(low.variants[0]!.id)
  })

  it('returns all variants in detail and updates only the supported product, commercial, and stock fields', async () => {
    const product = await seedProduct({
      name: 'Stable Product Name',
      variants: [
        { active: true, name: 'Primary', priceMnt: 10_000, stockQuantity: 5 },
        { active: false, name: 'Inactive', priceMnt: 20_000, stockQuantity: 7 },
      ],
      withRelations: true,
    })
    const approved = await createAdminSession(true)
    const detail = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(`/api/admin/catalog/products/${product.id}`, {
          cookie: approved.cookie,
        }),
      ),
    )
    expect(detail.variants.map(variant => ({ id: variant.id, active: variant.active }))).toEqual([
      { id: product.variants[0]!.id, active: true },
      { id: product.variants[1]!.id, active: false },
    ])

    const productResult = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(`/api/admin/catalog/products/${product.id}`, {
          method: 'PATCH',
          cookie: approved.cookie,
          body: { expectedUpdatedAt: detail.updatedAt, featured: true, status: 'archived' },
        }),
      ),
    )
    const variantBefore = productResult.variants[1]!
    const variantResult = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(
          `/api/admin/catalog/products/${product.id}/variants/${variantBefore.id}`,
          {
            method: 'PATCH',
            cookie: approved.cookie,
            body: {
              expectedUpdatedAt: variantBefore.updatedAt,
              priceMnt: 18_000,
              compareAtPriceMnt: 22_000,
              active: true,
            },
          },
        ),
      ),
    )
    const stockBefore = variantResult.variants[1]!
    const stockResult = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(
          `/api/admin/catalog/products/${product.id}/variants/${stockBefore.id}/stock`,
          {
            method: 'PATCH',
            cookie: approved.cookie,
            body: { expectedUpdatedAt: stockBefore.updatedAt, stockQuantity: 11 },
          },
        ),
      ),
    )

    expect(stockResult).toMatchObject({
      id: product.id,
      name: 'Stable Product Name',
      slug: product.slug,
      featured: true,
      status: 'archived',
      variants: [
        { name: 'Primary', priceMnt: 10_000, stockQuantity: 5, active: true },
        {
          id: product.variants[1]!.id,
          name: 'Inactive',
          sku: product.variants[1]!.sku,
          priceMnt: 18_000,
          compareAtPriceMnt: 22_000,
          stockQuantity: 11,
          active: true,
        },
      ],
    })
    const persisted = await env.DB.prepare(
      `select p.name, p.slug, p.status, p.featured, v.sku, v.name as variant_name,
        v.price_mnt, v.compare_at_price_mnt, v.stock_quantity, v.active
       from product p join product_variant v on v.product_id = p.id
       where p.id = ? and v.id = ?`,
    )
      .bind(product.id, product.variants[1]!.id)
      .first()
    expect(persisted).toEqual({
      name: 'Stable Product Name',
      slug: product.slug,
      status: 'archived',
      featured: 1,
      sku: product.variants[1]!.sku,
      variant_name: 'Inactive',
      price_mnt: 18_000,
      compare_at_price_mnt: 22_000,
      stock_quantity: 11,
      active: 1,
    })
  })

  it('returns serialized invariant, compare-at, not-found, and stale-version failures without persisting invalid writes', async () => {
    const inactiveDraft = await seedProduct({
      status: 'draft',
      variants: [{ active: false }],
    })
    const active = await seedProduct({ variants: [{ active: true, priceMnt: 10_000 }] })
    const approved = await createAdminSession(true)

    const activation = await deserializeCatalog<AdminCatalogProductDetail>(
      await requestCatalog(`/api/admin/catalog/products/${inactiveDraft.id}`, {
        method: 'PATCH',
        cookie: approved.cookie,
        body: { expectedUpdatedAt: inactiveDraft.updatedAt, status: 'active' },
      }),
    )
    expect(activation).toMatchObject({
      status: 'error',
      error: { _tag: 'ProductActivationBlocked', productId: inactiveDraft.id },
    })

    const variantId = active.variants[0]!.id
    const lastActive = await deserializeCatalog<AdminCatalogProductDetail>(
      await requestCatalog(`/api/admin/catalog/products/${active.id}/variants/${variantId}`, {
        method: 'PATCH',
        cookie: approved.cookie,
        body: { expectedUpdatedAt: active.updatedAt, active: false },
      }),
    )
    expect(lastActive).toMatchObject({
      status: 'error',
      error: { _tag: 'LastActiveVariantBlocked', variantId },
    })

    const invalidCompareAt = await deserializeCatalog<AdminCatalogProductDetail>(
      await requestCatalog(`/api/admin/catalog/products/${active.id}/variants/${variantId}`, {
        method: 'PATCH',
        cookie: approved.cookie,
        body: {
          expectedUpdatedAt: active.updatedAt,
          priceMnt: 12_000,
          compareAtPriceMnt: 12_000,
        },
      }),
    )
    expect(invalidCompareAt).toMatchObject({
      status: 'error',
      error: { _tag: 'InvalidCompareAtPrice', variantId },
    })

    const firstWrite = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(`/api/admin/catalog/products/${active.id}`, {
          method: 'PATCH',
          cookie: approved.cookie,
          body: { expectedUpdatedAt: active.updatedAt, featured: true },
        }),
      ),
    )
    const staleWrite = await deserializeCatalog<AdminCatalogProductDetail>(
      await requestCatalog(`/api/admin/catalog/products/${active.id}`, {
        method: 'PATCH',
        cookie: approved.cookie,
        body: { expectedUpdatedAt: active.updatedAt, featured: false },
      }),
    )
    expect(firstWrite.updatedAt).toBeGreaterThan(active.updatedAt)
    expect(staleWrite).toMatchObject({
      status: 'error',
      error: { _tag: 'AdminCatalogConflict', productId: active.id },
    })

    const missingProductId = createId('product')
    const missing = await deserializeCatalog<AdminCatalogProductDetail>(
      await requestCatalog(`/api/admin/catalog/products/${missingProductId}`, {
        cookie: approved.cookie,
      }),
    )
    expect(missing).toMatchObject({
      status: 'error',
      error: { _tag: 'AdminCatalogProductNotFound', productId: missingProductId },
    })

    const unknownVariantId = createId('productVariant')
    const missingVariant = await deserializeCatalog<AdminCatalogProductDetail>(
      await requestCatalog(
        `/api/admin/catalog/products/${active.id}/variants/${unknownVariantId}/stock`,
        {
          method: 'PATCH',
          cookie: approved.cookie,
          body: { expectedUpdatedAt: active.updatedAt, stockQuantity: 2 },
        },
      ),
    )
    expect(missingVariant).toMatchObject({
      status: 'error',
      error: { _tag: 'AdminCatalogVariantNotFound', variantId: unknownVariantId },
    })

    const persisted = await env.DB.prepare('select status, featured from product where id = ?')
      .bind(inactiveDraft.id)
      .first()
    const persistedVariant = await env.DB.prepare(
      'select price_mnt, compare_at_price_mnt, active from product_variant where id = ?',
    )
      .bind(variantId)
      .first()
    expect(persisted).toEqual({ status: 'draft', featured: 0 })
    expect(persistedVariant).toEqual({
      price_mnt: 10_000,
      compare_at_price_mnt: null,
      active: 1,
    })
  })

  it('rejects a stale stock request after real payment confirmation decrements the same version once', async () => {
    const product = await seedProduct({
      name: 'Race Product',
      variants: [{ active: true, priceMnt: 10_000, stockQuantity: 2 }],
    })
    const variantId = product.variants[0]!.id
    const payable = await seedClaimedOrder(product.id, variantId)
    const approved = await createAdminSession(true)

    const firstConfirmation = await commerce.payments.confirmOrderPayment(payable.orderId, {
      paymentId: 'telegram:catalog-race-first',
      amountMnt: 10_000,
      method: 'bank_transfer',
      telegramMessageId: payable.telegramMessageId,
    })
    const repeatedConfirmation = await commerce.payments.confirmOrderPayment(payable.orderId, {
      paymentId: 'telegram:catalog-race-repeated',
      amountMnt: 10_000,
      method: 'bank_transfer',
      telegramMessageId: payable.telegramMessageId,
    })
    const staleResponse = await requestCatalog(
      `/api/admin/catalog/products/${product.id}/variants/${variantId}/stock`,
      {
        method: 'PATCH',
        cookie: approved.cookie,
        body: { expectedUpdatedAt: product.updatedAt, stockQuantity: 99 },
      },
    )
    const stale = await deserializeCatalog<AdminCatalogProductDetail>(staleResponse)
    const persisted = await env.DB.prepare(
      'select stock_quantity, updated_at from product_variant where id = ?',
    )
      .bind(variantId)
      .first<{ stock_quantity: number; updated_at: number }>()

    expect(firstConfirmation).toMatchObject({
      status: 'ok',
      value: { newlyPaid: true, stockApplied: true },
    })
    expect(repeatedConfirmation).toMatchObject({
      status: 'ok',
      value: { newlyPaid: false, stockApplied: true },
    })
    expect(staleResponse.status).toBe(200)
    expect(stale).toMatchObject({
      status: 'error',
      error: { _tag: 'AdminCatalogConflict', productId: product.id, variantId },
    })
    expect(persisted?.stock_quantity).toBe(1)
    expect(persisted?.updated_at).toBeGreaterThan(product.updatedAt)
  })
})
