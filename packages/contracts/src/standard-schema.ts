import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Static, TSchema } from 'typebox'
import { Value } from 'typebox/value'

const decodePointerToken = (token: string) => token.replaceAll('~1', '/').replaceAll('~0', '~')

const pointerPath = (pointer: string, value: unknown) => {
  let current = value

  return pointer
    .split('/')
    .slice(1)
    .map(decodePointerToken)
    .map(token => {
      const segment = Array.isArray(current) && /^\d+$/.test(token) ? Number(token) : token

      current =
        typeof current === 'object' && current !== null ? Reflect.get(current, segment) : undefined

      return segment
    })
}

export const toStandardSchema = <const Schema extends TSchema>(
  schema: Schema,
): StandardSchemaV1<Static<Schema>> => ({
  '~standard': {
    version: 1,
    vendor: 'typebox',
    validate(value) {
      if (Value.Check(schema, value)) return { value }

      return {
        issues: Value.Errors(schema, value).map(issue => ({
          message: issue.message,
          path: pointerPath(issue.instancePath, value),
        })),
      }
    },
  },
})
