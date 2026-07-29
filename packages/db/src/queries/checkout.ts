import type { CartLineInput } from '@store-kit/contracts/cart'
import { and, eq, isNotNull, notExists } from 'drizzle-orm'

import { db } from '../client'
import { defaultCheckoutSettingsId } from '../ids'
import { productImage } from '../schema/catalog'
import { checkoutSettings, order, orderLine, payment } from '../schema/shopping'
import type { NewOrder, NewOrderLine, NewPayment } from '../schemas/shopping'
import { selectVariants } from './cart'

export type NewOrderAggregate = {
  order: NewOrder & { id: string }
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
  const clearRemovedImageSnapshots = db
    .update(orderLine)
    .set({ imageR2Key: null, imageWidth: null, imageHeight: null, imageAlt: null })
    .where(
      and(
        eq(orderLine.orderId, aggregate.order.id),
        isNotNull(orderLine.imageR2Key),
        notExists(
          db
            .select({ id: productImage.id })
            .from(productImage)
            .where(
              and(
                eq(productImage.productId, orderLine.productId),
                eq(productImage.r2Key, orderLine.imageR2Key),
              ),
            ),
        ),
      ),
    )

  await db.batch([
    db.insert(order).values(aggregate.order),
    db.insert(orderLine).values(aggregate.lines),
    clearRemovedImageSnapshots,
    db.insert(payment).values(aggregate.payment),
  ])
}

export const checkoutQuery = { findSettings, prepare, insertOrder }
