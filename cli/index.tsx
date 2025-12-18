/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { render, Box, Text, useInput, useApp } from 'ink'
import { native } from '@core/native'
// import { type MemorySegments } from '@core/memory/viewer' // Unused
// import { MemoryGrid } from '@core/memory/viewer-grid' // Unused
import { CallbackMemoryGrid } from '@core/memory/reactive-grid'
// import { Process } from '@core/process' // Unused
import { type NativeMemoryRegion } from 'types/native/index'
import { MemoryUtils } from '@core/memory-utils'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const BYTES_PER_ROW = 16
const VISIBLE_ROWS = 16
const PADDING_ROWS = 0 // Extra rows removed
const LENGTH = BYTES_PER_ROW * VISIBLE_ROWS // Total display length
const VIEWER_LENGTH = LENGTH // Viewer reads exactly what is visible

// Address boundaries
const MIN_ADDRESS = 0x0n
const MAX_ADDRESS = 0x07ffffffffffffn

// ─────────────────────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────────────────────

function hexByte(byte: number): string {
  return byte.toString(16).padStart(2, '0')
}

function formatAddress(address: bigint, width: number = 12): string {
  return address.toString(16).padStart(width, '0')
}

function toAscii(byte: number): string {
  return byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '.'
}

// Unused:
// function mergeSegments(
//   segments: MemorySegments,
//   startAddress: bigint,
//   length: number,
// ): (number | null)[] {
//   const result: (number | null)[] = new Array(length).fill(null)
//   for (const [address, data] of segments) {
//     const offset = Number(address - startAddress)
//     for (let i = 0; i < data.length; i++) {
//       const idx = offset + i
//       if (idx >= 0 && idx < length) {
//         result[idx] = data[i]
//       }
//     }
//   }
//   return result
// }

// ─────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────

interface ByteCellProps {
  byte: number | null
  isChanged?: boolean
}

function ByteCell({ byte, isChanged }: ByteCellProps) {
  if (byte === null || byte === undefined) {
    return <Text color="gray">??</Text>
  }

  // Changed bytes get inverse/bold highlight
  if (isChanged) {
    return (
      <Text color="white" backgroundColor="red" bold>
        {hexByte(byte)}
      </Text>
    )
  }

  if (byte === 0) {
    return <Text color="gray">00</Text>
  } else if (byte === 0xff) {
    return <Text color="red">ff</Text>
  } else if (byte >= 0x20 && byte <= 0x7e) {
    return <Text color="green">{hexByte(byte)}</Text>
  } else {
    return <Text color="yellow">{hexByte(byte)}</Text>
  }
}

interface AsciiCellProps {
  byte: number | null
  // isSelected?: boolean // Unused
}

function AsciiCell({ byte }: AsciiCellProps) {
  /* Cursor highlighting removed per request
  if (isSelected) {
    const char = byte !== null && byte !== undefined ? toAscii(byte) : '.'
    return (
      <Text color="black" backgroundColor="cyan">
        {char}
      </Text>
    )
  }
  */

  if (byte === null || byte === undefined) {
    return <Text color="gray">.</Text>
  } else if (byte === 0) {
    return <Text color="gray">.</Text>
  } else if (byte === 0xff) {
    return <Text color="redgray">.</Text>
  } else if (byte >= 0x20 && byte <= 0x7e) {
    return <Text color="green">{toAscii(byte)}</Text>
  } else {
    return <Text color="yellow">.</Text>
  }
}

interface HexRowProps {
  address: bigint
  bytes: (number | null)[]
  changedAddresses: Map<bigint, number>
  cursor: bigint
  now: number
}

function HexRow({ address, bytes, changedAddresses, now }: HexRowProps) {
  return (
    <Box>
      <Text color="cyan">{formatAddress(address)} </Text>
      {bytes.map((byte, i) => {
        const addr = address + BigInt(i)
        const expiry = changedAddresses.get(addr)
        const isChanged = expiry !== undefined && expiry > now
        return (
          <Text key={i}>
            <ByteCell byte={byte} isChanged={isChanged} />{' '}
          </Text>
        )
      })}
      <Text color="gray">│</Text>
      {bytes.map((byte, i) => {
        return <AsciiCell key={i} byte={byte} />
      })}
    </Box>
  )
}

interface StatusBarProps {
  cursor: bigint
  length: number
  cachedRows: number
  region?: NativeMemoryRegion
}

