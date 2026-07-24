import type { CartValidationError, ValidatedCart } from '@store-kit/contracts/cart'
import type { CheckoutCreated, CheckoutError } from '@store-kit/contracts/checkout'
import { Result } from 'better-result'
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vite-plus/test'

import { app } from './index'

const entityId = (prefix: string, value: number) =>
  `${prefix}_${value.toString().padStart(26, '0')}`

const seedCheckout = async (suffix: number) => {
  const now = Date.now()
  const productId = entityId('prod', suffix)
  const variantId = entityId('var', suffix)
  const imageId = entityId('img', suffix)
  await env.DB.batch([
    env.DB.prepare(
      `insert or replace into checkout_settings
        (id, delivery_fee_mnt, bank_name, bank_account_name, bank_account_number, updated_at)
       values (?, ?, ?, ?, ?, ?)`,
    ).bind('cfg_00000000000000000000000001', 5_000, 'Test Bank', 'Store', '1234', now),
    env.DB.prepare(
      `insert into product
        (id, slug, name, status, featured, use_cases, created_at, updated_at)
       values (?, ?, ?, 'active', 0, '[]', ?, ?)`,
    ).bind(productId, `api-product-${suffix}`, 'API Product', now, now),
    env.DB.prepare(
      `insert into product_variant
        (id, product_id, sku, name, options, price_mnt, stock_quantity, active, sort_order, created_at, updated_at)
       values (?, ?, ?, ?, '{}', ?, ?, 1, 0, ?, ?)`,
    ).bind(variantId, productId, `API-SKU-${suffix}`, 'Default', 10_000, 10, now, now),
    env.DB.prepare(
      `insert into product_image
        (id, product_id, r2_key, width, height, alt, sort_order, created_at)
       values (?, ?, ?, 1200, 900, ?, 0, ?)`,
    ).bind(
      imageId,
      productId,
      `catalog/products/api-product-${suffix}/main.webp`,
      'API Product',
      now,
    ),
    env.DB.prepare(
      `insert into product_variant_image (product_id, variant_id, image_id) values (?, ?, ?)`,
    ).bind(productId, variantId, imageId),
  ])
  return { productId, variantId }
}

const checkoutBody = (variantId: string) => ({
  items: [{ variantId, quantity: 1 }],
  customer: { name: 'Customer', phone: '99112233' },
  delivery: {
    district: 'Сүхбаатар',
    khoroo: '1-р хороо',
    address: 'Test address',
    notes: 'Call first',
  },
  paymentMethod: 'bank_transfer',
})

