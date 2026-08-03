import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vite-plus/test'

import { commerce } from './index'

const entityId = (prefix: string, value: number) =>
  `${prefix}_${value.toString().padStart(26, '0')}`

const insertProduct = async (suffix: number, stockQuantity = 3) => {
  const updatedAt = Date.now() - 10_000
  const productId = entityId('prod', suffix)
  const variantId = entityId('var', suffix)
  await env.DB.batch([
    env.DB.prepare(
      `insert into product
        (id, slug, name, status, featured, use_cases, created_at, updated_at)
       values (?, ?, 'Admin Commerce Product', 'active', 0, '[]', ?, ?)`,
    ).bind(productId, `admin-commerce-product-${suffix}`, updatedAt, updatedAt),
    env.DB.prepare(
      `insert into product_variant
        (id, product_id, sku, name, options, price_mnt, stock_quantity, active,
         sort_order, created_at, updated_at)
       values (?, ?, ?, 'Default', '{}', 10000, ?, 1, 0, ?, ?)`,
    ).bind(variantId, productId, `COMMERCE-${suffix}`, stockQuantity, updatedAt, updatedAt),
  ])
  return { productId, variantId, updatedAt }
}

const insertClaimedOrder = async (suffix: number, productId: string, variantId: string) => {
  const now = Date.now() - 5_000
  const orderId = entityId('ord', suffix)
  const telegramMessageId = `admin-message-${suffix}`
  await env.DB.batch([
    env.DB.prepare(
      `insert into customer_order
        (id, number, status_token_hash, status, customer_name, customer_phone, district, khoroo,
         address, subtotal_mnt, delivery_fee_mnt, total_mnt, created_at, updated_at)
       values (?, ?, ?, 'new', 'Customer', '99112233', 'Сүхбаатар', '1', 'Address',
         10000, 0, 10000, ?, ?)`,
    ).bind(orderId, `COMMERCE-ORDER-${suffix}`, `commerce-hash-${suffix}`, now, now),
    env.DB.prepare(
      `insert into order_line
        (id, order_id, product_id, variant_id, product_name, variant_name, sku, options,
         unit_price_mnt, quantity, line_total_mnt)
       values (?, ?, ?, ?, 'Admin Commerce Product', 'Default', ?, '{}', 10000, 1, 10000)`,
    ).bind(entityId('line', suffix), orderId, productId, variantId, `COMMERCE-${suffix}`),
    env.DB.prepare(
      `insert into payment
        (id, order_id, method, status, amount_mnt, claimed_at, telegram_message_id,
         created_at, updated_at)
       values (?, ?, 'bank_transfer', 'claimed', 10000, ?, ?, ?, ?)`,
    ).bind(entityId('pay', suffix), orderId, now, telegramMessageId, now, now),
  ])
  return { orderId, telegramMessageId }
}

const insertPendingOrder = async (suffix: number, method: 'qpay' | 'bank_transfer') => {
  const now = Date.now() - 5_000
  const orderId = entityId('ord', suffix)
  await env.DB.batch([
    env.DB.prepare(
      `insert into customer_order
        (id, number, status_token_hash, status, customer_name, customer_phone, district, khoroo,
         address, subtotal_mnt, delivery_fee_mnt, total_mnt, created_at, updated_at)
       values (?, ?, ?, 'new', 'Customer', '99112233', 'Сүхбаатар', '1', 'Address',
         10000, 0, 10000, ?, ?)`,
    ).bind(orderId, `PENDING-ORDER-${suffix}`, `pending-hash-${suffix}`, now, now),
    env.DB.prepare(
      `insert into payment
        (id, order_id, method, status, amount_mnt, created_at, updated_at)
       values (?, ?, ?, 'pending', 10000, ?, ?)`,
    ).bind(entityId('pay', suffix), orderId, method, now, now),
  ])
  return orderId
}

const checkoutInput = (variantId: string) => ({
  items: [{ variantId, quantity: 1 }],
  customer: { name: 'Customer', phone: '99112233' },
  delivery: {
    district: 'Сүхбаатар' as const,
    khoroo: '1-р хороо',
    address: 'Address',
  },
  paymentMethod: 'bank_transfer' as const,
})

