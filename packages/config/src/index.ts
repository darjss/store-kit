import { Type } from 'typebox'
import type { Static, TSchema } from 'typebox'
import { Value } from 'typebox/value'

export const STORE_LOCALE = 'mn-MN'
export const STORE_CURRENCY = 'MNT'

const strictObject = <Properties extends Record<string, TSchema>>(properties: Properties) =>
  Type.Object(properties, { additionalProperties: false })

const hexColorSchema = Type.String({ pattern: '^#[0-9a-fA-F]{6}$' })

export const storeBrandSchema = strictObject({
  wordmark: Type.String({ minLength: 1, maxLength: 40 }),
  logoAsset: Type.Optional(Type.String({ pattern: '^/[a-z0-9][a-z0-9/_-]*\\.[a-z0-9]+$' })),
})

export const storeThemeSchema = strictObject({
  accent: hexColorSchema,
  ink: hexColorSchema,
  surface: hexColorSchema,
  radius: Type.Union([Type.Literal('sm'), Type.Literal('md'), Type.Literal('lg')]),
})

export const storeContactSchema = strictObject({
  phone: Type.Optional(Type.String({ pattern: '^\\+?[0-9][0-9 -]{6,17}$' })),
  instagram: Type.Optional(Type.String({ format: 'uri', pattern: '^https://' })),
  facebook: Type.Optional(Type.String({ format: 'uri', pattern: '^https://' })),
})

export const storeFooterSchema = strictObject({
  tagline: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
})

export const storeConfigSchema = strictObject({
  id: Type.String({ pattern: '^[a-z][a-z0-9-]*$' }),
  name: Type.String({ minLength: 1 }),
  publicBaseUrl: Type.String({ format: 'uri' }),
  brand: Type.Optional(storeBrandSchema),
  theme: Type.Optional(storeThemeSchema),
  contact: Type.Optional(storeContactSchema),
  footer: Type.Optional(storeFooterSchema),
})

export type StoreBrand = Static<typeof storeBrandSchema>
export type StoreTheme = Static<typeof storeThemeSchema>
export type StoreContact = Static<typeof storeContactSchema>
export type StoreConfig = Static<typeof storeConfigSchema>

export const parseStoreConfig = (input: unknown) => {
  if (!Value.Check(storeConfigSchema, input)) {
    const issues = [...Value.Errors(storeConfigSchema, input)].map(issue => {
      const location = `store.json${issue.instancePath || ''}`
      const extra = (issue.params as Record<string, unknown> | undefined)?.additionalProperties
      if (issue.keyword === 'additionalProperties' && Array.isArray(extra)) {
        return `unknown key at ${location}: ${extra.join(', ')}`
      }
      return `${location} ${issue.message}`.trim()
    })
    throw new Error(`Invalid store.json. ${issues.join('; ')}`)
  }
  return Value.Parse(storeConfigSchema, input)
}
