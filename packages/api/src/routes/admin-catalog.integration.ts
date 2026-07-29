import type {
  AdminCatalogError,
  AdminCatalogProductDetail,
  AdminCatalogProductList,
} from '@store-kit/contracts/admin-catalog'
import { database } from '@store-kit/db'
import { createId } from '@store-kit/db/ids'
import { Result } from 'better-result'
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vite-plus/test'

import { createAdminSession } from '~/test/admin-session'
import fixtureDataUrl from '~/test/fixtures/catalog-upload.jpg?inline'

import { adminCatalogRoutes } from './admin-catalog'
import { catalogRoutes } from './catalog'

let sequence = 0

const nextSequence = () => ++sequence

const fixtureBytes = Uint8Array.from(
  atob(fixtureDataUrl.slice(fixtureDataUrl.indexOf(',') + 1)),
  character => character.charCodeAt(0),
)

const imageFile = (type = 'image/jpeg') => new File([fixtureBytes], 'catalog-upload.jpg', { type })

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
    const priceMnt = variant.priceMnt ?? 10_000 + index * 1_000
    const compareAtPriceMnt = variant.compareAtPriceMnt ?? null
    const stockQuantity = variant.stockQuantity ?? 5
    const active = variant.active ?? true
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
        priceMnt,
        compareAtPriceMnt,
        stockQuantity,
        active,
        index,
        updatedAt,
        updatedAt,
      ),
    )
    return {
      id: variantId,
      name: variantName,
      sku,
      options: {},
      priceMnt,
      compareAtPriceMnt,
      stockQuantity,
      active,
      sortOrder: index,
      updatedAt,
    }
  })

  await env.DB.batch(statements)
  return {
    id: productId,
    name: productName,
    slug,
    updatedAt,
    variants: seededVariants,
    brandId,
    categoryId,
    brandName: brandId ? `Admin Brand ${suffix}` : null,
    categoryName: categoryId ? `Admin Category ${suffix}` : null,
    status,
    featured,
  }
}

const productUpdate = (
  product: Awaited<ReturnType<typeof seedProduct>>,
  overrides: Record<string, unknown> = {},
) => ({
  expectedUpdatedAt: product.updatedAt,
  name: product.name,
  slug: product.slug,
  shortDescription: null,
  description: null,
  status: product.status === 'active' ? ('active' as const) : ('draft' as const),
  featured: product.featured,
  brandId: product.brandId,
  categoryId: product.categoryId,
  ...overrides,
})

const variantUpdate = (
  variant: {
    sku: string
    name: string
    options: Record<string, string>
    priceMnt: number
    compareAtPriceMnt: number | null
    stockQuantity: number
    active: boolean
    sortOrder: number
    updatedAt: number
  },
  overrides: Record<string, unknown> = {},
) => ({
  expectedUpdatedAt: variant.updatedAt,
  sku: variant.sku,
  name: variant.name,
  options: variant.options,
  priceMnt: variant.priceMnt,
  compareAtPriceMnt: variant.compareAtPriceMnt,
  stockQuantity: variant.stockQuantity,
  active: variant.active,
  sortOrder: variant.sortOrder,
  ...overrides,
})

type CatalogMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

const requestCatalog = (
  path: string,
  {
    body,
    cookie,
    method = 'GET',
  }: { body?: unknown | FormData; cookie?: string; method?: CatalogMethod } = {},
) => {
  const multipart = body instanceof FormData
  return adminCatalogRoutes.handle(
    new Request(`https://plugged.mn${path}`, {
      method,
      headers: {
        ...(body === undefined || multipart ? {} : { 'content-type': 'application/json' }),
        ...(cookie ? { cookie } : {}),
        origin: 'https://plugged.mn',
      },
      ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) }),
    }),
  )
}

