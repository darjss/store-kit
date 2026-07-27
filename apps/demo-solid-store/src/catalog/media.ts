import { getStoreEnvironment } from '~/server/environment'

export const mediaUrl = (key: string) => {
  const encodedKey = key
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')
  return new URL(encodedKey, getStoreEnvironment().PUBLIC_MEDIA_BASE_URL).toString()
}
