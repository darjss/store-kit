import { Input, NativeSelect, RadioGroup, Textarea } from '@store-kit/ui'
import { splitProps } from 'solid-js'
import type { ComponentProps } from 'solid-js'

import { useFieldContext } from './context'

const ariaInvalid = (value: ComponentProps<'input'>['aria-invalid'], fieldIsValid: boolean) =>
  value === true || value === 'true' || !fieldIsValid

type FormInputProps = Omit<ComponentProps<typeof Input>, 'name' | 'value' | 'onInput' | 'onBlur'>

export function FormInput(props: FormInputProps) {
  const [local, others] = splitProps(props, ['aria-invalid'])
  const field = useFieldContext<string>()

  return (
    <Input
      {...others}
      name={field().name}
      value={field().state.value}
      aria-invalid={ariaInvalid(local['aria-invalid'], field().state.meta.isValid)}
      onInput={event => field().handleChange(event.currentTarget.value)}
      onBlur={() => field().handleBlur()}
    />
  )
}

type FormTextareaProps = Omit<
  ComponentProps<typeof Textarea>,
  'name' | 'value' | 'onInput' | 'onBlur'
>

export function FormTextarea(props: FormTextareaProps) {
  const [local, others] = splitProps(props, ['aria-invalid'])
  const field = useFieldContext<string>()

  return (
    <Textarea
      {...others}
      name={field().name}
      value={field().state.value}
      aria-invalid={ariaInvalid(local['aria-invalid'], field().state.meta.isValid)}
      onInput={event => field().handleChange(event.currentTarget.value)}
      onBlur={() => field().handleBlur()}
    />
  )
}

type FormNativeSelectProps = Omit<
  ComponentProps<typeof NativeSelect>,
  'name' | 'value' | 'onChange' | 'onBlur'
>

export function FormNativeSelect(props: FormNativeSelectProps) {
  const [local, others] = splitProps(props, ['aria-invalid'])
  const field = useFieldContext<string>()

  return (
    <NativeSelect
      {...others}
      name={field().name}
      value={field().state.value}
      aria-invalid={ariaInvalid(local['aria-invalid'], field().state.meta.isValid)}
      onChange={event => field().handleChange(event.currentTarget.value)}
      onBlur={() => field().handleBlur()}
    />
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

  return (
    <RadioGroup
      class={props.class}
      id={props.id}
      name={field().name}
      value={field().state.value}
      disabled={props.disabled}
      aria-invalid={ariaInvalid(props['aria-invalid'], field().state.meta.isValid)}
      aria-describedby={props['aria-describedby']}
      aria-label={props['aria-label']}
      aria-labelledby={props['aria-labelledby']}
      onChange={value => field().handleChange(value)}
      onBlur={() => field().handleBlur()}
    >
      {props.children}
    </RadioGroup>
  )
}
