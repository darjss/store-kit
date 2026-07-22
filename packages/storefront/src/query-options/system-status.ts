import { queryOptions } from '@tanstack/solid-query'
import { Result, ResultDeserializationError } from 'better-result'
import type { SerializedResult } from 'better-result'

import { api } from '../client'

type ResponseParts<Response> = Response extends {
  data: SerializedResult<infer Value, infer Failure> | null
}
  ? [Value, Failure]
  : never
type ResponseValue<Response> = ResponseParts<Response>[0]
type ResponseFailure<Response> = ResponseParts<Response>[1]

export const systemStatusOptions = () =>
  queryOptions({
    queryKey: ['system', 'status'],
    queryFn: async () => {
      const response = await api.api.system.status.get()
      const { data } = response
      if (data === null) throw new Error('Eden response did not include result data.')

      const result = Result.deserialize<
        ResponseValue<typeof response>,
        ResponseFailure<typeof response>
      >(data)
      if (result.status === 'ok') return Result.ok(result.value)
      if (ResultDeserializationError.is(result.error)) throw result.error
      return result
    },
  })
