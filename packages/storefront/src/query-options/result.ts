import { mutationOptions, queryOptions, useQuery } from '@tanstack/solid-query'
import { Result, ResultDeserializationError } from 'better-result'
import type { SerializedResult } from 'better-result'

export type ResultResponse<Value, Failure> = {
  data: SerializedResult<Value, Failure> | null
}

type ResultQueryOptions<QueryKey extends readonly unknown[], WireValue, Value, Failure> = {
  queryKey: QueryKey
  request: () => Promise<ResultResponse<WireValue, Failure>>
  mapValue: (value: WireValue) => Value
}

export const useQueryResult: typeof useQuery = useQuery

export const resultMutationOptions = <Variables, Value, Failure>(
  request: (variables: Variables) => Promise<ResultResponse<Value, Failure>>,
) =>
  mutationOptions({
    mutationFn: async (variables: Variables) => {
      const { data } = await request(variables)
      if (data === null) throw new Error('Eden response did not include result data.')

      const result = Result.deserialize<Value, Failure>(data)
      if (result.status === 'ok') return Result.ok<Value, Failure>(result.value)
      if (ResultDeserializationError.is(result.error)) throw result.error
      return Result.err<Value, Failure>(result.error)
    },
  })

export const resultQueryOptions = <
  const QueryKey extends readonly unknown[],
  WireValue,
  Value,
  Failure,
>({
  queryKey,
  request,
  mapValue,
}: ResultQueryOptions<QueryKey, WireValue, Value, Failure>) =>
  queryOptions({
    queryKey,
    queryFn: async () => {
      const { data } = await request()
      if (data === null) throw new Error('Eden response did not include result data.')

      const result = Result.deserialize<WireValue, Failure>(data)
      if (result.status === 'ok') return Result.ok<Value, Failure>(mapValue(result.value))
      if (ResultDeserializationError.is(result.error)) throw result.error
      return Result.err<Value, Failure>(result.error)
    },
  })
