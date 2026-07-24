import type { Static, TSchema } from 'typebox'
import { Value } from 'typebox/value'

const decodePointerToken = (token: string) => token.replaceAll('~1', '/').replaceAll('~0', '~')

export const jsonPointerToFieldName = (pointer: string) =>
  pointer
    .split('/')
    .slice(1)
    .map(decodePointerToken)
    .reduce(
      (name, token) =>
        /^\d+$/.test(token) ? `${name}[${token}]` : name ? `${name}.${token}` : token,
      '',
    )

export const typeboxValidator =
  <Schema extends TSchema>(schema: Schema) =>
  ({ value }: { value: Static<Schema> }) => {
    const fieldMessages = new Map<string, Set<string>>()
    const formMessages = new Set<string>()

    for (const issue of Value.Errors(schema, value)) {
      const name = jsonPointerToFieldName(issue.instancePath)
      if (!name) {
        formMessages.add(issue.message)
        continue
      }

      const messages = fieldMessages.get(name) ?? new Set<string>()
      messages.add(issue.message)
      fieldMessages.set(name, messages)
    }

    if (fieldMessages.size === 0 && formMessages.size === 0) return

    return {
      ...(formMessages.size > 0 ? { form: [...formMessages].join(' ') } : {}),
      fields: Object.fromEntries(
        [...fieldMessages].map(([name, messages]) => [name, [...messages].join(' ')]),
      ),
    }
  }
