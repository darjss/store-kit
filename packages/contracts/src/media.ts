const blockedMediaHostnames = new Set(['localhost', '127.0.0.1', '[::1]'])

export const remoteMediaBaseUrl = (value: string) => {
  const url = new URL(value)

  if (url.protocol !== 'https:') {
    throw new Error('Media base URL must use HTTPS.')
  }
  if (
    blockedMediaHostnames.has(url.hostname) ||
    url.hostname.endsWith('.r2.dev') ||
    url.hostname.endsWith('.r2.cloudflarestorage.com')
  ) {
    throw new Error('Media base URL must use a remote R2 custom domain.')
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    !value.endsWith('/')
  ) {
    throw new Error('Media base URL must be an origin ending in "/".')
  }

  return url.toString()
}

export const remoteMediaUrl = (baseUrl: string, r2Key: string) => {
  if (
    !r2Key ||
    r2Key.startsWith('/') ||
    r2Key.includes('\\') ||
    r2Key.split('/').some(segment => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error('R2 media key must be a non-empty relative path.')
  }

  const encodedKey = r2Key.split('/').map(encodeURIComponent).join('/')
  return new URL(encodedKey, remoteMediaBaseUrl(baseUrl)).toString()
}
