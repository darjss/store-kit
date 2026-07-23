import type {
  CartCorrection,
  CartValidationError,
  StockStatus,
  ValidatedCartLine,
} from '@store-kit/contracts'
import { cartValidationInputsSchema } from '@store-kit/contracts/cart'
import type { CartValidationInput } from '@store-kit/contracts/cart'
import { database } from '@store-kit/db'
import { Result } from 'better-result'
import { match } from 'dismatch'
import { Value } from 'typebox/value'

import {
  cartEmpty,
  changedPrice,
  duplicateCartVariant,
  inactiveVariant,
  insufficientStock,
  invalidCart,
  missingVariant,
} from '~/errors'

export type { CartLineInput, PersistedCartItem } from '@store-kit/contracts/cart'

const stockStatus = (quantity: number): StockStatus =>
  match(
    quantity === 0
      ? { type: 'sold-out' as const }
      : quantity <= 3
        ? { type: 'low-stock' as const }
        : { type: 'in-stock' as const },
  )({
    'sold-out': () => 'sold-out',
    'low-stock': () => 'low-stock',
    'in-stock': () => 'in-stock',
  })

type ServerValidatedCartLine = Omit<ValidatedCartLine, 'image'> & {
  imageR2Key: string | null
  imageWidth: number | null
  imageHeight: number | null
  imageAlt: string | null
}
type ServerValidatedCart = {
  lines: ServerValidatedCartLine[]
  corrections: CartCorrection[]
  subtotalMnt: number
}

const validate = async (input: CartValidationInput[]) => {
  if (input.length === 0) return Result.err<ServerValidatedCart, CartValidationError>(cartEmpty())
  if (!Value.Check(cartValidationInputsSchema, input)) {
    return Result.err<ServerValidatedCart, CartValidationError>(
      invalidCart(
        [...Value.Errors(cartValidationInputsSchema, input)].map(error => ({
          path: error.instancePath || '/',
          code: 'invalid' as const,
        })),
      ),
    )
  }

  const duplicateVariant = input.find(
    (item, index) => input.findIndex(candidate => candidate.variantId === item.variantId) !== index,
  )
  if (duplicateVariant) {
    return Result.err<ServerValidatedCart, CartValidationError>(duplicateCartVariant())
  }

  const currentVariants = await database.query.cart.findVariants(input)
  const variantsById = new Map(currentVariants.map(variant => [variant.variantId, variant]))
  const corrections: CartCorrection[] = []
  const lines: ServerValidatedCartLine[] = []

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
    if (variant.unitPriceMnt !== item.previousUnitPriceMnt) {
      corrections.push(
        changedPrice(item.variantId, item.previousUnitPriceMnt, variant.unitPriceMnt),
      )
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

  return Result.ok<ServerValidatedCart, CartValidationError>({
    lines,
    corrections,
    subtotalMnt: lines.reduce((total, line) => total + line.lineTotalMnt, 0),
  })
}

export const cartOperations = { validate }
