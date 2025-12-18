import { createContext } from 'react'

export type ThemeMode = 'dark' | 'light' | 'system'
export type ThemeColor = 'blue' | 'violet' | 'green' | 'rose' | 'orange' | 'slate' | 'system'

export type ThemeProviderState = {
  mode: ThemeMode
  color: ThemeColor
  systemAccent: string
  setMode: (mode: ThemeMode) => void
  setColor: (color: ThemeColor) => void
}

const noop = () => undefined

export const defaultThemeState: ThemeProviderState = {
  mode: 'system',
  color: 'blue',
  systemAccent: '#3b82f6', // Default blue-500
  setMode: noop,
  setColor: noop,
}

export const ThemeProviderContext = createContext<ThemeProviderState>(defaultThemeState)

import { useContext } from 'react'

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
