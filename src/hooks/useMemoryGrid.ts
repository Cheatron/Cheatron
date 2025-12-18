import { useRef, useEffect, useCallback, useState } from 'react'
import { CallbackMemoryGrid } from '@/lib/memory'
import { VirtualHexRow } from '@/components/VirtualHexGrid'

// Constants - internal to hook, never changes
const BACKEND_COLS = 8
const MAX_ADDRESS = 0x7fffffffffffffffn
const HIGHLIGHT_DURATION = 500

export type ViewMode = 'hex' | 'decimal'
export type ValueType = 'byte' | 'word' | 'dword' | 'qword'

interface UseMemoryGridConfig {
  cursor: bigint
  bytesPerRow: number
  buffer: number
  viewMode: ViewMode
  valueType: ValueType
}

interface UseMemoryGridResult {
  getRow: (address: bigint) => VirtualHexRow
  updateCursor: (cursor: bigint) => void
  version: number
}

// Helper: Format single byte as hex
function byteToHex(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, '0')
}

// Helper: Format byte as ascii
function byteToAscii(value: number): string {
  return value >= 32 && value <= 126 ? String.fromCharCode(value) : '.'
}

// Helper: Get step size (bytes per value) for value type
function getStepSize(type: ValueType): number {
  return type === 'byte' ? 1 : type === 'word' ? 2 : type === 'dword' ? 4 : 8
}

// Helper: Get value width for padding
function getValueWidth(type: ValueType, mode: ViewMode): number {
  const bytes = getStepSize(type)
  if (mode === 'hex') return bytes * 2
  if (type === 'byte') return 3
  if (type === 'word') return 5
  if (type === 'dword') return 10
  return 20
}

// Helper: Format a single value from hex bytes
function formatValue(
  hexValues: string[],
  startIndex: number,
  step: number,
  mode: ViewMode,
  valueWidth: number,
): string {
  // Check if any byte is unknown
  for (let i = 0; i < step; i++) {
    if (hexValues[startIndex + i] === '??') {
      return mode === 'hex'
        ? '??'.repeat(step).padStart(valueWidth, '0')
        : '?'.padStart(valueWidth, ' ')
    }
  }

  if (step === 1) {
    const hexVal = hexValues[startIndex]
    if (mode === 'hex') {
      return hexVal.padStart(valueWidth, '0')
    } else {
      return parseInt(hexVal, 16).toString(10).padStart(valueWidth, ' ')
    }
  }

  // Multi-byte: combine in little endian order
  let value = 0n
  for (let i = 0; i < step; i++) {
    const byteVal = parseInt(hexValues[startIndex + i], 16)
    value |= BigInt(byteVal) << BigInt(i * 8)
  }

  if (mode === 'hex') {
    return value
      .toString(16)
      .toUpperCase()
      .padStart(step * 2, '0')
      .padStart(valueWidth, '0')
  } else {
    return value.toString(10).padStart(valueWidth, ' ')
  }
}

// Format address as hex
function formatAddress(addr: bigint): string {
  return addr.toString(16).padStart(16, '0').toUpperCase()
}

// Build row HTML with optional highlights and placeholder styling
function buildRow(
  startAddress: bigint,
  hexValues: string[],
  asciiValues: string[],
  highlightedBytes: Set<number>,
  bytesPerRow: number,
  valueType: ValueType,
  viewMode: ViewMode,
): VirtualHexRow {
  const step = getStepSize(valueType)
  const numValues = bytesPerRow / step
  const valueWidth = getValueWidth(valueType, viewMode)

  const dataParts: string[] = []
  let hasAnyData = false

  for (let i = 0; i < numValues; i++) {
    const startIndex = i * step
    const formattedValue = formatValue(hexValues, startIndex, step, viewMode, valueWidth)

    // Check if this value is a placeholder (contains ??)
    const isPlaceholder = formattedValue.includes('?')

    // Check if any byte in this value is highlighted
    let isHighlighted = false
    for (let j = 0; j < step; j++) {
      if (highlightedBytes.has(startIndex + j)) {
        isHighlighted = true
        break
      }
    }

    // Track if we have any real data
    if (!isPlaceholder) hasAnyData = true

    // Apply styling: highlight > placeholder > normal
    if (isHighlighted) {
      dataParts.push(`<span class="memory-highlight">${formattedValue}</span>`)
    } else if (isPlaceholder) {
      dataParts.push(`<span class="memory-placeholder">${formattedValue}</span>`)
    } else {
      dataParts.push(formattedValue)
    }
  }

  // Format address with color based on hasData
  const addressHex = formatAddress(startAddress)
  const addressHtml = hasAnyData
    ? addressHex
    : `<span class="memory-placeholder">${addressHex}</span>`

  return {
    address: addressHtml,
    data: dataParts.join(' '),
    ascii: asciiValues.join(''),
  }
}

