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

export const findVariants = async (items: CartLineInput[]): Promise<CartVariant[]> => {
  if (items.length === 0) return []
  const variantIds = [...new Set(items.map(item => item.variantId))]

  return db
    .select({
      variantId: productVariant.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      productStatus: product.status,
      variantName: productVariant.name,
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
      )`,
    })
    .from(productVariant)
    .innerJoin(product, eq(productVariant.productId, product.id))
    .where(inArray(productVariant.id, variantIds))
    .orderBy(productVariant.id)
}

export const cartQuery = { findVariants }
