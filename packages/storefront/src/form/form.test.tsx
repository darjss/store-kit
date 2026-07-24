// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@solidjs/testing-library'
import { QueryClientProvider } from '@tanstack/solid-query'
import { createSignal } from 'solid-js'
import { afterEach, expect, test } from 'vite-plus/test'

import { Checkout } from '~/checkout'
import { createStorefrontQueryClient } from '~/query-client'

import { PendingSubmitButton } from './submit-button'

afterEach(cleanup)

function CheckoutFixture() {
  return (
    <QueryClientProvider client={createStorefrontQueryClient()}>
      <Checkout.Root
        defaultValues={{
          customer: { name: '', phone: '' },
          delivery: { district: 'Баянзүрх', khoroo: '', address: '', notes: '' },
          paymentMethod: 'qpay',
        }}
      >
        <Checkout.Form>
          <Checkout.Field name="customer.name">
            {field => (
              <>
                <field.Input aria-label="Нэр" />
                <span data-testid="name-error-count">{field().state.meta.errors.length}</span>
              </>
            )}
          </Checkout.Field>
          <Checkout.Field name="customer.phone">
            {field => <field.Input aria-label="Утас" />}
          </Checkout.Field>
          <button type="submit">Илгээх</button>
        </Checkout.Form>
      </Checkout.Root>
    </QueryClientProvider>
  )
}

test('checkout fields validate on input and focus the first invalid control on submit', async () => {
  const view = render(() => <CheckoutFixture />)
  const name = view.getByLabelText('Нэр') as HTMLInputElement

  fireEvent.blur(name)
  await waitFor(() => expect(name.getAttribute('aria-invalid')).toBe('true'))

  fireEvent.input(name, { target: { value: 'Бат' } })
  fireEvent.blur(name)
  await waitFor(() => expect(name.value).toBe('Бат'))
  await waitFor(() => expect(view.getByTestId('name-error-count').textContent).toBe('0'))

  fireEvent.input(name, { target: { value: '' } })
  await waitFor(() => expect(name.getAttribute('aria-invalid')).toBe('true'))

  fireEvent.submit(view.getByRole('button', { name: 'Илгээх' }).closest('form')!)
  await waitFor(() => expect(document.activeElement).toBe(name))
})

test('the pending submit button blocks duplicate clicks and preserves its content width', async () => {
  let submissions = 0

  function Fixture() {
    const [pending, setPending] = createSignal(false)
    return (
      <PendingSubmitButton
        pending={pending()}
        pendingChildren="Хадгалж байна…"
        busyLabel="Хадгалж байна"
        onClick={() => {
          submissions += 1
          setPending(true)
        }}
      >
        Хадгалах
      </PendingSubmitButton>
    )
  }

  const view = render(() => <Fixture />)
  const button = view.getByRole('button', { name: 'Хадгалах' }) as HTMLButtonElement

  button.click()
  button.click()

  expect(submissions).toBe(1)
  expect(button.disabled).toBe(true)
  expect(button.getAttribute('aria-busy')).toBe('true')
  expect(view.getByText('Хадгалах').classList.contains('invisible')).toBe(true)
  expect(view.getByText('Хадгалж байна…').hidden).toBe(false)
  expect(view.getByRole('status').getAttribute('aria-label')).toBe('Хадгалж байна')
})
