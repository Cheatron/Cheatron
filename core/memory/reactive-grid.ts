import { MemoryGrid, MemoryGridOptions } from './viewer-grid'
import { ReadResult } from './viewer'
import type { Process } from '../process'

export interface ReactiveGridCallbacks {
  onNewRow?: (address: bigint, data: Uint8Array, offset: number) => void
  onUpdateRow?: (address: bigint, subData: Uint8Array, offset: number) => void
  onExtendsRow?: (address: bigint, subData: Uint8Array, offset: number) => void
  onRemoveRow?: (address: bigint) => void
  onChangesCommitted?: () => void
}

/**
 * ReactiveMemoryGrid
 * Extends MemoryGrid to provide detailed change detection callbacks.
 * Distinguishes between new rows, updates to existing rows, and removals.
 */
export class ReactiveMemoryGrid extends MemoryGrid {
  private _lastData: ReadResult | null = null
  private _hasChanges: boolean = false

  constructor(process: Process, options: MemoryGridOptions) {
    super(process, options)
  }

  // Virtual methods for subclasses to override
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onNewRow(_address: bigint, _data: Uint8Array, _offset: number): void {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onUpdateRow(_address: bigint, _subData: Uint8Array, _offset: number): void {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onExtendsRow(_address: bigint, _subData: Uint8Array, _offset: number): void {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onRemoveRow(_address: bigint): void {}
  protected onChangesCommitted(): void {}

  onData(read: ReadResult): void {
    // Reset change tracker for this batch
    this._hasChanges = false

    // Store current read for use in addRow (which runs BEFORE super.onData updates cache)
    this._lastData = read

    // Process rows (this calls addRow internally)
    // IMPORTANT: MemoryGrid.onData calls super.onData at the END.
    // So when addRow runs, this._lastData is the NEW data,
    // but this.getRowData() returns the OLD data from cache.
    super.onData(read)

    this._lastData = null

    // If any changes occurred during this processing, notify consumer
    if (this._hasChanges) {
      this.onChangesCommitted()
      this._hasChanges = false
    }
  }

  addRow(address: bigint): void {
    // 1. Get Old Data from Cache (before update)
    const oldRowMap = this.getRowData(address)

    // 2. Identify New Data Chunk for this row from _lastData
    if (!this._lastData) {
      // Should not happen if called via onData flow
      super.addRow(address)
      return
    }

    const read = this._lastData
    const colsBig = BigInt(this.cols)
    const rowEndAddr = address + colsBig

    // Intersect _lastData with this row to find the new chunk
    // (Logic duplicated from MemoryGrid to isolate the chunk)
    const overlapStart = read.address > address ? read.address : address
    const overlapEnd =
      read.address + BigInt(read.newData.length) < rowEndAddr
        ? read.address + BigInt(read.newData.length)
        : rowEndAddr

    if (overlapEnd <= overlapStart) {
      super.addRow(address)
      return
    }

    const rowOffset = Number(overlapStart - address)
    const dataOffset = Number(overlapStart - read.address)
    const len = Number(overlapEnd - overlapStart)
    const newChunk = read.newData.subarray(dataOffset, dataOffset + len)

    // 3. Diff Logic
    if (!oldRowMap || oldRowMap.size === 0) {
      // New Row!
      super.addRow(address)
      this.onNewRow(address, newChunk, rowOffset)
      this._hasChanges = true
    } else {
      // Update or Extend!
      // We need to categorize each byte as UPDATE (exists -> changed) or EXTEND (undefined -> set)

      let currentMode: 'none' | 'update' | 'extend' = 'none'
      let chunkStart = -1

      for (let i = 0; i < len; i++) {
        const offset = rowOffset + i
        const newVal = newChunk[i]

        // Find old byte
        let oldVal: number | undefined
        // Optimization: oldRowMap usually has few chunks (often 1).
        for (const [cOff, cDat] of oldRowMap) {
          if (offset >= cOff && offset < cOff + cDat.length) {
            oldVal = cDat[offset - cOff]
            break
          }
        }

        let newMode: 'none' | 'update' | 'extend' = 'none'

        if (oldVal === undefined) {
          newMode = 'extend'
        } else if (oldVal !== newVal) {
          newMode = 'update'
        } else {
          newMode = 'none' // Unchanged
        }

        if (newMode !== currentMode) {
          // Close previous chunk
          if (currentMode === 'update') {
            const sub = newChunk.subarray(chunkStart, i)
            this.onUpdateRow(address, sub, rowOffset + chunkStart)
            this._hasChanges = true
          } else if (currentMode === 'extend') {
            const sub = newChunk.subarray(chunkStart, i)
            this.onExtendsRow(address, sub, rowOffset + chunkStart)
            this._hasChanges = true
          }

          // Start new chunk
          currentMode = newMode
          chunkStart = i
        }
      }

      // Close final chunk
      if (currentMode === 'update') {
        const sub = newChunk.subarray(chunkStart, len)
        this.onUpdateRow(address, sub, rowOffset + chunkStart)
        this._hasChanges = true
      } else if (currentMode === 'extend') {
        const sub = newChunk.subarray(chunkStart, len)
        this.onExtendsRow(address, sub, rowOffset + chunkStart)
        this._hasChanges = true
      }

      super.addRow(address)
    }
  }

  removeRow(address: bigint): void {
    super.removeRow(address)
    this.onRemoveRow(address)
    this._hasChanges = true
  }
}

/**
 * CallbackMemoryGrid
 *
 * Legacy-style wrapper that delegates events to a callbacks object.
 */
export class CallbackMemoryGrid extends ReactiveMemoryGrid {
  private _callbacks: ReactiveGridCallbacks

  constructor(process: Process, options: MemoryGridOptions, callbacks: ReactiveGridCallbacks) {
    super(process, options)
    this._callbacks = callbacks
  }

  protected onNewRow(address: bigint, data: Uint8Array, offset: number) {
    this._callbacks.onNewRow?.(address, data, offset)
  }

  protected onUpdateRow(address: bigint, subData: Uint8Array, offset: number) {
    this._callbacks.onUpdateRow?.(address, subData, offset)
  }

  protected onExtendsRow(address: bigint, subData: Uint8Array, offset: number) {
    this._callbacks.onExtendsRow?.(address, subData, offset)
  }

  protected onRemoveRow(address: bigint) {
    this._callbacks.onRemoveRow?.(address)
  }

  protected onChangesCommitted() {
    this._callbacks.onChangesCommitted?.()
  }
}
