import { Image } from '@unpic/solid/base'
import { Show } from 'solid-js'
import { generate as cloudflare } from 'unpic/providers/cloudflare'

import { productImageLayouts } from './product-image'
import type { ProductImageLayout, ProductImageMetadata } from './product-image'

export function ProductImage(props: {
  image: ProductImageMetadata
  layout: ProductImageLayout
  class?: string
  priority?: boolean
}) {
  return (
    <Show
      when={!props.image.url.startsWith('/media/')}
      fallback={
        <img
          src={props.image.url}
          alt={props.image.alt}
          width={props.image.width}
          height={props.image.height}
          sizes={productImageLayouts[props.layout].sizes}
          loading={props.priority ? 'eager' : 'lazy'}
          decoding={props.priority ? 'sync' : 'async'}
          fetchpriority={props.priority ? 'high' : 'auto'}
          class={props.class}
        />
      }
    >
      <Image
        src={props.image.url}
        alt={props.image.alt}
        width={props.image.width}
        height={props.image.height}
        layout="constrained"
        sizes={productImageLayouts[props.layout].sizes}
        breakpoints={[...productImageLayouts[props.layout].breakpoints]}
        transformer={cloudflare}
        operations={{ quality: 80, format: 'auto', fit: 'scale-down' }}
        options={{ domain: new URL(props.image.url).hostname }}
        loading={props.priority ? 'eager' : 'lazy'}
        priority={props.priority}
        unstyled
        class={props.class}
      />
    </Show>
  )
}
