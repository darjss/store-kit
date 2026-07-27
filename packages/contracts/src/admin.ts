import { Type } from 'typebox'
import type { Static } from 'typebox'
import { Value } from 'typebox/value'

export const unauthenticatedSchema = Type.Object({
  _tag: Type.Literal('Unauthenticated'),
})

export const approvalRequiredSchema = Type.Object({
  _tag: Type.Literal('ApprovalRequired'),
})

export const adminSessionSchema = Type.Object({
  _tag: Type.Literal('AdminSession'),
  user: Type.Object({
    id: Type.String(),
    name: Type.String(),
    email: Type.String(),
    image: Type.Union([Type.String(), Type.Null()]),
  }),
  expiresAt: Type.Number(),
})

export const adminSessionResponseSchema = Type.Union([
  unauthenticatedSchema,
  approvalRequiredSchema,
  adminSessionSchema,
])

export type Unauthenticated = Static<typeof unauthenticatedSchema>
export type ApprovalRequired = Static<typeof approvalRequiredSchema>
export type AdminSession = Static<typeof adminSessionSchema>
export type AdminSessionResponse = Static<typeof adminSessionResponseSchema>

export const parseAdminSessionResponse = (value: unknown) =>
  Value.Parse(adminSessionResponseSchema, value)
