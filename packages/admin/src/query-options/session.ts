import { mutationOptions, queryOptions } from '@tanstack/solid-query'

import { authCommand } from '../auth-client'
import { adminSessionRoute } from '../client'

export type AdminSession =
  | { _tag: 'Unauthenticated' }
  | { _tag: 'ApprovalRequired' }
  | {
      _tag: 'AdminSession'
      user: { id: string; name: string; email: string; image: string | null }
      expiresAt: number
    }

export const adminSessionKey = ['admin', 'session'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isString = (value: unknown): value is string => typeof value === 'string'

const parseAdminSession = (value: unknown): AdminSession => {
  if (!isRecord(value) || !isString(value._tag))
    throw new Error('Malformed admin session response.')

  if (value._tag === 'Unauthenticated') return { _tag: 'Unauthenticated' }
  if (value._tag === 'ApprovalRequired') return { _tag: 'ApprovalRequired' }

  if (
    value._tag === 'AdminSession' &&
    isRecord(value.user) &&
    isString(value.user.id) &&
    isString(value.user.name) &&
    isString(value.user.email) &&
    (isString(value.user.image) || value.user.image === null) &&
    typeof value.expiresAt === 'number'
  ) {
    return {
      _tag: 'AdminSession',
      user: {
        id: value.user.id,
        name: value.user.name,
        email: value.user.email,
        image: value.user.image,
      },
      expiresAt: value.expiresAt,
    }
  }

  throw new Error('Malformed admin session response.')
}

const errorValue = (error: unknown) => (isRecord(error) && 'value' in error ? error.value : error)

const session = () =>
  queryOptions({
    queryKey: adminSessionKey,
    queryFn: async () => {
      const response = await adminSessionRoute.api.admin.session.get()
      if (response.status !== 200 && response.status !== 401 && response.status !== 403)
        throw new Error(`Unexpected admin session status: ${response.status}`)

      return parseAdminSession(response.status === 200 ? response.data : errorValue(response.error))
    },
    retry: false,
  })

const signOut = () =>
  mutationOptions({
    mutationFn: authCommand.signOut,
    onSuccess: (_data, _variables, _onMutateResult, context) => {
      context.client.setQueryData(adminSessionKey, {
        _tag: 'Unauthenticated',
      } satisfies AdminSession)
    },
  })

export const adminQuery = { session }
export const adminMutation = { signOut }
