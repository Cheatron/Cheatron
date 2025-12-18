export class MemoryUtils {
  static canRead(protect: number): boolean {
    return !!(
      protect & nativeConstants.PAGE_READONLY ||
      protect & nativeConstants.PAGE_READWRITE ||
      protect & nativeConstants.PAGE_EXECUTE_READ ||
      protect & nativeConstants.PAGE_EXECUTE_READWRITE
    )
  }

  static canWrite(protect: number): boolean {
    return !!(
      protect & nativeConstants.PAGE_READWRITE ||
      protect & nativeConstants.PAGE_WRITECOPY ||
      protect & nativeConstants.PAGE_EXECUTE_READWRITE ||
      protect & nativeConstants.PAGE_EXECUTE_WRITECOPY
    )
  }

  static canExecute(protect: number): boolean {
    return !!(
      protect & nativeConstants.PAGE_EXECUTE ||
      protect & nativeConstants.PAGE_EXECUTE_READ ||
      protect & nativeConstants.PAGE_EXECUTE_READWRITE ||
      protect & nativeConstants.PAGE_EXECUTE_WRITECOPY
    )
  }

  static canCopy(protect: number): boolean {
    return !!(
      protect & nativeConstants.PAGE_WRITECOPY || protect & nativeConstants.PAGE_EXECUTE_WRITECOPY
    )
  }

  static isGuarded(protect: number): boolean {
    return !!(protect & nativeConstants.PAGE_GUARD)
  }

  static isNoAccess(protect: number): boolean {
    return !!(protect & nativeConstants.PAGE_NOACCESS)
  }

  static canAccess(protect: number): boolean {
    return !MemoryUtils.isNoAccess(protect) && !MemoryUtils.isGuarded(protect)
  }

  static getProtectionString(p: number): string {
    const r = MemoryUtils.canRead(p) ? 'R' : '-'
    const w = MemoryUtils.canWrite(p) ? 'W' : '-'
    const x = MemoryUtils.canExecute(p) ? 'X' : '-'
    return `${r}${w}${x}`
  }
}
