import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import * as SwitchPrimitive from '@kobalte/core/switch'
import type { ComponentProps, ValidComponent } from 'solid-js'
import { mergeProps, splitProps } from 'solid-js'

import { cn } from '@/lib/utils'

type SwitchProps<T extends ValidComponent = 'div'> = PolymorphicProps<
  T,
  SwitchPrimitive.SwitchRootProps<T>
> &
  Pick<ComponentProps<T>, 'class' | 'children'> & {
    size?: 'sm' | 'default'
  }

const Switch = <T extends ValidComponent = 'div'>(props: SwitchProps<T>) => {
  const mergedProps = mergeProps({ size: 'default' as const }, props)
  const [local, others] = splitProps(mergedProps as SwitchProps, ['class', 'size', 'id'])

  return (
    <SwitchPrimitive.Root
      class={cn(
        'group/switch z-switch relative inline-flex items-center transition-all outline-none',
        local.class,
      )}
      data-size={local.size}
      data-slot="switch"
      {...others}
    >
      <SwitchPrimitive.Input class="peer sr-only" data-slot="switch-input" id={local.id} />
      <SwitchPrimitive.Control
        class="z-switch-control flex cursor-pointer items-center rounded-full transition-colors data-disabled:cursor-not-allowed"
        data-slot="switch-control"
        onClick={event => event.preventDefault()}
      >
        <SwitchPrimitive.Thumb
          class="z-switch-thumb pointer-events-none block rounded-full ring-0 transition-transform"
          data-slot="switch-thumb"
        />
      </SwitchPrimitive.Control>
    </SwitchPrimitive.Root>
  )
}

export { Switch, type SwitchProps }
