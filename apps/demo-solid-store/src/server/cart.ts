'use server'

import { respond } from '@solidjs/web'
import { commerce } from '@store-kit/commerce'
import { cartValidationInputsSchema, validatedCartSchema } from '@store-kit/contracts/cart'
import type { ValidatedCart } from '@store-kit/contracts/cart'
import { Value } from 'typebox/value'

import { mediaUrl } from '~/catalog/media'

export async function validateCart(input: unknown) {
  if (!Value.Check(cartValidationInputsSchema, input)) {
    throw respond(
      { ok: false as const, code: 'invalid_cart_input', message: 'Сагсны мэдээлэл буруу байна.' },
      { status: 400, headers: { 'cache-control': 'private, no-store' } },
    )
  }

  const result = await commerce.cart.validate(input)
  if (result.status === 'error') return { ok: false as const, error: result.error }

  const cart: ValidatedCart = {
    ...result.value,
    lines: result.value.lines.map(line => {
      const { imageR2Key, imageWidth, imageHeight, imageAlt, ...publicLine } = line
      return {
        ...publicLine,
        image:
          imageR2Key && imageWidth && imageHeight && imageAlt
            ? {
                url: mediaUrl(imageR2Key),
                width: imageWidth,
                height: imageHeight,
                alt: imageAlt,
              }
            : null,
      }
    }),
  }

  if (!Value.Check(validatedCartSchema, cart)) {
    throw respond(
      { ok: false as const, code: 'invalid_cart_result', message: 'Сагсыг шалгаж чадсангүй.' },
      { status: 500, headers: { 'cache-control': 'private, no-store' } },
    )
  }

  return { ok: true as const, cart }
}
