import { adminCatalogImageMaxBytes } from '@store-kit/contracts/admin-catalog'
import type {
  AdminCatalogError,
  AdminCatalogProductDetail,
} from '@store-kit/contracts/admin-catalog'
import { createId } from '@store-kit/db/ids'
import { Result } from 'better-result'
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vite-plus/test'

import { createAdminSession } from '../test/admin-session'
import fixtureDataUrl from '../test/fixtures/catalog-upload.jpg?inline'
import { adminCatalogRoutes } from './admin-catalog'

const fixtureBytes = Uint8Array.from(
  atob(fixtureDataUrl.slice(fixtureDataUrl.indexOf(',') + 1)),
  character => character.charCodeAt(0),
)

const seedProduct = async () => {
  const suffix = crypto.randomUUID()
  const productId = createId('product')
  const variantId = createId('productVariant')
  const now = Date.now() - 60_000
  await env.DB.batch([
    env.DB.prepare(
      `insert into product
        (id, slug, name, status, featured, use_cases, created_at, updated_at)
       values (?, ?, 'Upload boundary product', 'active', 0, '[]', ?, ?)`,
    ).bind(productId, `upload-boundary-${suffix}`, now, now),
    env.DB.prepare(
      `insert into product_variant
        (id, product_id, sku, name, options, price_mnt, stock_quantity, active,
         sort_order, created_at, updated_at)
       values (?, ?, ?, 'Default', '{}', 10000, 1, 1, 0, ?, ?)`,
    ).bind(variantId, productId, `UPLOAD-${suffix}`, now, now),
  ])
  return { productId, variantId, updatedAt: now }
}

const uploadPath = (productId: string) =>
  `https://plugged.mn/api/admin/catalog/products/${productId}/images`

const multipartRequest = async (url: string, cookie: string, body: FormData) => {
  const request = new Request(url, {
    method: 'POST',
    headers: { cookie, origin: 'https://plugged.mn' },
    body,
  })
  const encoded = await request.arrayBuffer()
  const headers = new Headers(request.headers)
  headers.set('content-length', String(encoded.byteLength))
  return new Request(url, { method: 'POST', headers, body: encoded })
}

describe('admin catalog API', () => {
  it('authenticates before body guards and returns 411/413 without a large allocation', async () => {
    const { productId } = await seedProduct()
    const url = uploadPath(productId)
    const tooLarge = String(adminCatalogImageMaxBytes + 64 * 1024 + 1)
    const malformedHeaders = {
      'content-length': tooLarge,
      'content-type': 'multipart/form-data; boundary=tiny',
      'origin': 'https://plugged.mn',
    }
    const unauthenticated = await adminCatalogRoutes.handle(
      new Request(url, { method: 'POST', headers: malformedHeaders, body: '--tiny--' }),
    )
    const approved = await createAdminSession(true)
    const oversized = await adminCatalogRoutes.handle(
      new Request(url, {
        method: 'POST',
        headers: { ...malformedHeaders, cookie: approved.cookie },
        body: '--tiny--',
      }),
    )
    const unknownLength = await adminCatalogRoutes.handle(
      new Request(url, {
        method: 'POST',
        headers: {
          'cookie': approved.cookie,
          'content-type': 'multipart/form-data; boundary=tiny',
          'origin': 'https://plugged.mn',
        },
        body: '--tiny--',
      }),
    )

    expect(unauthenticated.status).toBe(401)
    expect(await unauthenticated.json()).toEqual({ _tag: 'Unauthenticated' })
    expect(oversized.status).toBe(413)
    expect(await oversized.json()).toEqual({ _tag: 'PayloadTooLarge' })
    expect(unknownLength.status).toBe(411)
    expect(await unknownLength.json()).toEqual({ _tag: 'LengthRequired' })
    for (const response of [unauthenticated, oversized, unknownLength])
      expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('accepts one small real multipart image upload at the route boundary', async () => {
    const product = await seedProduct()
    const approved = await createAdminSession(true)
    const body = new FormData()
    body.set('file', new File([fixtureBytes], 'catalog-upload.jpg', { type: 'image/jpeg' }))
    body.set('alt', 'Multipart product image')
    body.set('expectedUpdatedAt', String(product.updatedAt))
    body.set('variantIds', JSON.stringify([product.variantId]))

    const response = await adminCatalogRoutes.handle(
      await multipartRequest(uploadPath(product.productId), approved.cookie, body),
    )
    const result = Result.deserialize<AdminCatalogProductDetail, AdminCatalogError>(
      await response.json(),
    )
    expect(response.status).toBe(200)
    expect(result.status).toBe('ok')
    if (result.status === 'error') throw new Error('Expected the multipart upload to succeed.')

    const image = result.value.images[0]!
    expect(image).toMatchObject({
      productId: product.productId,
      width: 322,
      height: 448,
      alt: 'Multipart product image',
      sortOrder: 10,
      variantIds: [product.variantId],
    })
    const stored = await env.DB.prepare(
      'select r2_key, width, height from product_image where id = ?',
    )
      .bind(image.id)
      .first<{ r2_key: string; width: number; height: number }>()
    expect(stored).toMatchObject({ width: 322, height: 448 })
    expect(await env.MEDIA.get(stored!.r2_key)).not.toBeNull()
  })
})
