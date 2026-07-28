import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vite-plus/test'

import { database } from './index'

const entityId = (prefix: string, value: number) =>
  `${prefix}_${value.toString().padStart(26, '0')}`

const insertProduct = async (
  suffix: number,
  {
    productStatus = 'active',
    variantActive = true,
    stockQuantity = 3,
    updatedAt = Date.now(),
  }: {
    productStatus?: 'draft' | 'active' | 'archived'
    variantActive?: boolean
    stockQuantity?: number
    updatedAt?: number
  } = {},
) => {
  const productId = entityId('prod', suffix)
  const variantId = entityId('var', suffix)
  await env.DB.batch([
    env.DB.prepare(
      `insert into product
        (id, slug, name, status, featured, use_cases, created_at, updated_at)
       values (?, ?, ?, ?, 0, '[]', ?, ?)`,
    ).bind(
      productId,
      `admin-product-${suffix}`,
      `Admin Product ${suffix}`,
      productStatus,
      updatedAt,
      updatedAt,
    ),
    env.DB.prepare(
      `insert into product_variant
        (id, product_id, sku, name, options, price_mnt, compare_at_price_mnt,
         stock_quantity, active, sort_order, created_at, updated_at)
       values (?, ?, ?, 'Default', '{}', 10000, 12000, ?, ?, 0, ?, ?)`,
    ).bind(
      variantId,
      productId,
      `ADMIN-${suffix}`,
      stockQuantity,
      variantActive,
      updatedAt,
      updatedAt,
    ),
  ])
  return { productId, variantId, updatedAt }
}

const insertOrder = async (
  suffix: number,
  status: 'new' | 'confirmed' | 'preparing' | 'delivering',
  paymentStatus: 'pending' | 'claimed' | 'paid' | 'failed',
) => {
  const now = Date.now() + suffix
  const orderId = entityId('ord', suffix)
  await env.DB.batch([
    env.DB.prepare(
      `insert into customer_order
        (id, number, status_token_hash, status, customer_name, customer_phone, district, khoroo,
         address, subtotal_mnt, delivery_fee_mnt, total_mnt, created_at, updated_at)
       values (?, ?, ?, ?, 'Admin Customer', '99112233', 'Сүхбаатар', '1', 'Address',
         10000, 0, 10000, ?, ?)`,
    ).bind(orderId, `ADMIN-ORDER-${suffix}`, `admin-hash-${suffix}`, status, now, now),
    env.DB.prepare(
      `insert into payment
        (id, order_id, method, status, amount_mnt, created_at, updated_at)
       values (?, ?, 'bank_transfer', ?, 10000, ?, ?)`,
    ).bind(entityId('pay', suffix), orderId, paymentStatus, now, now),
  ])
  return { orderId, updatedAt: now }
}

