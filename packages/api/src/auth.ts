import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { authSchema, db } from '@store-kit/db'
import { createId } from '@store-kit/db/ids'
import { betterAuth } from 'better-auth'
import { env } from 'cloudflare:workers'

const rateLimitKeyPrefix = 'better-auth:rate-limit:'
const rateLimitWindowSeconds = 60
const authIdEntities = {
  user: 'authUser',
  session: 'authSession',
  account: 'authAccount',
  verification: 'authVerification',
} as const

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'sqlite', schema: authSchema }),
  baseURL: env.PUBLIC_APP_URL,
  secret: env.BETTER_AUTH_SECRET,
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
    window: rateLimitWindowSeconds,
    customStorage: {
      get: key =>
        env.AUTH_KV.get<{ count: number; key: string; lastRequest: number }>(
          `${rateLimitKeyPrefix}${key}`,
          'json',
        ),
      set: (key, value) =>
        env.AUTH_KV.put(`${rateLimitKeyPrefix}${key}`, JSON.stringify(value), {
          expirationTtl: rateLimitWindowSeconds,
        }),
    },
  },
  advanced: {
    database: {
      generateId: ({ model }) => {
        const entity = authIdEntities[model as keyof typeof authIdEntities]
        if (!entity) throw new Error(`Unsupported Better Auth model: ${model}`)
        return createId(entity)
      },
    },
  },
})
