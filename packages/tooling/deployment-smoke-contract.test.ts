import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vite-plus/test'

import {
  moshpitCutoutPath,
  moshpitHomeCopy,
  moshpitProductSlug,
  remoteCatalogImage,
  requiredMoshpitCutout,
  smokeCatalogLimit,
} from './deployment-smoke-contract.ts'

const productionMediaBaseUrl = 'https://plugged.storekitcdn.darjs.dev/'
const seedPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../apps/plugged/data/catalog.seed.json',
)

describe('Plugged production smoke contract', () => {
  test('recognizes the deployed moshpit copy and bundled hero cutout in SSR HTML', () => {
    const homeHtml = `<main><p>${moshpitHomeCopy}.</p><img src="${moshpitCutoutPath}" alt="Tangzu Wan'er 2 Red Lion"></main>`

    expect(requiredMoshpitCutout(homeHtml)).toBe(moshpitCutoutPath)
  })

  test('does not accept transformed catalog media in place of the moshpit hero cutout', () => {
    const homeHtml = `<main><p>${moshpitHomeCopy}.</p><img src="https://plugged.storekitcdn.darjs.dev/cdn-cgi/image/width=800/images/tangzu.webp" alt="Tangzu Wan'er 2 Red Lion"></main>`

    expect(() => requiredMoshpitCutout(homeHtml)).toThrow(moshpitCutoutPath)
  })

  test('requests enough catalog items to include the real moshpit product', async () => {
    const seed = JSON.parse(await readFile(seedPath, 'utf8')) as { products: { slug: string }[] }

    expect(seed.products.some(product => product.slug === moshpitProductSlug)).toBe(true)
    expect(smokeCatalogLimit).toBeGreaterThanOrEqual(seed.products.length)
  })

  test('requires the moshpit catalog product and extracts its remote R2 media URL', () => {
    const imageUrl = `${productionMediaBaseUrl}products/tangzu-waner-2-red-lion/main.webp`
    const catalogText = JSON.stringify({
      items: [{ slug: moshpitProductSlug, images: [{ url: imageUrl }] }],
    })

    expect(remoteCatalogImage(catalogText, productionMediaBaseUrl)).toBe(imageUrl)
  })

  test('rejects catalog data that omits the moshpit product', () => {
    const catalogText = JSON.stringify({
      items: [
        {
          slug: 'kz-prx',
          images: [`${productionMediaBaseUrl}products/kz-prx/main.webp`],
        },
      ],
    })

    expect(() => remoteCatalogImage(catalogText, productionMediaBaseUrl)).toThrow(
      moshpitProductSlug,
    )
  })
})
