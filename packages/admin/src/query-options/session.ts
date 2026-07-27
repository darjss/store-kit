import { parseAdminSessionResponse } from '@store-kit/contracts/admin'
import type { AdminSessionResponse } from '@store-kit/contracts/admin'
import { mutationOptions, queryOptions } from '@tanstack/solid-query'

import { authCommand } from '../auth-client'
import { api } from '../client'

export const adminSessionKey = ['admin', 'session'] as const

const errorValue = (error: unknown) =>
  typeof error === 'object' && error !== null && 'value' in error ? error.value : error

const session = () =>
  queryOptions({
    queryKey: adminSessionKey,
    queryFn: async () => {
      const response = await api.api.admin.session.get()
      if (response.status !== 200 && response.status !== 401 && response.status !== 403)
        throw new Error(`Unexpected admin session status: ${response.status}`)

      return parseAdminSessionResponse(
        response.status === 200 ? response.data : errorValue(response.error),
      )
    },
    retry: false,
  })

const signOut = () =>
  mutationOptions({
    mutationFn: authCommand.signOut,
    onSuccess: (_data, _variables, _onMutateResult, context) => {
      context.client.setQueryData(adminSessionKey, {
        _tag: 'Unauthenticated',
      } satisfies AdminSessionResponse)
    },
  })

export const adminQuery = { session }
export const adminMutation = { signOut }
