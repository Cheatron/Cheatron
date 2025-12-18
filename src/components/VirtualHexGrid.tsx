import { useCallback, useMemo, memo } from 'react'
import { VirtualScroller } from './ui/virtual-scroller'

// Constants
const ROW_HEIGHT = 24
const HEADER_HEIGHT = 28

// Types
export interface VirtualHexRow {
  address: string // Pre-formatted HTML string with address and color
  data: string // Pre-formatted HTML string with data and highlight spans
  ascii: string
}

export interface VirtualHexGridProps {
  /** Current address (top of viewport) */
  address: bigint
  /** Bytes per row */
  bytesPerRow?: number
  /** Container height */
  height: number
  /** Function to get row data by address - always returns a row */
  getRow: (address: bigint) => VirtualHexRow
  /** Total address range */
  minAddress?: bigint
  maxAddress?: bigint
  /** Called when address changes via scroll */
  onAddressChange?: (address: bigint) => void
  /** Additional className */
  className?: string
  /** Header string */
  header?: string
}

// Memoized row component - renders pre-formatted HTML data
const VirtualHexRowComponent = memo(function VirtualHexRowComponent({
  row,
}: {
  row: VirtualHexRow
}) {
  return (
    <div className="flex items-center h-full font-mono text-xs select-text">
      {/* Address - pre-formatted HTML */}
      <span className="w-36 shrink-0" dangerouslySetInnerHTML={{ __html: row.address }} />

      {/* Values - pre-formatted HTML with highlight/placeholder spans */}
      <span className="flex-1 whitespace-pre" dangerouslySetInnerHTML={{ __html: row.data }} />

      {/* ASCII */}
      <span className="w-40 shrink-0 pl-2 text-muted-foreground tracking-wider">{row.ascii}</span>
    </div>
  )
})

// Header component
function VirtualHexGridHeader({ header }: { header: string }) {
  return (
    <div
      className="flex items-center font-mono text-xs font-semibold text-muted-foreground border-b border-border bg-muted/30"
      style={{ height: HEADER_HEIGHT }}
    >
      <span className="w-36 shrink-0">Address</span>
      <span className="flex-1 whitespace-pre">{header}</span>
      <span className="w-40 shrink-0 pl-2">ASCII</span>
    </div>
  )
}

/**
 * VirtualHexGrid - Memory hex viewer with virtual scrolling
 */
export function VirtualHexGrid({
  address,
  bytesPerRow = 16,
  height,
  getRow,
  minAddress = 0n,
  maxAddress = 0x7fffffffffffffffn,
  onAddressChange,
  header = '00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F',
  className = '',
}: VirtualHexGridProps) {
  // Calculate total rows in address space
  const totalRows = useMemo(() => {
    const range = maxAddress - minAddress
    return Number(range / BigInt(bytesPerRow)) + 1
  }, [minAddress, maxAddress, bytesPerRow])

  // Address offset within a row (0 to bytesPerRow-1)
  const addressOffset = useMemo(() => {
    return Number(address % BigInt(bytesPerRow))
  }, [address, bytesPerRow])

  // Base address for row 0 (the row containing 'address')
  const baseRowAddress = useMemo(() => {
    return address - BigInt(addressOffset)
  }, [address, addressOffset])

  // Current row index (row 0 = the row containing current address)
  const currentRowIndex = useMemo(() => {
    // Row 0 is the one containing 'address'
    // We calculate how many rows from minAddress to baseRowAddress
    const offset = baseRowAddress - minAddress
    return Math.floor(Number(offset) / bytesPerRow)
  }, [baseRowAddress, minAddress, bytesPerRow])

  // Viewport height minus header
  const viewportHeight = height - HEADER_HEIGHT

  // Handle scroll - scroll changes move by full rows, keeping the offset
  const handleScrollIndexChange = useCallback(
    (index: number) => {
      // Calculate new base row address
      const newBaseRowAddress = minAddress + BigInt(index) * BigInt(bytesPerRow)
      // Add the offset to keep cursor position within row
      const newAddress = newBaseRowAddress + BigInt(addressOffset)
      onAddressChange?.(newAddress)
    },
    [minAddress, bytesPerRow, addressOffset, onAddressChange],
  )

  // Render a single row - rows are offset by addressOffset
  const renderRow = useCallback(
    (index: number) => {
      // Row address = minAddress + index * bytesPerRow + addressOffset
      // This makes all rows shift based on the current address offset
      const rowAddress = minAddress + BigInt(index) * BigInt(bytesPerRow) + BigInt(addressOffset)
      const row = getRow(rowAddress)

      return <VirtualHexRowComponent row={row} />
    },
    [minAddress, bytesPerRow, addressOffset, getRow],
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return

      let delta = 0n
      switch (e.key) {
        case 'ArrowLeft':
          delta = 1n // Scroll left = show higher addresses
          break
        case 'ArrowRight':
          delta = -1n // Scroll right = show lower addresses
          break
        case 'ArrowUp':
          delta = -BigInt(bytesPerRow)
          break
        case 'ArrowDown':
          delta = BigInt(bytesPerRow)
          break
        case 'PageUp':
          delta = -BigInt(bytesPerRow * Math.floor(viewportHeight / ROW_HEIGHT))
          break
        case 'PageDown':
          delta = BigInt(bytesPerRow * Math.floor(viewportHeight / ROW_HEIGHT))
          break
        case 'Home':
          if (e.ctrlKey) {
            onAddressChange?.(minAddress)
            e.preventDefault()
            return
          }
          break
        case 'End':
          if (e.ctrlKey) {
            onAddressChange?.(maxAddress - BigInt(bytesPerRow))
            e.preventDefault()
            return
          }
          break
        default:
          return
      }

      if (delta !== 0n) {
        e.preventDefault()
        let newAddress = address + delta
        if (newAddress < minAddress) newAddress = minAddress
        if (newAddress > maxAddress) newAddress = maxAddress
        onAddressChange?.(newAddress)
      }
    },
    [address, bytesPerRow, viewportHeight, minAddress, maxAddress, onAddressChange],
  )

  return (
    <div
      className={`flex flex-col outline-none ${className}`}
      style={{ height }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <VirtualHexGridHeader header={header} />

      <VirtualScroller
        totalItems={totalRows}
        itemHeight={ROW_HEIGHT}
        height={viewportHeight}
        renderItem={renderRow}
        scrollIndex={currentRowIndex}
        onScrollIndexChange={handleScrollIndexChange}
        overscan={10}
      />
    </div>
  )
}
