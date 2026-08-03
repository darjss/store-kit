import type { AdminDashboard } from '@store-kit/contracts/admin-dashboard'
import { and, asc, count, desc, eq, lte, sql } from 'drizzle-orm'

import { db } from '../client'
import { product, productVariant } from '../schema/catalog'
import { order, orderLine, payment } from '../schema/shopping'

const countOrdersByStatus = (status: 'new' | 'confirmed' | 'preparing' | 'delivering') =>
  db.select({ value: count() }).from(order).where(eq(order.status, status))

export const getAdminDashboardOverview = async (): Promise<AdminDashboard> => {
  const recentOrdersQuery = db
    .select({
      id: sql<string>`${order.id}`.as('order_id'),
      number: sql<string>`${order.number}`.as('order_number'),
      customerName: sql<string>`${order.customerName}`.as('customer_name'),
      customerPhone: sql<string>`${order.customerPhone}`.as('customer_phone'),
      status: sql<(typeof order.$inferSelect)['status']>`${order.status}`.as('order_status'),
      paymentMethod: sql<(typeof payment.$inferSelect)['method']>`${payment.method}`.as(
        'payment_method',
      ),
      paymentStatus: sql<(typeof payment.$inferSelect)['status']>`${payment.status}`.as(
        'payment_status',
      ),
      lineCount: sql<number>`(
        select count(*) from ${orderLine} where ${orderLine.orderId} = ${order.id}
      )`.as('line_count'),
      totalMnt: sql<number>`${order.totalMnt}`.as('order_total_mnt'),
      createdAt: sql<number>`${order.createdAt}`.as('order_created_at'),
      updatedAt: sql<number>`${order.updatedAt}`.as('order_updated_at'),
    })
    .from(order)
    .innerJoin(payment, eq(payment.orderId, order.id))
    .orderBy(desc(order.createdAt), desc(order.id))
    .limit(8)

  const lowStockConditions = and(
    eq(product.status, 'active'),
    eq(productVariant.active, true),
    lte(productVariant.stockQuantity, 3),
  )
  const lowStockCountQuery = db
    .select({ value: count() })
    .from(productVariant)
    .innerJoin(product, eq(product.id, productVariant.productId))
    .where(lowStockConditions)
  const lowStockVariantsQuery = db
    .select({
      productId: sql<string>`${product.id}`.as('low_stock_product_id'),
      variantId: sql<string>`${productVariant.id}`.as('low_stock_variant_id'),
      productName: sql<string>`${product.name}`.as('low_stock_product_name'),
      variantName: sql<string>`${productVariant.name}`.as('low_stock_variant_name'),
      sku: sql<string>`${productVariant.sku}`.as('low_stock_sku'),
      stockQuantity: sql<number>`${productVariant.stockQuantity}`.as('low_stock_quantity'),
      updatedAt: sql<number>`${productVariant.updatedAt}`.as('low_stock_updated_at'),
    })
    .from(productVariant)
    .innerJoin(product, eq(product.id, productVariant.productId))
    .where(lowStockConditions)
    .orderBy(
      asc(productVariant.stockQuantity),
      asc(product.name),
      asc(productVariant.name),
      asc(productVariant.id),
    )
    .limit(8)

  const [
    newOrders,
    confirmedOrders,
    preparingOrders,
    deliveringOrders,
    lowStock,
    recentOrders,
    lowStockVariants,
  ] = await db.batch([
    countOrdersByStatus('new'),
    countOrdersByStatus('confirmed'),
    countOrdersByStatus('preparing'),
    countOrdersByStatus('delivering'),
    lowStockCountQuery,
    recentOrdersQuery,
    lowStockVariantsQuery,
  ])

  return {
    summary: {
      newOrderCount: newOrders[0]?.value ?? 0,
      confirmedOrderCount: confirmedOrders[0]?.value ?? 0,
      preparingOrderCount: preparingOrders[0]?.value ?? 0,
      deliveringOrderCount: deliveringOrders[0]?.value ?? 0,
      lowStockVariantCount: lowStock[0]?.value ?? 0,
    },
    recentOrders,
    lowStockVariants,
  }
}

export const dashboardQuery = { getOverview: getAdminDashboardOverview }
