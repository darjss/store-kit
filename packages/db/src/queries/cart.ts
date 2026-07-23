import type { CartLineInput } from '@store-kit/contracts/cart'
import { eq, inArray, sql } from 'drizzle-orm'

import { db } from '../client'
import { product, productImage, productVariant, productVariantImage } from '../schema/catalog'

export type CartVariant = {
  variantId: string
  productId: string
  productSlug: string
  productName: string
  productStatus: 'draft' | 'active' | 'archived'
  variantName: string
  sku: string
  options: Record<string, string>
  unitPriceMnt: number
  stockQuantity: number
  active: boolean
  imageR2Key: string | null
}

export const selectVariants = (items: CartLineInput[]) => {
  const variantIds = [...new Set(items.map(item => item.variantId))]

  return db
    .select({
      variantId: sql<string>`${productVariant.id}`.as('variant_id'),
      productId: sql<string>`${product.id}`.as('product_id'),
      productSlug: product.slug,
      productName: sql<string>`${product.name}`.as('product_name'),
      productStatus: product.status,
      variantName: sql<string>`${productVariant.name}`.as('variant_name'),
      sku: productVariant.sku,
      options: productVariant.options,
      unitPriceMnt: productVariant.priceMnt,
      stockQuantity: productVariant.stockQuantity,
      active: productVariant.active,
      imageR2Key: sql<string | null>`coalesce(
        (
          select ${productImage.r2Key} from ${productVariantImage}
          inner join ${productImage} on ${productImage.id} = ${productVariantImage.imageId}
          where ${productVariantImage.variantId} = ${productVariant.id}
          order by ${productImage.sortOrder}
          limit 1
        ),
        (
          select ${productImage.r2Key} from ${productImage}
          where ${productImage.productId} = ${product.id}
          order by ${productImage.sortOrder}
          limit 1
        )
      )`.as('image_r2_key'),
    })
    .from(productVariant)
    .innerJoin(product, eq(productVariant.productId, product.id))
    .where(inArray(productVariant.id, variantIds))
    .orderBy(productVariant.id)
}

export const findVariants = async (items: CartLineInput[]): Promise<CartVariant[]> =>
  items.length === 0 ? [] : selectVariants(items)

export const cartQuery = { findVariants }
