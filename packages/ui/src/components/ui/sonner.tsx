import {
  CheckCircle,
  DangerCircle,
  DangerTriangle,
  InfoCircle,
  Restart,
} from '@solar-icons/solid/Linear'
import type { Component, ComponentProps, JSX } from 'solid-js'
import { Toaster as Sonner } from 'solid-sonner'

import { useColorMode } from '@/components/color-mode'

type ToasterProps = ComponentProps<typeof Sonner>

const Toaster: Component<ToasterProps> = props => {
  const { colorMode } = useColorMode()
  return (
    <Sonner
      theme={colorMode()}
      class="toaster group"
      position="top-center"
      icons={{
        success: <CheckCircle size={16} />,
        info: <InfoCircle size={16} />,
        warning: <DangerTriangle size={16} />,
        error: <DangerCircle size={16} />,
        loading: (
          <span class="inline-flex animate-spin">
            <Restart size={16} />
          </span>
        ),
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as JSX.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
