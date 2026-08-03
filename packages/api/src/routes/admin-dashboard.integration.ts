import type { AdminDashboard } from '@store-kit/contracts/admin-dashboard'
import { Result } from 'better-result'
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vite-plus/test'

import { createAdminSession } from '../test/admin-session'
import { adminDashboardRoutes } from './admin-dashboard'

const entityId = (prefix: string, value: number) =>
  `${prefix}_${value.toString().padStart(26, '0')}`

const orderSeeds = [
  { value: 1, status: 'new', createdAt: 100 },
  { value: 2, status: 'confirmed', createdAt: 200 },
  { value: 3, status: 'preparing', createdAt: 300 },
  { value: 4, status: 'delivering', createdAt: 400 },
  { value: 5, status: 'completed', createdAt: 500 },
  { value: 6, status: 'cancelled', createdAt: 600 },
  { value: 7, status: 'new', createdAt: 700 },
  { value: 8, status: 'confirmed', createdAt: 800 },
  { value: 9, status: 'new', createdAt: 900 },
  { value: 10, status: 'completed', createdAt: 900 },
] as const

const paymentStatus = (status: (typeof orderSeeds)[number]['status']) => {
  if (status === 'new') return 'pending' as const
  if (status === 'cancelled') return 'failed' as const
  return 'paid' as const
}

const paymentMethod = (value: number) =>
  value % 2 === 0 ? ('qpay' as const) : ('bank_transfer' as const)

const expectedOrder = ({ value, status, createdAt }: (typeof orderSeeds)[number]) => ({
  id: entityId('ord', value),
  number: `ORD-${value}`,
  customerName: `Customer ${value}`,
  customerPhone: `990000${value.toString().padStart(2, '0')}`,
  status,
  paymentMethod: paymentMethod(value),
  paymentStatus: paymentStatus(status),
  lineCount: 1,
  totalMnt: 10_000,
  createdAt,
  updatedAt: createdAt + 1,
})

const seedDashboard = async () => {
  const activeProductId = entityId('prod', 1)
  const draftProductId = entityId('prod', 2)
  const now = 1_000
  const variants = [
    { value: 1, productId: activeProductId, name: 'Out of stock', stock: 0, active: 1 },
    { value: 2, productId: activeProductId, name: 'Low one', stock: 1, active: 1 },
    { value: 3, productId: activeProductId, name: 'Low boundary', stock: 3, active: 1 },
    { value: 4, productId: activeProductId, name: 'Above boundary', stock: 4, active: 1 },
    { value: 5, productId: activeProductId, name: 'Inactive', stock: 2, active: 0 },
    { value: 6, productId: draftProductId, name: 'Draft product', stock: 1, active: 1 },
  ] as const

  await env.DB.batch([
    env.DB.prepare(
      `insert into product
        (id, slug, name, status, featured, use_cases, created_at, updated_at)
       values (?, 'active-dashboard-product', 'Active product', 'active', 0, '[]', ?, ?)`,
    ).bind(activeProductId, now, now),
    env.DB.prepare(
      `insert into product
        (id, slug, name, status, featured, use_cases, created_at, updated_at)
       values (?, 'draft-dashboard-product', 'Draft product', 'draft', 0, '[]', ?, ?)`,
    ).bind(draftProductId, now, now),
    ...variants.map(variant =>
      env.DB.prepare(
        `insert into product_variant
          (id, product_id, sku, name, options, price_mnt, stock_quantity, active, sort_order,
           created_at, updated_at)
         values (?, ?, ?, ?, '{}', 10000, ?, ?, 0, ?, ?)`,
      ).bind(
        entityId('var', variant.value),
        variant.productId,
        `DASH-${variant.value}`,
        variant.name,
        variant.stock,
        variant.active,
        now,
        now + variant.value,
      ),
    ),
    ...orderSeeds.flatMap(orderSeed => {
      const orderId = entityId('ord', orderSeed.value)
      return [
        env.DB.prepare(
          `insert into customer_order
            (id, number, status_token_hash, status, customer_name, customer_phone, district,
             khoroo, address, subtotal_mnt, delivery_fee_mnt, total_mnt, created_at, updated_at)
           values (?, ?, ?, ?, ?, ?, 'Сүхбаатар', '1-р хороо', 'Test address', 10000, 0,
             10000, ?, ?)`,
        ).bind(
          orderId,
          `ORD-${orderSeed.value}`,
          `dashboard-token-${orderSeed.value}`,
          orderSeed.status,
          `Customer ${orderSeed.value}`,
          `990000${orderSeed.value.toString().padStart(2, '0')}`,
          orderSeed.createdAt,
          orderSeed.createdAt + 1,
        ),
        env.DB.prepare(
          `insert into order_line
            (id, order_id, product_id, variant_id, product_name, variant_name, sku, options,
             unit_price_mnt, quantity, line_total_mnt)
           values (?, ?, ?, ?, 'Active product', 'Above boundary', 'DASH-4', '{}', 10000, 1,
             10000)`,
        ).bind(entityId('line', orderSeed.value), orderId, activeProductId, entityId('var', 4)),
        env.DB.prepare(
          `insert into payment
            (id, order_id, method, status, amount_mnt, created_at, updated_at)
           values (?, ?, ?, ?, 10000, ?, ?)`,
        ).bind(
          entityId('pay', orderSeed.value),
          orderId,
          paymentMethod(orderSeed.value),
          paymentStatus(orderSeed.status),
          orderSeed.createdAt,
          orderSeed.createdAt + 1,
        ),
      ]
    }),
  ])

  return { activeProductId, now }
}

