import { commerce } from '@store-kit/commerce'
import type {
  AdminStoreSettings,
  AdminStoreSettingsError,
  AdminStoreSettingsUpdate,
} from '@store-kit/contracts/admin-settings'
import { Result } from 'better-result'
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vite-plus/test'

import { createAdminCookie } from '~/test/admin-session'

import { adminSettingsRoutes } from './admin-settings'

const settingsId = 'cfg_00000000000000000000000001'

const entityId = (prefix: string, value: number) =>
  `${prefix}_${value.toString().padStart(26, '0')}`

const seedSettings = async () => {
  const updatedAt = Date.now() - 10_000
  await env.DB.prepare(
    `insert or replace into checkout_settings
      (id, delivery_fee_mnt, bank_name, bank_account_name, bank_account_number, updated_at)
     values (?, 5000, 'Old Bank', 'Old Store', '001', ?)`,
  )
    .bind(settingsId, updatedAt)
    .run()
  return updatedAt
}

const settingsUpdate = (expectedUpdatedAt: number): AdminStoreSettingsUpdate => ({
  deliveryFeeMnt: 7000,
  bankName: 'New Bank',
  bankAccountName: 'New Store',
  bankAccountNumber: '00042',
  expectedUpdatedAt,
})

const requestSettings = (
  method: 'GET' | 'PUT',
  options: { cookie?: string; body?: unknown } = {},
) => {
  const headers = {
    origin: 'https://plugged.mn',
    ...(options.cookie ? { cookie: options.cookie } : {}),
    ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
  }
  const init =
    method === 'GET' ? { method, headers } : { method, headers, body: JSON.stringify(options.body) }
  return adminSettingsRoutes.handle(
    new Request('https://plugged.mn/api/admin/settings/store', init),
  )
}

const seedProduct = async () => {
  const now = Date.now()
  const productId = entityId('prod', 991)
  const variantId = entityId('var', 991)
  await env.DB.batch([
    env.DB.prepare(
      `insert into product
        (id, slug, name, status, featured, use_cases, created_at, updated_at)
       values (?, 'settings-api-product', 'Settings API Product', 'active', 0, '[]', ?, ?)`,
    ).bind(productId, now, now),
    env.DB.prepare(
      `insert into product_variant
        (id, product_id, sku, name, options, price_mnt, stock_quantity, active,
         sort_order, created_at, updated_at)
       values (?, ?, 'SETTINGS-API', 'Default', '{}', 10000, 10, 1, 0, ?, ?)`,
    ).bind(variantId, productId, now, now),
  ])
  return variantId
}

const checkoutInput = (variantId: string) => ({
  items: [{ variantId, quantity: 1 }],
  customer: { name: 'Settings Customer', phone: '99112233' },
  delivery: {
    district: 'Сүхбаатар' as const,
    khoroo: '1-р хороо',
    address: 'Test address',
  },
  paymentMethod: 'bank_transfer' as const,
})

