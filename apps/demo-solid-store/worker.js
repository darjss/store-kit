import { webhookApp } from '@store-kit/api'
import { commerce } from '@store-kit/commerce'
import { catalogSlugSchema } from '@store-kit/contracts/catalog'
import { Value } from 'typebox/value'

import { handleRequest } from './dist/server/server.js'

const publicDocument = /^\/(?:$|products(?:\/[^/]+)?)\/?$/
const privateRoute = /^\/(?:checkout(?:\/|$)|orders(?:\/|$))/
const knownDocument = /^\/(?:$|products(?:\/[^/]+)?|checkout|orders\/[^/]+)\/?$/
const webhookPaths = new Set(['/api/webhooks/qpay', '/api/webhooks/telegram'])

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
    'cloudflare-cdn-cache-control': 'no-store',
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

const productRoute = pathname => {
  const match = /^\/products\/([^/]+)\/?$/.exec(pathname)
  if (!match) return { matches: false }

  try {
    const slug = decodeURIComponent(match[1])
    return Value.Check(catalogSlugSchema, slug)
      ? { matches: true, slug }
      : { matches: true, slug: undefined }
  } catch {
    return { matches: true, slug: undefined }
  }
}

const productIsMissing = async pathname => {
  const route = productRoute(pathname)
  if (!route.matches) return false
  if (!route.slug) return true
  return (await commerce.catalog.getProduct(route.slug)).status === 'error'
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    const isBuildAsset = url.pathname.startsWith('/assets/')
    const isCatalogMedia = url.pathname.startsWith('/media/')
    const isCampaignImage = url.pathname.startsWith('/images/')
    if (
      (isBuildAsset || isCatalogMedia || isCampaignImage) &&
      (request.method === 'GET' || request.method === 'HEAD')
    ) {
      const asset = await env.ASSETS.fetch(request)
      if (isBuildAsset || isCatalogMedia) {
        return withHeaders(asset, { 'cache-control': 'public, max-age=31536000, immutable' })
      }
      return withHeaders(asset, { 'cache-control': 'public, max-age=3600' })
    }

    if (webhookPaths.has(url.pathname)) {
      return noStoreCachePolicy(await webhookApp.handle(request))
    }

    const missingProduct =
      (request.method === 'GET' || request.method === 'HEAD') &&
      (await productIsMissing(url.pathname))
    const response = await handleRequest(request)

    if (!knownDocument.test(url.pathname) && url.pathname !== '/_server') {
      return noStoreCachePolicy(withHeaders(response, {}, 404))
    }
    if (missingProduct) return noStoreCachePolicy(withHeaders(response, {}, 404))
    if (url.pathname === '/_server' || privateRoute.test(url.pathname)) {
      return privateCachePolicy(response)
    }
    if (publicDocument.test(url.pathname)) return publicCachePolicy(response)
    return noStoreCachePolicy(response)
  },
}
