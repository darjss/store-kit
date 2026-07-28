import type {
  AdminOrderDetail,
  AdminOrderError,
  AdminOrderList,
} from '@store-kit/contracts/admin-orders'
import type { OrderStatus } from '@store-kit/contracts/orders'
import type { PaymentStatus } from '@store-kit/contracts/payments'
import { Result } from 'better-result'
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vite-plus/test'

import { createAdminCookie } from '~/test/admin-session'

import { adminOrderRoutes } from './admin-orders'

const entityId = (prefix: string, value: number) =>
  `${prefix}_${value.toString().padStart(26, '0')}`

const request = (path: string, cookie?: string, init?: RequestInit) =>
  adminOrderRoutes.handle(
    new Request(`https://plugged.mn${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
        origin: 'https://plugged.mn',
        ...init?.headers,
      },
    }),
  )

const patchStatus = (orderId: string, body: unknown, cookie?: string) =>
  request(`/api/admin/orders/${orderId}/status`, cookie, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

const insertInventory = async (suffix: number, stockQuantity = 50) => {
  const productId = entityId('prod', suffix)
  const variantId = entityId('var', suffix)
  const now = 1_900_000_000_000 + suffix
  await env.DB.batch([
    env.DB.prepare(
      `insert into product
        (id, slug, name, status, featured, use_cases, created_at, updated_at)
       values (?, ?, ?, 'active', 0, '[]', ?, ?)`,
    ).bind(productId, `admin-order-product-${suffix}`, `Order Product ${suffix}`, now, now),
    env.DB.prepare(
      `insert into product_variant
        (id, product_id, sku, name, options, price_mnt, stock_quantity, active,
         sort_order, created_at, updated_at)
       values (?, ?, ?, 'Default', '{}', 10000, ?, 1, 0, ?, ?)`,
    ).bind(variantId, productId, `ORDER-SKU-${suffix}`, stockQuantity, now, now),
  ])
  return { productId, variantId, stockQuantity }
}

type InsertOrderInput = {
  suffix: number
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  paymentMethod?: 'qpay' | 'bank_transfer'
  customerName?: string
  customerPhone?: string
  number?: string
  createdAt?: number
  lineCount?: number
  inventory?: { productId: string; variantId: string }
}

const insertOrder = async ({
  suffix,
  status = 'new',
  paymentStatus = 'pending',
  paymentMethod = 'bank_transfer',
  customerName = `Order Customer ${suffix}`,
  customerPhone = `99${suffix.toString().padStart(6, '0').slice(-6)}`,
  number = `ADMIN-${suffix}`,
  createdAt = 1_800_000_000_000 + suffix,
  lineCount = 1,
  inventory,
}: InsertOrderInput) => {
  const orderId = entityId('ord', suffix)
  const paymentId = entityId('pay', suffix)
  const updatedAt = createdAt + 10
  const claimedAt = ['claimed', 'confirming', 'paid'].includes(paymentStatus) ? createdAt + 1 : null
  const paidAt = paymentStatus === 'paid' ? createdAt + 2 : null
  const statements = [
    env.DB.prepare(
      `insert into customer_order
        (id, number, status_token_hash, status, customer_name, customer_phone, district, khoroo,
         address, delivery_notes, subtotal_mnt, delivery_fee_mnt, total_mnt, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, 'Сүхбаатар', '1-р хороо', 'Peace Avenue 1', 'Call first',
         ?, 5000, ?, ?, ?)`,
    ).bind(
      orderId,
      number,
      `private-status-token-hash-${suffix}`,
      status,
      customerName,
      customerPhone,
      lineCount * 10_000,
      lineCount * 10_000 + 5_000,
      createdAt,
      updatedAt,
    ),
    ...Array.from({ length: lineCount }, (_, index) =>
      env.DB.prepare(
        `insert into order_line
          (id, order_id, product_id, variant_id, product_name, variant_name, sku, options,
           unit_price_mnt, quantity, line_total_mnt, image_r2_key, image_width, image_height,
           image_alt)
         values (?, ?, ?, ?, ?, ?, ?, ?, 10000, 1, 10000, ?, 1200, 900, ?)`,
      ).bind(
        entityId('line', suffix * 10 + index),
        orderId,
        inventory?.productId ?? null,
        inventory?.variantId ?? null,
        `Snapshot Product ${suffix}-${index}`,
        `Snapshot Variant ${index}`,
        `SNAPSHOT-${suffix}-${index}`,
        JSON.stringify({ size: index === 0 ? 'M' : 'L' }),
        `private/image-${suffix}-${index}.webp`,
        `Snapshot ${index}`,
      ),
    ),
    env.DB.prepare(
      `insert into payment
        (id, order_id, method, status, amount_mnt, provider_invoice_id, provider_payment_id,
         claimed_at, telegram_message_id, paid_at, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      paymentId,
      orderId,
      paymentMethod,
      paymentStatus,
      lineCount * 10_000 + 5_000,
      `private-invoice-${suffix}`,
      `private-provider-payment-${suffix}`,
      claimedAt,
      `private-telegram-message-${suffix}`,
      paidAt,
      createdAt,
      updatedAt,
    ),
  ]
  await env.DB.batch(statements)
  return { orderId, paymentId, updatedAt, createdAt, number }
}

