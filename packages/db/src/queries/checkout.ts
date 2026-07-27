import type { CartLineInput } from '@store-kit/contracts/cart'
import type { QPayPaymentInstructions } from '@store-kit/contracts/checkout'
import { and, eq, isNull, lte, or } from 'drizzle-orm'

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
export type CheckoutRecord = typeof order.$inferSelect & {
  payment: typeof payment.$inferSelect | null
}

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

export const findByKeyHash = (checkoutKeyHash: string): Promise<CheckoutRecord | undefined> =>
  db.query.order.findFirst({ where: { checkoutKeyHash }, with: { payment: true } })

export const insertOrder = async (aggregate: NewOrderAggregate) => {
  await db.batch([
    db.insert(order).values(aggregate.order),
    db.insert(orderLine).values(aggregate.lines),
    db.insert(payment).values(aggregate.payment),
  ])
}

export const claimQPaySetup = async (
  paymentId: string,
  leaseId: string,
  claimedAt: number,
  expiresAt: number,
) => {
  const [claimed] = await db
    .update(payment)
    .set({
      providerSetupLeaseId: leaseId,
      providerSetupLeaseExpiresAt: expiresAt,
      updatedAt: claimedAt,
    })
    .where(
      and(
        eq(payment.id, paymentId),
        eq(payment.method, 'qpay'),
        eq(payment.status, 'pending'),
        isNull(payment.providerInvoiceId),
        isNull(payment.checkoutNextAction),
        or(isNull(payment.providerSetupRetryAt), lte(payment.providerSetupRetryAt, claimedAt)),
        or(
          isNull(payment.providerSetupLeaseId),
          lte(payment.providerSetupLeaseExpiresAt, claimedAt),
        ),
      ),
    )
    .returning()
  return claimed
}

export const completeQPaySetup = async (
  paymentId: string,
  leaseId: string,
  providerInvoiceId: string,
  nextAction: QPayPaymentInstructions,
  updatedAt: number,
) => {
  const [completed] = await db
    .update(payment)
    .set({
      providerInvoiceId,
      checkoutNextAction: nextAction,
      providerSetupLeaseId: null,
      providerSetupLeaseExpiresAt: null,
      providerSetupRetryAt: null,
      updatedAt,
    })
    .where(
      and(
        eq(payment.id, paymentId),
        eq(payment.method, 'qpay'),
        eq(payment.status, 'pending'),
        eq(payment.providerSetupLeaseId, leaseId),
        isNull(payment.providerInvoiceId),
        isNull(payment.checkoutNextAction),
      ),
    )
    .returning()
  return completed
}

export const releaseQPaySetup = (
  paymentId: string,
  leaseId: string,
  retryAt: number,
  updatedAt: number,
) =>
  db
    .update(payment)
    .set({
      providerSetupLeaseId: null,
      providerSetupLeaseExpiresAt: null,
      providerSetupRetryAt: retryAt,
      updatedAt,
    })
    .where(
      and(
        eq(payment.id, paymentId),
        eq(payment.providerSetupLeaseId, leaseId),
        isNull(payment.providerInvoiceId),
        isNull(payment.checkoutNextAction),
      ),
    )
    .returning()

export const checkoutQuery = {
  findSettings,
  prepare,
  findByKeyHash,
  insertOrder,
  claimQPaySetup,
  completeQPaySetup,
  releaseQPaySetup,
}
