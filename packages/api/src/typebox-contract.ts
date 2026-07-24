import { t, ValidationError } from 'elysia'
import type { Static, TSchema } from 'typebox'
import { Value } from 'typebox/value'

const decodeContract = <Schema extends TSchema>(
  location: 'body' | 'query',
  schema: Schema,
  value: unknown,
) => {
  const decoded = location === 'query' ? Value.Convert(schema, value) : value
  if (!Value.Check(schema, decoded))
    throw new ValidationError(
      location,
      t.Never({ error: `Request ${location} does not match the shared contract.` }),
      decoded,
    )
  return Value.Parse(schema, decoded)
}

export const contractBody = <Schema extends TSchema>(schema: Schema) =>
  t
    .Transform(t.Unknown())
    .Decode((value): Static<Schema> => decodeContract('body', schema, value))
    .Encode(value => value)

export const contractQuery = <Schema extends TSchema>(schema: Schema) =>
  t
    .Transform(t.Unknown())
    .Decode((value): Static<Schema> => decodeContract('query', schema, value))
    .Encode(value => value)