function StatusBar({ cursor, length, cachedRows, region }: StatusBarProps) {
  // Coverage of cache relative to potential universe is uninteresting.
  // We just show row counts now.

  return (
    <Box>
      <Text color="cyan">📍 {formatAddress(cursor)}</Text>
      <Text color="gray"> │ </Text>
      <Text>{length} bytes</Text>
      <Text color="gray"> │ </Text>
      <Box>
        <Text color="gray">Cached Rows: {cachedRows}</Text>
      </Box>
      {region && (
        <>
          <Text color="gray"> │ </Text>
          <Text color="cyan">
            {formatAddress(BigInt(region.base), 8)}-
            {formatAddress(BigInt(region.base) + BigInt(region.size), 8)}
          </Text>
          <Text color="yellow"> [{MemoryUtils.getProtectionString(region.protection)}]</Text>
        </>
      )}
    </Box>
  )
}

function ControlsBar() {
  return (
    <Box>
      <Text color="gray">Controls: </Text>
      <Text color="white">←/→</Text>
      <Text color="gray"> byte │ </Text>
      <Text color="white">↑/↓</Text>
      <Text color="gray"> row │ </Text>
      <Text color="white">PgUp/PgDn</Text>
      <Text color="gray"> page │ </Text>
      <Text color="white">r</Text>
      <Text color="gray"> refresh</Text>
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────

function App() {
  const { exit } = useApp()
  const [tick, setTick] = useState(0)
  const [cursor, setCursorState] = useState<bigint>(0x00400000n)
  const [currentRegion] = useState<NativeMemoryRegion>()
  const rowsRef = React.useRef(new Map<bigint, Uint8Array>())
  const changedAddressesRef = React.useRef(new Map<bigint, number>())

  // Generate a separate timestamp for UI rendering to avoid impure calls in render
  // This updates every tick
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => Date.now(), [tick])

  // Temporary: Create a process instance for the current process
  // In a real app, this would likely come from context or props
  // assuming native.process.getCurrent() returns a valid ref for self
  const currentProcess = useMemo(() => {
    // We need to construct a Process object.
    // Process constructor takes (NativeReference, pid)
    return native.process.current
  }, [])

  // const logger = global.logger || { info: () => {}, error: () => {} } // Unused

  const viewer = useMemo(() => {
    return new CallbackMemoryGrid(
      currentProcess,
      {
        debounceMs: 300,
        autoRefreshMs: 1000,
        readLength: VIEWER_LENGTH,
        rows: MAX_ADDRESS / BigInt(BYTES_PER_ROW),
        cols: BYTES_PER_ROW,
        cacheDistance: 4096,
        minAddress: MIN_ADDRESS,
      },
      {
        onNewRow: (address: bigint, data: Uint8Array, offset: number) => {
          // Store new row - Allocate full width immediately as requested
          const newRow = new Uint8Array(BYTES_PER_ROW)

          // Place data at correct offset
          // User guaranteed BYTES_PER_ROW is constant and data fits.
          newRow.set(data, offset)
          rowsRef.current.set(address, newRow)
        },
        onExtendsRow: (address: bigint, subData: Uint8Array, offset: number) => {
          // Handle extensions (new bytes appearing where there were none)
          const row = rowsRef.current.get(address)
          if (row) {
            // User guaranteed buffer size is sufficient
            row.set(subData, offset)
          } else {
            // Should have been onNewRow? But handle safe
            const newRow = new Uint8Array(Math.max(offset + subData.length, BYTES_PER_ROW))
            newRow.set(subData, offset)
            rowsRef.current.set(address, newRow)
          }

          const currentTime = Date.now()
          // Mark extension as changed
          for (let i = 0; i < subData.length; i++) {
            changedAddressesRef.current.set(address + BigInt(offset + i), currentTime + 1000)
          }
        },
        onUpdateRow: (address: bigint, subData: Uint8Array, offset: number) => {
          const currentTime = Date.now()

          // Update local store
          const row = rowsRef.current.get(address)
          if (row) {
            const len = subData.length
            if (len > 0) {
              // Optimization: ReactiveMemoryGrid only sends chunks that are strictly changed.
              // We can blindly mark all provided bytes as changed.
              for (let i = 0; i < len; i++) {
                const byteAddr = address + BigInt(offset + i)
                changedAddressesRef.current.set(byteAddr, currentTime + 1000)
              }
            }

            // Merge subData
            row.set(subData, offset)
          }
        },
        onRemoveRow: (address: bigint) => {
          // Remove from local store
          rowsRef.current.delete(address)
        },
        onChangesCommitted: () => {
          setTick(t => t + 1)
        },
      },
    )
  }, [currentProcess])

  // Timer to clean up highlights
  useEffect(() => {
    const timer = setInterval(() => {
      const currentTime = Date.now()
      let changed = false
      for (const [addr, expiry] of changedAddressesRef.current) {
        if (currentTime > expiry) {
          changedAddressesRef.current.delete(addr)
          changed = true
        }
      }
      if (changed) setTick(t => t + 1)
    }, 100)
    return () => clearInterval(timer)
  }, [])

  // Override onRowUpdate and deleteRow to implement highlighting and UI sync
  // NO LONGER NEEDED with ReactiveMemoryGrid
  /*
  useEffect(() => {
    // Hook into row updates for "Change Detection"
    const originalAddRow = viewer.addRow.bind(viewer)

    // We maintain a local cache of row data to detect changes,
    // since MemoryGrid no longer exposes data in addRow.
    const prevRows = new Map<bigint, Map<number, Uint8Array>>()

    // Populate prevRows initally from viewer if possible?
    // No, on first load it's empty, so no change detection (correct).

    viewer.addRow = (address: bigint) => {
      // 1. Get New Data (Viewer Cache is already updated)
      const newData = viewer.getRowData(address)

      const now = Date.now()

      // Cleanup expired highlights
      for (const [addr, expiry] of changedAddressesRef.current) {
        if (now > expiry) {
          changedAddressesRef.current.delete(addr)
        }
      }

      // Helper to get old byte from Local Cache
      const getOldByte = (offset: number): number | undefined => {
        const oldChunks = prevRows.get(address)
        if (oldChunks) {
          for (const [chunkOffset, chunkData] of oldChunks) {
            if (offset >= chunkOffset && offset < chunkOffset + chunkData.length) {
              return chunkData[offset - chunkOffset]
            }
          }
        }
        return undefined
      }

      // Compare and Highlight
      if (newData) {
        const cols = viewer.cols
        // Iterate all bytes in the row to find changes
        // Since newData comes as chunks, we should iterate chunks or range 0..cols
        // Simpler to iterate 0..cols if we assume sparse checks

        for (const [cOffset, cData] of newData) {
          for (let i = 0; i < cData.length; i++) {
            const byteOffset = cOffset + i
            const newVal = cData[i]
            const oldVal = getOldByte(byteOffset)

            // Highlight only if we had a previous value and it changed
            if (oldVal !== undefined && oldVal !== newVal) {
              const byteAddr = address + BigInt(byteOffset)
              changedAddressesRef.current.set(byteAddr, now + 1000)
            }
          }
        }

        // Update Local Cache (Deep Copy)
        const newChunks = new Map<number, Uint8Array>()
        for (const [off, dat] of newData) {
          newChunks.set(off, new Uint8Array(dat)) // Copy buffer
        }
        prevRows.set(address, newChunks)
      } else {
        prevRows.delete(address)
      }

      // Call original (updates Grid internal state)
      originalAddRow.call(viewer, address)

      // 2. UI Logic
      logger.info('CLI', 'row update', {
        address: address.toString(16),
      })

      // Updates regions and trigger re-render
      setCurrentRegion(viewer.region ?? undefined)
      setTick(t => t + 1)
    }

    // Cleanup
    return () => {
      viewer.addRow = originalAddRow
      viewer.removeRow = originalRemoveRow
    }

    // Wrap removeRow to sync UI on eviction
    const originalRemoveRow = viewer.removeRow.bind(viewer)

    viewer.removeRow = (address: bigint): void => {
      originalRemoveRow(address)
      logger.info('CLI', 'row deleted', address.toString(16))
      setTick(t => t + 1)
    }
  }, [viewer])
  */

  // NOTE: Logic moved to ReactiveMemoryGrid callbacks above.

  useEffect(() => {
    viewer.setCursor(cursor)
    viewer.start()
    return () => viewer.stop()
  }, [viewer]) // eslint-disable-line react-hooks/exhaustive-deps

  const moveCursor = useCallback(
    (rows: number) => {
      let newCursor = cursor + BigInt(rows * BYTES_PER_ROW)
      // Only prevent negative
      if (newCursor < 0n) newCursor = 0n

      setCursorState(newCursor)
      viewer.setCursor(newCursor)
      setTick(t => t + 1)
    },
    [cursor, viewer],
  )

  const moveByBytes = useCallback(
    (bytes: number) => {
      let newCursor = cursor + BigInt(bytes)
      // Only prevent negative
      if (newCursor < 0n) newCursor = 0n

      setCursorState(newCursor)
      viewer.setCursor(newCursor)
      setTick(t => t + 1)
    },
    [cursor, viewer],
  )

  useInput((input, key) => {
    if (input === 'r' || input === 'R') {
      viewer.refresh()
    } else if (key.upArrow) {
      moveCursor(-1)
    } else if (key.downArrow) {
      moveCursor(1)
    } else if (key.leftArrow) {
      moveByBytes(-1)
    } else if (key.rightArrow) {
      moveByBytes(1)
    } else if (key.pageUp) {
      moveCursor(-VISIBLE_ROWS)
    } else if (key.pageDown) {
      moveCursor(VISIBLE_ROWS)
    } else if (key.escape) {
      exit()
    }
  })

  // --------------------------------------------------------------------------
  // Main Render Loop
  // --------------------------------------------------------------------------

  const renderStart = cursor - BigInt(PADDING_ROWS * BYTES_PER_ROW)
  const displayStart = renderStart < 0n ? 0n : renderStart

  // Row-based rendering helper (supports unaligned access)
  const getRowBytes = (startAddr: bigint): (number | null)[] => {
    const row = new Array(BYTES_PER_ROW).fill(null)

    // Calculate alignment
    // We assume backend stores rows aligned to BYTES_PER_ROW (16)
    const baseAddr = startAddr - (startAddr % BigInt(BYTES_PER_ROW))
    const offset = Number(startAddr - baseAddr)

    if (offset === 0) {
      // Aligned fetch - Standard path
      return getAlignedRowBytes(startAddr)
    }

    // Unaligned fetch - Need to stitch two rows
    // Row 1: [offset...15] from baseAddr
    // Row 2: [0...offset-1] from baseAddr + 16

    const row1 = getAlignedRowBytes(baseAddr)
    const row2 = getAlignedRowBytes(baseAddr + BigInt(BYTES_PER_ROW))

    // Fill first part from Row 1
    for (let i = 0; i < BYTES_PER_ROW - offset; i++) {
      row[i] = row1[offset + i]
    }

    // Fill second part from Row 2
    for (let i = 0; i < offset; i++) {
      row[BYTES_PER_ROW - offset + i] = row2[i]
    }

    return row
  }

  // Internal helper for aligned access only
  const getAlignedRowBytes = (rowAddr: bigint): (number | null)[] => {
    const row = new Array(BYTES_PER_ROW).fill(null)

    // Use unified getRowData (fetches & clips from cache)
    const chunks = viewer.getRowData(rowAddr)

    if (chunks) {
      for (const [offset, data] of chunks) {
        for (let i = 0; i < data.length; i++) {
          if (offset + i < BYTES_PER_ROW) {
            row[offset + i] = data[i]
          }
        }
      }
    }
    return row
  }

  // Construct rows for display
  const rows: { address: bigint; bytes: (number | null)[] }[] = []

  // No alignment snapping! Start exactly where displayStart is.
  const startRowAddr = displayStart

  for (let i = 0; i < VISIBLE_ROWS; i++) {
    const rowAddr = startRowAddr + BigInt(i * BYTES_PER_ROW)
    rows.push({
      address: rowAddr,
      bytes: getRowBytes(rowAddr),
    })
  }

  return (
    <Box flexDirection="column" padding={1}>
      <StatusBar
        cursor={cursor}
        length={LENGTH}
        cachedRows={viewer.cachedRowCount}
        region={currentRegion}
      />
      <Box marginY={1} flexDirection="column">
        {rows.map((row, i) => (
          <HexRow
            key={i}
            address={row.address}
            bytes={row.bytes}
            changedAddresses={changedAddressesRef.current}
            cursor={cursor}
            now={now}
          />
        ))}
      </Box>
      <ControlsBar />
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────

render(<App />)
