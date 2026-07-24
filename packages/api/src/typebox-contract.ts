import { t, ValidationError } from 'elysia'
import type { Static, TSchema } from 'typebox'
import { Value } from 'typebox/value'

export const contractBody = <Schema extends TSchema>(
  schema: Schema,
  normalize: (value: unknown) => unknown = value => value,
) =>
  t
    .Transform(t.Unknown())
    .Decode((value): Static<Schema> => {
      const normalized = normalize(value)
      if (!Value.Check(schema, normalized))
        throw new ValidationError(
          'body',
          t.Never({ error: 'Request body does not match the shared contract.' }),
          normalized,
        )
      return Value.Parse(schema, normalized)
    })
    .Encode(value => value)
