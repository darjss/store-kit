import { adminStoreSettingsUpdateSchema } from '@store-kit/contracts/admin-settings'
import type {
  AdminStoreSettings,
  AdminStoreSettingsError,
  AdminStoreSettingsUpdate,
} from '@store-kit/contracts/admin-settings'
import { toStandardSchema } from '@store-kit/contracts/standard-schema'
import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  Spinner,
} from '@store-kit/ui'
import { createForm } from '@tanstack/solid-form'
import type { Result } from 'better-result'
import { Show, createSignal } from 'solid-js'

import { InlineAlert } from '../components/foundation'

const settingsValidator = toStandardSchema(adminStoreSettingsUpdateSchema)

const deliveryFeeExample = new Intl.NumberFormat('mn-MN', {
  style: 'currency',
  currency: 'MNT',
  maximumFractionDigits: 0,
}).format(5_000)

const formValues = (settings: AdminStoreSettings): AdminStoreSettingsUpdate => ({
  deliveryFeeMnt: settings.deliveryFeeMnt,
  bankName: settings.bankName,
  bankAccountName: settings.bankAccountName,
  bankAccountNumber: settings.bankAccountNumber,
  expectedUpdatedAt: settings.updatedAt,
})

const validationMessages = (errors: readonly unknown[]) =>
  errors.map(error => ({
    message:
      typeof error === 'string'
        ? error
        : typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : 'Enter a valid value.',
  }))

const transportMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Check your connection, then try the save again.'

type SaveResult = Result<AdminStoreSettings, AdminStoreSettingsError>

type StoreSettingsFormProps = {
  settings: AdminStoreSettings
  onSave: (input: AdminStoreSettingsUpdate) => Promise<SaveResult>
  onSaved: () => void
  onReload: () => Promise<AdminStoreSettings | undefined>
}

export function StoreSettingsForm(props: StoreSettingsFormProps) {
  const [failure, setFailure] = createSignal<AdminStoreSettingsError>()
  const [transportError, setTransportError] = createSignal<string>()
  const [reloading, setReloading] = createSignal(false)
  const form = createForm(() => ({
    defaultValues: formValues(props.settings),
    validators: {
      onBlur: settingsValidator,
      onSubmit: settingsValidator,
    },
    onSubmit: async ({ value }) => {
      setFailure()
      setTransportError()

      try {
        const result = await props.onSave(value)
        if (result.isErr()) {
          setFailure(result.error)
          return
        }

        form.reset(formValues(result.value))
        props.onSaved()
      } catch (error) {
        setTransportError(transportMessage(error))
      }
    },
  }))
  const message = () => transportError() ?? failure()?.message
  const conflict = () => failure()?._tag === 'StoreSettingsConflict'
  const reload = async () => {
    setReloading(true)
    setTransportError()

    try {
      const settings = await props.onReload()
      if (!settings) return

      form.reset(formValues(settings))
      setFailure()
    } catch (error) {
      setTransportError(transportMessage(error))
    } finally {
      setReloading(false)
    }
  }

  return (
    <form
      aria-label="Store checkout settings"
      class="rounded-lg border bg-background p-4 sm:p-5"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div class="mb-5 border-b pb-4">
        <h2 class="text-lg leading-6 font-semibold">Checkout and bank transfer</h2>
        <p class="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
          These values apply to new checkouts. Existing orders keep their recorded delivery fee and
          payment instructions.
        </p>
      </div>

      <FieldGroup class="gap-5">
        <form.Field name="deliveryFeeMnt">
          {field => (
            <Field class="max-w-xs">
              <FieldLabel for="store-delivery-fee">Delivery fee</FieldLabel>
              <Input
                id="store-delivery-fee"
                inputMode="numeric"
                min="0"
                step="1"
                type="number"
                value={Number.isNaN(field().state.value) ? '' : field().state.value}
                aria-invalid={!field().state.meta.isValid}
                onBlur={() => field().handleBlur()}
                onInput={event => field().handleChange(event.currentTarget.valueAsNumber)}
              />
              <FieldDescription>
                Enter a nonnegative whole MNT amount, for example {deliveryFeeExample}.
              </FieldDescription>
              <FieldError errors={validationMessages(field().state.meta.errors)} />
            </Field>
          )}
        </form.Field>

        <div class="grid gap-5 md:grid-cols-2">
          <form.Field name="bankName">
            {field => (
              <Field>
                <FieldLabel for="store-bank-name">Bank name</FieldLabel>
                <Input
                  autocomplete="organization"
                  id="store-bank-name"
                  maxlength="120"
                  value={field().state.value}
                  aria-invalid={!field().state.meta.isValid}
                  onBlur={() => field().handleBlur()}
                  onInput={event => field().handleChange(event.currentTarget.value)}
                />
                <FieldDescription>The bank shown in bank-transfer instructions.</FieldDescription>
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>

          <form.Field name="bankAccountName">
            {field => (
              <Field>
                <FieldLabel for="store-bank-account-name">Account name</FieldLabel>
                <Input
                  autocomplete="name"
                  id="store-bank-account-name"
                  maxlength="120"
                  value={field().state.value}
                  aria-invalid={!field().state.meta.isValid}
                  onBlur={() => field().handleBlur()}
                  onInput={event => field().handleChange(event.currentTarget.value)}
                />
                <FieldDescription>The account holder name customers must use.</FieldDescription>
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>
        </div>

        <form.Field name="bankAccountNumber">
          {field => (
            <Field class="max-w-md">
              <FieldLabel for="store-bank-account-number">Account number</FieldLabel>
              <Input
                autocomplete="off"
                id="store-bank-account-number"
                inputMode="numeric"
                maxlength="120"
                spellcheck={false}
                type="text"
                value={field().state.value}
                aria-invalid={!field().state.meta.isValid}
                onBlur={() => field().handleBlur()}
                onInput={event => field().handleChange(event.currentTarget.value)}
              />
              <FieldDescription>
                Stored as text so leading zeroes remain in the payment instructions.
              </FieldDescription>
              <FieldError errors={validationMessages(field().state.meta.errors)} />
            </Field>
          )}
        </form.Field>
      </FieldGroup>

      <form.Subscribe
        selector={state => ({ canSubmit: state.canSubmit, pending: state.isSubmitting })}
      >
        {state => (
          <Button class="mt-6 w-36" disabled={!state().canSubmit || state().pending} type="submit">
            <Show when={state().pending}>
              <Spinner aria-hidden="true" />
            </Show>
            {state().pending ? 'Saving…' : 'Save settings'}
          </Button>
        )}
      </form.Subscribe>

      <Show when={message()}>
        {text => (
          <div class="mt-5">
            <InlineAlert
              action={
                <Show when={conflict()}>
                  <Button
                    disabled={reloading()}
                    onClick={() => void reload()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Show when={reloading()}>
                      <Spinner aria-hidden="true" />
                    </Show>
                    {reloading() ? 'Reloading…' : 'Reload current data'}
                  </Button>
                </Show>
              }
              title={conflict() ? 'Store settings changed' : 'Could not save store settings'}
              tone="destructive"
            >
              {text()}
            </InlineAlert>
          </div>
        )}
      </Show>
    </form>
  )
}
