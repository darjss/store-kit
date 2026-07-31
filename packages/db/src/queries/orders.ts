import type {
  AdminOrderListFilters,
  AdminOrderStatusUpdate,
} from '@store-kit/contracts/admin-orders'
import { and, count, desc, eq, exists, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

import { db } from '../client'
import { order, orderLine, payment } from '../schema/shopping'

export type OrderWithPayment = typeof order.$inferSelect & {
  lines: (typeof orderLine.$inferSelect)[]
  payment: typeof payment.$inferSelect | null
}

export const findPrivate = (
  id: string,
  statusTokenHash: string,
): Promise<OrderWithPayment | undefined> =>
  db.query.order.findFirst({
    where: { id, statusTokenHash },
    with: { lines: true, payment: true },
  })

export const findByNumber = (number: string): Promise<typeof order.$inferSelect | undefined> =>
  db.query.order.findFirst({ where: { number } })

export const findWithPayment = (id: string): Promise<OrderWithPayment | undefined> =>
  db.query.order.findFirst({ where: { id }, with: { lines: true, payment: true } })

export const listAdminOrders = async (filters: AdminOrderListFilters = {}) => {
  const limit = Math.min(filters.limit ?? 24, 100)
  const offset = filters.offset ?? 0
  const conditions: SQL[] = []

  if (filters.status) conditions.push(eq(order.status, filters.status))
  if (filters.paymentStatus) conditions.push(eq(payment.status, filters.paymentStatus))
  if (filters.query) {
    const search = `%${filters.query
      .toLowerCase()
      .replaceAll('\\', '\\\\')
      .replaceAll('%', '\\%')
      .replaceAll('_', '\\_')}%`
    conditions.push(sql`(
      lower(${order.number}) like ${search} escape '\\'
      or lower(${order.customerName}) like ${search} escape '\\'
      or lower(${order.customerPhone}) like ${search} escape '\\'
    )`)
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined
  const list = db
    .select({
      id: sql<string>`${order.id}`.as('admin_order_id'),
      number: sql<string>`${order.number}`.as('admin_order_number'),
      customerName: sql<string>`${order.customerName}`.as('admin_customer_name'),
      customerPhone: sql<string>`${order.customerPhone}`.as('admin_customer_phone'),
      status: sql<(typeof order.$inferSelect)['status']>`${order.status}`.as('admin_order_status'),
      paymentMethod: sql<(typeof payment.$inferSelect)['method']>`${payment.method}`.as(
        'admin_payment_method',
      ),
      paymentStatus: sql<(typeof payment.$inferSelect)['status']>`${payment.status}`.as(
        'admin_payment_status',
      ),
      lineCount: sql<number>`(
        select count(*) from ${orderLine} where ${orderLine.orderId} = ${order.id}
      )`.as('admin_line_count'),
      totalMnt: sql<number>`${order.totalMnt}`.as('admin_total_mnt'),
      createdAt: sql<number>`${order.createdAt}`.as('admin_created_at'),
      updatedAt: sql<number>`${order.updatedAt}`.as('admin_updated_at'),
    })
    .from(order)
    .innerJoin(payment, eq(payment.orderId, order.id))
    .where(where)
    .orderBy(desc(order.createdAt), desc(order.id))
    .limit(limit)
    .offset(offset)
  const total = db
    .select({ value: count() })
    .from(order)
    .innerJoin(payment, eq(payment.orderId, order.id))
    .where(where)
  const [items, totalRows] = await db.batch([list, total])

  return { items, total: totalRows[0]?.value ?? 0, limit, offset }
}

export type AdminOrderStatusWrite = AdminOrderStatusUpdate & {
  orderId: string
  updatedAt: number
}

export const updateAdminOrderStatus = async (input: AdminOrderStatusWrite) => {
  const pendingOrFailedPayment = db
    .select({ value: sql`1` })
    .from(payment)
    .where(
      and(
        eq(payment.orderId, order.id),
        eq(payment.method, 'bank_transfer'),
        or(eq(payment.status, 'pending'), eq(payment.status, 'failed')),
      ),
    )
  const allowedTransition = or(
    and(
      eq(order.status, 'new'),
      eq(sql`${input.status}`, 'cancelled'),
      exists(pendingOrFailedPayment),
    ),
    and(eq(order.status, 'confirmed'), eq(sql`${input.status}`, 'preparing')),
    and(eq(order.status, 'preparing'), eq(sql`${input.status}`, 'delivering')),
    and(eq(order.status, 'delivering'), eq(sql`${input.status}`, 'completed')),
  )
  const update = db
    .update(order)
    .set({ status: input.status, updatedAt: input.updatedAt })
    .where(
      and(
        eq(order.id, input.orderId),
        eq(order.updatedAt, input.expectedUpdatedAt),
        allowedTransition,
      ),
    )
    .returning({ id: order.id })
  const inspect = db.query.order.findFirst({
    where: { id: input.orderId },
    with: { lines: true, payment: true },
  })
  const [updated, persisted] = await db.batch([update, inspect])
  return { updated: updated.length === 1, persisted }
}

export const orderQuery = {
  findPrivate,
  findByNumber,
  findWithPayment,
  listAdminOrders,
  updateAdminOrderStatus,
}
