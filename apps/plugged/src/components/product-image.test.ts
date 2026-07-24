import { cloudflareImageTransformer } from '@store-kit/storefront/media'
import { describe, expect, test } from 'vite-plus/test'

import { productImageLayouts } from './product-image'

describe('product image delivery', () => {
  test('builds each hero candidate on the R2 custom domain without an Astro image proxy', () => {
    const source = 'https://media.plugged.mn/catalog/products/aster/graphite.webp'
    const candidates = productImageLayouts.hero.breakpoints.map(width => ({
      width,
      url: cloudflareImageTransformer(source, { width, quality: 80 }),
    }))

    expect(candidates.map(candidate => candidate.width)).toEqual([480, 768, 960, 1200])
    for (const candidate of candidates) {
      expect(candidate.url).toBe(
        `https://media.plugged.mn/cdn-cgi/image/width=${candidate.width},quality=80,format=auto,fit=scale-down/catalog/products/aster/graphite.webp`,
      )
      expect(candidate.url).not.toContain('/_image')
    }
  })

  test('keeps the direct R2 source for local development', () => {
    const source = 'http://localhost:4321/media/catalog/products/aster/graphite.webp'

    expect(cloudflareImageTransformer(source, { width: 480, quality: 80 })).toBe(source)
  })
})
