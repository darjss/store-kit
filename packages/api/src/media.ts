import type { PublicImage } from '@store-kit/contracts'
import { env } from 'cloudflare:workers'

const encodeR2Key = (r2Key: string) => r2Key.split('/').map(encodeURIComponent).join('/')
const isLocalRequest = (request: Request) =>
  ['localhost', '127.0.0.1'].includes(new URL(request.url).hostname)

export const publicMediaUrl = (r2Key: string, request: Request) => {
  if (isLocalRequest(request)) return `/media/${encodeR2Key(r2Key)}`
  return new URL(encodeR2Key(r2Key), env.PUBLIC_MEDIA_BASE_URL).toString()
}

export const publicImage = (
  image: { r2Key: string; width: number; height: number; alt: string },
  request: Request,
) =>
  ({
    url: publicMediaUrl(image.r2Key, request),
    width: image.width,
    height: image.height,
    alt: image.alt,
  }) satisfies PublicImage

export const nullablePublicImage = (
  image: {
    r2Key: string | null
    width: number | null
    height: number | null
    alt: string | null
  },
  request: Request,
) => {
  if (image.r2Key === null || image.width === null || image.height === null || image.alt === null)
    return null

  return publicImage(
    { r2Key: image.r2Key, width: image.width, height: image.height, alt: image.alt },
    request,
  )
}
