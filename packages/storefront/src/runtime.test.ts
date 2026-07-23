import { expect, test } from 'vite-plus/test'

import { formatMnt } from './format'
import { mediaUrl, publicMediaUrl } from './media'
import { clampPurchaseQuantity, maximumPurchaseQuantity } from './purchase'
import { orderQuery } from './query-options/orders'
import { orderStatusLabel, paymentStatusLabel, shouldPollOrderStatus } from './status'
import { cartStorageKey, privateOrderStorageKey } from './storage'

test('formats MNT with the shared Mongolian currency format', () => {
  expect(formatMnt(189_000)).toBe('₮ 189,000')
})

test('builds storefront storage keys', () => {
  expect(cartStorageKey('plugged')).toBe('store-kit:plugged:cart:v1')
  expect(privateOrderStorageKey('plugged', 'ord_123')).toBe('plugged:order-token:ord_123')
})

test('scopes private-order queries by their credential', () => {
  expect(orderQuery.findPrivateStatus('ord_123', 'token-a').queryKey).toEqual([
    'order',
    'ord_123',
    'token-a',
  ])
  expect(orderQuery.findPrivateStatus('ord_123', 'token-b').queryKey).not.toEqual(
    orderQuery.findPrivateStatus('ord_123', 'token-a').queryKey,
  )
})

test('builds encoded public media URLs', () => {
  expect(publicMediaUrl('products/Zero Red.webp', 'https://media.example.com/')).toBe(
    'https://media.example.com/products/Zero%20Red.webp',
  )
  expect(mediaUrl('https://media.example.com/products/zero-red.webp')).toBe(
    'https://media.example.com/products/zero-red.webp',
  )
  expect(mediaUrl('products/zero-red.webp')).toBe('/media/products/zero-red.webp')
})

test('uses reviewed customer status labels', () => {
  expect(orderStatusLabel('delivering')).toBe('Хүргэлтэд гарсан')
  expect(paymentStatusLabel('claimed')).toBe('Шилжүүлгийг шалгаж байна')
})

test('polls only nonterminal orders with pending payment work', () => {
  expect(shouldPollOrderStatus({ status: 'new', payment: { status: 'pending' } })).toBe(true)
  expect(shouldPollOrderStatus({ status: 'new', payment: { status: 'claimed' } })).toBe(true)
  expect(shouldPollOrderStatus({ status: 'confirmed', payment: { status: 'paid' } })).toBe(false)
  expect(shouldPollOrderStatus({ status: 'cancelled', payment: { status: 'pending' } })).toBe(false)
})

test('clamps purchase quantity to stock and the visible limit', () => {
  expect(maximumPurchaseQuantity(12)).toBe(10)
  expect(clampPurchaseQuantity(12, 12)).toBe(10)
  expect(clampPurchaseQuantity(8, 3)).toBe(3)
  expect(clampPurchaseQuantity(0, 3)).toBe(1)
  expect(clampPurchaseQuantity(1, 0)).toBe(0)
})
