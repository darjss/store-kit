// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@solidjs/testing-library'
import { addCartItem, clearCart } from '@store-kit/storefront/cart/store'
import type { PersistedCartItem } from '@store-kit/storefront/cart/store'
import { afterEach, beforeEach, expect, test } from 'vite-plus/test'

import { CheckoutForm } from './CheckoutForm'

const cartItem: PersistedCartItem = {
  variantId: 'var_01arz3ndektsv4rrffq69g5fav',
  quantity: 2,
  productSlug: 'aster-kit',
  productName: 'Aster Kit',
  variantName: 'Graphite',
  options: { color: 'Graphite' },
  image: {
    url: 'https://media.example.com/products/aster-kit/graphite.webp',
    width: 1200,
    height: 900,
    alt: 'Aster Kit Graphite',
  },
  unitPriceMnt: 120_000,
}

beforeEach(() => addCartItem(cartItem))
afterEach(() => {
  cleanup()
  clearCart()
})

test('checkout reveals only touched errors until submit, then summarizes and focuses all errors', async () => {
  const view = render(() => <CheckoutForm />)
  const name = await view.findByLabelText('Нэр *')
  const phone = view.getByLabelText('Утас *')
  const submit = view.getByRole('button', { name: 'Захиалга үүсгэх →' })
  const form = submit.closest('form')

  expect(form).not.toBeNull()
  if (!form) return

  expect(view.queryByText('Нэрээ оруулна уу.')).toBeNull()
  expect(view.queryByText('Утасны дугаараа шалгана уу.')).toBeNull()
  expect(view.queryByText('Хороогоо оруулна уу.')).toBeNull()
  expect(name.getAttribute('aria-invalid')).not.toBe('true')
  expect(phone.getAttribute('aria-invalid')).not.toBe('true')

  fireEvent.input(name, { target: { value: 'Бат' } })
  await waitFor(() => expect((name as HTMLInputElement).value).toBe('Бат'))
  expect(view.queryByText('Утасны дугаараа шалгана уу.')).toBeNull()
  expect(phone.getAttribute('aria-invalid')).not.toBe('true')

  fireEvent.input(name, { target: { value: ' ' } })
  await waitFor(() => expect(view.getByText('Нэрээ оруулна уу.')).toBeTruthy())
  expect(view.queryByText('Утасны дугаараа шалгана уу.')).toBeNull()

  fireEvent.submit(form)

  await waitFor(() => expect(document.activeElement).toBe(name))
  expect(name.getAttribute('name')).toBe('customer.name')
  expect(name.getAttribute('aria-invalid')).toBe('true')
  expect(phone.getAttribute('aria-invalid')).toBe('true')
  expect(view.getByText('Утасны дугаараа шалгана уу.')).toBeTruthy()
  expect(view.getByText('Хороогоо оруулна уу.')).toBeTruthy()
  expect(view.getByText('Дэлгэрэнгүй хаягаа оруулна уу.')).toBeTruthy()
  expect(view.getByText('Тодруулсан талбаруудыг засаад дахин оролдоно уу.')).toBeTruthy()
  expect(view.getByText('Нэр', { selector: 'li' })).toBeTruthy()
  expect(view.getByText('Утас', { selector: 'li' })).toBeTruthy()
  expect(form.elements.namedItem('items')).toBeNull()
})

test('checkout controls edit values shaped like the checkout details schema', async () => {
  const view = render(() => <CheckoutForm />)
  const name = (await view.findByLabelText('Нэр *')) as HTMLInputElement
  const phone = view.getByLabelText('Утас *') as HTMLInputElement
  const khoroo = view.getByLabelText('Хороо *') as HTMLInputElement
  const address = view.getByLabelText('Дэлгэрэнгүй хаяг *') as HTMLTextAreaElement
  const bankTransfer = view.getByLabelText('Дансаар шилжүүлэх Ажилтан баталгаажуулна')

  fireEvent.input(name, { target: { value: 'Бат' } })
  fireEvent.input(phone, { target: { value: '99112233' } })
  fireEvent.input(khoroo, { target: { value: '1' } })
  fireEvent.input(address, { target: { value: 'Энхтайвны өргөн чөлөө 1' } })
  fireEvent.click(bankTransfer)

  expect(name.value).toBe('Бат')
  expect(phone.name).toBe('customer.phone')
  expect(khoroo.name).toBe('delivery.khoroo')
  expect(address.name).toBe('delivery.address')
  expect((bankTransfer as HTMLInputElement).name).toBe('paymentMethod')
  expect((bankTransfer as HTMLInputElement).checked).toBe(true)
  expect(view.getByText('Aster Kit × 2')).toBeTruthy()
})
