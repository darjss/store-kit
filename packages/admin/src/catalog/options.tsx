import { Button, Input } from '@store-kit/ui'
import { For, Show, createSignal } from 'solid-js'

type OptionRowsProps = {
  value: Record<string, string>
  onChange: (value: Record<string, string>) => void
  disabled?: boolean
}

export function OptionRows(props: OptionRowsProps) {
  const entries = () => Object.entries(props.value)
  const [keyErrors, setKeyErrors] = createSignal<Record<string, string>>({})
  const addOption = () => {
    let index = 1
    let key = 'Сонголт'
    while (key in props.value) {
      index += 1
      key = `Сонголт ${index}`
    }
    props.onChange({ ...props.value, [key]: '' })
  }
  const updateKey = (oldKey: string, key: string) => {
    if (!key) {
      setKeyErrors(errors => ({ ...errors, [oldKey]: 'Сонголтын нэрийг оруулна уу.' }))
      return false
    }
    if (key !== oldKey && key in props.value) {
      setKeyErrors(errors => ({ ...errors, [oldKey]: 'Сонголтын нэр давхардаж болохгүй.' }))
      return false
    }
    setKeyErrors(errors =>
      Object.fromEntries(Object.entries(errors).filter(([name]) => name !== oldKey)),
    )
    if (key === oldKey) return true
    props.onChange(
      Object.fromEntries(entries().map(([name, value]) => [name === oldKey ? key : name, value])),
    )
    return true
  }

  return (
    <div class="space-y-3">
      <Show
        when={entries().length > 0}
        fallback={
          <p class="text-sm text-muted-foreground">Сонголтгүй бол үндсэн хувилбарыг ашиглана.</p>
        }
      >
        <For each={entries()}>
          {([name, value]) => (
            <div class="grid gap-2 border-b pb-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
              <div>
                <Input
                  aria-invalid={Boolean(keyErrors()[name])}
                  aria-label="Сонголтын нэр"
                  class="min-h-12! text-base! md:h-8! md:text-sm!"
                  disabled={props.disabled}
                  value={name}
                  onChange={event => {
                    if (!updateKey(name, event.currentTarget.value.trim()))
                      event.currentTarget.value = name
                  }}
                />
                <Show when={keyErrors()[name]}>
                  {message => (
                    <p class="mt-1 text-sm text-destructive" role="alert">
                      {message()}
                    </p>
                  )}
                </Show>
              </div>
              <Input
                aria-label={`${name} утга`}
                class="min-h-12! text-base! md:h-8! md:text-sm!"
                disabled={props.disabled}
                placeholder="Утга"
                value={value}
                onInput={event =>
                  props.onChange({ ...props.value, [name]: event.currentTarget.value })
                }
              />
              <Button
                aria-label={`${name} сонголтыг хасах`}
                class="min-h-11! md:h-8!"
                disabled={props.disabled}
                onClick={() => {
                  setKeyErrors(errors =>
                    Object.fromEntries(Object.entries(errors).filter(([key]) => key !== name)),
                  )
                  props.onChange(Object.fromEntries(entries().filter(([key]) => key !== name)))
                }}
                type="button"
                variant="ghost"
              >
                Хасах
              </Button>
            </div>
          )}
        </For>
      </Show>
      <Button
        class="min-h-11! md:h-8!"
        disabled={props.disabled || entries().length >= 20}
        onClick={addOption}
        type="button"
        variant="outline"
      >
        Сонголт нэмэх
      </Button>
    </div>
  )
}
