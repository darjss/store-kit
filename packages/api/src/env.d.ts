declare namespace Cloudflare {
  interface Env {
    AUTH_KV: KVNamespace
    BETTER_AUTH_SECRET: string
    DB: D1Database
    DEPLOYMENT_ENV: string
    GOOGLE_CLIENT_ID: string
    GOOGLE_CLIENT_SECRET: string
    LOCAL_ADMIN_BYPASS?: string
    IMAGES: ImagesBinding
    MEDIA: R2Bucket
    PUBLIC_APP_URL: string
    PUBLIC_MEDIA_BASE_URL: string
    TELEGRAM_WEBHOOK_SECRET: string
    TELEGRAM_ADMIN_USER_ID: string
  }
}
