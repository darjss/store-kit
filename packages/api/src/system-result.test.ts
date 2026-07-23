import { systemOperations } from '@store-kit/commerce/system'
import type { SystemError, SystemStatus } from '@store-kit/commerce/system'
import { Result } from 'better-result'
import type { SerializedResult } from 'better-result'
import { expect, expectTypeOf, test } from 'vite-plus/test'

test('the system Result keeps both variants across serialization', () => {
  const success = Result.serialize(systemOperations.getStatus(true))
  const failure = Result.serialize(systemOperations.getStatus(false))

  expectTypeOf(success).toEqualTypeOf<SerializedResult<SystemStatus, SystemError>>()

  const deserializedSuccess = Result.deserialize<SystemStatus, SystemError>(success)
  const deserializedFailure = Result.deserialize<SystemStatus, SystemError>(failure)

  expect(deserializedSuccess).toMatchObject({
    status: 'ok',
    value: { status: 'ready' },
  })
  expect(deserializedFailure).toMatchObject({
    status: 'error',
    error: {
      _tag: 'SystemUnavailable',
      message: 'The system is unavailable.',
    },
  })
})
