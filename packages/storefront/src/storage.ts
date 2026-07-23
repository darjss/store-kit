export const cartStorageKey = (store: string) => `store-kit:${store}:cart:v1`

export const privateOrderStorageKey = (store: string, orderId: string) =>
  `${store}:order-token:${orderId}`
