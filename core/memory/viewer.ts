import type { Process } from '../process'
import { NativeMemoryRegion } from 'types/native/index'

/**
 * MemoryViewer options
 */
export interface MemoryViewerOptions {
  /** Debounce time in ms for setCursor - delays refresh after cursor changes */
  debounceMs: number
  /** Auto-refresh interval in seconds, 0 = disabled */
  autoRefreshMs: number
  /** Number of bytes to read, default 0 */
  readLength?: number
  /** Initial cursor position, default 0 */
  cursor?: bigint
  /** Max distance from cursor to keep in cache (bytes), default 4096 */
  cacheDistance?: number
  /** Minimum address boundary - viewer will never read below this */
  minAddress?: bigint
  /** Maximum address boundary - viewer will never read at or above this */
  maxAddress?: bigint
}

/**
 * Memory segments map: address -> buffer
 */
export type MemorySegments = Map<bigint, Uint8Array>

/**
 * Result of a memory read operation
 * Contains the read data and the merged segment it was placed into
 */
export interface ReadResult {
  address: bigint // Address where data was read from
  newData: Uint8Array // The newly read data
  segment: Uint8Array | null // The merged segment containing the data (null if no existing cache overlap)
  segmentAddress: bigint // Start address of the segment
  region: NativeMemoryRegion // Memory region info
  toDelete: bigint[] // Addresses to delete from cache upon merge
  validRanges?: Array<{ offset: number; length: number }> // Ranges in segment that contain valid old data
}

/**
 * Memory viewer for CLI - handles debounced reading with caching
 * Uses memory.query to respect region boundaries
 */
export class MemoryViewer {
  private _process: Process
  private _cursor: bigint = 0n
  private _readLength: number
  private _currentRegion: NativeMemoryRegion | null = null

  // Timing settings
  private _debounceMs: number
  private _autoRefreshMs: number
  private _cacheDistance: number

  // Address boundaries
  protected _minAddress: bigint
  protected _maxAddress: bigint

  // Unified cache: Map<Address, Buffer>
  // Buffers are merged when adjacent
  private _cache: Map<bigint, Uint8Array> = new Map()

  // Region cache: Map<Address, Region> - stores region for each cached buffer
  private _regionCache: Map<bigint, NativeMemoryRegion> = new Map()

  // Timers
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null
  private _refreshTimer: ReturnType<typeof setInterval> | null = null
  private _isDebouncing: boolean = false

  /**
   * Synchronously retrieve data from standard cache if available.
   * Does not trigger new reads. Stitches multiple segments if necessary.
   */
  public readToBuffer(address: bigint, length: number): Uint8Array | undefined {
    if (length <= 0) return undefined

    const end = address + BigInt(length)
    const result = new Uint8Array(length)
    let bytesFound = 0

    // Naive iteration over map (could be improved if SortedMap)
    // Assuming cache size is managed and not massive
    for (const [segAddr, segData] of this._cache) {
      const segEnd = segAddr + BigInt(segData.length)

      // Check overlap
      const overlapStart = segAddr > address ? segAddr : address
      const overlapEnd = segEnd < end ? segEnd : end

      if (overlapEnd > overlapStart) {
        const offsetInResult = Number(overlapStart - address)
        const offsetInSeg = Number(overlapStart - segAddr)
        const len = Number(overlapEnd - overlapStart)

        result.set(segData.subarray(offsetInSeg, offsetInSeg + len), offsetInResult)

        bytesFound += len
      }
    }

    // Since we want "hızlıca okuycak" (fast read), maybe returning partial is OK?
    // But caller usually expects full buffer or null/partial.
    // For now, return what we found. If 0 bytes found, return null.
    if (bytesFound === 0) return undefined

    // Optional: Check if we have holes?
    // User requirement: "o row okunmak istediğinde cols length kadar hızlıca okuycak"
    // Usually implies assuming data exists.
    return result
  }