describe('admin database foundation', () => {
  it('reads operational dashboard counts and low-stock boundaries from D1', async () => {
    const low = await insertProduct(701, { stockQuantity: 3 })
    await insertProduct(702, { stockQuantity: 4 })
    await insertProduct(703, { productStatus: 'draft', stockQuantity: 0 })
    await insertOrder(701, 'new', 'pending')
    await insertOrder(702, 'confirmed', 'paid')
    await insertOrder(703, 'preparing', 'paid')
    await insertOrder(704, 'delivering', 'paid')

    const overview = await database.query.dashboard.getOverview()

    expect(overview.summary).toMatchObject({
      newOrderCount: expect.any(Number),
      confirmedOrderCount: expect.any(Number),
      preparingOrderCount: expect.any(Number),
      deliveringOrderCount: expect.any(Number),
    })
    expect(overview.lowStockVariants).toContainEqual(
      expect.objectContaining({ variantId: low.variantId, stockQuantity: 3 }),
    )
    expect(overview.lowStockVariants.map(variant => variant.variantId)).not.toContain(
      entityId('var', 702),
    )
    expect(overview.lowStockVariants.map(variant => variant.variantId)).not.toContain(
      entityId('var', 703),
    )
  })

  it('enforces catalog invariants and optimistic versions inside write predicates', async () => {
    const draft = await insertProduct(711, { productStatus: 'draft', variantActive: false })
    const activation = await database.query.catalog.updateAdminProduct({
      productId: draft.productId,
      expectedUpdatedAt: draft.updatedAt,
      status: 'active',
      updatedAt: draft.updatedAt + 1,
    })
    expect(activation.updated).toBe(false)
    expect(activation.persisted?.status).toBe('draft')

    const active = await insertProduct(712)
    const deactivation = await database.query.catalog.updateAdminVariant({
      productId: active.productId,
      variantId: active.variantId,
      expectedUpdatedAt: active.updatedAt,
      active: false,
      updatedAt: active.updatedAt + 1,
    })
    expect(deactivation.updated).toBe(false)
    expect(deactivation.persisted?.variants[0]?.active).toBe(true)

    await env.DB.prepare(
      'update product_variant set stock_quantity = 2, updated_at = ? where id = ?',
    )
      .bind(active.updatedAt + 2, active.variantId)
      .run()
    const staleStock = await database.query.catalog.updateAdminStock({
      productId: active.productId,
      variantId: active.variantId,
      expectedUpdatedAt: active.updatedAt,
      stockQuantity: 99,
      updatedAt: active.updatedAt + 3,
    })
    expect(staleStock.updated).toBe(false)
    expect(staleStock.persisted?.variants[0]).toMatchObject({
      stockQuantity: 2,
      updatedAt: active.updatedAt + 2,
    })
  })

  it('uses one conditional order transition without changing payment state', async () => {
    const confirmed = await insertOrder(721, 'confirmed', 'paid')
    const transition = await database.query.orders.updateAdminOrderStatus({
      orderId: confirmed.orderId,
      status: 'preparing',
      expectedUpdatedAt: confirmed.updatedAt,
      updatedAt: confirmed.updatedAt + 1,
    })
    expect(transition.updated).toBe(true)
    expect(transition.persisted).toMatchObject({
      status: 'preparing',
      payment: { status: 'paid' },
    })

    const claimed = await insertOrder(722, 'new', 'claimed')
    const blocked = await database.query.orders.updateAdminOrderStatus({
      orderId: claimed.orderId,
      status: 'cancelled',
      expectedUpdatedAt: claimed.updatedAt,
      updatedAt: claimed.updatedAt + 1,
    })
    expect(blocked.updated).toBe(false)
    expect(blocked.persisted).toMatchObject({
      status: 'new',
      payment: { status: 'claimed' },
    })
  })

  it('updates only the current checkout settings singleton version', async () => {
    const updatedAt = Date.now()
    await env.DB.prepare(
      `insert or replace into checkout_settings
        (id, delivery_fee_mnt, bank_name, bank_account_name, bank_account_number, updated_at)
       values ('cfg_00000000000000000000000001', 5000, 'Bank', 'Store', '001', ?)`,
    )
      .bind(updatedAt)
      .run()

    const first = await database.query.settings.updateStore({
      deliveryFeeMnt: 6000,
      bankName: 'New Bank',
      bankAccountName: 'New Store',
      bankAccountNumber: '002',
      expectedUpdatedAt: updatedAt,
      updatedAt: updatedAt + 1,
    })
    const stale = await database.query.settings.updateStore({
      deliveryFeeMnt: 9000,
      bankName: 'Stale Bank',
      bankAccountName: 'Stale Store',
      bankAccountNumber: '003',
      expectedUpdatedAt: updatedAt,
      updatedAt: updatedAt + 2,
    })

    expect(first.updated).toBe(true)
    expect(stale.updated).toBe(false)
    expect(stale.persisted).toMatchObject({ deliveryFeeMnt: 6000, bankName: 'New Bank' })
  })
})
