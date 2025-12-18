import { useContext } from 'react'
import { ThemeProviderContext } from '@/components/theme-context'

export function useTheme() {
  const context = useContext(ThemeProviderContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
