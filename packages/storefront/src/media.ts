const productionMediaBaseUrl = 'https://media.plugged.mn/'

export const mediaUrl = (r2Key: string) => {
  if (
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname)
  )
    return `/media/${r2Key.split('/').map(encodeURIComponent).join('/')}`
  return new URL(r2Key, productionMediaBaseUrl).toString()
}
