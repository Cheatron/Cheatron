import { systemPreferences } from 'electron'
import { IpcServer } from './ipc-server'

export class AccentColorServer extends IpcServer {
  private accentColor: string

  constructor() {
    super()
    this.accentColor = this.getAccentColorSafe()
  }

  protected setupIpc() {
    this.addHandle('system:getAccentColor', () => {
      return this.accentColor
    })
  }

  private getAccentColorSafe(): string {
    const fallbackColor = '#0078d4'
    try {
      // systemPreferences.getAccentColor returns a hex string without hash on some platforms?
      // Electron docs: "Returns String - The users current system wide accent color preference in RGBA hexadecimal rrggbbaa format."
      // Actually on Windows it is usually rrggbb.
      // We'll trust the method returns something usable or we catch it.
      // If the user code was adding '#' we might need to check.
      // User snippet: `return systemPreferences.getAccentColor?.() || fallbackColor`
      // It implies direct return is fine.

      const color = systemPreferences.getAccentColor?.()
      if (!color) return fallbackColor

      // Ensure it has # if it's a hex code (usually electron returns just the hex without #)
      // BUT if the user's fallback has #, they probably expect #.
      // Electron `getAccentColor` returns "aabbcc".
      // Let's assume we should prepend # if missing and it looks like hex.

      // However, looking at the previous implementation in main.ts scan (user modified):
      // return systemPreferences.getAccentColor?.() || fallbackColor
      // It didn't add #. So maybe the frontend handles it or I should replicate "exactly" but simpler.
      // Wait, if fallback is #0078d4, and system returns "aabbcc", that's inconsistent.
      // Most Electron apps prepend #.
      // let's blindly return what `getAccentColor` returns if valid.

      // Better yet, let's add # if it's missing, to be truly "safe" and consistent.
      // But user just said "her zaman bir değeri olmak zorunda olsun" (must always have a value).

      return color.startsWith('#') ? color : `#${color}`
    } catch (error) {
      logger.warn('AccentColor', 'Failed to get accent color', error)
      return fallbackColor
    }
  }
}
