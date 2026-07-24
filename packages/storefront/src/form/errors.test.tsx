// @vitest-environment jsdom
import { createRoot, createSignal } from 'solid-js'
import { afterEach, expect, test } from 'vite-plus/test'

import { createFormErrorController } from './errors'

afterEach(() => {
  document.body.replaceChildren()
})

test('form error controller prioritizes domain state, performs corrections, and focuses controls or summary', async () => {
  const owned = createRoot(dispose => {
    const [domainError, setDomainError] = createSignal<{ code: string }>()
    const [transportError, setTransportError] = createSignal<unknown>()
    const [performedAction, setPerformedAction] = createSignal<string>()
    const controller = createFormErrorController({
      domainError,
      transportError,
      domainActions: () => ['correct'],
      transportActions: ['retry'],
    })
    controller.setActionHandler(action => {
      setPerformedAction(action)
    })
    return {
      controller,
      setDomainError,
      setTransportError,
      performedAction,
      dispose,
    }
  })

  const form = document.createElement('form')
  const first = document.createElement('input')
  first.name = 'first'
  first.setAttribute('aria-invalid', 'false')
  const second = document.createElement('input')
  second.name = 'second'
  second.setAttribute('aria-invalid', 'true')
  const summary = document.createElement('div')
  summary.tabIndex = -1
  form.append(first, second)
  document.body.append(form, summary)
  owned.controller.setFormElement(form)
  owned.controller.setSummaryElement(summary)

  expect(owned.controller.state().type).toBe('none')
  owned.setTransportError(new Error('offline'))
  expect(owned.controller.state()).toMatchObject({ type: 'transport', actions: ['retry'] })
  owned.setDomainError({ code: 'invalid' })
  expect(owned.controller.state()).toMatchObject({ type: 'domain', actions: ['correct'] })

  owned.controller.performAction('correct')
  expect(owned.performedAction()).toBe('correct')

  owned.controller.focusFirstInvalid()
  await Promise.resolve()
  expect(document.activeElement).toBe(second)

  second.setAttribute('aria-invalid', 'false')
  owned.controller.focusFirstInvalid()
  await Promise.resolve()
  expect(document.activeElement).toBe(summary)

  owned.dispose()
})
