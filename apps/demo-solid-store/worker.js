import { webhookApp } from '@store-kit/api'

import { handleRequest } from './dist/server/server.js'

const publicDocument = /^\/(?:$|products(?:\/[^/]+)?)\/?$/
const privateRoute = /^\/(?:checkout(?:\/|$)|orders(?:\/|$))/
const knownDocument = /^\/(?:$|products(?:\/[^/]+)?|checkout|orders\/[^/]+)\/?$/
const webhookPaths = new Set(['/api/webhooks/qpay', '/api/webhooks/telegram'])
const publicDocumentCacheTtl = 60

const withHeaders = (response, values, status = response.status) => {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) headers.delete(name)
    else headers.set(name, value)
  }
  return new Response(response.body, {
    status,
    statusText: status === response.status ? response.statusText : undefined,
    headers,
  })
}

const publicCachePolicy = response =>
  withHeaders(response, {
    'cache-control': 'public, max-age=0, must-revalidate',
    'cloudflare-cdn-cache-control':
      'public, max-age=60, stale-while-revalidate=300, stale-if-error=86400',
  })

const privateCachePolicy = response =>
  withHeaders(response, {
    'cache-control': 'private, no-store',
    'cloudflare-cdn-cache-control': undefined,
  })

const noStoreCachePolicy = response =>
  withHeaders(response, {
    'cache-control': 'no-store',
    'cloudflare-cdn-cache-control': undefined,
  })

const documentCacheKey = url => `dund:document:v1:${url.pathname}${url.search}`

const cachedDocument = async (request, env, url) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return undefined
  if (!request.headers.get('accept')?.includes('text/html')) return undefined

  const html = await env.CACHE.get(documentCacheKey(url))
  if (html === null) return undefined

  return publicCachePolicy(
    new Response(request.method === 'HEAD' ? null : html, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }),
  )
}

const storeDocument = (response, env, ctx, url) => {
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) {
    return
  }

  const copy = response.clone()
  ctx.waitUntil(
    copy
      .text()
      .then(html =>
        env.CACHE.put(documentCacheKey(url), html, { expirationTtl: publicDocumentCacheTtl }),
      ),
  )
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    const isStaticAsset = url.pathname.startsWith('/assets/') || url.pathname.startsWith('/images/')
    if (isStaticAsset && (request.method === 'GET' || request.method === 'HEAD')) {
      const asset = await env.ASSETS.fetch(request)
      return url.pathname.startsWith('/assets/')
        ? withHeaders(asset, { 'cache-control': 'public, max-age=31536000, immutable' })
        : asset
    }

    if (webhookPaths.has(url.pathname)) {
      return noStoreCachePolicy(await webhookApp.handle(request))
    }

    if (publicDocument.test(url.pathname)) {
      const cached = await cachedDocument(request, env, url)
      if (cached) return cached
    }

    const response = await handleRequest(request)
    if (!knownDocument.test(url.pathname) && url.pathname !== '/_server') {
      return noStoreCachePolicy(withHeaders(response, {}, 404))
    }
    if (url.pathname === '/_server' || privateRoute.test(url.pathname)) {
      return privateCachePolicy(response)
    }
    if (publicDocument.test(url.pathname)) {
      const publicResponse = publicCachePolicy(response)
      if (request.method === 'GET') storeDocument(publicResponse, env, ctx, url)
      return publicResponse
    }
    return noStoreCachePolicy(response)
  },
}
