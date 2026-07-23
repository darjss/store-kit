import type { PublicImage } from '@store-kit/contracts'
import { env } from 'cloudflare:workers'

const mediaUrl = (r2Key: string) =>
  import.meta.env.DEV
    ? `/media/${r2Key.split('/').map(encodeURIComponent).join('/')}`
    : new URL(r2Key, env.PUBLIC_MEDIA_BASE_URL).toString()

export const toPublicImage = <
  T extends { r2Key: string; width: number; height: number; alt: string },
>(
  image: T,
) => {
  const { r2Key, ...metadata } = image
  return {
    ...metadata,
    url: mediaUrl(r2Key),
  } satisfies PublicImage
}
