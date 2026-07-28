import { useQuery } from '@tanstack/solid-query'
import { Result, ResultDeserializationError } from 'better-result'
import type { SerializedResult } from 'better-result'

export type ResultResponse<Value, Failure> = {
  data: SerializedResult<Value, Failure> | null
}

export const deserializeResult = async <Value, Failure>(
  request: Promise<ResultResponse<Value, Failure>>,
  subject: string,
) => {
  const { data } = await request
  if (data === null) throw new Error(`The ${subject} response did not include result data.`)

  const result = Result.deserialize<Value, Failure>(data)
  if (result.isOk()) return Result.ok<Value, Failure>(result.value)
  if (ResultDeserializationError.is(result.error)) throw result.error
  return Result.err<Value, Failure>(result.error)
}

export const useQueryResult = useQuery
