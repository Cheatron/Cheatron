import { ReactiveMemoryGrid } from '../memory/reactive-grid'

/**
 * NetworkedMemoryGrid
 *
 * Automatically encodes all memory changes into compact binary packets
 * and sends them to the onFlush callback.
 */
import type { Process } from '../process'
import type { MemoryGridOptions } from '../memory/viewer-grid'

export class NetworkedMemoryGrid extends ReactiveMemoryGrid {
  private _chunks: Buffer[] = []
  private readonly fieldWidth: number
  private readonly headerLen: number
  private _onFlush: (packet: Buffer) => void

  constructor(process: Process, options: MemoryGridOptions, onFlush: (packet: Buffer) => void) {
    super(process, options)
    // this.cols is available via getter from MemoryGrid
    this.fieldWidth = this.cols < 256 ? 1 : 2
    this.headerLen = 8 + this.fieldWidth * 2
    this._onFlush = onFlush
  }

  private _encode(address: bigint, data: Uint8Array, offset: number) {
    const header = Buffer.allocUnsafe(this.headerLen)

    header.writeBigUInt64LE(address, 0)

    if (this.fieldWidth === 1) {
      header.writeUInt8(offset, 8)
      header.writeUInt8(data.length, 9)
    } else {
      header.writeUInt16LE(offset, 8)
      header.writeUInt16LE(data.length, 10)
    }

    this._chunks.push(header)
    if (data.length > 0) {
      this._chunks.push(Buffer.from(data))
    }
  }

  protected onNewRow(address: bigint, data: Uint8Array, offset: number) {
    this._encode(address, data, offset)
  }

  protected onUpdateRow(address: bigint, subData: Uint8Array, offset: number) {
    this._encode(address, subData, offset)
  }

  protected onExtendsRow(address: bigint, subData: Uint8Array, offset: number) {
    this._encode(address, subData, offset)
  }

  protected onRemoveRow(address: bigint) {
    const header = Buffer.allocUnsafe(this.headerLen)

    header.writeBigUInt64LE(address, 0)

    if (this.fieldWidth === 1) {
      header.writeUInt8(this.cols, 8)
      header.writeUInt8(0, 9)
    } else {
      header.writeUInt16LE(this.cols, 8)
      header.writeUInt16LE(0, 10)
    }

    this._chunks.push(header)
  }

  protected onChangesCommitted() {
    if (this._chunks.length === 0) return

    const totalLen = this._chunks.reduce((acc, c) => acc + c.length, 0)
    const packet = Buffer.concat(this._chunks, totalLen)

    this._onFlush(packet)
    this._chunks = []
  }
}
