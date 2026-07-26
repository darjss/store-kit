import { qpayWebhook, telegramWebhook } from '@store-kit/api'

import { handleRequest } from './dist/server/server.js'

const publicDocument = /^\/(?:$|products(?:\/[^/]+)?)$/
const privateRoute = /^\/(?:checkout|orders(?:\/|$))/
const knownDocument = /^\/(?:$|products(?:\/[^/]+)?|checkout|orders\/[^/]+)\/?$/

const setCachePolicy = (response, value, cloudflareValue) => {
  response.headers.set('cache-control', value)
  if (cloudflareValue) response.headers.set('cloudflare-cdn-cache-control', cloudflareValue)
  return response
}

const copyWithCachePolicy = (response, value) => {
  const headers = new Headers(response.headers)
  headers.set('cache-control', value)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    const isStaticAsset = url.pathname.startsWith('/assets/') || url.pathname.startsWith('/images/')
    if (isStaticAsset && (request.method === 'GET' || request.method === 'HEAD')) {
      const asset = await env.ASSETS.fetch(request)
      if (url.pathname.startsWith('/assets/')) {
        return copyWithCachePolicy(asset, 'public, max-age=31536000, immutable')
      }
      return asset
    }

    if (url.pathname === '/api/webhooks/qpay') {
      return copyWithCachePolicy(await qpayWebhook.handle(request), 'no-store')
    }
    if (url.pathname === '/api/webhooks/telegram') {
      return copyWithCachePolicy(await telegramWebhook.handle(request), 'no-store')
    }

    const response = await handleRequest(request)
    if (!knownDocument.test(url.pathname) && url.pathname !== '/_server') {
      const headers = new Headers(response.headers)
      headers.set('cache-control', 'no-store')
      return new Response(response.body, { status: 404, headers })
    }
    if (url.pathname === '/_server' || privateRoute.test(url.pathname)) {
      return setCachePolicy(response, 'private, no-store')
    }
    if (publicDocument.test(url.pathname)) {
      return setCachePolicy(
        response,
        'public, max-age=0, must-revalidate',
        'public, max-age=60, stale-while-revalidate=300, stale-if-error=86400',
      )
    }
    return setCachePolicy(response, 'no-store')
  },
}
