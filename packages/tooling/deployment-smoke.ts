import { remoteMediaBaseUrl } from '@store-kit/contracts/media'

const argumentValue = (args: string[], name: string) => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

const selectedEnvironment = argumentValue(process.argv.slice(2), '--environment')
if (selectedEnvironment !== 'development' && selectedEnvironment !== 'production') {
  throw new Error('Usage: deployment-smoke.ts --environment <development|production>')
}

const appUrl = process.env.PLUGGED_SMOKE_URL?.trim()
const mediaValue = process.env.PLUGGED_MEDIA_BASE_URL?.trim()
if (!appUrl || !mediaValue) {
  throw new Error('PLUGGED_SMOKE_URL and PLUGGED_MEDIA_BASE_URL are required.')
}

const appOrigin = new URL(appUrl)
if (appOrigin.protocol !== 'https:' || appOrigin.pathname !== '/') {
  throw new Error('PLUGGED_SMOKE_URL must be an HTTPS origin ending in "/".')
}
const mediaBaseUrl = remoteMediaBaseUrl(mediaValue)
if (
  selectedEnvironment === 'production' &&
  mediaBaseUrl !== 'https://plugged.storekitcdn.darjs.dev/'
) {
  throw new Error('Production smoke must use the Plugged production media origin.')
}
if (
  selectedEnvironment === 'development' &&
  mediaBaseUrl === 'https://plugged.storekitcdn.darjs.dev/'
) {
  throw new Error('Development smoke must not use the production media origin.')
}

const get = async (path: string) => {
  const response = await fetch(new URL(path, appOrigin), { redirect: 'error' })
  if (!response.ok) throw new Error(`${path} returned ${response.status}.`)
  return response
}

await get('/api/system/status')
const catalogResponse = await get('/api/products?limit=1')
const catalogText = await catalogResponse.text()
const homeResponse = await get('/')
const homeHtml = await homeResponse.text()
const legacyMediaPath = ['/media', '/'].join('')
if (catalogText.includes(legacyMediaPath) || homeHtml.includes(legacyMediaPath)) {
  throw new Error('Smoke output contains a legacy Worker media path.')
}

const originalImage = catalogText.match(
  new RegExp(`${mediaBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"\\\\]+`),
)?.[0]
if (!originalImage) throw new Error('Catalog response contains no selected remote R2 image.')

const transformedImage = homeHtml
  .replaceAll('&amp;', '&')
  .match(/https:\/\/[^"' ]+\/cdn-cgi\/image\/[^"' ]+/)?.[0]
if (!transformedImage) throw new Error('Home HTML contains no Cloudflare image transformation.')

const imageResponses = await Promise.all(
  (
    [
      ['R2 custom-domain image', originalImage],
      ['Cloudflare transformed image', transformedImage],
    ] as const
  ).map(async ([label, url]) => ({
    label,
    response: await fetch(url, { method: 'HEAD', redirect: 'error' }),
  })),
)
for (const { label, response } of imageResponses) {
  if (!response.ok) throw new Error(`${label} returned ${response.status}.`)
  if (label === 'R2 custom-domain image' && !response.headers.has('cache-control')) {
    throw new Error('R2 custom-domain image is missing Cache-Control.')
  }
}

const removedRoute = await fetch(new URL(`${legacyMediaPath}smoke-probe`, appOrigin), {
  redirect: 'error',
})
if (removedRoute.status !== 404) {
  throw new Error(`Removed Worker media route returned ${removedRoute.status}, expected 404.`)
}

process.stdout.write(
  `Smoke passed for ${selectedEnvironment}: ${appOrigin.toString()} using ${mediaBaseUrl}\n`,
)