const postJson = (
  path: string,
  body: unknown,
  headers?: HeadersInit,
  origin = 'https://plugged.test',
) =>
  app.handle(
    new Request(`${origin}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  )

describe('checked shared request contracts', () => {
  it('rejects malformed checkout and cart bodies at the Elysia boundary', async () => {
    const checkoutResponse = await postJson('/api/checkout', {
      ...checkoutBody(entityId('var', 91)),
      items: [{ variantId: entityId('var', 91), quantity: '1' }],
    })
    const cartResponse = await postJson('/api/cart/validate', [
      { variantId: entityId('var', 91), quantity: '1' },
    ])
    const catalogResponse = await app.handle(
      new Request('https://plugged.test/api/products?limit=not-a-number'),
    )
    const catalogBooleanResponse = await app.handle(
      new Request('https://plugged.test/api/products?featured=invalid'),
    )

    expect(checkoutResponse.status).toBe(422)
    expect(cartResponse.status).toBe(422)
    expect(catalogResponse.status).toBe(422)
    expect(catalogBooleanResponse.status).toBe(422)
  })

  it('returns stable field codes for checkout domain validation', async () => {
    const { variantId } = await seedCheckout(96)
    const response = await postJson('/api/checkout', {
      ...checkoutBody(variantId),
      items: [
        { variantId, quantity: 1 },
        { variantId, quantity: 1 },
      ],
    })
    const result = Result.deserialize<CheckoutCreated, CheckoutError>(await response.json())

    expect(result).toEqual({
      status: 'error',
      error: {
        _tag: 'InvalidCheckoutDetails',
        fields: [{ path: '/items', code: 'duplicate' }],
      },
    })
  })

  it('returns final public image URLs without exposing R2 keys', async () => {
    const { variantId } = await seedCheckout(95)
    const input = [{ variantId, quantity: 1, previousUnitPriceMnt: 10_000 }]
    const publicResponse = await postJson('/api/cart/validate', input)
    const localHostResponse = await postJson(
      '/api/cart/validate',
      input,
      undefined,
      'http://localhost',
    )
    const publicResult = Result.deserialize<ValidatedCart, CartValidationError>(
      await publicResponse.json(),
    )
    const localHostResult = Result.deserialize<ValidatedCart, CartValidationError>(
      await localHostResponse.json(),
    )

    const expectedImage = {
      url: 'https://plugged.storekitcdn.darjs.dev/catalog/products/api-product-95/main.webp',
      width: 1200,
      height: 900,
      alt: 'API Product',
    }
    expect(publicResult).toMatchObject({
      status: 'ok',
      value: {
        lines: [
          {
            image: expectedImage,
          },
        ],
      },
    })
    expect(localHostResult).toMatchObject({
      status: 'ok',
      value: { lines: [{ image: expectedImage }] },
    })
    expect(JSON.stringify(publicResult)).not.toContain('r2Key')
  })

  it('rejects noncanonical direct checkout requests and persists typed storage normalization', async () => {
    const { variantId } = await seedCheckout(92)
    const whitespaceResponse = await postJson('/api/checkout', {
      ...checkoutBody(variantId),
      customer: { name: '   ', phone: ' 9911 2233 ' },
      delivery: {
        district: 'Сүхбаатар',
        khoroo: '   ',
        address: '\n\t',
        notes: '   ',
      },
    })
    expect(whitespaceResponse.status).toBe(422)

    const formattedPhoneResponse = await postJson('/api/checkout', {
      ...checkoutBody(variantId),
      customer: { name: 'Test Customer', phone: '+976 9911-2233' },
    })
    expect(formattedPhoneResponse.status).toBe(422)

    const validResponse = await postJson('/api/checkout', {
      ...checkoutBody(variantId),
      customer: { name: '  Test Customer  ', phone: '99112233' },
      delivery: {
        district: 'Сүхбаатар',
        khoroo: '  1-р хороо  ',
        address: '  Энхтайвны өргөн чөлөө  ',
        notes: '   ',
      },
    })
    const validResult = Result.deserialize<CheckoutCreated, CheckoutError>(
      await validResponse.json(),
    )
    expect(validResult).toMatchObject({ status: 'ok' })
    if (validResult.status === 'error') return

    const persisted = await env.DB.prepare(
      `select customer_name, customer_phone, khoroo, address, delivery_notes
       from customer_order where id = ?`,
    )
      .bind(validResult.value.orderId)
      .first<{
        customer_name: string
        customer_phone: string
        khoroo: string
        address: string
        delivery_notes: string | null
      }>()

    expect(persisted).toEqual({
      customer_name: 'Test Customer',
      customer_phone: '99112233',
      khoroo: '1-р хороо',
      address: 'Энхтайвны өргөн чөлөө',
      delivery_notes: null,
    })
  })
})

describe('retryable webhook transport outcomes', () => {
  it('uses the documented QPay POST query shape and returns 503 on verification transport failure', async () => {
    const now = Date.now()
    const orderId = entityId('ord', 93)
    const paymentId = entityId('pay', 93)
    await env.DB.batch([
      env.DB.prepare(
        `insert into customer_order
          (id, number, status_token_hash, status, customer_name, customer_phone, district, khoroo,
           address, subtotal_mnt, delivery_fee_mnt, total_mnt, created_at, updated_at)
         values (?, ?, ?, 'new', 'QPay Customer', '99112233', 'Сүхбаатар', '1', 'Address',
           1000, 0, 1000, ?, ?)`,
      ).bind(orderId, `QPAY-${orderId}`, `hash-${orderId}`, now, now),
      env.DB.prepare(
        `insert into payment
          (id, order_id, method, status, amount_mnt, provider_invoice_id, created_at, updated_at)
         values (?, ?, 'qpay', 'pending', 1000, ?, ?, ?)`,
      ).bind(paymentId, orderId, `invoice-${paymentId}`, now, now),
    ])

    const response = await app.handle(
      new Request(`https://plugged.test/api/webhooks/qpay?payment_id=${paymentId}`, {
        method: 'POST',
      }),
    )

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ ok: false })
  })

  it('returns 503 for Telegram action failure while keeping callback state idempotent', async () => {
    const { productId, variantId } = await seedCheckout(94)
    const now = Date.now()
    const orderId = entityId('ord', 94)
    const paymentId = entityId('pay', 94)
    const lineId = entityId('line', 94)
    await env.DB.batch([
      env.DB.prepare(
        `insert into customer_order
          (id, number, status_token_hash, status, customer_name, customer_phone, district, khoroo,
           address, subtotal_mnt, delivery_fee_mnt, total_mnt, created_at, updated_at)
         values (?, ?, ?, 'new', 'Bank Customer', '99112233', 'Сүхбаатар', '1', 'Address',
           10000, 0, 10000, ?, ?)`,
      ).bind(orderId, `BANK-${orderId}`, `hash-${orderId}`, now, now),
      env.DB.prepare(
        `insert into order_line
          (id, order_id, product_id, variant_id, product_name, variant_name, sku, options,
           unit_price_mnt, quantity, line_total_mnt)
         values (?, ?, ?, ?, 'API Product', 'Default', ?, '{}', 10000, 1, 10000)`,
      ).bind(lineId, orderId, productId, variantId, `API-SKU-94`),
      env.DB.prepare(
        `insert into payment
          (id, order_id, method, status, amount_mnt, claimed_at, telegram_message_id,
           created_at, updated_at)
         values (?, ?, 'bank_transfer', 'claimed', 10000, ?, '777', ?, ?)`,
      ).bind(paymentId, orderId, now, now, now),
    ])
    const update = {
      callback_query: {
        id: 'callback-94',
        from: { id: 42 },
        data: `bank:confirm:${orderId}`,
        message: { message_id: 777 },
      },
    }
    const headers = { 'x-telegram-bot-api-secret-token': 'integration-test-secret' }

    const first = await postJson('/api/webhooks/telegram', update, headers)
    const repeated = await postJson('/api/webhooks/telegram', update, headers)
    const persisted = await env.DB.prepare(
      `select p.status as payment_status, o.status as order_status, v.stock_quantity
       from payment p
       join customer_order o on o.id = p.order_id
       join order_line l on l.order_id = o.id
       join product_variant v on v.id = l.variant_id
       where o.id = ?`,
    )
      .bind(orderId)
      .first<{
        payment_status: string
        order_status: string
        stock_quantity: number
      }>()

    expect(first.status).toBe(503)
    expect(repeated.status).toBe(503)
    expect(persisted).toEqual({
      payment_status: 'paid',
      order_status: 'confirmed',
      stock_quantity: 9,
    })
  })
})