const requestDashboard = (cookie?: string) =>
  adminDashboardRoutes.handle(
    new Request('https://plugged.mn/api/admin/dashboard', {
      headers: { ...(cookie ? { cookie } : {}), origin: 'https://plugged.mn' },
    }),
  )

describe('admin dashboard route', () => {
  it('requires a currently approved real Better Auth session', async () => {
    const unauthenticated = await requestDashboard()
    const session = await createAdminSession(false)
    const unapproved = await requestDashboard(session.cookie)

    await env.DB.prepare('update user set approved = true, updated_at = ? where id = ?')
      .bind(Date.now(), session.userId)
      .run()
    const approved = await requestDashboard(session.cookie)

    expect(unauthenticated.status).toBe(401)
    expect(await unauthenticated.json()).toEqual({ _tag: 'Unauthenticated' })
    expect(unapproved.status).toBe(403)
    expect(await unapproved.json()).toEqual({ _tag: 'ApprovalRequired' })
    expect(approved.status).toBe(200)
    expect(Result.deserialize<AdminDashboard, never>(await approved.json())).toMatchObject({
      status: 'ok',
      value: {
        summary: {
          newOrderCount: 0,
          confirmedOrderCount: 0,
          preparingOrderCount: 0,
          deliveringOrderCount: 0,
          lowStockVariantCount: 0,
        },
        recentOrders: [],
        lowStockVariants: [],
      },
    })
    for (const response of [unauthenticated, unapproved, approved])
      expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('serializes current counts, newest orders, and active low-stock variants from D1', async () => {
    const { activeProductId, now } = await seedDashboard()
    const { cookie } = await createAdminSession(true)
    const response = await requestDashboard(cookie)
    const wireResult = await response.json()
    const expected: AdminDashboard = {
      summary: {
        newOrderCount: 3,
        confirmedOrderCount: 2,
        preparingOrderCount: 1,
        deliveringOrderCount: 1,
        lowStockVariantCount: 3,
      },
      recentOrders: [10, 9, 8, 7, 6, 5, 4, 3].map(value => expectedOrder(orderSeeds[value - 1])),
      lowStockVariants: [
        {
          productId: activeProductId,
          variantId: entityId('var', 1),
          productName: 'Active product',
          variantName: 'Out of stock',
          sku: 'DASH-1',
          stockQuantity: 0,
          updatedAt: now + 1,
        },
        {
          productId: activeProductId,
          variantId: entityId('var', 2),
          productName: 'Active product',
          variantName: 'Low one',
          sku: 'DASH-2',
          stockQuantity: 1,
          updatedAt: now + 2,
        },
        {
          productId: activeProductId,
          variantId: entityId('var', 3),
          productName: 'Active product',
          variantName: 'Low boundary',
          sku: 'DASH-3',
          stockQuantity: 3,
          updatedAt: now + 3,
        },
      ],
    }

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(wireResult).toEqual(Result.serialize(Result.ok(expected)))
    expect(Result.deserialize<AdminDashboard, never>(wireResult)).toEqual({
      status: 'ok',
      value: expected,
    })
  })
})
