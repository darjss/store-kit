import { Result } from 'better-result'
import type { SerializedResult } from 'better-result'

export const deserializeResult = <Value, Failure>(serialized: SerializedResult<Value, Failure>) =>
  Result.deserialize<Value, Failure>(serialized)
