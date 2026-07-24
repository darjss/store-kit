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

export const orderQuery = { findPrivate, findByNumber, findWithPayment }
