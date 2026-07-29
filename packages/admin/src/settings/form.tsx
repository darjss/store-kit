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
import { UnsavedChangesGuard } from '../components/unsaved-changes'
import { formatMnt } from '../format'

const settingsValidator = toStandardSchema(adminStoreSettingsUpdateSchema)

const deliveryFeeExample = formatMnt(5_000)

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
          : 'Зөв утга оруулна уу.',
  }))

const transportMessage = (_error: unknown) =>
  'Интернэт холболтоо шалгаад өөрчлөлтөө дахин хадгална уу.'

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
      aria-label="Дэлгүүрийн төлбөр, хүргэлтийн тохиргоо"
      class="-mx-4 border-y bg-card sm:mx-0 sm:rounded-lg sm:border-x"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <UnsavedChangesGuard isDirty={() => form.state.isDirty} />
      <div class="border-b px-4 py-5 sm:px-6">
        <h2 class="text-base font-semibold">Шинэ захиалгад харагдах мэдээлэл</h2>
        <p class="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
          Энд хадгалсан хүргэлтийн үнэ, банкны данс дараагийн захиалгуудад ашиглагдана. Өмнөх
          захиалгын үнэ, төлбөрийн мэдээлэл өөрчлөгдөхгүй.
        </p>
      </div>

      <FieldGroup class="mx-auto max-w-2xl gap-0 px-4 sm:px-6">
        <section aria-labelledby="delivery-settings-title" class="border-b py-5">
          <div class="mb-4">
            <h3 class="text-base font-semibold" id="delivery-settings-title">
              Хүргэлт
            </h3>
            <p class="mt-1 text-sm leading-5 text-muted-foreground">
              Хэрэглэгч төлбөр хийхээс өмнө энэ үнийг захиалгын нийт дүнд харна.
            </p>
          </div>
          <form.Field name="deliveryFeeMnt">
            {field => (
              <Field class="max-w-sm">
                <FieldLabel for="store-delivery-fee">Хүргэлтийн үнэ</FieldLabel>
                <Input
                  class="min-h-12! text-base! lg:min-h-8! lg:text-sm!"
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
                  Төгрөгөөр бүхэл тоо оруулна. Жишээ: {deliveryFeeExample}.
                </FieldDescription>
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>
        </section>

        <section aria-labelledby="bank-settings-title" class="py-5">
          <div class="mb-4">
            <h3 class="text-base font-semibold" id="bank-settings-title">
              Банкны шилжүүлэг
            </h3>
            <p class="mt-1 text-sm leading-5 text-muted-foreground">
              Хэрэглэгч банкны шилжүүлэг сонговол эдгээр дансны мэдээллийг хуулж ашиглана.
            </p>
          </div>

          <div class="space-y-4">
            <form.Field name="bankName">
              {field => (
                <Field>
                  <FieldLabel for="store-bank-name">Банкны нэр</FieldLabel>
                  <Input
                    autocomplete="organization"
                    class="min-h-12! text-base! lg:min-h-8! lg:text-sm!"
                    id="store-bank-name"
                    maxlength="120"
                    value={field().state.value}
                    aria-invalid={!field().state.meta.isValid}
                    onBlur={() => field().handleBlur()}
                    onInput={event => field().handleChange(event.currentTarget.value)}
                  />
                  <FieldDescription>Шилжүүлгийн зааварт харагдах банк.</FieldDescription>
                  <FieldError errors={validationMessages(field().state.meta.errors)} />
                </Field>
              )}
            </form.Field>

            <form.Field name="bankAccountName">
              {field => (
                <Field>
                  <FieldLabel for="store-bank-account-name">Данс эзэмшигчийн нэр</FieldLabel>
                  <Input
                    autocomplete="name"
                    class="min-h-12! text-base! lg:min-h-8! lg:text-sm!"
                    id="store-bank-account-name"
                    maxlength="120"
                    value={field().state.value}
                    aria-invalid={!field().state.meta.isValid}
                    onBlur={() => field().handleBlur()}
                    onInput={event => field().handleChange(event.currentTarget.value)}
                  />
                  <FieldDescription>
                    Хэрэглэгч шилжүүлэхдээ тулгаж харах дансны нэр.
                  </FieldDescription>
                  <FieldError errors={validationMessages(field().state.meta.errors)} />
                </Field>
              )}
            </form.Field>

            <form.Field name="bankAccountNumber">
              {field => (
                <Field>
                  <FieldLabel for="store-bank-account-number">Дансны дугаар</FieldLabel>
                  <Input
                    autocomplete="off"
                    class="min-h-12! font-mono text-base! lg:min-h-8! lg:text-sm!"
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
                    Эхний тэгийг алдахгүйгээр яг дансан дээрх дугаарыг оруулна.
                  </FieldDescription>
                  <FieldError errors={validationMessages(field().state.meta.errors)} />
                </Field>
              )}
            </form.Field>
          </div>
        </section>
      </FieldGroup>

      <Show when={message()}>
        {text => (
          <div class="border-t px-4 py-3 sm:px-6">
            <InlineAlert
              action={
                <Show when={conflict()}>
                  <Button
                    class="min-h-11!"
                    disabled={reloading()}
                    onClick={() => void reload()}
                    type="button"
                    variant="outline"
                  >
                    <Show when={reloading()}>
                      <Spinner aria-hidden="true" />
                    </Show>
                    {reloading() ? 'Дахин авч байна…' : 'Одоогийн мэдээллийг дахин авах'}
                  </Button>
                </Show>
              }
              title={conflict() ? 'Тохиргоо өөрчлөгдсөн байна' : 'Тохиргоог хадгалж чадсангүй'}
              tone="destructive"
            >
              {text()}
            </InlineAlert>
          </div>
        )}
      </Show>

      <form.Subscribe
        selector={state => ({
          canSubmit: state.canSubmit,
          dirty: state.isDirty,
          pending: state.isSubmitting,
        })}
      >
        {state => (
          <div class="sticky bottom-0 flex min-h-16 items-center justify-between gap-3 border-t bg-popover px-4 py-2 sm:px-6">
            <p class="text-sm text-muted-foreground" role="status">
              {state().dirty ? 'Хадгалаагүй өөрчлөлт байна' : 'Бүх өөрчлөлт хадгалагдсан'}
            </p>
            <Button
              class="min-h-12! min-w-36 lg:min-h-8!"
              disabled={!state().canSubmit || !state().dirty || state().pending}
              type="submit"
            >
              <Show when={state().pending}>
                <Spinner aria-hidden="true" />
              </Show>
              {state().pending ? 'Хадгалж байна…' : 'Тохиргоо хадгалах'}
            </Button>
          </div>
        )}
      </form.Subscribe>
    </form>
  )
}
