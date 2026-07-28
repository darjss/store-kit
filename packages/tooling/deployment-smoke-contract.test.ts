import { describe, expect, test } from 'vite-plus/test'

import {
  moshpitCutoutPath,
  moshpitHomeCopy,
  moshpitProductSlug,
  remoteCatalogImage,
  requiredMoshpitCutout,
} from './deployment-smoke-contract.ts'

const productionMediaBaseUrl = 'https://plugged.storekitcdn.darjs.dev/'

describe('Plugged production smoke contract', () => {
  test('recognizes the deployed moshpit copy and bundled hero cutout in SSR HTML', () => {
    const homeHtml = `<main><p>${moshpitHomeCopy}.</p><img src="${moshpitCutoutPath}" alt="Tangzu Wan'er 2 Red Lion"></main>`

    expect(requiredMoshpitCutout(homeHtml)).toBe(moshpitCutoutPath)
  })

  test('does not accept transformed catalog media in place of the moshpit hero cutout', () => {
    const homeHtml = `<main><p>${moshpitHomeCopy}.</p><img src="https://plugged.storekitcdn.darjs.dev/cdn-cgi/image/width=800/images/tangzu.webp" alt="Tangzu Wan'er 2 Red Lion"></main>`

    expect(() => requiredMoshpitCutout(homeHtml)).toThrow(moshpitCutoutPath)
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
