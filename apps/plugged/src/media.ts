import { env } from 'cloudflare:workers'

const mediaHeaders = (object: R2Object) => {
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  return headers
}

const mediaKey = (request: Request) => {
  const encodedKey = new URL(request.url).pathname.slice('/media/'.length)

  try {
    return decodeURIComponent(encodedKey)
  } catch {
    return undefined
  }
}

export const handleMediaRequest = async (request: Request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } })
  }

  const key = mediaKey(request)

  if (!key) {
    return new Response(null, { status: 404 })
  }

  if (request.method === 'HEAD') {
    const object = await env.MEDIA.head(key)
    return object
      ? new Response(null, { headers: mediaHeaders(object) })
      : new Response(null, { status: 404 })
  }

  const object = await env.MEDIA.get(key)

  return object
    ? new Response(object.body, { headers: mediaHeaders(object) })
    : new Response(null, { status: 404 })
}
