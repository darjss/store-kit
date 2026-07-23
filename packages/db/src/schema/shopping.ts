import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

import { createId, defaultCheckoutSettingsId, entityIdPrefixes } from '../ids.ts'
import { product, productVariant } from './catalog'
import { typeIdCheck } from './typeid-check.ts'

export type OrderLineOptions = Record<string, string>

export const checkoutSettings = sqliteTable(
  'checkout_settings',
  {
    id: text('id')
      .notNull()
      .$defaultFn(() => defaultCheckoutSettingsId),
    deliveryFeeMnt: integer('delivery_fee_mnt').notNull(),
    bankName: text('bank_name').notNull(),
    bankAccountName: text('bank_account_name').notNull(),
    bankAccountNumber: text('bank_account_number').notNull(),
    checkoutHelpText: text('checkout_help_text'),
    orderConfirmationText: text('order_confirmation_text'),
    updatedAt: integer('updated_at').notNull(),
  },
  table => [
    primaryKey({ name: 'checkout_settings_pk', columns: [table.id] }),
    check(
      'checkout_settings_id_check',
      sql`${table.id} = ${sql.raw(`'${defaultCheckoutSettingsId}'`)}`,
    ),
    check('checkout_settings_delivery_fee_mnt_check', sql`${table.deliveryFeeMnt} >= 0`),
  ],
)

export const order = sqliteTable(
  'customer_order',
  {
    id: text('id')
      .notNull()
      .$defaultFn(() => createId('order')),
    number: text('number').notNull(),
    statusTokenHash: text('status_token_hash').notNull(),
    status: text('status', {
      enum: ['new', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled'],
    }).notNull(),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull(),
    district: text('district').notNull(),
    khoroo: text('khoroo').notNull(),
    address: text('address').notNull(),
    deliveryNotes: text('delivery_notes'),
    subtotalMnt: integer('subtotal_mnt').notNull(),
    deliveryFeeMnt: integer('delivery_fee_mnt').notNull(),
    totalMnt: integer('total_mnt').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  table => [
    primaryKey({ name: 'customer_order_pk', columns: [table.id] }),
    uniqueIndex('customer_order_number_unique').on(table.number),
    uniqueIndex('customer_order_status_token_hash_unique').on(table.statusTokenHash),
    index('customer_order_id_status_token_hash_index').on(table.id, table.statusTokenHash),
    index('customer_order_created_at_index').on(table.createdAt),
    check(
      'customer_order_status_check',
      sql`${table.status} in ('new', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled')`,
    ),
    check(
      'customer_order_money_check',
      sql`${table.subtotalMnt} >= 0 and ${table.deliveryFeeMnt} >= 0 and ${table.totalMnt} >= 0`,
    ),
    check(
      'customer_order_total_check',
      sql`${table.totalMnt} = ${table.subtotalMnt} + ${table.deliveryFeeMnt}`,
    ),
    check('customer_order_id_typeid_check', typeIdCheck(table.id, entityIdPrefixes.order)),
  ],
)

export const orderLine = sqliteTable(
  'order_line',
  {
    id: text('id')
      .notNull()
      .$defaultFn(() => createId('orderLine')),
    orderId: text('order_id')
      .notNull()
      .references(() => order.id, { onDelete: 'cascade' }),
    productId: text('product_id').references(() => product.id, { onDelete: 'set null' }),
    variantId: text('variant_id').references(() => productVariant.id, { onDelete: 'set null' }),
    productName: text('product_name').notNull(),
    variantName: text('variant_name').notNull(),
    sku: text('sku').notNull(),
    options: text('options', { mode: 'json' }).$type<OrderLineOptions>().notNull(),
    imageR2Key: text('image_r2_key'),
    imageWidth: integer('image_width'),
    imageHeight: integer('image_height'),
    imageAlt: text('image_alt'),
    unitPriceMnt: integer('unit_price_mnt').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalMnt: integer('line_total_mnt').notNull(),
  },
  table => [
    primaryKey({ name: 'order_line_pk', columns: [table.id] }),
    check('order_line_unit_price_mnt_check', sql`${table.unitPriceMnt} >= 0`),
    check('order_line_quantity_check', sql`${table.quantity} > 0`),
    check('order_line_total_mnt_check', sql`${table.lineTotalMnt} >= 0`),
    check(
      'order_line_calculated_total_check',
      sql`${table.lineTotalMnt} = ${table.unitPriceMnt} * ${table.quantity}`,
    ),
    check('order_line_id_typeid_check', typeIdCheck(table.id, entityIdPrefixes.orderLine)),
  ],
)

export const payment = sqliteTable(
  'payment',
  {
    id: text('id')
      .notNull()
      .$defaultFn(() => createId('payment')),
    orderId: text('order_id')
      .notNull()
      .references(() => order.id, { onDelete: 'cascade' }),
    method: text('method', { enum: ['qpay', 'bank_transfer'] }).notNull(),
    status: text('status', {
      enum: ['pending', 'claimed', 'confirming', 'paid', 'failed'],
    }).notNull(),
    amountMnt: integer('amount_mnt').notNull(),
    providerInvoiceId: text('provider_invoice_id'),
    providerPaymentId: text('provider_payment_id'),
    claimedAt: integer('claimed_at'),
    telegramMessageId: text('telegram_message_id'),
    paidAt: integer('paid_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  table => [
    primaryKey({ name: 'payment_pk', columns: [table.id] }),
    uniqueIndex('payment_order_id_unique').on(table.orderId),
    uniqueIndex('payment_provider_invoice_id_unique').on(table.providerInvoiceId),
    uniqueIndex('payment_provider_payment_id_unique').on(table.providerPaymentId),
    index('payment_status_index').on(table.status),
    check('payment_method_check', sql`${table.method} in ('qpay', 'bank_transfer')`),
    check(
      'payment_status_check',
      sql`${table.status} in ('pending', 'claimed', 'confirming', 'paid', 'failed')`,
    ),
    check('payment_amount_mnt_check', sql`${table.amountMnt} >= 0`),
    check('payment_id_typeid_check', typeIdCheck(table.id, entityIdPrefixes.payment)),
  ],
)
