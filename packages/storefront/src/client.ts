import { treaty } from '@elysiajs/eden'
import type { App } from '@store-kit/api'
import { Result, ResultDeserializationError } from 'better-result'
import type { SerializedResult } from 'better-result'

const origin = globalThis.location?.origin ?? 'http://localhost'

export const api = treaty<App>(origin, { throwHttpError: true })

type ResultResponse<Value, Failure> = Promise<{
  data: SerializedResult<Value, Failure> | null
}>

export const resultRequest = async <Value, Failure>(response: ResultResponse<Value, Failure>) => {
  const { data } = await response
  if (data === null) throw new Error('Eden response did not include result data.')

  const result = Result.deserialize<Value, Failure>(data)
  if (result.status === 'ok') return Result.ok<Value, Failure>(result.value)
  if (ResultDeserializationError.is(result.error)) throw result.error
  return Result.err<Value, Failure>(result.error)
}
