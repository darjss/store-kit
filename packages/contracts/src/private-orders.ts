import { Type } from 'typebox'
import type { Static } from 'typebox'

export const privateOrderErrorSchema = Type.Object(
  {
    _tag: Type.Literal('InvalidStatusToken'),
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export type PrivateOrderError = Static<typeof privateOrderErrorSchema>
