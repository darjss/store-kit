import { t, ValidationError } from 'elysia'
import type { Static, TSchema } from 'typebox'
import { Value } from 'typebox/value'

export const contractBody = <Schema extends TSchema>(schema: Schema) =>
  t
    .Transform(t.Unknown())
    .Decode((value): Static<Schema> => {
      if (!Value.Check(schema, value))
        throw new ValidationError(
          'body',
          t.Never({ error: 'Request body does not match the shared contract.' }),
          value,
        )
      return Value.Parse(schema, value)
    })
    .Encode(value => value)
