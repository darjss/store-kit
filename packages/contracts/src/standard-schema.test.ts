import type { StandardSchemaV1 } from '@standard-schema/spec'
import { Type } from 'typebox'
import { expect, expectTypeOf, test } from 'vite-plus/test'

import { toStandardSchema } from './standard-schema'

const profileSchema = Type.Object({
  name: Type.String({ minLength: 2 }),
  addresses: Type.Array(
    Type.Object({
      city: Type.String({ minLength: 1 }),
      postalCode: Type.String({ pattern: '^\\d{5}$' }),
    }),
  ),
})

test('returns the TypeBox static type for valid input', () => {
  const validator = toStandardSchema(profileSchema)
  const input: unknown = {
    name: 'Bat',
    addresses: [{ city: 'Ulaanbaatar', postalCode: '14200' }],
  }
  const result = validator['~standard'].validate(input)

  expectTypeOf(validator).toExtend<
    StandardSchemaV1<{
      name: string
      addresses: { city: string; postalCode: string }[]
    }>
  >()
  expect(result).toEqual({ value: input })
})

test('maps nested TypeBox errors to stable Standard Schema issues', () => {
  const validator = toStandardSchema(profileSchema)
  const result = validator['~standard'].validate({
    name: '',
    addresses: [
      { city: '', postalCode: 'wrong' },
      { city: 'Darkhan', postalCode: '12345' },
    ],
  })

  expect(result).toEqual({
    issues: [
      {
        message: 'must not have fewer than 2 characters',
        path: ['name'],
      },
      {
        message: 'must not have fewer than 1 characters',
        path: ['addresses', 0, 'city'],
      },
      {
        message: 'must match pattern "^\\d{5}$"',
        path: ['addresses', 0, 'postalCode'],
      },
    ],
  })
})
