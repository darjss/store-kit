import type { AdminDashboard } from '@store-kit/contracts/admin-dashboard'
import { database } from '@store-kit/db'
import { Result } from 'better-result'

export const getAdminDashboardOverview = async () =>
  Result.ok<AdminDashboard, never>(await database.query.dashboard.getOverview())

export const dashboardOperations = { getOverview: getAdminDashboardOverview }
