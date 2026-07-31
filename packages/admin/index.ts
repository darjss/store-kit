export type { AdminSession, AdminSessionResponse } from '@store-kit/contracts/admin'

export { AdminShell } from './src/AdminShell'
export type { AdminRoute } from './src/AdminPage'
export {
  AdminEmptyState,
  InlineAlert,
  PageHeader,
  RetryState,
  StatusBadge,
  TableSkeleton,
} from './src/components/foundation'
export type {
  AdminSemanticTone,
  StatusTone,
  TableSkeletonColumn,
} from './src/components/foundation'
export { useQueryResult } from './src/query-options/result'
export { adminMutation, adminQuery } from './src/query-options/session'
