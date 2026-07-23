import { Image } from '@unpic/solid/base'

import { productImageLayouts, productImageOptions, productImageTransformer } from './product-image'
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
      transformer={productImageTransformer(props.image.url)}
      options={productImageOptions(props.image.url)}
      operations={{ quality: 80, format: 'auto', fit: 'scale-down' }}
      priority={props.priority}
      unstyled
      class={props.class}
    />
  )
}
