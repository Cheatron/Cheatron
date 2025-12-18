import { MemoryViewer, MemoryViewerOptions, ReadResult } from './viewer'
import type { Process } from '../process'

export interface MemoryGridOptions extends Omit<MemoryViewerOptions, 'maxAddress'> {
  rows: bigint
  cols: number
}

/**
 * MemoryGrid with global row/column addressing
 * Addresses are fixed based on minAddress + row * cols
 *
 * Implements Row Caching:
 * - Tracks which rows have data via a simple index
 * - Retrieves row data by querying the underlying MemoryViewer cache
 */
export class MemoryGrid extends MemoryViewer {
  private _totalRows: bigint
  private _cols: number

  // Row Cache - Tracks which rows have been touched/loaded
  private _rows: Set<bigint> = new Set()

  constructor(process: Process, options: MemoryGridOptions) {
    const minAddr = options.minAddress ?? 0n
    const maxAddr = minAddr + options.rows * BigInt(options.cols)

    super(process, {
      ...options,
      readLength: options.readLength ?? 0,
      minAddress: minAddr,
      maxAddress: maxAddr,
    })

    this._totalRows = options.rows
    this._cols = options.cols
  }

  // ─────────────────────────────────────────────────────────────
  // Core Logic
  // ─────────────────────────────────────────────────────────────

  /**
   * Handle read data - processes changes, updates cache, and notifies
   */
  onData(read: ReadResult): void {
    const colsBig = BigInt(this._cols)

    // Calculate range of rows affected by this read
    const startRowAddr = this.getRowAddress(read.address)
    const endRowAddr = this.getRowAddress(read.address + BigInt(read.newData.length) - 1n) // Inclusive end check

    // Iterate all rows touched by the new data
    let currentRowAddr = startRowAddr
    while (currentRowAddr <= endRowAddr) {
      // Intersect read data with this row
      const rowEndAddr = currentRowAddr + colsBig

      const overlapStart = read.address > currentRowAddr ? read.address : currentRowAddr
      const overlapEnd =
        read.address + BigInt(read.newData.length) < rowEndAddr
          ? read.address + BigInt(read.newData.length)
          : rowEndAddr

      if (overlapEnd > overlapStart) {
        // Notify grid about data arrival for this row
        this.addRow(currentRowAddr)
      }

      currentRowAddr += colsBig
    }

    // Update underlying cache AFTER notifying grid
    // This allows subclasses (ReactiveMemoryGrid) to diff against OLD cache state in addRow
    super.onData(read)
  }

  /**
   * Process a row update.
   * Default implementation: simply marks the row as existing in our index.
   * Override this method to handle updates in the consumer (e.g. update UI state).
   */
  public addRow(address: bigint): void {
    this._rows.add(address)
  }

  // ─────────────────────────────────────────────────────────────
  // Cache Eviction Override
  // ─────────────────────────────────────────────────────────────

  protected deleteCacheEntry(address: bigint, size: number): void {
    super.deleteCacheEntry(address, size)

    const startRow = this.getRowAddress(address)
    const endRow = this.getRowAddress(address + BigInt(size) - 1n)
    const colsBig = BigInt(this._cols)

    for (let rowAddr = startRow; rowAddr <= endRow; rowAddr += colsBig) {
      this.removeRow(rowAddr)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Cache Accessors / Helpers
  // ─────────────────────────────────────────────────────────────

  /**
   * Explicitly remove a row from cache.
   * Override this to handle row deletion in the consumer.
   */
  public removeRow(address: bigint): void {
    this._rows.delete(address)
  }

  /**
   * Calculate Row Start Address for any given address
   */
  getRowAddress(address: bigint): bigint {
    if (address < this._minAddress) return this._minAddress
    const offset = address - this._minAddress
    const rowIndex = offset / BigInt(this._cols)
    return this._minAddress + rowIndex * BigInt(this._cols)
  }

  get rows(): bigint {
    return this._totalRows
  }

  get cols(): number {
    return this._cols
  }

  // Public accessor for cached row count (for UI)
  get cachedRowCount(): number {
    return this._rows.size
  }

  /**
   * Retrieve row data split into valid chunks.
   * Returns chunks relative to the row start (offset 0..15).
   * Data is fetched from the underlying MemoryViewer cache.
   */
  public getRowData(address: bigint): Map<number, Uint8Array> | undefined {
    if (!this._rows.has(address)) return undefined

    // Fetch overlapping segments from Viewer
    const segments = this.read(address, this._cols)
    if (segments.size === 0) return undefined

    // Clip and align to row
    const rowEnd = address + BigInt(this._cols)
    const result = new Map<number, Uint8Array>()

    for (const [segAddr, segData] of segments) {
      const segEnd = segAddr + BigInt(segData.length)

      // Intersection
      const start = segAddr > address ? segAddr : address
      const end = segEnd < rowEnd ? segEnd : rowEnd

      if (end > start) {
        const offsetInRow = Number(start - address)
        const offsetInSeg = Number(start - segAddr)
        const len = Number(end - start)

        // Extract chunk
        const chunk = segData.subarray(offsetInSeg, offsetInSeg + len)
        result.set(offsetInRow, chunk)
      }
    }

    return result
  }
}
