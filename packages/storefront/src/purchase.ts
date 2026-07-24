export const maximumPurchaseQuantity = (stockQuantity: number) => Math.min(10, stockQuantity)

export const clampPurchaseQuantity = (quantity: number, stockQuantity: number) => {
  const maximum = maximumPurchaseQuantity(stockQuantity)
  return maximum === 0 ? 0 : Math.max(1, Math.min(quantity, maximum))
}
