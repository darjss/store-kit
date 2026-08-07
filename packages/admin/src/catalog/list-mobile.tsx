import type { AdminCatalogProductListItem } from '@store-kit/contracts/admin-catalog'
import { Link } from '@tanstack/solid-router'
import { Image } from '@unpic/solid/base'
import { For, Show } from 'solid-js'
import { generate as cloudflare } from 'unpic/providers/cloudflare'

import { formatMnt } from '../format'

const priceRange = (product: AdminCatalogProductListItem) => {
  if (product.minimumPriceMnt === null || product.maximumPriceMnt === null)
    return 'Идэвхтэй үнэ байхгүй'
  if (product.minimumPriceMnt === product.maximumPriceMnt) return formatMnt(product.minimumPriceMnt)
  return `${formatMnt(product.minimumPriceMnt)} – ${formatMnt(product.maximumPriceMnt)}`
}

const statusLabel = (status: AdminCatalogProductListItem['status']) => {
  if (status === 'active') return 'Идэвхтэй'
  if (status === 'archived') return 'Архивласан'
  return 'Ноорог'
}

const inventoryLabel = (quantity: number) => {
  if (quantity === 0) return 'Дууссан'
  if (quantity <= 3) return `Цөөн · ${quantity}`
  return `Бэлэн · ${quantity}`
}

export function CatalogMobileList(props: { products: AdminCatalogProductListItem[] }) {
  return (
    <ul
      aria-label="Барааны жагсаалт"
      class="divide-y divide-(--border) border border-(--border) bg-card lg:hidden"
    >
      <For each={props.products}>
        {product => (
          <li>
            <Link
              class="grid min-h-24 grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-accent sm:px-4"
              params={{ productId: product.id }}
              to="/catalog/$productId"
            >
              <Show
                when={product.primaryImage}
                fallback={<div aria-hidden="true" class="size-16 border bg-muted" />}
              >
                {image => (
                  <Image
                    alt=""
                    breakpoints={[64, 128]}
                    class="size-16 bg-muted object-cover"
                    height={image().height}
                    layout="fixed"
                    operations={{ quality: 78, format: 'auto', fit: 'cover' }}
                    options={{ domain: new URL(image().url).hostname }}
                    sizes="64px"
                    src={image().url}
                    transformer={cloudflare}
                    unstyled
                    width={image().width}
                  />
                )}
              </Show>
              <div class="min-w-0">
                <div class="line-clamp-2 text-base leading-5 font-semibold">{product.name}</div>
                <div class="mt-1 text-sm font-medium tabular-nums">{priceRange(product)}</div>
                <div class="mt-1 text-sm text-muted-foreground">{statusLabel(product.status)}</div>
              </div>
              <div class="min-w-16 text-right">
                <div class="text-xs text-muted-foreground">Үлдэгдэл</div>
                <div
                  class={`mt-1 text-lg font-semibold tabular-nums ${
                    product.totalStockQuantity === 0
                      ? 'text-destructive'
                      : product.totalStockQuantity <= 3
                        ? 'text-(--admin-warning-foreground)'
                        : ''
                  }`}
                >
                  {product.totalStockQuantity}
                </div>
                <div class="mt-0.5 text-xs text-muted-foreground">
                  {inventoryLabel(product.totalStockQuantity).split(' · ')[0]}
                </div>
              </div>
            </Link>
          </li>
        )}
      </For>
    </ul>
  )
}
