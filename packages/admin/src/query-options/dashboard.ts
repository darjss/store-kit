import type { AdminDashboard } from '@store-kit/contracts/admin-dashboard'
import { queryOptions } from '@tanstack/solid-query'

import { api } from '../client'
import { deserializeResult } from './result'

export const adminDashboardKey = ['admin', 'dashboard'] as const

type AdminDashboardFailure = { message: string }

const overview = () =>
  queryOptions({
    queryKey: adminDashboardKey,
    queryFn: () =>
      deserializeResult<AdminDashboard, AdminDashboardFailure>(
        api.api.admin.dashboard.get(),
        'dashboard',
      ),
    retry: false,
  })

export const dashboardQuery = { overview }
