import { ReactNode, useCallback, useEffect, useState } from 'react'
import {
  createSystemAccentPalette,
  DEFAULT_ACCENT_HEX,
  type SystemAccentPalette,
} from '@/lib/system-accent'
import {
  ThemeProviderContext,
  type ThemeColor,
  type ThemeMode,
  type ThemeProviderState,
} from './theme-context'

type ThemeProviderProps = {
  children: ReactNode
  defaultMode?: ThemeMode
  defaultColor?: ThemeColor
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultMode = 'dark',
  defaultColor = 'blue',
  storageKey = 'cheatron-theme',
  ...props
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode)
  const [color, setColorState] = useState<ThemeColor>(defaultColor)
  const [systemPalette, setSystemPalette] = useState<SystemAccentPalette>(() =>
    createSystemAccentPalette(),
  )

  const isBrowser = typeof window !== 'undefined'
  const storeBridge = isBrowser ? window.store : undefined

  const isThemeMode = (value: unknown): value is ThemeMode =>
    value === 'light' || value === 'dark' || value === 'system'

  const isThemeColor = (value: unknown): value is ThemeColor =>
    value === 'blue' ||
    value === 'violet' ||
    value === 'green' ||
    value === 'rose' ||
    value === 'orange' ||
    value === 'slate' ||
    value === 'system'

  const readPersistedValue = useCallback(
    async (key: string): Promise<unknown> => {
      try {
        if (storeBridge) {
          return await storeBridge.get(key)
        }
        if (isBrowser) {
          return window.localStorage.getItem(key) ?? undefined
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        window.logger.warn('Theme', 'Failed to read persisted theme value', { key, message })
      }
      return undefined
    },
    [storeBridge, isBrowser],
  )

  const persistValue = useCallback(
    async (key: string, value: string) => {
      try {
        if (storeBridge) {
          await storeBridge.set(key, value)
          return
        }
        if (isBrowser) {
          window.localStorage.setItem(key, value)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        window.logger.warn('Theme', 'Failed to persist theme value', { key, value, message })
      }
    },
    [storeBridge, isBrowser],
  )

  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      const [storedMode, storedColor] = await Promise.all([
        readPersistedValue(`${storageKey}-mode`),
        readPersistedValue(`${storageKey}-color`),
      ])

      if (cancelled) {
        return
      }

      if (isThemeMode(storedMode)) {
        setModeState(storedMode)
      }

      if (isThemeColor(storedColor)) {
        setColorState(storedColor)
      }
    }

    void hydrate()

    return () => {
      cancelled = true
    }
  }, [readPersistedValue, storageKey])

  // Combined effect to manage both mode and color classes
  useEffect(() => {
    if (!isBrowser) {
      return
    }

    const root = window.document.documentElement

    Object.entries(systemPalette.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }, [systemPalette, isBrowser])

  useEffect(() => {
    if (!isBrowser) {
      return
    }

    let cancelled = false

    const applyPalette = (hex?: string) => {
      const palette = createSystemAccentPalette(hex)
      setSystemPalette(previous => (previous.accentHex === palette.accentHex ? previous : palette))
    }

    const loadAccent = async () => {
      if (!window.system?.getAccentColor) {
        applyPalette(DEFAULT_ACCENT_HEX)
        return
      }

      try {
        const accentColor = await window.system.getAccentColor()
        if (cancelled) {
          return
        }

        if (accentColor) {
          applyPalette(accentColor)
          window.logger.debug('ThemeProvider', 'System accent color applied', {
            accentColor,
          })
        } else {
          window.logger.info('ThemeProvider', 'System accent color unavailable; using fallback')
          applyPalette(DEFAULT_ACCENT_HEX)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        window.logger.warn('ThemeProvider', 'Failed to load system accent color', { message })
        if (!cancelled) {
          applyPalette(DEFAULT_ACCENT_HEX)
        }
      }
    }

    void loadAccent()

    return () => {
      cancelled = true
    }
  }, [isBrowser])

  useEffect(() => {
    if (!isBrowser) {
      return
    }

    const root = window.document.documentElement

    // Disable transitions on first load
    root.classList.add('disable-transitions')

    // 1. Remove all mode classes
    root.classList.remove('light', 'dark')

    // 2. Add correct mode class
    if (mode === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(mode)
    }

    // 3. Remove all color theme classes
    root.classList.remove(
      'theme-blue',
      'theme-violet',
      'theme-green',
      'theme-rose',
      'theme-orange',
      'theme-slate',
      'theme-system',
    )

    // 4. Add current color theme and handle system accent color
    if (color === 'system') {
      root.classList.add('theme-system')
    } else {
      root.classList.add(`theme-${color}`)
    }

    // Enable transitions after a short delay
    setTimeout(() => {
      root.classList.remove('disable-transitions')
    }, 100)
  }, [mode, color, isBrowser])

  const value: ThemeProviderState = {
    mode,
    color,
    systemAccent: systemPalette.accentHex,
    setMode: (newMode: ThemeMode) => {
      setModeState(newMode)
      void persistValue(`${storageKey}-mode`, newMode)
    },
    setColor: (newColor: ThemeColor) => {
      setColorState(newColor)
      void persistValue(`${storageKey}-color`, newColor)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
