import type { ApprovalRequired, Unauthenticated } from '@store-kit/contracts/admin'

export const unauthenticated = {
  _tag: 'Unauthenticated',
} satisfies Unauthenticated

export const approvalRequired = {
  _tag: 'ApprovalRequired',
} satisfies ApprovalRequired