describe('admin settings API', () => {
  it('guards both methods with real Better Auth sessions and current D1 approval', async () => {
    const updatedAt = await seedSettings()
    const unapprovedCookie = await createAdminCookie(false)
    const approvedCookie = await createAdminCookie(true)
    const update = settingsUpdate(updatedAt)

    const responses = [
      await requestSettings('GET'),
      await requestSettings('GET', { cookie: unapprovedCookie }),
      await requestSettings('GET', { cookie: approvedCookie }),
      await requestSettings('PUT', { body: update }),
      await requestSettings('PUT', { cookie: unapprovedCookie, body: update }),
      await requestSettings('PUT', { cookie: approvedCookie, body: update }),
    ]

    expect(responses.map(response => response.status)).toEqual([401, 403, 200, 401, 403, 200])
    expect(await responses[0]!.json()).toEqual({ _tag: 'Unauthenticated' })
    expect(await responses[1]!.json()).toEqual({ _tag: 'ApprovalRequired' })
    expect(
      Result.deserialize<AdminStoreSettings, AdminStoreSettingsError>(await responses[2]!.json()),
    ).toMatchObject({ status: 'ok', value: { deliveryFeeMnt: 5000 } })
    expect(
      Result.deserialize<AdminStoreSettings, AdminStoreSettingsError>(await responses[5]!.json()),
    ).toMatchObject({ status: 'ok', value: { deliveryFeeMnt: 7000 } })
    for (const response of responses)
      expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('rejects negative fees and blank bank fields before persistence', async () => {
    const expectedUpdatedAt = await seedSettings()
    const cookie = await createAdminCookie(true)
    const valid = settingsUpdate(expectedUpdatedAt)
    const invalidBodies = [
      { ...valid, deliveryFeeMnt: -1 },
      { ...valid, bankName: '   ' },
      { ...valid, bankAccountName: '   ' },
      { ...valid, bankAccountNumber: '   ' },
    ]

    const responses = await Promise.all(
      invalidBodies.map(body => requestSettings('PUT', { cookie, body })),
    )

    expect(responses.map(response => response.status)).toEqual([422, 422, 422, 422])
    const persisted = await env.DB.prepare(
      `select delivery_fee_mnt, bank_name, bank_account_name, bank_account_number, updated_at
       from checkout_settings where id = ?`,
    )
      .bind(settingsId)
      .first()
    expect(persisted).toEqual({
      delivery_fee_mnt: 5000,
      bank_name: 'Old Bank',
      bank_account_name: 'Old Store',
      bank_account_number: '001',
      updated_at: expectedUpdatedAt,
    })
  })

  it('returns serialized missing-settings failures for reads and writes', async () => {
    await env.DB.prepare('delete from checkout_settings where id = ?').bind(settingsId).run()
    const cookie = await createAdminCookie(true)
    const getResponse = await requestSettings('GET', { cookie })
    const putResponse = await requestSettings('PUT', {
      cookie,
      body: settingsUpdate(Date.now()),
    })

    expect(getResponse.status).toBe(200)
    expect(putResponse.status).toBe(200)
    expect(
      Result.deserialize<AdminStoreSettings, AdminStoreSettingsError>(await getResponse.json()),
    ).toMatchObject({ status: 'error', error: { _tag: 'StoreSettingsMissing' } })
    expect(
      Result.deserialize<AdminStoreSettings, AdminStoreSettingsError>(await putResponse.json()),
    ).toMatchObject({ status: 'error', error: { _tag: 'StoreSettingsMissing' } })
  })

  it('updates and trims settings, rejects a stale version, and changes the next checkout', async () => {
    const expectedUpdatedAt = await seedSettings()
    const variantId = await seedProduct()
    const cookie = await createAdminCookie(true)
    const update = {
      ...settingsUpdate(expectedUpdatedAt),
      bankName: '  New Bank  ',
      bankAccountName: '  New Store  ',
      bankAccountNumber: '  00042  ',
    }

    const updateResponse = await requestSettings('PUT', { cookie, body: update })
    const updated = Result.deserialize<AdminStoreSettings, AdminStoreSettingsError>(
      await updateResponse.json(),
    )
    const staleResponse = await requestSettings('PUT', {
      cookie,
      body: { ...update, deliveryFeeMnt: 9000 },
    })
    const stale = Result.deserialize<AdminStoreSettings, AdminStoreSettingsError>(
      await staleResponse.json(),
    )
    const checkout = await commerce.checkout.createOrder(checkoutInput(variantId))

    expect(updateResponse.status).toBe(200)
    expect(updated).toMatchObject({
      status: 'ok',
      value: {
        deliveryFeeMnt: 7000,
        bankName: 'New Bank',
        bankAccountName: 'New Store',
        bankAccountNumber: '00042',
      },
    })
    expect(staleResponse.status).toBe(200)
    expect(stale).toMatchObject({
      status: 'error',
      error: { _tag: 'StoreSettingsConflict' },
    })
    expect(checkout).toMatchObject({
      status: 'ok',
      value: {
        nextAction: {
          type: 'bank_transfer',
          bankName: 'New Bank',
          accountName: 'New Store',
          accountNumber: '00042',
        },
      },
    })
    if (checkout.status === 'error') return

    const persisted = await env.DB.prepare(
      `select delivery_fee_mnt, total_mnt from customer_order where id = ?`,
    )
      .bind(checkout.value.orderId)
      .first()
    expect(persisted).toEqual({ delivery_fee_mnt: 7000, total_mnt: 17000 })
  })
})
