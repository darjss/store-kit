import { env } from 'cloudflare:workers'

const loopbackHosts = new Set(['127.0.0.1', '::1', 'localhost'])

export const localAdminEnabled = (request: Request) => {
  const appUrl = new URL(env.PUBLIC_APP_URL)
  const requestUrl = new URL(request.url)

  return (
    env.DEPLOYMENT_ENV === 'development' &&
    env.LOCAL_ADMIN_BYPASS === 'true' &&
    loopbackHosts.has(appUrl.hostname) &&
    requestUrl.origin === appUrl.origin
  )
}

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
