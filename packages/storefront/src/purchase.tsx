import type { PublicImage } from '@store-kit/contracts'
import { For, createContext, createMemo, createSignal, useContext } from 'solid-js'
import type { Accessor, JSX, ParentProps } from 'solid-js'

import { addCartItem, openCart } from './cart/store'

export const maximumPurchaseQuantity = (stockQuantity: number) => Math.min(10, stockQuantity)

export const clampPurchaseQuantity = (quantity: number, stockQuantity: number) => {
  const maximum = maximumPurchaseQuantity(stockQuantity)
  return maximum === 0 ? 0 : Math.max(1, Math.min(quantity, maximum))
}

type PurchaseImage = PublicImage & { id: string }

export type PurchaseVariant = {
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

function createProductPurchaseState(product: PurchasableProduct) {
  const initialVariant =
    product.variants.find(variant => variant.stockQuantity > 0) ?? product.variants[0]
  const [selectedVariantId, setSelectedVariantId] = createSignal(initialVariant?.id ?? '')
  const [quantity, setQuantityState] = createSignal(
    clampPurchaseQuantity(1, initialVariant?.stockQuantity ?? 0),
  )
  const [selectedImageId, setSelectedImageId] = createSignal(product.images[0]?.id ?? '')
  const [announcement, setAnnouncement] = createSignal<PurchaseAnnouncement>()

  const selectedVariant = createMemo(() =>
    product.variants.find(variant => variant.id === selectedVariantId()),
  )
  const maximumQuantity = createMemo(() =>
    maximumPurchaseQuantity(selectedVariant()?.stockQuantity ?? 0),
  )
  const selectedImage = createMemo(
    () => product.images.find(image => image.id === selectedImageId()) ?? product.images[0],
  )

  const setQuantity = (nextQuantity: number) => {
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
    const linkedImage = variant.imageLinks[0]
    if (linkedImage) setSelectedImageId(linkedImage.imageId)
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
    product,
    selectedVariantId,
    selectedVariant,
    selectedImage,
    selectImage: (imageId: string) => {
      if (!product.images.some(image => image.id === imageId)) return false
      setSelectedImageId(imageId)
      return true
    },
    quantity,
    maximumQuantity,
    announcement,
    selectVariant,
    setQuantity,
    decrementQuantity: () => setQuantity(quantity() - 1),
    incrementQuantity: () => setQuantity(quantity() + 1),
    addToCart,
    clearAnnouncement: () => setAnnouncement(),
  }
}

type ProductPurchaseContextValue = ReturnType<typeof createProductPurchaseState>
const ProductPurchaseContext = createContext<ProductPurchaseContextValue>()

export function useProductPurchase() {
  const purchase = useContext(ProductPurchaseContext)
  if (!purchase) throw new Error('ProductPurchase components must be inside ProductPurchase.Root.')
  return purchase
}

function Root(props: ParentProps<{ product: PurchasableProduct }>) {
  const purchase = createProductPurchaseState(props.product)
  return (
    <ProductPurchaseContext.Provider value={purchase}>
      {props.children}
    </ProductPurchaseContext.Provider>
  )
}

export type ProductPurchaseSelection = {
  selectedVariantId: string
  selectedVariant: PurchaseVariant | undefined
  selectedImage: PurchaseImage | undefined
  quantity: number
  maximumQuantity: number
  selectVariant: (variantId: string) => boolean
  selectImage: (imageId: string) => boolean
  setQuantity: (quantity: number) => void
  decrementQuantity: () => void
  incrementQuantity: () => void
  addToCart: () => boolean
}

type SelectionProps = {
  children: (selection: Accessor<ProductPurchaseSelection>) => JSX.Element
}

function Selection(props: SelectionProps) {
  const purchase = useProductPurchase()
  const selection = createMemo(() => ({
    selectedVariantId: purchase.selectedVariantId(),
    selectedVariant: purchase.selectedVariant(),
    selectedImage: purchase.selectedImage(),
    quantity: purchase.quantity(),
    maximumQuantity: purchase.maximumQuantity(),
    selectVariant: purchase.selectVariant,
    selectImage: purchase.selectImage,
    setQuantity: purchase.setQuantity,
    decrementQuantity: purchase.decrementQuantity,
    incrementQuantity: purchase.incrementQuantity,
    addToCart: purchase.addToCart,
  }))

  return props.children(selection)
}

type VariantsProps = {
  children: (variant: PurchaseVariant) => JSX.Element
}

function Variants(props: VariantsProps) {
  const purchase = useProductPurchase()
  return <For each={purchase.product.variants}>{props.children}</For>
}

type AnnouncementProps = {
  children: (announcement: Accessor<PurchaseAnnouncement | undefined>) => JSX.Element
}

function Announcement(props: AnnouncementProps) {
  const purchase = useProductPurchase()
  return props.children(purchase.announcement)
}

export const ProductPurchase = { Root, Selection, Variants, Announcement }
