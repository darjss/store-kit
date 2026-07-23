const productionMediaBaseUrl = 'https://media.plugged.mn/'

const isLocalUrl = (url: URL) => ['localhost', '127.0.0.1'].includes(url.hostname)

export const mediaUrl = (r2Key: string, baseUrl = productionMediaBaseUrl) => {
  if (
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname)
  )
    return `/media/${r2Key.split('/').map(encodeURIComponent).join('/')}`
  return new URL(r2Key, baseUrl).toString()
}

export const cloudflareImageTransformer = (
  source: string | URL,
  operations: { width?: number; quality?: number },
) => {
  const sourceUrl = new URL(
    source,
    typeof window === 'undefined' ? productionMediaBaseUrl : window.location.origin,
  )
  if (isLocalUrl(sourceUrl)) return sourceUrl.toString()

  const options = [
    `width=${operations.width ?? 1200}`,
    `quality=${operations.quality ?? 80}`,
    'format=auto',
    'fit=scale-down',
  ].join(',')
  return new URL(`/cdn-cgi/image/${options}${sourceUrl.pathname}`, sourceUrl.origin).toString()
}
