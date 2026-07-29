import { Button } from '@store-kit/ui'
import type { JSX } from 'solid-js'

const acceptedImageTypes = 'image/jpeg,image/png,image/webp,image/avif'

type ImageFilePickerProps = {
  id: string
  file: File | undefined
  inputRef?: (element: HTMLInputElement) => void
  onChange: (file: File | undefined) => void
}

export function ImageFilePicker(props: ImageFilePickerProps) {
  let inputElement: HTMLInputElement | undefined
  const selectFile: JSX.EventHandler<HTMLInputElement, Event> = event =>
    props.onChange(event.currentTarget.files?.[0])

  return (
    <div class="flex min-w-0 flex-wrap items-center gap-3">
      <input
        accept={acceptedImageTypes}
        class="hidden"
        id={props.id}
        ref={element => {
          inputElement = element
          props.inputRef?.(element)
        }}
        type="file"
        onChange={selectFile}
      />
      <Button
        class="min-h-11! shrink-0"
        onClick={() => inputElement?.click()}
        type="button"
        variant="outline"
      >
        Зураг сонгох
      </Button>
      <span class="min-w-0 truncate text-sm text-muted-foreground" role="status">
        {props.file?.name ?? 'Файл сонгоогүй'}
      </span>
    </div>
  )
}
