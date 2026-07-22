import { Result, ResultDeserializationError } from 'better-result'
import type { SerializedResult } from 'better-result'

export const deserializeResult = <Value, Failure>(serialized: SerializedResult<Value, Failure>) => {
  const result = Result.deserialize<Value, Failure>(serialized)

  if (result.status === 'ok') return Result.ok<Value, Failure>(result.value)
  if (ResultDeserializationError.is(result.error)) throw result.error
  return Result.err<Value, Failure>(result.error)
}
