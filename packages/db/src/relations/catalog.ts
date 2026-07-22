import { defineRelations } from 'drizzle-orm'

import * as schema from '../schema/catalog'

export const catalogRelations = defineRelations(
  schema,
  ({ one, many, brand, category, product, productImage, productVariant, productVariantImage }) => ({
    brand: {
      products: many.product({ from: brand.id, to: product.brandId }),
    },
    category: {
      products: many.product({ from: category.id, to: product.categoryId }),
    },
    product: {
      brand: one.brand({ from: product.brandId, to: brand.id }),
      category: one.category({ from: product.categoryId, to: category.id }),
      images: many.productImage({ from: product.id, to: productImage.productId }),
      variants: many.productVariant({
        from: product.id,
        to: productVariant.productId,
      }),
    },
    productImage: {
      product: one.product({
        from: productImage.productId,
        to: product.id,
        optional: false,
      }),
      variants: many.productVariant({
        from: productImage.id.through(productVariantImage.imageId),
        to: productVariant.id.through(productVariantImage.variantId),
      }),
      variantLinks: many.productVariantImage({
        from: productImage.id,
        to: productVariantImage.imageId,
      }),
    },
    productVariant: {
      product: one.product({
        from: productVariant.productId,
        to: product.id,
        optional: false,
      }),
      images: many.productImage({
        from: productVariant.id.through(productVariantImage.variantId),
        to: productImage.id.through(productVariantImage.imageId),
      }),
      imageLinks: many.productVariantImage({
        from: productVariant.id,
        to: productVariantImage.variantId,
      }),
    },
    productVariantImage: {
      variant: one.productVariant({
        from: productVariantImage.variantId,
        to: productVariant.id,
        optional: false,
      }),
      image: one.productImage({
        from: productVariantImage.imageId,
        to: productImage.id,
        optional: false,
      }),
    },
  }),
)
