import { Type } from 'typebox'
import type { Static } from 'typebox'
import { Value } from 'typebox/value'

export const STORE_LOCALE = 'mn-MN'
export const STORE_CURRENCY = 'MNT'

export type BetterAuthSecret = { version: number; value: string }

export const parseBetterAuthSecrets = (input: string): BetterAuthSecret[] =>
  input.split(',').map(rawEntry => {
    const entry = rawEntry.trim()
    const separator = entry.indexOf(':')
    const versionSource = entry.slice(0, separator)
    const value = entry.slice(separator + 1).trim()
    if (
      separator < 1 ||
      !/^\d+$/u.test(versionSource) ||
      !Number.isSafeInteger(Number(versionSource)) ||
      value.length < 32
    )
      throw new Error(
        'BETTER_AUTH_SECRETS must contain versioned secrets of at least 32 characters.',
      )

    return { version: Number(versionSource), value }
  })

export const storeConfigSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    publicBaseUrl: Type.String({ format: 'uri' }),
  },
  { additionalProperties: false },
)

export type StoreConfig = Static<typeof storeConfigSchema>

export const parseStoreConfig = (input: unknown) => Value.Parse(storeConfigSchema, input)
