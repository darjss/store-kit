declare namespace Cloudflare {
  interface Env {
    QPAY_CLIENT_ID: string
    QPAY_CLIENT_SECRET: string
    QPAY_INVOICE_CODE: string
    QPAY_ENVIRONMENT: 'sandbox' | 'production'
  }
}
