import type { AdminDashboard } from '@store-kit/contracts/admin-dashboard'
import { queryOptions } from '@tanstack/solid-query'
import { Result, ResultDeserializationError } from 'better-result'
import type { Result as ResultValue, SerializedResult } from 'better-result'

export const adminDashboardKey = ['admin', 'dashboard'] as const

export type AdminDashboardFailure = {
  message: string
}

export type AdminDashboardRequest = () => Promise<{
  data: SerializedResult<AdminDashboard, AdminDashboardFailure> | null
}>

const overview = (request: AdminDashboardRequest) =>
  queryOptions({
    queryKey: adminDashboardKey,
    queryFn: async () => {
      const { data } = await request()
      if (data === null) throw new Error('The dashboard response did not include result data.')

      return Result.deserialize<AdminDashboard, AdminDashboardFailure>(data).match<
        ResultValue<AdminDashboard, AdminDashboardFailure>
      >({
        ok: value => Result.ok<AdminDashboard, AdminDashboardFailure>(value),
        err: error => {
          if (ResultDeserializationError.is(error)) throw error
          return Result.err<AdminDashboard, AdminDashboardFailure>(error)
        },
      })
    },
    retry: false,
  })

export const dashboardQuery = { overview }
