import { Type } from 'typebox'
import type { Static } from 'typebox'
import { Value } from 'typebox/value'

export const STORE_LOCALE = 'mn-MN'
export const STORE_CURRENCY = 'MNT'

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