  private _emitRead(address: bigint, data: Uint8Array, region: NativeMemoryRegion): void {
    if (data.length === 0) return

    const newEnd = address + BigInt(data.length)

    // Find buffers that touch or overlap with new data
    let mergeStart = address
    let mergeEnd = newEnd
    const toMerge: Array<{ address: bigint; data: Uint8Array }> = []
    const toDelete: bigint[] = []

    for (const [addr, buf] of this._cache) {
      // Since cache is sorted (by _sortCache or insertion order),
      // if we passed the end of new data, we can stop
      if (addr > newEnd) break

      const bufEnd = addr + BigInt(buf.length)

      if (bufEnd >= address && addr <= newEnd) {
        toMerge.push({ address: addr, data: buf })
        toDelete.push(addr)

        if (addr < mergeStart) mergeStart = addr
        if (bufEnd > mergeEnd) mergeEnd = bufEnd
      }
    }

    let merged: Uint8Array | null = null
    const validRanges: Array<{ offset: number; length: number }> = []

    if (toMerge.length > 0) {
      // Create merged buffer
      const mergedLength = Number(mergeEnd - mergeStart)
      merged = new Uint8Array(mergedLength)

      // Copy existing data first
      for (const { address: addr, data: buf } of toMerge) {
        const offset = Number(addr - mergeStart)
        merged.set(buf, offset)
        validRanges.push({ offset, length: buf.length })
      }
    }

    // Emit read event via onData
    // Users should override onData to handle changes and calling mergeRead
    this.onData({
      address: address,
      newData: data,
      segment: merged,
      segmentAddress: mergeStart,
      region: region,
      toDelete: toDelete,
      validRanges: validRanges.length > 0 ? validRanges : undefined,
    })
  }

  // Last read result for callback
  private _lastReadResult: ReadResult | null = null

  constructor(process: Process, options: MemoryViewerOptions) {
    this._process = process
    this._readLength = options.readLength ?? 0
    this._cursor = options.cursor ?? 0n
    this._debounceMs = options.debounceMs
    this._autoRefreshMs = options.autoRefreshMs
    this._cacheDistance = options.cacheDistance ?? 4096
    this._minAddress = options.minAddress ?? 0n
    this._maxAddress = options.maxAddress ?? 0xffff_ffff_ffff_ffffn
  }

  // ─────────────────────────────────────────────────────────────
  // Getters
  // ─────────────────────────────────────────────────────────────

  get cursor(): bigint {
    return this._cursor
  }

  get readLength(): number {
    return this._readLength
  }

  set debounce(v: number) {
    this._debounceMs = v
  }

  set autoRefresh(v: number) {
    this._autoRefreshMs = v
    if (v > 0) this.start()
    else this.stop()
  }

  get region(): NativeMemoryRegion | null {
    return this._currentRegion
  }

  get cache(): Map<bigint, Uint8Array> {
    return this._cache
  }

  /**
   * Handle read data.
   * Override this method to implement custom logic (highlighting, etc).
   * Default implementation merges data into cache.
   */
  onData(read: ReadResult): void {
    this.mergeRead(read)
  }

  /**
   * Apply a read result to the cache.
   * This must be called from the callback to commit changes.
   */
  mergeRead(read: ReadResult): void {
    // Delete old entries
    for (const addr of read.toDelete) {
      this._cache.delete(addr)
      this._regionCache.delete(addr)
    }

    if (read.segment === null) {
      // No merge needed, store new data directly
      this._cache.set(read.address, read.newData)
      this._regionCache.set(read.address, read.region)
    } else {
      // Copy new data
      const offset = Number(read.address - read.segmentAddress)
      read.segment.set(read.newData, offset)

      // Store merged buffer and region
      this._cache.set(read.segmentAddress, read.segment)
      this._regionCache.set(read.segmentAddress, read.region)
    }

    // Maintenance
    this._sortCache()
    this._cleanCacheEdges()
  }

  // ─────────────────────────────────────────────────────────────
  // Read methods - return Map<address, buffer>
  // ─────────────────────────────────────────────────────────────

  /**
   * Read memory at given address/length from cache.
   * Returns segments map with available data.
   */
  read(address: bigint, length: number): MemorySegments {
    return this._collectSegments(address, length)
  }

