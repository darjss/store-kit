import { Result } from 'better-result'
import { expect, test } from 'vite-plus/test'

import { deserializeResult } from './result'

type TestFailure = { _tag: 'TestFailure'; message: string }

test('deserializes successful and expected error results with Better Result', async () => {
  const success = await deserializeResult(
    Promise.resolve({
      data: Result.serialize(Result.ok<number, TestFailure>(42)),
    }),
    'test',
  )
  const failure: TestFailure = { _tag: 'TestFailure', message: 'Expected failure' }
  const expectedError = await deserializeResult(
    Promise.resolve({
      data: Result.serialize(Result.err<number, TestFailure>(failure)),
    }),
    'test',
  )

  expect(success).toMatchObject({ status: 'ok', value: 42 })
  expect(expectedError).toMatchObject({ status: 'error', error: failure })
})

test('rejects a response without result data', async () => {
  await expect(
    deserializeResult<number, TestFailure>(Promise.resolve({ data: null }), 'test'),
  ).rejects.toThrow('The test response did not include result data.')
})
