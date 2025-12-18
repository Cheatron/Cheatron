/// <reference types="vite/client" />

import { NativeConstantsType } from 'types/native/constants'
import { CapstoneHandle } from 'types/handles'
import { MemoryCreatePayload, MemoryUpdatePayload } from 'types/memory'

declare global {
  interface Window {
    app: {
      getVersion(): Promise<string>
    }
    logger: {
      debug(category: string, message: string, data?: unknown): void
      info(category: string, message: string, data?: unknown): void
      warn(category: string, message: string, data?: unknown): void
      error(category: string, message: string, data?: unknown): void
      open(): Promise<void>
    }
    process: {
      getPlatform(): Promise<NodeJS.Platform>
      getArch(): Promise<NodeJS.Architecture>
      getVersions(): Promise<NodeJS.ProcessVersions>
      main: {
        getPID(): Promise<ProcessID>
        getPPID(): Promise<ProcessID>
      }
    }
    system: {
      getAccentColor(): Promise<string>
    }
    native: {
      getVersion(): Promise<string>
      getConstants(): Promise<NativeConstantsType>
    }

    // Main ProcessIDs
    mainPID: ProcessID
    mainPPID: ProcessID

    platform: NodeJS.Platform
    arch: NodeJS.Architecture

    nativeVersion: string
    nativeConstants: NativeConstantsType

    // Global version info
    version: string
    versions: NodeJS.ProcessVersions & {
      app: string
      native: string
    }

    cs?: {
      open(arch: number, mode: number): Promise<CapstoneHandle>
      close(handle: CapstoneHandle): Promise<void>
    }
    memory?: {
      create(config: Omit<MemoryCreatePayload, 'id'> & { id: string }): Promise<void>
      update(config: Omit<MemoryUpdatePayload, 'id'> & { id: string }): Promise<void>
      destroy(id: string): Promise<void>
      onData(id: string, callback: (data: Uint8Array) => void): void
      offData(id: string, callback: (data: Uint8Array) => void): void
    }
    store?: {
      get<T = unknown>(key: string): Promise<T | undefined>
      set<T = unknown>(key: string, value: T): Promise<unknown>
      delete(key: string): Promise<unknown>
    }
    updater?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checkForUpdates(): Promise<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      downloadUpdate(): Promise<any>
      quitAndInstall(): Promise<void>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on(channel: string, callback: (...args: any[]) => void): void
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      off(channel: string, callback: (...args: any[]) => void): void
    }
  }
}

export {}
