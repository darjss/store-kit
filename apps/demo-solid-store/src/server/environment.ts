import { env } from 'cloudflare:workers'
import { Type } from 'typebox'
import { Value } from 'typebox/value'

const SERVER_ONLY_MARKER = 'DUND-SERVER-ONLY-2b1948a7'

const storeEnvironmentSchema = Type.Object(
  {
    DEPLOYMENT_ENV: Type.Union([Type.Literal('development'), Type.Literal('production')]),
    PUBLIC_APP_URL: Type.String({ format: 'uri' }),
    PUBLIC_MEDIA_BASE_URL: Type.String({ format: 'uri' }),
    QPAY_BASE_URL: Type.String({ format: 'uri' }),
  },
  { additionalProperties: true },
)

export const getStoreEnvironment = () => {
  if (!Value.Check(storeEnvironmentSchema, env)) {
    throw new Error(`Invalid ДУНД Worker environment. ${SERVER_ONLY_MARKER}`)
  }
  return env
}
