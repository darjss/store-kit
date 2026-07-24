import type { PublicImage } from '@store-kit/contracts'
import { remoteMediaUrl } from '@store-kit/contracts/media'
import { env } from 'cloudflare:workers'

export const publicMediaUrl = (r2Key: string) => remoteMediaUrl(env.PUBLIC_MEDIA_BASE_URL, r2Key)

export const publicImage = (image: { r2Key: string; width: number; height: number; alt: string }) =>
  ({
    url: publicMediaUrl(image.r2Key),
    width: image.width,
    height: image.height,
    alt: image.alt,
  }) satisfies PublicImage

export const nullablePublicImage = (image: {
  r2Key: string | null
  width: number | null
  height: number | null
  alt: string | null
}) => {
  if (image.r2Key === null || image.width === null || image.height === null || image.alt === null)
    return null

  return publicImage({
    r2Key: image.r2Key,
    width: image.width,
    height: image.height,
    alt: image.alt,
  })
}
