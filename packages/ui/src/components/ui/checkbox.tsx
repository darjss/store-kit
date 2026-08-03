import * as CheckboxPrimitive from '@kobalte/core/checkbox'
import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import { CheckRead } from '@solar-icons/solid/Linear'
import type { ComponentProps, ValidComponent } from 'solid-js'
import { splitProps } from 'solid-js'

import { cn } from '@/lib/utils'

type CheckboxProps<T extends ValidComponent = 'div'> = PolymorphicProps<
  T,
  CheckboxPrimitive.CheckboxRootProps<T>
> &
  Pick<ComponentProps<T>, 'class' | 'children'>

const Checkbox = <T extends ValidComponent = 'div'>(props: CheckboxProps<T>) => {
  const [local, others] = splitProps(props as CheckboxProps, ['class', 'children', 'id'])

  return (
    <CheckboxPrimitive.Root
      class={cn(
        'group/checkbox inline-flex min-h-5 items-center gap-2 text-xs text-foreground outline-none data-disabled:cursor-not-allowed data-disabled:opacity-50',
        local.class,
      )}
      data-slot="checkbox"
      id={local.id}
      {...others}
    >
      <CheckboxPrimitive.Input class="peer sr-only" />
      <CheckboxPrimitive.Control class="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-input bg-background text-primary-foreground transition-colors duration-150 outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background data-checked:border-primary data-checked:bg-primary data-disabled:cursor-not-allowed">
        <CheckboxPrimitive.Indicator>
          <CheckRead aria-hidden="true" size={12} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Control>
      <CheckboxPrimitive.Label class="cursor-pointer select-none group-data-disabled/checkbox:cursor-not-allowed">
        {local.children}
      </CheckboxPrimitive.Label>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox, type CheckboxProps }
