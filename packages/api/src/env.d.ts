declare namespace Cloudflare {
  interface Env {
    AUTH_KV: KVNamespace
    BETTER_AUTH_SECRETS: string
    DB: D1Database
    GOOGLE_CLIENT_ID: string
    GOOGLE_CLIENT_SECRET: string
    PUBLIC_APP_URL: string
    PUBLIC_MEDIA_BASE_URL: string
    TELEGRAM_WEBHOOK_SECRET: string
    TELEGRAM_ADMIN_USER_ID: string
  }
}
