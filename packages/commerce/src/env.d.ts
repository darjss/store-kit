declare namespace Cloudflare {
  interface Env {
    CACHE: KVNamespace
    QPAY_USERNAME: string
    QPAY_PASSWORD: string
    QPAY_INVOICE_CODE: string
    QPAY_BASE_URL?: string
    PUBLIC_APP_URL: string
    PUBLIC_MEDIA_BASE_URL: string
    MEDIA: R2Bucket
    IMAGES: ImagesBinding
    TELEGRAM_BOT_TOKEN: string
    TELEGRAM_CHAT_ID: string
  }
}
