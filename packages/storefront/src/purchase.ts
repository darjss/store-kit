import type { PublicImage } from '@store-kit/contracts'
import { createMemo, createSignal } from 'solid-js'

import { addCartItem, openCart } from './cart/store'

export const maximumPurchaseQuantity = (stockQuantity: number) => Math.min(10, stockQuantity)

export const clampPurchaseQuantity = (quantity: number, stockQuantity: number) => {
  const maximum = maximumPurchaseQuantity(stockQuantity)
  return maximum === 0 ? 0 : Math.max(1, Math.min(quantity, maximum))
}

type PurchaseImage = PublicImage & { id: string }

type PurchaseVariant = {
  id: string
  name: string
  options: Record<string, string>
  priceMnt: number
  stockQuantity: number
  imageLinks: { imageId: string }[]
}

export type PurchasableProduct = {
  slug: string
  name: string
  images: PurchaseImage[]
  variants: PurchaseVariant[]
}

export type PurchaseAnnouncement =
  | { type: 'quantity-clamped'; maximum: number }
  | { type: 'added'; productName: string }

export function createProductPurchaseController(product: PurchasableProduct) {
  const initialVariant =
    product.variants.find(variant => variant.stockQuantity > 0) ?? product.variants[0]
  const [selectedVariantId, setSelectedVariantId] = createSignal(initialVariant?.id ?? '')
  const [quantity, setQuantityState] = createSignal(
    clampPurchaseQuantity(1, initialVariant?.stockQuantity ?? 0),
  )
  const [announcement, setAnnouncement] = createSignal<PurchaseAnnouncement>()

  const selectedVariant = createMemo(() =>
    product.variants.find(variant => variant.id === selectedVariantId()),
  )
  const maximumQuantity = createMemo(() =>
    maximumPurchaseQuantity(selectedVariant()?.stockQuantity ?? 0),
  )
  const selectedImage = createMemo(() => {
    const linkedImage = selectedVariant()?.imageLinks[0]
    return product.images.find(image => image.id === linkedImage?.imageId) ?? product.images[0]
  })

  const updateQuantity = (nextQuantity: number) => {
    const maximum = maximumQuantity()
    const clamped = clampPurchaseQuantity(nextQuantity, selectedVariant()?.stockQuantity ?? 0)
    setQuantityState(clamped)
    if (maximum > 0 && nextQuantity > maximum)
      setAnnouncement({ type: 'quantity-clamped', maximum })
  }

  const selectVariant = (variantId: string) => {
    const variant = product.variants.find(item => item.id === variantId)
    if (!variant) return false

    setSelectedVariantId(variant.id)
    const currentQuantity = quantity()
    const clamped = clampPurchaseQuantity(currentQuantity, variant.stockQuantity)
    setQuantityState(clamped)
    const maximum = maximumPurchaseQuantity(variant.stockQuantity)
    if (maximum > 0 && currentQuantity > maximum)
      setAnnouncement({ type: 'quantity-clamped', maximum })
    return true
  }

  const addToCart = () => {
    const variant = selectedVariant()
    const image = selectedImage()
    if (!variant || variant.stockQuantity === 0 || quantity() === 0) return false

    addCartItem({
      variantId: variant.id,
      quantity: quantity(),
      productSlug: product.slug,
      productName: product.name,
      variantName: variant.name,
      options: variant.options,
      image: image
        ? {
            url: image.url,
            width: image.width,
            height: image.height,
            alt: image.alt,
          }
        : null,
      unitPriceMnt: variant.priceMnt,
    })
    setAnnouncement({ type: 'added', productName: product.name })
    openCart()
    return true
  }

  return {
    selectedVariantId,
    selectedVariant,
    selectedImage,
    quantity,
    maximumQuantity,
    announcement,
    selectVariant,
    setQuantity: updateQuantity,
    decrementQuantity: () => updateQuantity(quantity() - 1),
    incrementQuantity: () => updateQuantity(quantity() + 1),
    addToCart,
    clearAnnouncement: () => setAnnouncement(),
  }
}
