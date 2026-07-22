import { Result, ResultDeserializationError } from 'better-result'
import type { SerializedResult } from 'better-result'

export const deserializeResult = <Value, Failure>(serialized: SerializedResult<Value, Failure>) => {
  const result = Result.deserialize<Value, Failure>(serialized)

  if (result.isErr() && ResultDeserializationError.is(result.error)) {
    throw result.error
  }

  return result
}
