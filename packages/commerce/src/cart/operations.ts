import type {
  CartCorrection,
  CartValidationError,
  StockStatus,
  ValidatedCart,
  ValidatedCartLine,
} from '@store-kit/contracts'
import { persistedCartItemsSchema } from '@store-kit/contracts/cart'
import { query as dbQuery } from '@store-kit/db'
import { Result } from 'better-result'
import { Value } from 'typebox/value'

import {
  cartEmpty,
  changedPrice,
  duplicateCartVariant,
  inactiveVariant,
  insufficientStock,
  invalidCart,
  missingVariant,
} from './errors'

export type { CartLineInput, PersistedCartItem } from '@store-kit/contracts/cart'

const stockStatus = (quantity: number): StockStatus => {
  if (quantity === 0) return 'sold-out'
  if (quantity <= 3) return 'low-stock'
  return 'in-stock'
}

const validate = async (input: unknown) => {
  if (Array.isArray(input) && input.length === 0) {
    return Result.err<ValidatedCart, CartValidationError>(cartEmpty())
  }
  if (!Value.Check(persistedCartItemsSchema, input)) {
    return Result.err<ValidatedCart, CartValidationError>(invalidCart(input))
  }

  const duplicateVariant = input.find(
    (item, index) => input.findIndex(candidate => candidate.variantId === item.variantId) !== index,
  )
  if (duplicateVariant) {
    return Result.err<ValidatedCart, CartValidationError>(duplicateCartVariant())
  }

  const currentVariants = await dbQuery.cart.findVariants(input)
  const variantsById = new Map(currentVariants.map(variant => [variant.variantId, variant]))
  const corrections: CartCorrection[] = []
  const lines: ValidatedCartLine[] = []

  for (const item of input) {
    const variant = variantsById.get(item.variantId)
    if (!variant) {
      corrections.push(missingVariant(item.variantId))
      continue
    }

    if (!variant.active || variant.productStatus !== 'active') {
      corrections.push(inactiveVariant(item.variantId))
    }
    if (variant.stockQuantity < item.quantity) {
      corrections.push(insufficientStock(item.variantId, variant.stockQuantity))
    }
    if (variant.unitPriceMnt !== item.unitPriceMnt) {
      corrections.push(changedPrice(item.variantId, item.unitPriceMnt, variant.unitPriceMnt))
    }

    lines.push({
      variantId: variant.variantId,
      productSlug: variant.productSlug,
      productName: variant.productName,
      variantName: variant.variantName,
      sku: variant.sku,
      options: variant.options,
      imageR2Key: variant.imageR2Key,
      imageWidth: variant.imageWidth,
      imageHeight: variant.imageHeight,
      imageAlt: variant.imageAlt,
      unitPriceMnt: variant.unitPriceMnt,
      requestedQuantity: item.quantity,
      availableQuantity: variant.stockQuantity,
      stockStatus: stockStatus(variant.stockQuantity),
      lineTotalMnt: variant.unitPriceMnt * item.quantity,
    })
  }

  return Result.ok<ValidatedCart, CartValidationError>({
    lines,
    corrections,
    subtotalMnt: lines.reduce((total, line) => total + line.lineTotalMnt, 0),
  })
}

export const cartOperations = { validate }
