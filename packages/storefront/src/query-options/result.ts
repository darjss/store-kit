import { queryOptions } from '@tanstack/solid-query'
import { Result, ResultDeserializationError } from 'better-result'
import type { SerializedResult } from 'better-result'

type ResultResponse<Value, Failure> = {
  data: SerializedResult<Value, Failure> | null
}

type ResultQueryOptions<QueryKey extends readonly unknown[], Value, Failure> = {
  queryKey: QueryKey
  request: () => Promise<ResultResponse<Value, Failure>>
}

export const resultQueryOptions = <const QueryKey extends readonly unknown[], Value, Failure>({
  queryKey,
  request,
}: ResultQueryOptions<QueryKey, Value, Failure>) =>
  queryOptions({
    queryKey,
    queryFn: async () => {
      const { data } = await request()
      if (data === null) throw new Error('Eden response did not include result data.')

      const result = Result.deserialize<Value, Failure>(data)
      if (result.status === 'ok') return Result.ok<Value, Failure>(result.value)
      if (ResultDeserializationError.is(result.error)) throw result.error
      return Result.err<Value, Failure>(result.error)
    },
  })
