import { MemoryGridConfig, MemoryUpdateConfig, MemoryGridCallbacks } from 'types/memory'

export type MemoryDataCallback = (data: Uint8Array) => void

export class MemoryGrid {
  public readonly id: string
  private readonly fieldWidth: number

  private _config: MemoryGridConfig
  private _rows = new Map<bigint, Map<number, Uint8Array>>()

  constructor(config: MemoryGridConfig, id?: string) {
    this.id = id || crypto.randomUUID()
    this._config = config
    this.fieldWidth = this._config.cols < 256 ? 1 : 2

    this._init()
  }

  private async _init() {
    this.onData(this.processPacket.bind(this))

    await window.memory?.create({
      id: this.id,
      ...this._config,
    })
  }

  protected processPacket(buffer: Uint8Array) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

    let cursor = 0
    while (cursor < buffer.byteLength) {
      const address = view.getBigUint64(cursor, true)
      cursor += 8

      let offset: number
      let length: number

      if (this.fieldWidth === 1) {
        offset = view.getUint8(cursor)
        length = view.getUint8(cursor + 1)
        cursor += 2
      } else {
        offset = view.getUint16(cursor, true)
        length = view.getUint16(cursor + 2, true)
        cursor += 4
      }

      // Check for removal (offset == cols)
      if (offset === this._config.cols) {
        if (this._rows.has(address)) {
          this.deleteRow(address)
        }
        continue
      }

      if (length > 0) {
        const data = new Uint8Array(buffer.slice(cursor, cursor + length))
        cursor += length

        const row = this._rows.get(address)
        if (!row) {
          // New Row
          this.newRow(address, data, offset)
        } else {
          if (!this.tryUpdateRow(address, data, offset)) {
            this.extendsRow(address, data, offset)
          }
        }
      }
    }
  }

  protected newRow(address: bigint, data: Uint8Array, offset: number) {
    const row = new Map<number, Uint8Array>()
    row.set(offset, data)
    this._rows.set(address, row)
  }

  protected tryUpdateRow(address: bigint, subData: Uint8Array, offset: number): boolean {
    const row = this._rows.get(address)
    if (!row) return false

    const end = offset + subData.length
    for (const [rowOffset, rowData] of row) {
      if (offset < rowOffset) continue

      const rowEnd = rowOffset + rowData.length
      if (end > rowEnd) continue

      rowData.set(subData, offset - rowOffset)
      return true
    }

    return false
  }

  protected extendsRow(address: bigint, subData: Uint8Array, offset: number) {
    const row = this._rows.get(address)
    if (!row) return

    let prevOffset: number | undefined
    let nextOffset: number | undefined

    // Find adjacent chunks
    const end = offset + subData.length
    for (const [off, data] of row) {
      if (off + data.length === offset) {
        prevOffset = off
      }
      if (off === end) {
        nextOffset = off
      }
    }

    let finalOffset = offset
    let finalData = subData

    // Merge with previous
    if (prevOffset !== undefined) {
      const prevData = row.get(prevOffset)!
      const merged = new Uint8Array(prevData.length + finalData.length)
      merged.set(prevData, 0)
      merged.set(finalData, prevData.length)

      finalData = merged
      finalOffset = prevOffset

      row.delete(prevOffset)
    }

    // Merge with next
    if (nextOffset !== undefined) {
      const nextData = row.get(nextOffset)!
      const merged = new Uint8Array(finalData.length + nextData.length)
      merged.set(finalData, 0)
      merged.set(nextData, finalData.length)

      finalData = merged
      // Offset remains same as current finalOffset (which includes prev if merged)

      row.delete(nextOffset)
    }

    row.set(finalOffset, finalData)
  }

  protected deleteRow(address: bigint) {
    this._rows.delete(address)
  }

  public async update(config: MemoryUpdateConfig) {
    if (!window.memory) return

    // Update local state if needed (optional)
    this._config = { ...this._config, ...config }

    await window.memory.update({
      id: this.id,
      ...config,
    })
  }

  public onData(callback: MemoryDataCallback) {
    window.memory?.onData(this.id, callback)
  }

  public offData(callback: MemoryDataCallback) {
    window.memory?.offData(this.id, callback)
  }

  public async destroy() {
    await window.memory?.destroy(this.id)
  }

  public getRow(address: bigint): Map<number, Uint8Array> | undefined {
    return this._rows.get(address)
  }

  // Get all cached rows
  public getAllRows(): Map<bigint, Map<number, Uint8Array>> {
    return this._rows
  }
}

export class CallbackMemoryGrid extends MemoryGrid {
  private _callbacks: MemoryGridCallbacks

  constructor(config: MemoryGridConfig, callbacks: MemoryGridCallbacks, id?: string) {
    super(config, id)
    this._callbacks = callbacks
  }

  protected newRow(address: bigint, data: Uint8Array, offset: number) {
    super.newRow(address, data, offset)
    this._callbacks.onNewRow?.(address, data, offset)
  }

  protected tryUpdateRow(address: bigint, subData: Uint8Array, offset: number): boolean {
    const updated = super.tryUpdateRow(address, subData, offset)
    if (updated) this._callbacks.onUpdateRow?.(address, subData, offset)
    return updated
  }

  protected extendsRow(address: bigint, subData: Uint8Array, offset: number) {
    super.extendsRow(address, subData, offset)
    this._callbacks.onExtendsRow?.(address, subData, offset)
  }

  protected deleteRow(address: bigint) {
    super.deleteRow(address)
    this._callbacks.onRemoveRow?.(address)
  }

  protected processPacket(buffer: Uint8Array): void {
    this._callbacks.onData?.()
    super.processPacket(buffer)
    this._callbacks.onChangesCommitted?.()
  }
}