describe('admin commerce foundation', () => {
  it('updates real settings used by the next bank-transfer checkout', async () => {
    const product = await insertProduct(801, 10)
    const updatedAt = Date.now() - 20_000
    await env.DB.prepare(
      `insert or replace into checkout_settings
        (id, delivery_fee_mnt, bank_name, bank_account_name, bank_account_number, updated_at)
       values ('cfg_00000000000000000000000001', 5000, 'Old Bank', 'Old Store', '001', ?)`,
    )
      .bind(updatedAt)
      .run()

    const settings = await commerce.settings.updateStore({
      deliveryFeeMnt: 7000,
      bankName: '  New Bank  ',
      bankAccountName: '  New Store  ',
      bankAccountNumber: '  00042  ',
      expectedUpdatedAt: updatedAt,
    })
    const checkout = await commerce.checkout.createOrder(checkoutInput(product.variantId))

    expect(settings).toMatchObject({
      status: 'ok',
      value: {
        deliveryFeeMnt: 7000,
        bankName: 'New Bank',
        bankAccountName: 'New Store',
        bankAccountNumber: '00042',
      },
    })
    expect(checkout).toMatchObject({
      status: 'ok',
      value: {
        nextAction: {
          type: 'bank_transfer',
          bankName: 'New Bank',
          accountName: 'New Store',
          accountNumber: '00042',
        },
      },
    })
    if (checkout.status === 'error') return
    const persisted = await env.DB.prepare(
      'select delivery_fee_mnt, total_mnt from customer_order where id = ?',
    )
      .bind(checkout.value.orderId)
      .first()
    expect(persisted).toEqual({ delivery_fee_mnt: 7000, total_mnt: 17000 })
  })

  it('rejects stale stock after real payment confirmation changes the variant version', async () => {
    const product = await insertProduct(811, 2)
    const payable = await insertClaimedOrder(811, product.productId, product.variantId)

    const confirmed = await commerce.payments.confirmOrderPayment(payable.orderId, {
      paymentId: 'telegram:admin-foundation',
      amountMnt: 10000,
      method: 'bank_transfer',
      telegramMessageId: payable.telegramMessageId,
    })
    const stale = await commerce.catalog.updateAdminStock(product.productId, product.variantId, {
      stockQuantity: 99,
      expectedUpdatedAt: product.updatedAt,
    })
    const persisted = await env.DB.prepare(
      'select stock_quantity, updated_at from product_variant where id = ?',
    )
      .bind(product.variantId)
      .first<{ stock_quantity: number; updated_at: number }>()

    expect(confirmed).toMatchObject({ status: 'ok', value: { newlyPaid: true } })
    expect(stale).toMatchObject({ status: 'error', error: { _tag: 'AdminCatalogConflict' } })
    expect(persisted?.stock_quantity).toBe(1)
    expect(persisted?.updated_at).toBeGreaterThan(product.updatedAt)
  })

  it('computes allowed order transitions without changing payment or stock', async () => {
    const product = await insertProduct(821, 2)
    const payable = await insertClaimedOrder(821, product.productId, product.variantId)
    await commerce.payments.confirmOrderPayment(payable.orderId, {
      paymentId: 'telegram:admin-order',
      amountMnt: 10000,
      method: 'bank_transfer',
      telegramMessageId: payable.telegramMessageId,
    })
    const detail = await commerce.orders.getAdminOrder(payable.orderId)
    expect(detail).toMatchObject({
      status: 'ok',
      value: { status: 'confirmed', allowedTransitions: ['preparing'] },
    })
    if (detail.status === 'error') return

    const transitioned = await commerce.orders.updateAdminStatus(payable.orderId, {
      status: 'preparing',
      expectedUpdatedAt: detail.value.updatedAt,
    })
    const persisted = await env.DB.prepare(
      `select o.status as order_status, p.status as payment_status, v.stock_quantity
       from customer_order o
       join payment p on p.order_id = o.id
       join order_line l on l.order_id = o.id
       join product_variant v on v.id = l.variant_id
       where o.id = ?`,
    )
      .bind(payable.orderId)
      .first()

    expect(transitioned).toMatchObject({
      status: 'ok',
      value: { status: 'preparing', allowedTransitions: ['delivering'] },
    })
    expect(persisted).toEqual({
      order_status: 'preparing',
      payment_status: 'paid',
      stock_quantity: 1,
    })
  })

  it('allows manual cancellation only for pending bank transfers', async () => {
    const qpayOrderId = await insertPendingOrder(831, 'qpay')
    const bankOrderId = await insertPendingOrder(832, 'bank_transfer')
    const qpay = await commerce.orders.getAdminOrder(qpayOrderId)
    const bank = await commerce.orders.getAdminOrder(bankOrderId)

    expect(qpay).toMatchObject({
      status: 'ok',
      value: { allowedTransitions: [] },
    })
    expect(bank).toMatchObject({
      status: 'ok',
      value: { allowedTransitions: ['cancelled'] },
    })
    if (qpay.status === 'error' || bank.status === 'error') return

    const qpayCancellation = await commerce.orders.updateAdminStatus(qpayOrderId, {
      status: 'cancelled',
      expectedUpdatedAt: qpay.value.updatedAt,
    })
    const bankCancellation = await commerce.orders.updateAdminStatus(bankOrderId, {
      status: 'cancelled',
      expectedUpdatedAt: bank.value.updatedAt,
    })

    expect(qpayCancellation).toMatchObject({
      status: 'error',
      error: { _tag: 'OrderStatusTransitionNotAllowed' },
    })
    expect(bankCancellation).toMatchObject({
      status: 'ok',
      value: { status: 'cancelled' },
    })
  })
})
