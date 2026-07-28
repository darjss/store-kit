import { commerce } from '@store-kit/commerce'
import { Result } from 'better-result'

import { createApprovedAdminRoutes } from './approved-admin'

export const adminDashboardRoutes = createApprovedAdminRoutes().get('/dashboard', async () =>
  Result.serialize(await commerce.dashboard.getOverview()),
)
