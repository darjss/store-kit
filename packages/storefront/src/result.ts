import { Result, ResultDeserializationError } from 'better-result'
import type { SerializedResult } from 'better-result'

type EdenResponse<Value, Failure> = {
  data: SerializedResult<Value, Failure> | null
  error: unknown
}

export const unwrapEdenResult = <Value, Failure>(response: EdenResponse<Value, Failure>) => {
  if (response.error) throw response.error
  if (response.data === null) throw new Error('Eden response did not include result data.')

  const result = Result.deserialize<Value, Failure>(response.data)

  if (result.status === 'ok') return Result.ok<Value, Failure>(result.value)
  if (ResultDeserializationError.is(result.error)) throw result.error
  return Result.err<Value, Failure>(result.error)
}
