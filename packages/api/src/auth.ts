import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { authSchema, db } from '@store-kit/db'
import { createId } from '@store-kit/db/ids'
import { betterAuth } from 'better-auth'
import { env } from 'cloudflare:workers'

const keyPrefix = 'better-auth:'
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
  secondaryStorage: {
    get: key => env.AUTH_KV.get(`${keyPrefix}${key}`),
    delete: key => env.AUTH_KV.delete(`${keyPrefix}${key}`),
    set: (key, value, ttl) =>
      env.AUTH_KV.put(
        `${keyPrefix}${key}`,
        value,
        ttl === undefined ? undefined : { expirationTtl: Math.max(60, Math.ceil(ttl)) },
      ),
  },
  rateLimit: {
    enabled: true,
    window: 60,
    storage: 'secondary-storage',
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
