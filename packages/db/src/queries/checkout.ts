import { db } from '../client'
import { defaultCheckoutSettingsId } from '../ids'
import { checkoutSettings, order, orderLine, payment } from '../schema/shopping'
import type { NewOrder, NewOrderLine, NewPayment } from '../schemas/shopping'

export type NewOrderAggregate = {
  order: NewOrder
  lines: NewOrderLine[]
  payment: NewPayment
}

export type CheckoutSettings = typeof checkoutSettings.$inferSelect

export const findSettings = (): Promise<CheckoutSettings | undefined> =>
  db.query.checkoutSettings.findFirst({ where: { id: defaultCheckoutSettingsId } })

export const insertOrder = async (aggregate: NewOrderAggregate) => {
  await db.batch([
    db.insert(order).values(aggregate.order),
    ...aggregate.lines.map(line => db.insert(orderLine).values(line)),
    db.insert(payment).values(aggregate.payment),
  ])
}

export const checkoutQuery = { findSettings, insertOrder }
