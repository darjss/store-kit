// @vitest-environment jsdom
import { cleanup, render } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { createSignal } from 'solid-js'
import { afterEach, expect, test } from 'vite-plus/test'

import { Switch } from './switch'

afterEach(cleanup)

test('shows focus on the visible control and toggles from the keyboard', async () => {
  const user = userEvent.setup()
  const [checked, setChecked] = createSignal(false)
  const view = render(() => (
    <Switch aria-label="Featured product" checked={checked()} onChange={setChecked} />
  ))
  const input = view.getByRole('switch')
  const control = view.container.querySelector('[data-slot="switch-control"]')

  if (!(input instanceof HTMLInputElement) || !(control instanceof HTMLElement))
    throw new Error('Expected the switch input and visible control.')

  await user.tab()

  expect(document.activeElement).toBe(input)
  await user.keyboard(' ')

  expect(checked()).toBe(true)
  expect(input.checked).toBe(true)
})

test('toggles when the visible control is clicked', async () => {
  const user = userEvent.setup()
  const [checked, setChecked] = createSignal(false)
  const view = render(() => (
    <Switch aria-label="Featured product" checked={checked()} onChange={setChecked} />
  ))
  const input = view.getByRole('switch')
  const control = view.container.querySelector('[data-slot="switch-control"]')

  if (!(input instanceof HTMLInputElement) || !(control instanceof HTMLElement))
    throw new Error('Expected the switch input and visible control.')

  await user.click(control)

  expect(checked()).toBe(true)
  expect(input.checked).toBe(true)
})
