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
      class="border-y bg-card"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div class="grid gap-5 px-4 py-5 sm:px-5 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
        <div>
          <h2 class="text-sm font-semibold">Checkout and bank transfer</h2>
          <p class="mt-1 text-xs leading-5 text-muted-foreground">
            These values apply to new checkouts. Existing orders keep their recorded delivery fee
            and payment instructions.
          </p>
        </div>

        <FieldGroup class="gap-0">
          <form.Field name="deliveryFeeMnt">
            {field => (
              <Field class="max-w-xs border-b pb-4">
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

          <div class="grid gap-4 border-b py-4 md:grid-cols-2">
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
              <Field class="max-w-md pt-4">
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
      </div>

      <form.Subscribe
        selector={state => ({
          canSubmit: state.canSubmit,
          dirty: state.isDirty,
          pending: state.isSubmitting,
        })}
      >
        {state => (
          <div class="sticky bottom-0 flex min-h-12 items-center justify-between gap-3 border-t bg-popover px-4 py-2 sm:px-5">
            <p class="text-xs text-muted-foreground" role="status">
              {state().dirty ? 'Unsaved changes' : 'All changes saved'}
            </p>
            <Button
              class="w-32"
              disabled={!state().canSubmit || !state().dirty || state().pending}
              type="submit"
            >
              <Show when={state().pending}>
                <Spinner aria-hidden="true" />
              </Show>
              {state().pending ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        )}
      </form.Subscribe>

      <Show when={message()}>
        {text => (
          <div class="border-t px-4 py-3 sm:px-5">
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
