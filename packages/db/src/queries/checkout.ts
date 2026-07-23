import type { CartLineInput } from '@store-kit/contracts/cart'
import { eq } from 'drizzle-orm'

import { db } from '../client'
import { defaultCheckoutSettingsId } from '../ids'
import { checkoutSettings, order, orderLine, payment } from '../schema/shopping'
import type { NewOrder, NewOrderLine, NewPayment } from '../schemas/shopping'
import { selectVariants } from './cart'

export type NewOrderAggregate = {
  order: NewOrder
  lines: NewOrderLine[]
  payment: NewPayment
}

export type CheckoutSettings = typeof checkoutSettings.$inferSelect

export const findSettings = (): Promise<CheckoutSettings | undefined> =>
  db.query.checkoutSettings.findFirst({ where: { id: defaultCheckoutSettingsId } })

export const prepare = async (items: CartLineInput[]) => {
  const settings = db
    .select()
    .from(checkoutSettings)
    .where(eq(checkoutSettings.id, defaultCheckoutSettingsId))
    .limit(1)
  const [settingRows, variants] = await db.batch([settings, selectVariants(items)])
  return { settings: settingRows[0], variants }
}

export const insertOrder = async (aggregate: NewOrderAggregate) => {
  await db.batch([
    db.insert(order).values(aggregate.order),
    ...aggregate.lines.map(line => db.insert(orderLine).values(line)),
    db.insert(payment).values(aggregate.payment),
  ])
}

export const checkoutQuery = { findSettings, prepare, insertOrder }
