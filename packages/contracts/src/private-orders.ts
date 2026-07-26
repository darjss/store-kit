import { Type } from 'typebox'
import type { Static } from 'typebox'

import { orderIdSchema } from './common'

export const statusTokenSchema = Type.String({ minLength: 32, maxLength: 200 })

export const privateOrderAccessSchema = Type.Object(
  {
    orderId: orderIdSchema,
    statusToken: statusTokenSchema,
  },
  { additionalProperties: false },
)

export const privateOrderErrorSchema = Type.Object(
  {
    _tag: Type.Literal('InvalidStatusToken'),
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export type PrivateOrderAccess = Static<typeof privateOrderAccessSchema>
export type PrivateOrderError = Static<typeof privateOrderErrorSchema>
