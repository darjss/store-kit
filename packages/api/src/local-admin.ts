import { env } from 'cloudflare:workers'

export const localAdminEnabled = () =>
  env.DEPLOYMENT_ENV === 'development' && env.LOCAL_ADMIN_BYPASS === 'true'

export const localAdminSession = {
  _tag: 'AdminSession' as const,
  user: {
    id: 'local_admin',
    name: 'Local Admin',
    email: 'local@store-kit.dev',
    image: null,
  },
  expiresAt: 8_640_000_000_000_000,
}
