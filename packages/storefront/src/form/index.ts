import { createFormHook } from '@tanstack/solid-form'

import { fieldContext, formContext, useFieldContext, useFormContext } from './context'
import { FormErrorSummary, FormFieldErrorState } from './errors'
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
    ErrorState: FormFieldErrorState,
  },
  formComponents: { SubmitButton, ErrorSummary: FormErrorSummary },
})

export { useFieldContext, useFormContext }
export {
  FormErrorSummary,
  FormFieldErrorState,
  createFormErrorController,
  fieldErrorIsVisible,
} from './errors'
export type { FieldErrorState, FormErrorSummaryItem, FormErrorSummaryState } from './errors'
export { PendingSubmitButton, SubmitButton } from './submit-button'
