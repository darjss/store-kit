import type { AdminDashboard } from '@store-kit/contracts/admin-dashboard'
import { queryOptions } from '@tanstack/solid-query'

import { deserializeResult } from './result'
import type { ResultResponse } from './result'

export const adminDashboardKey = ['admin', 'dashboard'] as const

export type AdminDashboardFailure = {
  message: string
}

export type AdminDashboardRequest = () => Promise<
  ResultResponse<AdminDashboard, AdminDashboardFailure>
>

const overview = (request: AdminDashboardRequest) =>
  queryOptions({
    queryKey: adminDashboardKey,
    queryFn: () => deserializeResult(request(), 'dashboard'),
    retry: false,
  })

export const dashboardQuery = { overview }
