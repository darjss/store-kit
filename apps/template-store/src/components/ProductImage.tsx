import type { PublicImage } from '@store-kit/contracts'
import { Image } from '@unpic/solid/base'
import { generate as cloudflare } from 'unpic/providers/cloudflare'

import { productImageLayouts } from './product-image'
import type { ProductImageLayout } from './product-image'

export function ProductImage(props: {
  image: PublicImage
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
      layout="fixed"
      sizes={productImageLayouts[props.layout].sizes}
      breakpoints={[...productImageLayouts[props.layout].breakpoints]}
      transformer={cloudflare}
      operations={{ quality: 80, format: 'auto', fit: 'scale-down' }}
      options={{ domain: new URL(props.image.url).hostname }}
      priority={props.priority}
      unstyled
      class={props.class}
    />
  )
}
