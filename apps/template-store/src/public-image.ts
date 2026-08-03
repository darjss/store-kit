import type { PublicImage } from '@store-kit/contracts'
import { remoteMediaUrl } from '@store-kit/contracts/media'
import { env } from 'cloudflare:workers'

export const toPublicImage = <
  T extends { r2Key: string; width: number; height: number; alt: string },
>(
  image: T,
) => {
  const { r2Key, ...metadata } = image
  return {
    ...metadata,
    url: remoteMediaUrl(env.PUBLIC_MEDIA_BASE_URL, r2Key),
  } satisfies PublicImage
}
