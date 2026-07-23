import { cloudflareImageTransformer } from '@store-kit/storefront/media'
import { transformBaseImageProps } from '@unpic/core/base'
import type { JSX } from 'solid-js'

import { productImageLayouts } from './product-image'
import type { ProductImageLayout, ProductImageMetadata } from './product-image'

export function ProductImage(props: {
  image: ProductImageMetadata
  layout: ProductImageLayout
  class?: string
  priority?: boolean
}) {
  const imageProps = () => {
    const config = productImageLayouts[props.layout]
    return transformBaseImageProps<
      { width?: number; quality?: number },
      undefined,
      JSX.ImgHTMLAttributes<HTMLImageElement>
    >({
      src: props.image.url,
      alt: props.image.alt,
      width: props.image.width,
      height: props.image.height,
      layout: 'constrained',
      sizes: config.sizes,
      breakpoints: [...config.breakpoints],
      transformer: cloudflareImageTransformer,
      operations: { quality: 80 },
      priority: props.priority,
      unstyled: true,
    })
  }

  return (
    <img
      {...imageProps()}
      width={props.image.width}
      height={props.image.height}
      class={props.class}
    />
  )
}
