export interface MemoryUpdateConfig {
  cursor?: bigint
  readLength?: number
  debounceMs?: number
  autoRefreshMs?: number
}

export interface MemoryGridConfig extends MemoryUpdateConfig {
  cols: number
  rows: bigint
  minAddress?: bigint
  cacheDistance?: number
}

// IPC Payload types
export interface MemoryCreatePayload extends MemoryGridConfig {
  id: string
}

export interface MemoryUpdatePayload extends MemoryUpdateConfig {
  id: string
}

export interface MemoryGridCallbacks {
  onData?: () => void
  onNewRow?: (address: bigint, data: Uint8Array, offset: number) => void
  onUpdateRow?: (address: bigint, subData: Uint8Array, offset: number) => void
  onExtendsRow?: (address: bigint, subData: Uint8Array, offset: number) => void
  onRemoveRow?: (address: bigint) => void
  onChangesCommitted?: () => void
}
