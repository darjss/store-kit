import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vite-plus/test'

import { createCheckoutOrder } from '~/checkout/operations'
import { confirmOrderPayment } from '~/payments/operations'

const entityId = (prefix: string, value: number) =>
  `${prefix}_${value.toString().padStart(26, '0')}`

const insertProduct = async (
  suffix: number,
  { active = true, stock = 2 }: { active?: boolean; stock?: number } = {},
) => {
  const now = Date.now()
  const productId = entityId('prod', suffix)
  const variantId = entityId('var', suffix)
  await env.DB.batch([
    env.DB.prepare(
      `insert into product
        (id, slug, name, status, featured, use_cases, created_at, updated_at)
       values (?, ?, ?, ?, 0, '[]', ?, ?)`,
    ).bind(
      productId,
      `operation-product-${suffix}`,
      'Operation Product',
      active ? 'active' : 'draft',
      now,
      now,
    ),
    env.DB.prepare(
      `insert into product_variant
        (id, product_id, sku, name, options, price_mnt, stock_quantity, active, sort_order, created_at, updated_at)
       values (?, ?, ?, 'Default', '{}', 10000, ?, ?, 0, ?, ?)`,
    ).bind(variantId, productId, `OP-${suffix}`, stock, active ? 1 : 0, now, now),
  ])
  return { productId, variantId }
}

const insertPaymentOrder = async (suffix: number, stock: number, quantity: number) => {
  const { productId, variantId } = await insertProduct(suffix, { stock })
  const now = Date.now()
  const orderId = entityId('ord', suffix)
  const paymentId = entityId('pay', suffix)
  const telegramMessageId = `message-${suffix}`
  const amountMnt = quantity * 10_000

  await env.DB.batch([
    env.DB.prepare(
      `insert into customer_order
        (id, number, status_token_hash, status, customer_name, customer_phone, district, khoroo,
         address, subtotal_mnt, delivery_fee_mnt, total_mnt, created_at, updated_at)
       values (?, ?, ?, 'new', 'Customer', '99112233', 'Сүхбаатар', '1', 'Address',
         ?, 0, ?, ?, ?)`,
    ).bind(orderId, `ORDER-${suffix}`, `hash-${suffix}`, amountMnt, amountMnt, now, now),
    env.DB.prepare(
      `insert into order_line
        (id, order_id, product_id, variant_id, product_name, variant_name, sku, options,
         unit_price_mnt, quantity, line_total_mnt)
       values (?, ?, ?, ?, 'Operation Product', 'Default', ?, '{}', 10000, ?, ?)`,
    ).bind(
      entityId('line', suffix),
      orderId,
      productId,
      variantId,
      `OP-${suffix}`,
      quantity,
      amountMnt,
    ),
    env.DB.prepare(
      `insert into payment
        (id, order_id, method, status, amount_mnt, claimed_at, telegram_message_id,
         created_at, updated_at)
       values (?, ?, 'bank_transfer', 'claimed', ?, ?, ?, ?, ?)`,
    ).bind(paymentId, orderId, amountMnt, now, telegramMessageId, now, now),
  ])

  return { orderId, variantId, amountMnt, telegramMessageId }
}

describe('commerce operations with local D1', () => {
  it('returns every current cart correction before creating an order', async () => {
    const { variantId } = await insertProduct(201, { active: false, stock: 0 })
    await env.DB.prepare(
      `insert or replace into checkout_settings
        (id, delivery_fee_mnt, bank_name, bank_account_name, bank_account_number, updated_at)
       values ('cfg_00000000000000000000000001', 5000, 'Test Bank', 'Store', '1234', ?)`,
    )
      .bind(Date.now())
      .run()

    const result = await createCheckoutOrder({
      items: [{ variantId, quantity: 1 }],
      customer: { name: 'Customer', phone: '99112233' },
      delivery: {
        district: 'Сүхбаатар',
        khoroo: '1-р хороо',
        address: 'Test address',
      },
      paymentMethod: 'bank_transfer',
    })

    expect(result).toMatchObject({
      status: 'error',
      error: {
        _tag: 'CartChanged',
        corrections: [
          { _tag: 'InactiveVariant', variantId },
          { _tag: 'InsufficientStock', variantId, availableQuantity: 0 },
        ],
      },
    })
    const persisted = await env.DB.prepare('select count(*) as count from customer_order').first<{
      count: number
    }>()
    expect(persisted?.count).toBe(0)
  })

  it('maps atomic confirmation outcomes without repeated or negative stock changes', async () => {
    const payable = await insertPaymentOrder(202, 2, 2)
    const reference = {
      paymentId: 'telegram:first',
      amountMnt: payable.amountMnt,
      method: 'bank_transfer' as const,
      telegramMessageId: payable.telegramMessageId,
    }

    const first = await confirmOrderPayment(payable.orderId, reference)
    const repeated = await confirmOrderPayment(payable.orderId, {
      ...reference,
      paymentId: 'telegram:repeated',
    })
    const paidState = await env.DB.prepare(
      `select p.status as payment_status, o.status as order_status, v.stock_quantity
       from payment p
       join customer_order o on o.id = p.order_id
       join order_line l on l.order_id = o.id
       join product_variant v on v.id = l.variant_id
       where o.id = ?`,
    )
      .bind(payable.orderId)
      .first<{ payment_status: string; order_status: string; stock_quantity: number }>()

    expect(first).toMatchObject({ status: 'ok', value: { newlyPaid: true, stockApplied: true } })
    expect(repeated).toMatchObject({
      status: 'ok',
      value: { newlyPaid: false, stockApplied: true },
    })
    expect(paidState).toEqual({
      payment_status: 'paid',
      order_status: 'confirmed',
      stock_quantity: 0,
    })

    const short = await insertPaymentOrder(203, 1, 2)
    const insufficient = await confirmOrderPayment(short.orderId, {
      paymentId: 'telegram:short',
      amountMnt: short.amountMnt,
      method: 'bank_transfer',
      telegramMessageId: short.telegramMessageId,
    })
    const shortState = await env.DB.prepare(
      `select p.status as payment_status, o.status as order_status, v.stock_quantity
       from payment p
       join customer_order o on o.id = p.order_id
       join order_line l on l.order_id = o.id
       join product_variant v on v.id = l.variant_id
       where o.id = ?`,
    )
      .bind(short.orderId)
      .first<{ payment_status: string; order_status: string; stock_quantity: number }>()

    expect(insufficient).toMatchObject({
      status: 'error',
      error: { _tag: 'InsufficientStock', variantIds: [short.variantId] },
    })
    expect(shortState).toEqual({
      payment_status: 'claimed',
      order_status: 'new',
      stock_quantity: 1,
    })
  })
})
