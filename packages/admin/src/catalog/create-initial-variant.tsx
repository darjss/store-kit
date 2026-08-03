import { Field, FieldDescription, FieldError, FieldLabel, Input } from '@store-kit/ui'

import type { ProductCreateForm } from './create-form'
import { validationMessages } from './errors'
import { OptionRows } from './options'

export function InitialVariantEssentials(props: { form: ProductCreateForm }) {
  return (
    <>
      <props.form.Field name="initialVariant.priceMnt">
        {field => (
          <Field>
            <FieldLabel for="new-variant-price">Үнэ (₮)</FieldLabel>
            <Input
              class="min-h-12! text-base! tabular-nums"
              id="new-variant-price"
              inputmode="numeric"
              min="0"
              step="1"
              type="number"
              value={Number.isNaN(field().state.value) ? '' : field().state.value}
              onInput={event => field().handleChange(event.currentTarget.valueAsNumber)}
            />
            <FieldError errors={validationMessages(field().state.meta.errors)} />
          </Field>
        )}
      </props.form.Field>
      <props.form.Field name="initialVariant.stockQuantity">
        {field => (
          <Field>
            <FieldLabel for="new-variant-stock">Эхний үлдэгдэл</FieldLabel>
            <Input
              class="min-h-12! text-base! tabular-nums"
              id="new-variant-stock"
              inputmode="numeric"
              min="0"
              step="1"
              type="number"
              value={Number.isNaN(field().state.value) ? '' : field().state.value}
              onInput={event => field().handleChange(event.currentTarget.valueAsNumber)}
            />
            <FieldError errors={validationMessages(field().state.meta.errors)} />
          </Field>
        )}
      </props.form.Field>
      <props.form.Field name="initialVariant.sku">
        {field => (
          <Field>
            <FieldLabel for="new-variant-sku">Барааны код</FieldLabel>
            <Input
              class="min-h-12! font-mono text-base!"
              id="new-variant-sku"
              value={field().state.value}
              aria-invalid={!field().state.meta.isValid}
              onBlur={() => field().handleBlur()}
              onInput={event => field().handleChange(event.currentTarget.value)}
            />
            <FieldDescription>
              Нэрээс автоматаар үүснэ. Шаардлагатай бол засаж болно.
            </FieldDescription>
            <FieldError errors={validationMessages(field().state.meta.errors)} />
          </Field>
        )}
      </props.form.Field>
    </>
  )
}

export function InitialVariantDetails(props: { form: ProductCreateForm }) {
  return (
    <>
      <props.form.Field name="initialVariant.name">
        {field => (
          <Field>
            <FieldLabel for="new-variant-name">Хувилбарын нэр</FieldLabel>
            <Input
              class="min-h-12! text-base!"
              id="new-variant-name"
              value={field().state.value}
              aria-invalid={!field().state.meta.isValid}
              onBlur={() => field().handleBlur()}
              onInput={event => field().handleChange(event.currentTarget.value)}
            />
            <FieldError errors={validationMessages(field().state.meta.errors)} />
          </Field>
        )}
      </props.form.Field>
      <props.form.Field name="initialVariant.compareAtPriceMnt">
        {field => (
          <Field>
            <FieldLabel for="new-variant-compare-price">Өмнөх үнэ (₮)</FieldLabel>
            <Input
              class="min-h-12! text-base! tabular-nums"
              id="new-variant-compare-price"
              inputmode="numeric"
              min="0"
              placeholder="Байхгүй"
              step="1"
              type="number"
              value={field().state.value ?? ''}
              onInput={event =>
                field().handleChange(
                  event.currentTarget.value === '' ? null : event.currentTarget.valueAsNumber,
                )
              }
            />
            <FieldError errors={validationMessages(field().state.meta.errors)} />
          </Field>
        )}
      </props.form.Field>
      <props.form.Field name="initialVariant.sortOrder">
        {field => (
          <Field>
            <FieldLabel for="new-variant-sort">Харагдах дараалал</FieldLabel>
            <Input
              class="min-h-12! text-base! tabular-nums"
              id="new-variant-sort"
              inputmode="numeric"
              min="0"
              step="1"
              type="number"
              value={Number.isNaN(field().state.value) ? '' : field().state.value}
              onInput={event => field().handleChange(event.currentTarget.valueAsNumber)}
            />
            <FieldError errors={validationMessages(field().state.meta.errors)} />
          </Field>
        )}
      </props.form.Field>
      <props.form.Field name="initialVariant.options">
        {field => (
          <Field class="sm:col-span-2">
            <FieldLabel>Сонголтууд</FieldLabel>
            <OptionRows value={field().state.value} onChange={field().handleChange} />
            <FieldDescription>Жишээ: хэмжээ — M, өнгө — хар.</FieldDescription>
            <FieldError errors={validationMessages(field().state.meta.errors)} />
          </Field>
        )}
      </props.form.Field>
    </>
  )
}
