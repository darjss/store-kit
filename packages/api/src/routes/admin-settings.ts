import { commerce } from '@store-kit/commerce'
import { adminStoreSettingsUpdateSchema } from '@store-kit/contracts/admin-settings'
import { Result } from 'better-result'

import { contractBody } from '../typebox-contract'
import { createApprovedAdminRoutes } from './approved-admin'

export const adminSettingsRoutes = createApprovedAdminRoutes('/settings')
  .get('/settings/store', async () => Result.serialize(await commerce.settings.getStore()))
  .put(
    '/settings/store',
    async ({ body }) => Result.serialize(await commerce.settings.updateStore(body)),
    { body: contractBody(adminStoreSettingsUpdateSchema) },
  )