const imageUploadBody = (
  expectedUpdatedAt: number,
  { alt = 'Product image', file = imageFile(), variantIds = [] as string[] } = {},
) => {
  const body = new FormData()
  body.set('file', file)
  body.set('alt', alt)
  body.set('expectedUpdatedAt', String(expectedUpdatedAt))
  if (variantIds.length > 0) body.set('variantIds', JSON.stringify(variantIds))
  return body
}

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
  it('requires current D1 approval on every planned route and method', async () => {
    const detail = await seedProduct()
    const productWrite = await seedProduct()
    const productDelete = await seedProduct()
    const archive = await seedProduct()
    const restore = await seedProduct({ status: 'archived' })
    const variantCreate = await seedProduct({ status: 'draft' })
    const variantWrite = await seedProduct({ status: 'draft' })
    const variantDelete = await seedProduct({ status: 'draft' })
    const activation = await seedProduct({ status: 'draft' })
    const stockWrite = await seedProduct()
    const upload = await seedProduct()
    const reorder = await seedProduct()
    const imageWrite = await seedProduct()
    const imageDelete = await seedProduct()
    const missingImageId = createId('productImage')
    const createdSuffix = nextSequence()
    const routes: Array<{
      method: CatalogMethod
      path: string
      body?: unknown | (() => FormData)
    }> = [
      { method: 'GET', path: '/api/admin/catalog/selectors' },
      { method: 'GET' as const, path: '/api/admin/catalog/products' },
      {
        method: 'POST' as const,
        path: '/api/admin/catalog/products',
        body: {
          name: `Approved route product ${createdSuffix}`,
          slug: `approved-route-product-${createdSuffix}`,
          shortDescription: null,
          description: null,
          status: 'draft' as const,
          featured: false,
          brandId: null,
          categoryId: null,
          initialVariant: {
            sku: `APPROVED-ROUTE-${createdSuffix}`,
            name: 'Default',
            options: {},
            priceMnt: 10_000,
            compareAtPriceMnt: null,
            stockQuantity: 1,
            sortOrder: 0,
          },
        },
      },
      { method: 'GET' as const, path: `/api/admin/catalog/products/${detail.id}` },
      {
        method: 'PUT' as const,
        path: `/api/admin/catalog/products/${productWrite.id}`,
        body: productUpdate(productWrite, { featured: true }),
      },
      {
        method: 'DELETE' as const,
        path: `/api/admin/catalog/products/${productDelete.id}`,
        body: { expectedUpdatedAt: productDelete.updatedAt },
      },
      {
        method: 'POST' as const,
        path: `/api/admin/catalog/products/${archive.id}/archive`,
        body: { expectedUpdatedAt: archive.updatedAt },
      },
      {
        method: 'POST' as const,
        path: `/api/admin/catalog/products/${restore.id}/restore`,
        body: { expectedUpdatedAt: restore.updatedAt },
      },
      {
        method: 'POST' as const,
        path: `/api/admin/catalog/products/${variantCreate.id}/variants`,
        body: {
          expectedProductUpdatedAt: variantCreate.updatedAt,
          sku: `APPROVED-VARIANT-${createdSuffix}`,
          name: 'New variant',
          options: { color: 'Violet' },
          priceMnt: 12_000,
          compareAtPriceMnt: null,
          stockQuantity: 2,
          active: true,
          sortOrder: 10,
        },
      },
      {
        method: 'PUT' as const,
        path: `/api/admin/catalog/products/${variantWrite.id}/variants/${variantWrite.variants[0]!.id}`,
        body: variantUpdate(variantWrite.variants[0]!, { priceMnt: 11_000 }),
      },
      {
        method: 'DELETE' as const,
        path: `/api/admin/catalog/products/${variantDelete.id}/variants/${variantDelete.variants[0]!.id}`,
        body: {
          expectedProductUpdatedAt: variantDelete.updatedAt,
          expectedVariantUpdatedAt: variantDelete.variants[0]!.updatedAt,
        },
      },
      {
        method: 'PATCH' as const,
        path: `/api/admin/catalog/products/${activation.id}/variants/${activation.variants[0]!.id}/activation`,
        body: { expectedUpdatedAt: activation.variants[0]!.updatedAt, active: true },
      },
      {
        method: 'PATCH' as const,
        path: `/api/admin/catalog/products/${stockWrite.id}/variants/${stockWrite.variants[0]!.id}/stock`,
        body: { expectedUpdatedAt: stockWrite.variants[0]!.updatedAt, stockQuantity: 8 },
      },
      {
        method: 'POST' as const,
        path: `/api/admin/catalog/products/${upload.id}/images`,
        body: () => imageUploadBody(upload.updatedAt),
      },
      {
        method: 'PUT' as const,
        path: `/api/admin/catalog/products/${reorder.id}/images/order`,
        body: { expectedUpdatedAt: reorder.updatedAt, imageIds: [] },
      },
      {
        method: 'PUT' as const,
        path: `/api/admin/catalog/products/${imageWrite.id}/images/${missingImageId}`,
        body: {
          expectedUpdatedAt: imageWrite.updatedAt,
          alt: 'Updated image',
          variantIds: [],
        },
      },
      {
        method: 'DELETE' as const,
        path: `/api/admin/catalog/products/${imageDelete.id}/images/${missingImageId}`,
        body: { expectedUpdatedAt: imageDelete.updatedAt },
      },
    ]
    const declaredRoutes = new Set(
      adminCatalogRoutes.routes.map(route => `${route.method} ${route.path}`),
    )
    const plannedRoutes = [
      'GET /api/admin/catalog/selectors',
      'GET /api/admin/catalog/products',
      'POST /api/admin/catalog/products',
      'GET /api/admin/catalog/products/:productId',
      'PUT /api/admin/catalog/products/:productId',
      'DELETE /api/admin/catalog/products/:productId',
      'POST /api/admin/catalog/products/:productId/archive',
      'POST /api/admin/catalog/products/:productId/restore',
      'POST /api/admin/catalog/products/:productId/variants',
      'PUT /api/admin/catalog/products/:productId/variants/:variantId',
      'DELETE /api/admin/catalog/products/:productId/variants/:variantId',
      'PATCH /api/admin/catalog/products/:productId/variants/:variantId/activation',
      'PATCH /api/admin/catalog/products/:productId/variants/:variantId/stock',
      'POST /api/admin/catalog/products/:productId/images',
      'PUT /api/admin/catalog/products/:productId/images/order',
      'PUT /api/admin/catalog/products/:productId/images/:imageId',
      'DELETE /api/admin/catalog/products/:productId/images/:imageId',
    ]
    for (const route of plannedRoutes) expect(declaredRoutes).toContain(route)

    const outcomes = await Promise.all(
      routes.map(async route => {
        const session = await createAdminSession(false)
        const makeBody = () => (typeof route.body === 'function' ? route.body() : route.body)
        const [unauthenticatedResponse, unapprovedResponse] = await Promise.all([
          requestCatalog(route.path, { method: route.method, body: makeBody() }),
          requestCatalog(route.path, {
            method: route.method,
            body: makeBody(),
            cookie: session.cookie,
          }),
        ])
        await env.DB.prepare('update user set approved = 1 where id = ?').bind(session.userId).run()
        const approvedResponse = await requestCatalog(route.path, {
          method: route.method,
          body: makeBody(),
          cookie: session.cookie,
        })
        const [unauthenticatedBody, unapprovedBody, approvedBody] = await Promise.all([
          unauthenticatedResponse.json(),
          unapprovedResponse.json(),
          approvedResponse.json(),
        ])
        return {
          unauthenticatedResponse,
          unauthenticatedBody,
          unapprovedResponse,
          unapprovedBody,
          approvedResponse,
          approvedResult: Result.deserialize<unknown, AdminCatalogError>(approvedBody),
        }
      }),
    )

    for (const outcome of outcomes) {
      expect(outcome.unauthenticatedResponse.status).toBe(401)
      expect(outcome.unauthenticatedBody).toEqual({ _tag: 'Unauthenticated' })
      expect(outcome.unapprovedResponse.status).toBe(403)
      expect(outcome.unapprovedBody).toEqual({ _tag: 'ApprovalRequired' })
      expect(outcome.approvedResponse.status).toBe(200)
      expect(outcome.approvedResult.status).toMatch(/^(ok|error)$/u)
      for (const response of [
        outcome.unauthenticatedResponse,
        outcome.unapprovedResponse,
        outcome.approvedResponse,
      ])
        expect(response.headers.get('cache-control')).toBe('private, no-store')
    }
  })

  it('runs product and variant CRUD through serialized Better Result routes', async () => {
    const references = await seedProduct({ withRelations: true })
    const cookie = (await createAdminSession(true)).cookie
    const suffix = nextSequence()
    const createBody = {
      name: `Route CRUD product ${suffix}`,
      slug: `route-crud-product-${suffix}`,
      shortDescription: 'Compact description',
      description: 'Full product description',
      status: 'draft' as const,
      featured: false,
      brandId: references.brandId,
      categoryId: references.categoryId,
      initialVariant: {
        sku: `ROUTE-CRUD-${suffix}`,
        name: 'Default',
        options: { color: 'Graphite' },
        priceMnt: 100_000,
        compareAtPriceMnt: 120_000,
        stockQuantity: 4,
        sortOrder: 0,
      },
    }
    const createResponse = await requestCatalog('/api/admin/catalog/products', {
      method: 'POST',
      cookie,
      body: createBody,
    })
    const created = expectOk(await deserializeCatalog<AdminCatalogProductDetail>(createResponse))
    expect(createResponse.headers.get('cache-control')).toBe('private, no-store')
    expect(created).toMatchObject({
      name: createBody.name,
      slug: createBody.slug,
      shortDescription: createBody.shortDescription,
      description: createBody.description,
      status: 'draft',
      featured: false,
      brand: { id: references.brandId },
      category: { id: references.categoryId },
      images: [],
      variants: [
        {
          sku: createBody.initialVariant.sku,
          name: 'Default',
          options: { color: 'Graphite' },
          priceMnt: 100_000,
          compareAtPriceMnt: 120_000,
          stockQuantity: 4,
          active: true,
          sortOrder: 0,
        },
      ],
    })

    const duplicateSlug = await deserializeCatalog<AdminCatalogProductDetail>(
      await requestCatalog('/api/admin/catalog/products', {
        method: 'POST',
        cookie,
        body: {
          ...createBody,
          initialVariant: { ...createBody.initialVariant, sku: `UNIQUE-SKU-${suffix}` },
        },
      }),
    )
    const duplicateSkuSlug = `duplicate-route-sku-${suffix}`
    const duplicateSku = await deserializeCatalog<AdminCatalogProductDetail>(
      await requestCatalog('/api/admin/catalog/products', {
        method: 'POST',
        cookie,
        body: { ...createBody, slug: duplicateSkuSlug },
      }),
    )
    expect(duplicateSlug).toMatchObject({ status: 'error', error: { _tag: 'ProductSlugTaken' } })
    expect(duplicateSku).toMatchObject({ status: 'error', error: { _tag: 'VariantSkuTaken' } })
    expect(
      await env.DB.prepare('select id from product where slug = ?').bind(duplicateSkuSlug).first(),
    ).toBeNull()

    const selectors = expectOk(
      await deserializeCatalog<{
        brands: Array<{ id: string }>
        categories: Array<{ id: string }>
      }>(await requestCatalog('/api/admin/catalog/selectors', { cookie })),
    )
    expect(selectors.brands).toContainEqual(expect.objectContaining({ id: references.brandId }))
    expect(selectors.categories).toContainEqual(
      expect.objectContaining({ id: references.categoryId }),
    )

    const updated = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(`/api/admin/catalog/products/${created.id}`, {
          method: 'PUT',
          cookie,
          body: {
            expectedUpdatedAt: created.updatedAt,
            name: 'Edited route product',
            slug: createBody.slug,
            shortDescription: null,
            description: null,
            status: 'active',
            featured: true,
            brandId: references.brandId,
            categoryId: references.categoryId,
          },
        }),
      ),
    )
    const withVariant = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(`/api/admin/catalog/products/${created.id}/variants`, {
          method: 'POST',
          cookie,
          body: {
            expectedProductUpdatedAt: updated.updatedAt,
            sku: `ROUTE-SECOND-${suffix}`,
            name: 'Second',
            options: { color: 'Violet' },
            priceMnt: 110_000,
            compareAtPriceMnt: null,
            stockQuantity: 2,
            active: true,
            sortOrder: 10,
          },
        }),
      ),
    )
    const second = withVariant.variants.find(variant => variant.name === 'Second')!
    const edited = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(`/api/admin/catalog/products/${created.id}/variants/${second.id}`, {
          method: 'PUT',
          cookie,
          body: variantUpdate(second, {
            name: 'Second edited',
            options: { color: 'Electric violet' },
            priceMnt: 115_000,
            compareAtPriceMnt: 130_000,
            sortOrder: 20,
          }),
        }),
      ),
    )
    const editedSecond = edited.variants.find(variant => variant.id === second.id)!
    const stocked = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(
          `/api/admin/catalog/products/${created.id}/variants/${second.id}/stock`,
          {
            method: 'PATCH',
            cookie,
            body: { expectedUpdatedAt: editedSecond.updatedAt, stockQuantity: 9 },
          },
        ),
      ),
    )
    const stockedSecond = stocked.variants.find(variant => variant.id === second.id)!
    const deactivated = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(
          `/api/admin/catalog/products/${created.id}/variants/${second.id}/activation`,
          {
            method: 'PATCH',
            cookie,
            body: { expectedUpdatedAt: stockedSecond.updatedAt, active: false },
          },
        ),
      ),
    )
    const inactiveSecond = deactivated.variants.find(variant => variant.id === second.id)!
    expect(inactiveSecond).toMatchObject({
      name: 'Second edited',
      stockQuantity: 9,
      active: false,
      sortOrder: 20,
    })

    const deletedVariant = expectOk(
      await deserializeCatalog<{ productId: string; variantId: string; updatedAt: number }>(
        await requestCatalog(`/api/admin/catalog/products/${created.id}/variants/${second.id}`, {
          method: 'DELETE',
          cookie,
          body: {
            expectedProductUpdatedAt: deactivated.updatedAt,
            expectedVariantUpdatedAt: inactiveSecond.updatedAt,
          },
        }),
      ),
    )
    expect(deletedVariant.variantId).toBe(second.id)

    const archived = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(`/api/admin/catalog/products/${created.id}/archive`, {
          method: 'POST',
          cookie,
          body: { expectedUpdatedAt: deletedVariant.updatedAt },
        }),
      ),
    )
    expect(archived).toMatchObject({ status: 'archived', featured: false })
    const restored = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(`/api/admin/catalog/products/${created.id}/restore`, {
          method: 'POST',
          cookie,
          body: { expectedUpdatedAt: archived.updatedAt },
        }),
      ),
    )
    expect(restored).toMatchObject({ status: 'draft', featured: false })
    const archivedAgain = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(`/api/admin/catalog/products/${created.id}/archive`, {
          method: 'POST',
          cookie,
          body: { expectedUpdatedAt: restored.updatedAt },
        }),
      ),
    )
    const deletedProduct = expectOk(
      await deserializeCatalog<{ productId: string; mediaCleanup: string }>(
        await requestCatalog(`/api/admin/catalog/products/${created.id}`, {
          method: 'DELETE',
          cookie,
          body: { expectedUpdatedAt: archivedAgain.updatedAt },
        }),
      ),
    )
    expect(deletedProduct).toEqual({ productId: created.id, mediaCleanup: 'complete' })
    expect(
      await env.DB.prepare('select id from product where id = ?').bind(created.id).first(),
    ).toBeNull()
  })

  it('uses real Images, R2, and D1 for multipart image CRUD without exposing storage fields', async () => {
    const product = await seedProduct({ status: 'active' })
    const variantId = product.variants[0]!.id
    const cookie = (await createAdminSession(true)).cookie
    const firstResponse = await requestCatalog(`/api/admin/catalog/products/${product.id}/images`, {
      method: 'POST',
      cookie,
      body: imageUploadBody(product.updatedAt, {
        alt: 'Front product image',
        file: imageFile('image/png'),
        variantIds: [variantId],
      }),
    })
    const firstWire = await firstResponse.json()
    const first = expectOk(
      Result.deserialize<AdminCatalogProductDetail, AdminCatalogError>(firstWire),
    )
    const firstImage = first.images[0]!
    expect(firstResponse.status).toBe(200)
    expect(firstResponse.headers.get('cache-control')).toBe('private, no-store')
    expect(firstImage).toEqual({
      id: firstImage.id,
      productId: product.id,
      url: `https://plugged.storekitcdn.darjs.dev/products/${product.id}/${firstImage.id}.jpg`,
      width: 322,
      height: 448,
      alt: 'Front product image',
      sortOrder: 10,
      variantIds: [variantId],
    })
    expect(JSON.stringify(firstWire)).not.toContain('r2Key')
    expect(JSON.stringify(firstWire)).not.toContain('r2_key')
    const listWire = await requestCatalog(
      `/api/admin/catalog/products?query=${encodeURIComponent(product.slug)}`,
      { cookie },
    ).then(response => response.json())
    const list = expectOk(Result.deserialize<AdminCatalogProductList, AdminCatalogError>(listWire))
    expect(list.items).toContainEqual(
      expect.objectContaining({
        id: product.id,
        primaryImage: {
          url: firstImage.url,
          width: 322,
          height: 448,
          alt: 'Front product image',
        },
      }),
    )
    expect(JSON.stringify(listWire)).not.toContain('r2Key')

    const firstRecord = await env.DB.prepare(
      'select r2_key, width, height, alt, sort_order from product_image where id = ?',
    )
      .bind(firstImage.id)
      .first<{
        r2_key: string
        width: number
        height: number
        alt: string
        sort_order: number
      }>()
    const firstObject = await env.MEDIA.get(firstRecord!.r2_key)
    expect(firstRecord).toMatchObject({
      width: 322,
      height: 448,
      alt: 'Front product image',
      sort_order: 10,
    })
    expect(firstObject?.httpMetadata).toMatchObject({
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000, immutable',
    })
    expect(new Uint8Array(await firstObject!.arrayBuffer())).toEqual(fixtureBytes)

    const second = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(`/api/admin/catalog/products/${product.id}/images`, {
          method: 'POST',
          cookie,
          body: imageUploadBody(first.updatedAt, { alt: 'Detail product image' }),
        }),
      ),
    )
    const secondImage = second.images.find(image => image.id !== firstImage.id)!
    const edited = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(`/api/admin/catalog/products/${product.id}/images/${secondImage.id}`, {
          method: 'PUT',
          cookie,
          body: {
            expectedUpdatedAt: second.updatedAt,
            alt: 'Variant detail image',
            variantIds: [variantId],
          },
        }),
      ),
    )
    expect(edited.images.find(image => image.id === secondImage.id)).toMatchObject({
      alt: 'Variant detail image',
      variantIds: [variantId],
    })

    const reordered = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(`/api/admin/catalog/products/${product.id}/images/order`, {
          method: 'PUT',
          cookie,
          body: {
            expectedUpdatedAt: edited.updatedAt,
            imageIds: [secondImage.id, firstImage.id],
          },
        }),
      ),
    )
    expect(reordered.images.map(image => image.id)).toEqual([secondImage.id, firstImage.id])
    expect(reordered.images.map(image => image.sortOrder)).toEqual([10, 20])

    const removed = expectOk(
      await deserializeCatalog<{
        product: AdminCatalogProductDetail
        mediaCleanup: string
      }>(
        await requestCatalog(`/api/admin/catalog/products/${product.id}/images/${firstImage.id}`, {
          method: 'DELETE',
          cookie,
          body: { expectedUpdatedAt: reordered.updatedAt },
        }),
      ),
    )
    expect(removed.mediaCleanup).toBe('complete')
    expect(removed.product.images.map(image => image.id)).toEqual([secondImage.id])
    expect(await env.MEDIA.get(firstRecord!.r2_key)).toBeNull()

    const prefix = `products/${product.id}/`
    const beforeFailures = (await env.MEDIA.list({ prefix })).objects.map(object => object.key)
    const invalidBytes = new File([new TextEncoder().encode('not an image')], 'invalid.jpg', {
      type: 'image/jpeg',
    })
    const invalid = await deserializeCatalog<AdminCatalogProductDetail>(
      await requestCatalog(`/api/admin/catalog/products/${product.id}/images`, {
        method: 'POST',
        cookie,
        body: imageUploadBody(removed.product.updatedAt, {
          alt: 'Invalid image',
          file: invalidBytes,
        }),
      }),
    )
    expect(invalid).toMatchObject({ status: 'error', error: { _tag: 'ImageUploadRejected' } })
    const foreignVariant = await deserializeCatalog<AdminCatalogProductDetail>(
      await requestCatalog(`/api/admin/catalog/products/${product.id}/images`, {
        method: 'POST',
        cookie,
        body: imageUploadBody(removed.product.updatedAt, {
          alt: 'Foreign variant image',
          variantIds: [createId('productVariant')],
        }),
      }),
    )
    expect(foreignVariant).toMatchObject({
      status: 'error',
      error: { _tag: 'CatalogReferenceNotFound', referenceType: 'variant' },
    })

    const changed = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(`/api/admin/catalog/products/${product.id}`, {
          method: 'PUT',
          cookie,
          body: productUpdate(
            {
              ...product,
              name: product.name,
              slug: product.slug,
              updatedAt: removed.product.updatedAt,
            },
            { name: 'Changed before stale upload', status: 'active' },
          ),
        }),
      ),
    )
    const stale = await deserializeCatalog<AdminCatalogProductDetail>(
      await requestCatalog(`/api/admin/catalog/products/${product.id}/images`, {
        method: 'POST',
        cookie,
        body: imageUploadBody(removed.product.updatedAt, { alt: 'Stale image' }),
      }),
    )
    expect(changed.updatedAt).toBeGreaterThan(removed.product.updatedAt)
    expect(stale).toMatchObject({ status: 'error', error: { _tag: 'AdminCatalogConflict' } })
    expect((await env.MEDIA.list({ prefix })).objects.map(object => object.key)).toEqual(
      beforeFailures,
    )
  })

  it('validates JSON, params, queries, and converted multipart bodies at the TypeBox boundary', async () => {
    const product = await seedProduct()
    const variantId = product.variants[0]!.id
    const imageId = createId('productImage')
    const approved = await createAdminSession(true)
    const suffix = nextSequence()
    const validCreate = {
      name: 'Boundary product',
      slug: `boundary-product-${suffix}`,
      shortDescription: null,
      description: null,
      status: 'draft' as const,
      featured: false,
      brandId: null,
      categoryId: null,
      initialVariant: {
        sku: `BOUNDARY-${suffix}`,
        name: 'Default',
        options: {},
        priceMnt: 10_000,
        compareAtPriceMnt: null,
        stockQuantity: 1,
        sortOrder: 0,
      },
    }
    const invalidVersion = imageUploadBody(product.updatedAt)
    invalidVersion.set('expectedUpdatedAt', 'not-a-number')
    const duplicateVariants = imageUploadBody(product.updatedAt, {
      variantIds: [variantId, variantId],
    })
    const invalidRequests: Array<{
      path: string
      method?: CatalogMethod
      body?: unknown | FormData
    }> = [
      { path: '/api/admin/catalog/products?limit=0' },
      { path: '/api/admin/catalog/products?unknown=value' },
      { path: '/api/admin/catalog/products/not-a-product-id' },
      { path: '/api/admin/catalog/products', method: 'POST', body: {} },
      {
        path: '/api/admin/catalog/products',
        method: 'POST',
        body: { ...validCreate, slug: 'Invalid Slug' },
      },
      {
        path: '/api/admin/catalog/products',
        method: 'POST',
        body: { ...validCreate, unsupported: true },
      },
      {
        path: '/api/admin/catalog/products',
        method: 'POST',
        body: {
          ...validCreate,
          initialVariant: { ...validCreate.initialVariant, priceMnt: -1 },
        },
      },
      {
        path: `/api/admin/catalog/products/${product.id}`,
        method: 'PUT',
        body: { expectedUpdatedAt: product.updatedAt },
      },
      {
        path: `/api/admin/catalog/products/${product.id}`,
        method: 'DELETE',
        body: { expectedUpdatedAt: -1 },
      },
      {
        path: `/api/admin/catalog/products/${product.id}/archive`,
        method: 'POST',
        body: { expectedUpdatedAt: product.updatedAt, unsupported: true },
      },
      {
        path: `/api/admin/catalog/products/${product.id}/variants`,
        method: 'POST',
        body: { expectedProductUpdatedAt: product.updatedAt },
      },
      {
        path: `/api/admin/catalog/products/${product.id}/variants/${variantId}`,
        method: 'PUT',
        body: { expectedUpdatedAt: product.updatedAt, priceMnt: 9000, unsupported: true },
      },
      {
        path: `/api/admin/catalog/products/${product.id}/variants/${variantId}`,
        method: 'DELETE',
        body: {
          expectedProductUpdatedAt: product.updatedAt,
          expectedVariantUpdatedAt: -1,
        },
      },
      {
        path: `/api/admin/catalog/products/${product.id}/variants/${variantId}/activation`,
        method: 'PATCH',
        body: { expectedUpdatedAt: product.updatedAt },
      },
      {
        path: `/api/admin/catalog/products/${product.id}/variants/${variantId}/stock`,
        method: 'PATCH',
        body: { expectedUpdatedAt: product.updatedAt, stockQuantity: -1 },
      },
      {
        path: `/api/admin/catalog/products/${product.id}/images/order`,
        method: 'PUT',
        body: { expectedUpdatedAt: product.updatedAt, imageIds: [imageId, imageId] },
      },
      {
        path: `/api/admin/catalog/products/${product.id}/images/${imageId}`,
        method: 'PUT',
        body: { expectedUpdatedAt: product.updatedAt, alt: ' ', variantIds: [] },
      },
      {
        path: `/api/admin/catalog/products/${product.id}/images/not-an-image-id`,
        method: 'DELETE',
        body: { expectedUpdatedAt: product.updatedAt },
      },
      {
        path: `/api/admin/catalog/products/${product.id}/images`,
        method: 'POST',
        body: imageUploadBody(product.updatedAt, { alt: ' ' }),
      },
      {
        path: `/api/admin/catalog/products/${product.id}/images`,
        method: 'POST',
        body: imageUploadBody(product.updatedAt, { file: imageFile('image/gif') }),
      },
      {
        path: `/api/admin/catalog/products/${product.id}/images`,
        method: 'POST',
        body: imageUploadBody(product.updatedAt, {
          file: new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.jpg', {
            type: 'image/jpeg',
          }),
        }),
      },
      {
        path: `/api/admin/catalog/products/${product.id}/images`,
        method: 'POST',
        body: invalidVersion,
      },
      {
        path: `/api/admin/catalog/products/${product.id}/images`,
        method: 'POST',
        body: duplicateVariants,
      },
    ]

    const responses = await Promise.all(
      invalidRequests.map(request =>
        requestCatalog(request.path, { ...request, cookie: approved.cookie }),
      ),
    )
    expect(responses).toHaveLength(invalidRequests.length)
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
          method: 'PUT',
          cookie: approved.cookie,
          body: productUpdate(product, { featured: true, status: 'draft' }),
        }),
      ),
    )
    const variantBefore = productResult.variants[1]!
    const variantResult = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(
          `/api/admin/catalog/products/${product.id}/variants/${variantBefore.id}`,
          {
            method: 'PUT',
            cookie: approved.cookie,
            body: variantUpdate(variantBefore, {
              priceMnt: 18_000,
              compareAtPriceMnt: 22_000,
              active: true,
            }),
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
      status: 'draft',
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
      status: 'draft',
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
        method: 'PUT',
        cookie: approved.cookie,
        body: productUpdate(inactiveDraft, { status: 'active' }),
      }),
    )
    expect(activation).toMatchObject({
      status: 'error',
      error: { _tag: 'ProductActivationBlocked', productId: inactiveDraft.id },
    })

    const variantId = active.variants[0]!.id
    const lastActive = await deserializeCatalog<AdminCatalogProductDetail>(
      await requestCatalog(`/api/admin/catalog/products/${active.id}/variants/${variantId}`, {
        method: 'PUT',
        cookie: approved.cookie,
        body: variantUpdate(active.variants[0]!, { active: false }),
      }),
    )
    expect(lastActive).toMatchObject({
      status: 'error',
      error: { _tag: 'LastActiveVariantBlocked', variantId },
    })

    const invalidCompareAt = await deserializeCatalog<AdminCatalogProductDetail>(
      await requestCatalog(`/api/admin/catalog/products/${active.id}/variants/${variantId}`, {
        method: 'PUT',
        cookie: approved.cookie,
        body: variantUpdate(active.variants[0]!, {
          priceMnt: 12_000,
          compareAtPriceMnt: 12_000,
        }),
      }),
    )
    expect(invalidCompareAt).toMatchObject({
      status: 'error',
      error: { _tag: 'InvalidCompareAtPrice', variantId },
    })

    const firstWrite = expectOk(
      await deserializeCatalog<AdminCatalogProductDetail>(
        await requestCatalog(`/api/admin/catalog/products/${active.id}`, {
          method: 'PUT',
          cookie: approved.cookie,
          body: productUpdate(active, { featured: true }),
        }),
      ),
    )
    const staleWrite = await deserializeCatalog<AdminCatalogProductDetail>(
      await requestCatalog(`/api/admin/catalog/products/${active.id}`, {
        method: 'PUT',
        cookie: approved.cookie,
        body: productUpdate(active, { featured: false }),
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

    const confirmationInput = {
      orderId: payable.orderId,
      providerPaymentId: 'telegram:catalog-race-first',
      amountMnt: 10_000,
      method: 'bank_transfer' as const,
      paidAt: product.updatedAt,
      telegramMessageId: payable.telegramMessageId,
    }
    const firstConfirmation =
      await database.query.payments.confirmAndDecrementStock(confirmationInput)
    const repeatedConfirmation = await database.query.payments.confirmAndDecrementStock({
      ...confirmationInput,
      providerPaymentId: 'telegram:catalog-race-repeated',
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

    expect(firstConfirmation).toEqual({ status: 'confirmed', orderStatus: 'confirmed' })
    expect(repeatedConfirmation).toEqual({
      status: 'already-paid',
      orderStatus: 'confirmed',
      stockApplied: true,
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
