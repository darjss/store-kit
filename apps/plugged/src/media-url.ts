import { env } from 'cloudflare:workers'

export const publicMediaBaseUrl = import.meta.env.DEV ? '/media/' : env.PUBLIC_MEDIA_BASE_URL

export const mediaUrl = (r2Key: string) =>
  import.meta.env.DEV
    ? `/media/${r2Key.split('/').map(encodeURIComponent).join('/')}`
    : new URL(r2Key, env.PUBLIC_MEDIA_BASE_URL).toString()