const deserializeList = async (response: Response) =>
  Result.deserialize<AdminOrderList, AdminOrderError>(await response.json())

const deserializeDetail = async (response: Response) =>
  Result.deserialize<AdminOrderDetail, AdminOrderError>(await response.json())

describe('admin order routes', () => {
  it('guards every endpoint with real Better Auth sessions and current D1 approval', async () => {
    const seeded = await insertOrder({
      suffix: 9001,
      status: 'confirmed',
      paymentStatus: 'paid',
    })
    const unapprovedCookie = await createAdminCookie(false)
    const approvedCookie = await createAdminCookie(true)
    const calls = [
      () => request('/api/admin/orders?query=ADMIN-9001'),
      () => request(`/api/admin/orders/${seeded.orderId}`),
      () =>
        patchStatus(seeded.orderId, {
          status: 'preparing',
          expectedUpdatedAt: seeded.updatedAt,
        }),
      () => request('/api/admin/orders?query=ADMIN-9001', unapprovedCookie),
      () => request(`/api/admin/orders/${seeded.orderId}`, unapprovedCookie),
      () =>
        patchStatus(
          seeded.orderId,
          { status: 'preparing', expectedUpdatedAt: seeded.updatedAt },
          unapprovedCookie,
        ),
      () => request('/api/admin/orders?query=ADMIN-9001', approvedCookie),
      () => request(`/api/admin/orders/${seeded.orderId}`, approvedCookie),
      () =>
        patchStatus(
          seeded.orderId,
          { status: 'preparing', expectedUpdatedAt: seeded.updatedAt },
          approvedCookie,
        ),
    ]

    const responses = await Promise.all(calls.map(call => call()))

    expect(responses.map(response => response.status)).toEqual([
      401, 401, 401, 403, 403, 403, 200, 200, 200,
    ])
    expect(await responses[0]!.json()).toEqual({ _tag: 'Unauthenticated' })
    expect(await responses[3]!.json()).toEqual({ _tag: 'ApprovalRequired' })
    for (const response of responses)
      expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('filters, searches, sorts, and paginates real order rows', async () => {
    const createdAt = 1_810_000_000_000
    const lowerId = await insertOrder({
      suffix: 9101,
      status: 'new',
      paymentStatus: 'pending',
      customerName: 'List Scope Alpha',
      customerPhone: '88110001',
      number: 'LIST-NUMBER-ALPHA',
      createdAt,
      lineCount: 2,
    })
    const higherId = await insertOrder({
      suffix: 9102,
      status: 'preparing',
      paymentStatus: 'paid',
      paymentMethod: 'qpay',
      customerName: 'List Scope Beta',
      customerPhone: '88110002',
      number: 'LIST-NUMBER-BETA',
      createdAt,
    })
    const oldest = await insertOrder({
      suffix: 9103,
      status: 'new',
      paymentStatus: 'failed',
      customerName: 'List Scope Gamma',
      customerPhone: '88110003',
      number: 'LIST-NUMBER-GAMMA',
      createdAt: createdAt - 1,
    })
    const cookie = await createAdminCookie(true)

    const all = await deserializeList(
      await request('/api/admin/orders?query=List%20Scope&limit=2&offset=0', cookie),
    )
    const page = await deserializeList(
      await request('/api/admin/orders?query=List%20Scope&limit=1&offset=1', cookie),
    )
    const status = await deserializeList(
      await request('/api/admin/orders?query=List%20Scope&status=new', cookie),
    )
    const payment = await deserializeList(
      await request('/api/admin/orders?query=88110003&paymentStatus=failed', cookie),
    )
    const number = await deserializeList(
      await request('/api/admin/orders?query=list-number-alpha', cookie),
    )

    expect(all).toMatchObject({
      status: 'ok',
      value: {
        total: 3,
        limit: 2,
        offset: 0,
        items: [
          { id: higherId.orderId, paymentMethod: 'qpay', paymentStatus: 'paid' },
          { id: lowerId.orderId, lineCount: 2, totalMnt: 25_000 },
        ],
      },
    })
    expect(page).toMatchObject({
      status: 'ok',
      value: { total: 3, items: [{ id: lowerId.orderId }] },
    })
    expect(status).toMatchObject({
      status: 'ok',
      value: { total: 2, items: [{ id: lowerId.orderId }, { id: oldest.orderId }] },
    })
    expect(payment).toMatchObject({
      status: 'ok',
      value: { total: 1, items: [{ id: oldest.orderId }] },
    })
    expect(number).toMatchObject({
      status: 'ok',
      value: { total: 1, items: [{ id: lowerId.orderId }] },
    })
  })

  it('returns safe immutable detail snapshots and redacts private fields', async () => {
    const seeded = await insertOrder({
      suffix: 9201,
      status: 'confirmed',
      paymentStatus: 'paid',
      lineCount: 2,
    })
    const response = await request(
      `/api/admin/orders/${seeded.orderId}`,
      await createAdminCookie(true),
    )
    const json = await response.clone().json()
    const result = Result.deserialize<AdminOrderDetail, AdminOrderError>(json)

    expect(result).toMatchObject({
      status: 'ok',
      value: {
        id: seeded.orderId,
        number: seeded.number,
        status: 'confirmed',
        customerName: 'Order Customer 9201',
        customerPhone: '99009201',
        district: 'Сүхбаатар',
        khoroo: '1-р хороо',
        address: 'Peace Avenue 1',
        deliveryNotes: 'Call first',
        subtotalMnt: 20_000,
        deliveryFeeMnt: 5_000,
        totalMnt: 25_000,
        lines: [
          {
            productName: 'Snapshot Product 9201-0',
            variantName: 'Snapshot Variant 0',
            sku: 'SNAPSHOT-9201-0',
            options: { size: 'M' },
            unitPriceMnt: 10_000,
            quantity: 1,
            lineTotalMnt: 10_000,
          },
          {
            productName: 'Snapshot Product 9201-1',
            options: { size: 'L' },
          },
        ],
        payment: {
          method: 'bank_transfer',
          status: 'paid',
          amountMnt: 25_000,
          claimedAt: seeded.createdAt + 1,
          paidAt: seeded.createdAt + 2,
        },
        allowedTransitions: ['preparing'],
      },
    })
    expect(JSON.stringify(json)).not.toContain('private-status-token-hash')
    expect(JSON.stringify(json)).not.toContain('private-invoice')
    expect(JSON.stringify(json)).not.toContain('private-provider-payment')
    expect(JSON.stringify(json)).not.toContain('private-telegram-message')
    expect(JSON.stringify(json)).not.toContain('private/image')
  })

  it('allows only the manual transition edges and never changes payment or stock', async () => {
    const inventory = await insertInventory(9300, 50)
    const allowed: Array<[number, OrderStatus, PaymentStatus, OrderStatus]> = [
      [9301, 'new', 'pending', 'cancelled'],
      [9302, 'new', 'failed', 'cancelled'],
      [9303, 'confirmed', 'paid', 'preparing'],
      [9304, 'preparing', 'paid', 'delivering'],
      [9305, 'delivering', 'paid', 'completed'],
    ]
    const cookie = await createAdminCookie(true)

    await Promise.all(
      allowed.map(async ([suffix, status, paymentStatus, target]) => {
        const seeded = await insertOrder({
          suffix,
          status,
          paymentStatus,
          inventory,
        })
        const result = await deserializeDetail(
          await patchStatus(
            seeded.orderId,
            { status: target, expectedUpdatedAt: seeded.updatedAt },
            cookie,
          ),
        )
        const persisted = await env.DB.prepare(
          `select o.status as order_status, p.status as payment_status, v.stock_quantity
           from customer_order o
           join payment p on p.order_id = o.id
           join order_line l on l.order_id = o.id
           join product_variant v on v.id = l.variant_id
           where o.id = ?`,
        )
          .bind(seeded.orderId)
          .first()

        expect(result).toMatchObject({ status: 'ok', value: { status: target } })
        expect(persisted).toEqual({
          order_status: target,
          payment_status: paymentStatus,
          stock_quantity: 50,
        })
      }),
    )
  })

  it('blocks skips, regressions, terminal changes, and payment-controlled cancellation', async () => {
    const inventory = await insertInventory(9400, 40)
    const blocked: Array<[number, OrderStatus, PaymentStatus, OrderStatus]> = [
      [9401, 'new', 'claimed', 'cancelled'],
      [9402, 'new', 'confirming', 'cancelled'],
      [9403, 'new', 'paid', 'cancelled'],
      [9404, 'new', 'pending', 'confirmed'],
      [9405, 'confirmed', 'paid', 'delivering'],
      [9406, 'preparing', 'paid', 'confirmed'],
      [9407, 'completed', 'paid', 'preparing'],
      [9408, 'cancelled', 'pending', 'new'],
    ]
    const cookie = await createAdminCookie(true)

    await Promise.all(
      blocked.map(async ([suffix, status, paymentStatus, target]) => {
        const seeded = await insertOrder({
          suffix,
          status,
          paymentStatus,
          inventory,
        })
        const result = await deserializeDetail(
          await patchStatus(
            seeded.orderId,
            { status: target, expectedUpdatedAt: seeded.updatedAt },
            cookie,
          ),
        )
        const persisted = await env.DB.prepare(
          `select o.status as order_status, p.status as payment_status, v.stock_quantity
           from customer_order o
           join payment p on p.order_id = o.id
           join order_line l on l.order_id = o.id
           join product_variant v on v.id = l.variant_id
           where o.id = ?`,
        )
          .bind(seeded.orderId)
          .first()

        expect(result).toMatchObject({
          status: 'error',
          error: {
            _tag: 'OrderStatusTransitionNotAllowed',
            currentStatus: status,
            requestedStatus: target,
          },
        })
        expect(persisted).toEqual({
          order_status: status,
          payment_status: paymentStatus,
          stock_quantity: 40,
        })
      }),
    )
  })

  it('serializes not-found, transition, and stale-version failures', async () => {
    const cookie = await createAdminCookie(true)
    const blocked = await insertOrder({
      suffix: 9501,
      status: 'new',
      paymentStatus: 'claimed',
    })
    const stale = await insertOrder({
      suffix: 9502,
      status: 'confirmed',
      paymentStatus: 'paid',
    })
    const missingId = entityId('ord', 9599)

    const notFoundDetail = await deserializeDetail(
      await request(`/api/admin/orders/${missingId}`, cookie),
    )
    const notFoundUpdate = await deserializeDetail(
      await patchStatus(missingId, { status: 'preparing', expectedUpdatedAt: 1 }, cookie),
    )
    const transition = await deserializeDetail(
      await patchStatus(
        blocked.orderId,
        { status: 'cancelled', expectedUpdatedAt: blocked.updatedAt },
        cookie,
      ),
    )
    const conflict = await deserializeDetail(
      await patchStatus(
        stale.orderId,
        { status: 'preparing', expectedUpdatedAt: stale.updatedAt - 1 },
        cookie,
      ),
    )

    expect(notFoundDetail).toMatchObject({
      status: 'error',
      error: { _tag: 'AdminOrderNotFound', orderId: missingId },
    })
    expect(notFoundUpdate).toMatchObject({
      status: 'error',
      error: { _tag: 'AdminOrderNotFound', orderId: missingId },
    })
    expect(transition).toMatchObject({
      status: 'error',
      error: {
        _tag: 'OrderStatusTransitionNotAllowed',
        allowedStatuses: [],
      },
    })
    expect(conflict).toMatchObject({
      status: 'error',
      error: { _tag: 'AdminOrderConflict', orderId: stale.orderId },
    })
    const persisted = await env.DB.prepare(
      'select status, updated_at from customer_order where id = ?',
    )
      .bind(stale.orderId)
      .first()
    expect(persisted).toEqual({ status: 'confirmed', updated_at: stale.updatedAt })
  })

  it('rejects malformed params, filters, and status bodies at the TypeBox boundary', async () => {
    const seeded = await insertOrder({ suffix: 9601 })
    const cookie = await createAdminCookie(true)
    const invalidRequests = [
      request('/api/admin/orders?status=refunded', cookie),
      request('/api/admin/orders?paymentStatus=refunded', cookie),
      request('/api/admin/orders?limit=0', cookie),
      request('/api/admin/orders?unknown=value', cookie),
      request(`/api/admin/orders/${entityId('prod', 9601)}`, cookie),
      patchStatus(
        seeded.orderId,
        { status: 'refunded', expectedUpdatedAt: seeded.updatedAt },
        cookie,
      ),
      patchStatus(seeded.orderId, { status: 'cancelled', expectedUpdatedAt: -1 }, cookie),
      patchStatus(
        seeded.orderId,
        { status: 'cancelled', expectedUpdatedAt: seeded.updatedAt, paymentStatus: 'paid' },
        cookie,
      ),
      patchStatus(seeded.orderId, { status: 'cancelled' }, cookie),
    ]

    const responses = await Promise.all(invalidRequests)
    expect(responses.map(response => response.status)).toEqual(Array.from({ length: 9 }, () => 422))
    for (const response of responses)
      expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
})
