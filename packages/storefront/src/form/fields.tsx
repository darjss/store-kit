import { Input, NativeSelect, RadioGroup, Textarea } from '@store-kit/ui'
import { splitProps } from 'solid-js'
import type { ComponentProps } from 'solid-js'

import { useFieldContext, useFormContext } from './context'
import { fieldErrorIsVisible } from './errors'

const ariaInvalid = (
  value: ComponentProps<'input'>['aria-invalid'],
  fieldIsValid: boolean,
  fieldIsTouched: boolean,
  submissionAttempts: number,
) =>
  value === true ||
  value === 'true' ||
  (!fieldIsValid && fieldErrorIsVisible(fieldIsTouched, submissionAttempts))

type FormInputProps = Omit<ComponentProps<typeof Input>, 'name' | 'value' | 'onInput' | 'onBlur'>

export function FormInput(props: FormInputProps) {
  const [local, others] = splitProps(props, ['aria-invalid'])
  const field = useFieldContext<string>()
  const form = useFormContext()

  return (
    <form.Subscribe selector={state => state.submissionAttempts}>
      {submissionAttempts => (
        <Input
          {...others}
          name={field().name}
          value={field().state.value}
          aria-invalid={ariaInvalid(
            local['aria-invalid'],
            field().state.meta.isValid,
            field().state.meta.isTouched,
            submissionAttempts(),
          )}
          onInput={event => field().handleChange(event.currentTarget.value)}
          onBlur={() => field().handleBlur()}
        />
      )}
    </form.Subscribe>
  )
}

type FormTextareaProps = Omit<
  ComponentProps<typeof Textarea>,
  'name' | 'value' | 'onInput' | 'onBlur'
>

export function FormTextarea(props: FormTextareaProps) {
  const [local, others] = splitProps(props, ['aria-invalid'])
  const field = useFieldContext<string>()
  const form = useFormContext()

  return (
    <form.Subscribe selector={state => state.submissionAttempts}>
      {submissionAttempts => (
        <Textarea
          {...others}
          name={field().name}
          value={field().state.value}
          aria-invalid={ariaInvalid(
            local['aria-invalid'],
            field().state.meta.isValid,
            field().state.meta.isTouched,
            submissionAttempts(),
          )}
          onInput={event => field().handleChange(event.currentTarget.value)}
          onBlur={() => field().handleBlur()}
        />
      )}
    </form.Subscribe>
  )
}

type FormNativeSelectProps = Omit<
  ComponentProps<typeof NativeSelect>,
  'name' | 'value' | 'onChange' | 'onBlur'
>

export function FormNativeSelect(props: FormNativeSelectProps) {
  const [local, others] = splitProps(props, ['aria-invalid'])
  const field = useFieldContext<string>()
  const form = useFormContext()

  return (
    <form.Subscribe selector={state => state.submissionAttempts}>
      {submissionAttempts => (
        <NativeSelect
          {...others}
          name={field().name}
          value={field().state.value}
          aria-invalid={ariaInvalid(
            local['aria-invalid'],
            field().state.meta.isValid,
            field().state.meta.isTouched,
            submissionAttempts(),
          )}
          onChange={event => field().handleChange(event.currentTarget.value)}
          onBlur={() => field().handleBlur()}
        />
      )}
    </form.Subscribe>
  )
}

type FormRadioGroupProps = Pick<
  ComponentProps<'div'>,
  | 'children'
  | 'class'
  | 'id'
  | 'aria-describedby'
  | 'aria-invalid'
  | 'aria-label'
  | 'aria-labelledby'
> & {
  disabled?: boolean
}

export function FormRadioGroup(props: FormRadioGroupProps) {
  const field = useFieldContext<string>()
  const form = useFormContext()

  return (
    <form.Subscribe selector={state => state.submissionAttempts}>
      {submissionAttempts => (
        <RadioGroup
          class={props.class}
          id={props.id}
          name={field().name}
          value={field().state.value}
          disabled={props.disabled}
          aria-invalid={ariaInvalid(
            props['aria-invalid'],
            field().state.meta.isValid,
            field().state.meta.isTouched,
            submissionAttempts(),
          )}
          aria-describedby={props['aria-describedby']}
          aria-label={props['aria-label']}
          aria-labelledby={props['aria-labelledby']}
          onChange={value => field().handleChange(value)}
          onBlur={() => field().handleBlur()}
        >
          {props.children}
        </RadioGroup>
      )}
    </form.Subscribe>
  )
}
