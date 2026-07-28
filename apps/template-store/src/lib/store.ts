/* oxlint-disable import/no-relative-parent-imports */
import { parseStoreConfig } from '@store-kit/config'

import storeJson from '../../store.json'

export const store = parseStoreConfig(storeJson)

export const defaultTheme = {
  accent: '#2c4bff',
  ink: '#17150f',
  surface: '#f4f3ee',
  radius: 'md',
} as const

export const theme = store.theme ?? defaultTheme

export const radiusValues = {
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.625rem',
} as const