export function useMemoryGrid(config: UseMemoryGridConfig): UseMemoryGridResult {
  const { cursor, bytesPerRow, buffer, viewMode, valueType } = config

  // Version counter - increments when data changes, triggers parent re-render
  const [version, setVersion] = useState(0)

  // Grid reference
  const gridRef = useRef<CallbackMemoryGrid | null>(null)

  // Highlight tracking: absolute byte address -> timestamp when it was updated
  const highlightsRef = useRef<Map<string, number>>(new Map())

  // Settings ref for use in callbacks
  const settingsRef = useRef({ bytesPerRow, viewMode, valueType })
  settingsRef.current = { bytesPerRow, viewMode, valueType }

  // Helper: Get chunk address (8-byte aligned)
  const getChunkAddress = useCallback((byteAddr: bigint): bigint => {
    return byteAddr - (byteAddr % BigInt(BACKEND_COLS))
  }, [])

  // Record highlight for a byte at absolute address
  const recordHighlight = useCallback((byteAddr: bigint) => {
    highlightsRef.current.set(byteAddr.toString(), Date.now())
  }, [])

  // Check if a byte is highlighted
  const isByteHighlighted = useCallback((byteAddr: bigint): boolean => {
    const timestamp = highlightsRef.current.get(byteAddr.toString())
    if (!timestamp) return false
    if (Date.now() - timestamp >= HIGHLIGHT_DURATION) {
      highlightsRef.current.delete(byteAddr.toString())
      return false
    }
    return true
  }, [])

  // Clean expired highlights
  const cleanExpiredHighlights = useCallback(() => {
    const now = Date.now()
    for (const [key, timestamp] of highlightsRef.current) {
      if (now - timestamp >= HIGHLIGHT_DURATION) {
        highlightsRef.current.delete(key)
      }
    }
  }, [])

  // Get byte data from grid at any address
  const getByteFromGrid = useCallback(
    (byteAddr: bigint): { hex: string; ascii: string } | null => {
      const grid = gridRef.current
      if (!grid) return null

      const chunkAddr = getChunkAddress(byteAddr)
      const chunkData = grid.getRow(chunkAddr)

      if (!chunkData) return null

      const byteIndex = Number(byteAddr - chunkAddr)
      for (const [offset, data] of chunkData) {
        if (byteIndex >= offset && byteIndex < offset + data.length) {
          const byteValue = data[byteIndex - offset]
          return {
            hex: byteToHex(byteValue),
            ascii: byteToAscii(byteValue),
          }
        }
      }

      return null
    },
    [getChunkAddress],
  )

  // Build a row starting at any arbitrary address - always returns a row
  const buildRowFromGrid = useCallback(
    (startAddress: bigint): VirtualHexRow => {
      const { bytesPerRow, viewMode, valueType } = settingsRef.current

      const hexParts: string[] = []
      const asciiParts: string[] = []
      const highlightedBytes = new Set<number>()

      for (let i = 0; i < bytesPerRow; i++) {
        const byteAddr = startAddress + BigInt(i)
        const byteData = getByteFromGrid(byteAddr)

        if (byteData) {
          hexParts.push(byteData.hex)
          asciiParts.push(byteData.ascii)
          if (isByteHighlighted(byteAddr)) {
            highlightedBytes.add(i)
          }
        } else {
          hexParts.push('??')
          asciiParts.push('.')
        }
      }

      // Always return a row - even if all placeholders

      return buildRow(
        startAddress,
        hexParts,
        asciiParts,
        highlightedBytes,
        bytesPerRow,
        valueType,
        viewMode,
      )
    },
    [getByteFromGrid, isByteHighlighted],
  )

  // Initialize grid synchronously
  if (!gridRef.current) {
    const initialReadLength = buffer * bytesPerRow

    gridRef.current = new CallbackMemoryGrid(
      {
        cursor,
        rows: MAX_ADDRESS / BigInt(BACKEND_COLS),
        cols: BACKEND_COLS,
        readLength: initialReadLength,
      },
      {
        onData: () => {
          cleanExpiredHighlights()
        },
        onNewRow: () => {
          // New data arrived - trigger re-render
        },
        onUpdateRow: (addr, subData, offset) => {
          // Record highlights for updated bytes
          for (let i = 0; i < subData.length; i++) {
            recordHighlight(addr + BigInt(offset + i))
          }
        },
        onExtendsRow: (addr, subData, offset) => {
          // Record highlights for extended bytes
          for (let i = 0; i < subData.length; i++) {
            recordHighlight(addr + BigInt(offset + i))
          }
        },
        onRemoveRow: () => {
          // Row removed - no special handling needed
        },
        onChangesCommitted: () => {
          // Increment version to trigger re-render
          setVersion(v => v + 1)

          // Schedule highlight cleanup
          setTimeout(() => {
            cleanExpiredHighlights()
            setVersion(v => v + 1)
          }, HIGHLIGHT_DURATION)
        },
      },
    )
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      gridRef.current?.destroy()
      gridRef.current = null
    }
  }, [])

  // Debounced update for cursor and readLength
  useEffect(() => {
    const readLength = buffer * bytesPerRow

    if (!gridRef.current) return

    const timer = setTimeout(() => {
      gridRef.current?.update({
        cursor,
        readLength,
      })
    }, 100)

    return () => clearTimeout(timer)
  }, [cursor, buffer, bytesPerRow])

  // Get row function - builds row on demand, always returns a row
  // Include version in dependencies so parent gets new reference when data changes
  const getRow = useCallback(
    (address: bigint): VirtualHexRow => {
      return buildRowFromGrid(address)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buildRowFromGrid, version],
  )

  // Immediate cursor update
  const updateCursor = useCallback((newCursor: bigint) => {
    gridRef.current?.update({ cursor: newCursor })
  }, [])

  return {
    getRow,
    updateCursor,
    version,
  }
}
