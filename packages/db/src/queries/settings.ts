import type { AdminStoreSettingsUpdate } from '@store-kit/contracts/admin-settings'
import { and, eq } from 'drizzle-orm'

import { db } from '../client'
import { defaultCheckoutSettingsId } from '../ids'
import { checkoutSettings } from '../schema/shopping'

export const findAdminStoreSettings = () =>
  db.query.checkoutSettings.findFirst({ where: { id: defaultCheckoutSettingsId } })

export type AdminStoreSettingsWrite = AdminStoreSettingsUpdate & { updatedAt: number }

export const updateAdminStoreSettings = async (input: AdminStoreSettingsWrite) => {
  const update = db
    .update(checkoutSettings)
    .set({
      deliveryFeeMnt: input.deliveryFeeMnt,
      bankName: input.bankName,
      bankAccountName: input.bankAccountName,
      bankAccountNumber: input.bankAccountNumber,
      updatedAt: input.updatedAt,
    })
    .where(
      and(
        eq(checkoutSettings.id, defaultCheckoutSettingsId),
        eq(checkoutSettings.updatedAt, input.expectedUpdatedAt),
      ),
    )
    .returning({ id: checkoutSettings.id })
  const inspect = db.query.checkoutSettings.findFirst({
    where: { id: defaultCheckoutSettingsId },
  })
  const [updated, persisted] = await db.batch([update, inspect])
  return { updated: updated.length === 1, persisted }
}

export const settingsQuery = {
  getStore: findAdminStoreSettings,
  updateStore: updateAdminStoreSettings,
}
