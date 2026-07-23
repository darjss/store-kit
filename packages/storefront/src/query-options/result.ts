import { mutationOptions, queryOptions, useMutation, useQuery } from '@tanstack/solid-query'
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

export const useMutationResult = useMutation
export const useQueryResult = useQuery

export const resultMutationOptions = <Variables, Value, Failure>(
  request: (variables: Variables) => Promise<ResultResponse<Value, Failure>>,
) =>
  mutationOptions({
    mutationFn: async (variables: Variables) => {
      const { data } = await request(variables)
      if (data === null) throw new Error('Eden response did not include result data.')

      return Result.deserialize<Value, Failure>(data).match<Result<Value, Failure>>({
        ok: value => Result.ok<Value, Failure>(value),
        err: error => {
          if (ResultDeserializationError.is(error)) throw error
          return Result.err<Value, Failure>(error)
        },
      })
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

      return Result.deserialize<WireValue, Failure>(data).match<Result<Value, Failure>>({
        ok: value => Result.ok<Value, Failure>(mapValue(value)),
        err: error => {
          if (ResultDeserializationError.is(error)) throw error
          return Result.err<Value, Failure>(error)
        },
      })
    },
  })
