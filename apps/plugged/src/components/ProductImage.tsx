import { Image } from '@unpic/solid'

import { productImageFallback, productImageLayouts, productImageOptions } from './product-image'
import type { ProductImageLayout, ProductImageMetadata } from './product-image'

export function ProductImage(props: {
  image: ProductImageMetadata
  layout: ProductImageLayout
  class?: string
  priority?: boolean
}) {
  return (
    <Image
      src={props.image.url}
      alt={props.image.alt}
      width={props.image.width}
      height={props.image.height}
      layout="constrained"
      sizes={productImageLayouts[props.layout].sizes}
      breakpoints={[...productImageLayouts[props.layout].breakpoints]}
      fallback={productImageFallback(props.image.url)}
      options={productImageOptions(props.image.url)}
      operations={{ cloudflare: { quality: 80, format: 'auto', fit: 'scale-down' } }}
      loading={props.priority ? 'eager' : 'lazy'}
      priority={props.priority}
      unstyled
      class={props.class}
    />
  )
}
