export interface StoreImage {
  id: string
  url: string
  srcset?: string
  width: number
  height: number
  alt: string
}

export type StockStatus = 'in-stock' | 'low-stock' | 'sold-out'

export interface PurchaseVariant {
  id: string
  sku: string
  name: string
  options: Record<string, string>
  priceMnt: number
  compareAtPriceMnt: number | null
  stockStatus: StockStatus
  maxQuantity: number
  imageIds: string[]
}

export interface PurchaseProduct {
  id: string
  slug: string
  name: string
  images: StoreImage[]
  variants: PurchaseVariant[]
}

export interface ProductPageData {
  product: PurchaseProduct
  category: { name: string; href: string }
  brandName: string
  useCaseText: string
  shortDescription: string
}
