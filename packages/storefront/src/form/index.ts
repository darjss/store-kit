import { createFormHook } from '@tanstack/solid-form'

import { fieldContext, formContext, useFieldContext, useFormContext } from './context'
import { FormInput, FormNativeSelect, FormRadioGroup, FormTextarea } from './fields'
import { SubmitButton } from './submit-button'

export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    Input: FormInput,
    Textarea: FormTextarea,
    NativeSelect: FormNativeSelect,
    RadioGroup: FormRadioGroup,
  },
  formComponents: { SubmitButton },
})

export { useFieldContext, useFormContext }
export { PendingSubmitButton, SubmitButton } from './submit-button'
export { jsonPointerToFieldName, typeboxValidator } from './typebox-validator'
