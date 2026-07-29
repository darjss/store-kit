import type { AdminCatalogError, AdminCatalogProductList } from '@store-kit/contracts/admin-catalog'
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

export type AdminDashboardCatalogRequest = () => Promise<
  ResultResponse<AdminCatalogProductList, AdminCatalogError>
>

const overview = (request: AdminDashboardRequest) =>
  queryOptions({
    queryKey: adminDashboardKey,
    queryFn: () => deserializeResult(request(), 'dashboard'),
    retry: false,
  })

const catalogReadiness = (request: AdminDashboardCatalogRequest, status: 'active' | 'draft') =>
  queryOptions({
    queryKey: ['admin', 'catalog', 'list', { limit: 1, offset: 0, status }],
    queryFn: () => deserializeResult(request(), 'dashboard catalog readiness'),
    retry: false,
  })

export const dashboardQuery = { overview, catalogReadiness }