  /**
   * Set cursor position. Debounces the actual memory read.
   * Fresh data comes via callback after debounce.
   */
  setCursor(address: bigint) {
    if (address === this._cursor) return

    this._cursor = address

    // Clear existing debounce timer
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer)
    }

    // Clean cache - remove entries too far from cursor
    this._cleanCache()

    // Mark as debouncing
    this._isDebouncing = true

    // Schedule actual read after debounce
    this._debounceTimer = setTimeout(() => {
      this._isDebouncing = false
      this._debounceTimer = null
      this._doRead()
    }, this._debounceMs)
  }

  /**
   * Set read length. Triggers immediate read.
   */
  setReadLength(length: number) {
    this._readLength = length
  }

  // Deprecated support if needed, or just remove
  set length(v: number) {
    this.setReadLength(v)
  }

  get length(): number {
    return this._readLength
  }

  // ─────────────────────────────────────────────────────────────
  // Settings
  // ─────────────────────────────────────────────────────────────

  setDebounce(ms: number): void {
    this._debounceMs = ms
  }

  setAutoRefresh(ms: number): void {
    this._autoRefreshMs = ms

    // Restart timer if running
    if (this._refreshTimer) {
      this.stop()
      if (this._autoRefreshMs > 0) {
        this.start()
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Control
  // ─────────────────────────────────────────────────────────────

  /**
   * Start auto-refresh timer
   */
  start(): void {
    if (this._autoRefreshMs <= 0) return
    if (this._refreshTimer) return // Already running

    this._refreshTimer = setInterval(() => {
      // Skip if debouncing
      if (this._isDebouncing) return
      this._doRead()
    }, this._autoRefreshMs)
  }

  /**
   * Stop all timers
   */
  stop(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer)
      this._debounceTimer = null
    }
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer)
      this._refreshTimer = null
    }
    this._isDebouncing = false
  }

  /**
   * Manual refresh - ignores debounce
   */
  refresh(): void {
    this._doRead()
  }

  // ─────────────────────────────────────────────────────────────
  // Protected Methods / Hooks
  // ─────────────────────────────────────────────────────────────

  /**
   * Delete an entry from the internal cache.
   * Wraps specific map operations to allow subclasses to hook into deletions.
   * @param address The address of the segment
   * @param size The size of the segment
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected deleteCacheEntry(address: bigint, _size: number): void {
    this._cache.delete(address)
    this._regionCache.delete(address)
  }

  // ─────────────────────────────────────────────────────────────
  // Private methods
  // ─────────────────────────────────────────────────────────────

  /**
   * Query region info for an address
   */
  private _queryRegion(address: bigint): NativeMemoryRegion {
    const result = this._process.memory.query(address)
    return {
      base: BigInt(result.base),
      size: BigInt(result.size),
      protection: result.protection,
    }
  }

  /**
   * Sort cache Map by address (ascending order)
   */
  private _sortCache(): void {
    const entries = Array.from(this._cache.entries())
    entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    this._cache.clear()
    for (const [addr, buf] of entries) {
      this._cache.set(addr, buf)
    }
  }

  /**
   * Clean cache edges - trim or remove entries from the start or end
   * Entries partially within threshold get trimmed, fully outside get removed
   */
  private _cleanCacheEdges(): void {
    const cursorStart = this._cursor
    const cursorEnd = this._cursor + BigInt(this._readLength)
    const distanceThreshold = BigInt(this._cacheDistance)

    // Threshold boundaries
    const keepStart = cursorStart - distanceThreshold // Keep data from this address onwards
    const keepEnd = cursorEnd + distanceThreshold // Keep data up to this address

    // Get sorted entries
    const entries = Array.from(this._cache.entries())

    // Process from start (lowest addresses) - trim or delete
    for (const [addr, buf] of entries) {
      const bufEnd = addr + BigInt(buf.length)

      if (bufEnd <= keepStart) {
        // Entire buffer is before keepStart - delete it
        this.deleteCacheEntry(addr, buf.length)
        // Continue checking next entry
      } else if (addr < keepStart) {
        // Buffer partially overlaps keepStart - trim from beginning
        const trimAmount = Number(keepStart - addr)
        const trimmed = buf.subarray(trimAmount)
        const region = this._regionCache.get(addr)

        // Delete original (evict)
        this.deleteCacheEntry(addr, buf.length)

        // Set new trimmed part
        this._cache.set(keepStart, trimmed)
        if (region) this._regionCache.set(keepStart, region)

        // Stop - remaining entries are closer
        break
      } else {
        // Buffer is within threshold - stop
        break
      }
    }

    // Re-sort after modifications
    this._sortCache()

    // Get updated entries for end processing
    const updatedEntries = Array.from(this._cache.entries())

    // Process from end (highest addresses) - trim or delete
    for (let i = updatedEntries.length - 1; i >= 0; i--) {
      const [addr, buf] = updatedEntries[i]
      const bufEnd = addr + BigInt(buf.length)

      // Skip if already deleted
      if (!this._cache.has(addr)) continue

      if (addr >= keepEnd) {
        // Entire buffer is after keepEnd - delete it
        this.deleteCacheEntry(addr, buf.length)
        // Continue checking previous entry
      } else if (bufEnd > keepEnd) {
        // Buffer partially overlaps keepEnd - trim from end
        const keepLength = Number(keepEnd - addr)
        const trimmed = buf.subarray(0, keepLength)

        // Delete original to notify eviction
        this.deleteCacheEntry(addr, buf.length)

        // Replace with trimmed
        this._cache.set(addr, trimmed)

        // Region stays the same for trimmed-from-end
        // Stop - remaining entries are closer
        break
      } else {
        // Buffer is within threshold - stop
        break
      }
    }
  }

  /**
   * Clean cache - called on setCursor, delegates to edge cleanup
   */
  private _cleanCache(): void {
    this._cleanCacheEdges()
  }

  /**
   * Collect segments from cache for a given range
   * Returns Map<address, buffer> with non-overlapping segments
   */
  private _collectSegments(address: bigint, length: number): MemorySegments {
    const segments: MemorySegments = new Map()
    const requestEnd = address + BigInt(length)

    // Cache is maintained in sorted order
    let currentPos = address

    for (const [addr, buf] of this._cache) {
      const bufEnd = addr + BigInt(buf.length)

      // Skip if entirely before current position
      if (bufEnd <= currentPos) continue

      // Stop if entirely after requested range
      if (addr >= requestEnd) break

      // Calculate the portion we need
      let startOffset = 0
      let segmentStart = addr

      if (addr < currentPos) {
        // Buffer starts before currentPos, need to trim
        startOffset = Number(currentPos - addr)
        segmentStart = currentPos
      }

      let endOffset = buf.length
      if (bufEnd > requestEnd) {
        // Buffer extends beyond requested range
        endOffset = Number(requestEnd - addr)
      }

      if (startOffset < endOffset) {
        const slice = buf.subarray(startOffset, endOffset)
        segments.set(segmentStart, slice)
        currentPos = segmentStart + BigInt(slice.length)
      }
    }

    return segments
  }

  /**
   * Perform actual memory read and update cache
   * Calls _doReadEx to handle multi-region reads
   * Callback is called per-read in _doReadEx with ReadResult
   */
  private _doRead(): void {
    try {
      // Get region info for cursor position first
      this._currentRegion = this._queryRegion(this._cursor)

      // Read all needed regions - callbacks happen inside
      this._doReadEx(this._cursor, this._readLength)
    } catch (error) {
      console.error('MemoryViewer read error:', error)
    }
  }

  /**
   * Extended read - recursively reads across multiple regions
   * Respects minAddress/maxAddress boundaries
   * @param address Start address to read from
   * @param remaining Remaining bytes to read
   */
  private _doReadEx(address: bigint, remaining: number): void {
    if (remaining <= 0) return

    // Clamp to address boundaries
    let readAddress = address
    let readRemaining = remaining

    // Don't read below minAddress
    if (readAddress < this._minAddress) {
      const skip = Number(this._minAddress - readAddress)
      readAddress = this._minAddress
      readRemaining -= skip
      if (readRemaining <= 0) return
    }

    // Don't read at or above maxAddress
    const requestEnd = readAddress + BigInt(readRemaining)
    if (requestEnd > this._maxAddress) {
      readRemaining = Number(this._maxAddress - readAddress)
      if (readRemaining <= 0) return
    }

    // Query region info for this address
    const region = this._queryRegion(readAddress)

    // Update current region (first region encountered)
    if (this._currentRegion === null) {
      this._currentRegion = region
    }

    const regionEnd = BigInt(region.base) + BigInt(region.size)
    const clampedRequestEnd = readAddress + BigInt(readRemaining)

    // Check if region is readable
    if (MemoryUtils.isNoAccess(region.protection)) {
      // Skip this region - try next one if there's remaining bytes past this region
      if (clampedRequestEnd > regionEnd && regionEnd < this._maxAddress) {
        const bytesSkipped = Number(regionEnd - readAddress)
        const stillRemaining = readRemaining - bytesSkipped
        if (stillRemaining > 0) {
          this._doReadEx(regionEnd, stillRemaining)
        }
      }
      return
    }

    // Determine actual read start
    let readStart = readAddress

    // If address is BEFORE region base, adjust start to region base
    if (readAddress < BigInt(region.base)) {
      readStart = BigInt(region.base)
    }

    // Calculate how much we can read in this region
    let readEnd = clampedRequestEnd
    if (readEnd > regionEnd) {
      readEnd = regionEnd
    }

    const actualLength = Number(readEnd - readStart)
    if (actualLength > 0) {
      // Read memory from adjusted position
      try {
        const raw = this._process.memory.read(readStart, actualLength)
        const data = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)

        // Add to cache - onData is called inside _emitRead
        this._emitRead(readStart, data, region)
      } catch (e) {
        // Individual read failed, continue with remaining regions
        console.error('MemoryViewer read error at', readStart.toString(16), e)
      }
    }

    // If request extends beyond this region, continue to next region (respecting maxAddress)
    if (clampedRequestEnd > regionEnd && regionEnd < this._maxAddress) {
      const bytesRead = Number(regionEnd - readAddress)
      const stillRemaining = readRemaining - bytesRead
      if (stillRemaining > 0) {
        this._doReadEx(regionEnd, stillRemaining)
      }
    }
  }
}
