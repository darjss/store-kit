import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { authSchema, db } from '@store-kit/db'
import { createId } from '@store-kit/db/ids'
import { betterAuth } from 'better-auth'
import { env } from 'cloudflare:workers'

const rateLimitKeyPrefix = 'better-auth:rate-limit:'
const authSecrets = env.BETTER_AUTH_SECRETS.split(',').map(entry => {
  const separator = entry.indexOf(':')
  return {
    version: Number(entry.slice(0, separator)),
    value: entry.slice(separator + 1),
  }
})
const authIdEntities = {
  user: 'authUser',
  session: 'authSession',
  account: 'authAccount',
  verification: 'authVerification',
} as const

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'sqlite', schema: authSchema }),
  baseURL: env.PUBLIC_APP_URL,
  secrets: authSecrets,
  trustedOrigins: [env.PUBLIC_APP_URL],
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  account: {
    encryptOAuthTokens: true,
  },
  session: {
    storeSessionInDatabase: true,
  },
  user: {
    additionalFields: {
      approved: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
        returned: false,
      },
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    customStorage: {
      get: key =>
        env.AUTH_KV.get<{ count: number; key: string; lastRequest: number }>(
          `${rateLimitKeyPrefix}${key}`,
          'json',
        ),
      set: (key, value) =>
        env.AUTH_KV.put(`${rateLimitKeyPrefix}${key}`, JSON.stringify(value), {
          expirationTtl: 60,
        }),
    },
  },
  advanced: {
    database: {
      generateId: ({ model }) => {
        const entity = authIdEntities[model as keyof typeof authIdEntities]
        return entity ? createId(entity) : false
      },
    },
  },
})
