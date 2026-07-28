import { remoteMediaBaseUrl } from '@store-kit/contracts/media'

import { pluggedDevelopmentMediaBaseUrl } from './catalog-seed-target.ts'
import {
  moshpitProductSlug,
  remoteCatalogImage,
  requiredMoshpitCutout,
} from './deployment-smoke-contract.ts'

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
if (selectedEnvironment === 'development' && mediaBaseUrl !== pluggedDevelopmentMediaBaseUrl) {
  throw new Error(`Development smoke must use ${pluggedDevelopmentMediaBaseUrl}`)
}

const get = async (path: string) => {
  const response = await fetch(new URL(path, appOrigin), { redirect: 'error' })
  if (!response.ok) throw new Error(`${path} returned ${response.status}.`)
  return response
}

await get('/api/system/status')
await Promise.all([get('/products'), get(`/products/${moshpitProductSlug}`), get('/checkout')])
const catalogResponse = await get('/api/products?limit=1')
const catalogText = await catalogResponse.text()
const homeResponse = await get('/')
const homeHtml = await homeResponse.text()
const legacyMediaPath = ['/media', '/'].join('')
if (catalogText.includes(legacyMediaPath) || homeHtml.includes(legacyMediaPath)) {
  throw new Error('Smoke output contains a legacy Worker media path.')
}

const originalImage = remoteCatalogImage(catalogText, mediaBaseUrl)
const cutoutPath = requiredMoshpitCutout(homeHtml)

const imageResponses = await Promise.all(
  (
    [
      ['R2 custom-domain image', originalImage],
      ['Bundled moshpit cutout', new URL(cutoutPath, appOrigin)],
    ] as const
  ).map(async ([label, url]) => ({
    label,
    response: await fetch(url, { redirect: 'error' }),
  })),
)
for (const { label, response } of imageResponses) {
  if (response.status !== 200) throw new Error(`${label} returned ${response.status}.`)
  if (!response.headers.get('content-type')?.startsWith('image/')) {
    throw new Error(`${label} did not return image content.`)
  }
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
