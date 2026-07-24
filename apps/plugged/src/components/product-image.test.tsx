import { render } from 'solid-js/web'
import { describe, expect, test } from 'vite-plus/test'

import { productImageLayouts } from './product-image'
import type { ProductImageLayout } from './product-image'
import { ProductImage } from './ProductImage'

const remoteImage = {
  url: 'https://plugged.storekitcdn.darjs.dev/products/product_kz-prx/2e55e0a123564da1a9a11e246dc983e0.jpg',
  width: 1200,
  height: 900,
  alt: 'KZ PRX',
}

const renderImage = (layout: ProductImageLayout, priority = false, image = remoteImage) => {
  const container = document.createElement('div')
  const dispose = render(
    () => <ProductImage image={image} layout={layout} priority={priority} />,
    container,
  )
  const output = container.innerHTML
  dispose()
  return output
}

describe('product image delivery', () => {
  test.each(['hero', 'wall', 'card', 'listingHalf', 'listingFull', 'detail', 'thumbnail'] as const)(
    'renders the configured %s responsive candidates',
    layout => {
      const output = renderImage(layout)
      const config = productImageLayouts[layout]

      expect(output).toContain(`sizes="${config.sizes}"`)
      for (const width of config.breakpoints) {
        expect(output).toContain(`width=${width}`)
        expect(output).toContain(`height=${width * 0.75}`)
        expect(output).toContain(` ${width}w`)
      }
      expect(output).toContain('quality=80')
      expect(output).toContain('fit=scale-down')
      expect(output).toContain('f=auto')
      expect(output).toContain('https://plugged.storekitcdn.darjs.dev/cdn-cgi/image/')
      expect(output).not.toContain('/_image')
    },
  )

  test('loads only a priority image eagerly', () => {
    expect(renderImage('hero', true)).toContain('loading="eager"')
    expect(renderImage('hero', true)).toContain('fetchpriority="high"')
    expect(renderImage('card')).toContain('loading="lazy"')
    expect(renderImage('card')).not.toContain('fetchpriority="high"')
  })

  test('preserves intrinsic metadata and alt text', () => {
    const output = renderImage('thumbnail')

    expect(output).toContain('width="1200"')
    expect(output).toContain('height="900"')
    expect(output).toContain('alt="KZ PRX"')
  })
})
