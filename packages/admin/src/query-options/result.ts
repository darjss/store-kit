import { useQuery } from '@tanstack/solid-query'
import { Result, ResultDeserializationError } from 'better-result'
import type { SerializedResult } from 'better-result'

export type ResultResponse<Value, Failure> = {
  data: SerializedResult<Value, Failure> | null
  status: number
}

type AdminSessionInvalidError = Error & { adminSessionInvalid: true; status: 401 | 403 }

export const isAdminSessionInvalidError = (error: unknown): error is AdminSessionInvalidError =>
  error instanceof Error && 'adminSessionInvalid' in error && error.adminSessionInvalid === true

export const deserializeResult = async <Value, Failure>(
  request: Promise<ResultResponse<Value, Failure>>,
  subject: string,
) => {
  const { data, status } = await request
  if (status === 401 || status === 403) {
    throw Object.assign(new Error(`The admin session is no longer valid (HTTP ${status}).`), {
      adminSessionInvalid: true as const,
      status,
    })
  }
  if (data === null) throw new Error(`The ${subject} response did not include result data.`)

  const result = Result.deserialize<Value, Failure>(data)
  if (result.isOk()) return Result.ok<Value, Failure>(result.value)
  if (ResultDeserializationError.is(result.error)) throw result.error
  return Result.err<Value, Failure>(result.error)
}

export const useQueryResult = useQuery
