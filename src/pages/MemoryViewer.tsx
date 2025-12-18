import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { MemoryControlPanel } from '@/components/MemoryControlPanel'
import { VirtualHexGrid } from '@/components/VirtualHexGrid'
import { useMemoryGrid, type ViewMode, type ValueType } from '@/hooks/useMemoryGrid'

// Configuration
const DEFAULT_BYTES_PER_ROW = 16
const DEFAULT_BUFFER = 32
const MAX_ADDRESS = 0x7fffffffffffffffn

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

// Helper: Generate header string
function generateHeader(bytesPerRow: number, valueType: ValueType, viewMode: ViewMode): string {
  const step = getStepSize(valueType)
  const count = bytesPerRow / step
  const valueWidth = getValueWidth(valueType, viewMode)

  return Array.from({ length: count }, (_, i) =>
    (i * step).toString(16).toUpperCase().padStart(2, '0').padStart(valueWidth, ' '),
  ).join(' ')
}

export default function MemoryViewer() {
  // UI State
  const [bytesPerRow, setBytesPerRow] = useState(DEFAULT_BYTES_PER_ROW)
  const [buffer, setBuffer] = useState(DEFAULT_BUFFER)
  const [currentAddress, setCurrentAddress] = useState(0x100000n)
  const [addressInput, setAddressInput] = useState('0x100000')
  const [viewMode, setViewMode] = useState<ViewMode>('hex')
  const [valueType, setValueType] = useState<ValueType>('byte')
  const [containerHeight, setContainerHeight] = useState(600)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)

  // Use the refactored hook - handles all grid logic internally
  const { getRow, updateCursor } = useMemoryGrid({
    cursor: currentAddress,
    bytesPerRow,
    buffer,
    viewMode,
    valueType,
  })

  // Measure container
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Handle address change
  const handleAddressChange = useCallback(
    (newAddress: bigint) => {
      setCurrentAddress(newAddress)
      setAddressInput(`0x${newAddress.toString(16)}`)
      updateCursor(newAddress)
    },
    [updateCursor],
  )

  // Handle Go button
  const handleGoToAddress = useCallback(() => {
    try {
      let addr = addressInput.toLowerCase().startsWith('0x')
        ? BigInt(addressInput)
        : BigInt(parseInt(addressInput, 10))

      if (addr < 0n) addr = 0n
      if (addr > MAX_ADDRESS) addr = MAX_ADDRESS

      handleAddressChange(addr)
    } catch {
      // Invalid address input
    }
  }, [addressInput, handleAddressChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleGoToAddress()
    },
    [handleGoToAddress],
  )

  // Memoize header
  const header = useMemo(
    () => generateHeader(bytesPerRow, valueType, viewMode),
    [bytesPerRow, valueType, viewMode],
  )

  return (
    <div className="w-full h-full flex flex-col gap-2 p-4">
      <MemoryControlPanel
        addressInput={addressInput}
        onAddressInputChange={setAddressInput}
        onGoToAddress={handleGoToAddress}
        onKeyDown={handleKeyDown}
        bytesPerRow={bytesPerRow}
        onBytesPerRowChange={setBytesPerRow}
        buffer={buffer}
        onBufferChange={setBuffer}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        valueType={valueType}
        onValueTypeChange={setValueType}
      />

      <div ref={containerRef} className="flex-1 min-h-0 border rounded-md overflow-hidden bg-card">
        <VirtualHexGrid
          address={currentAddress}
          bytesPerRow={bytesPerRow}
          height={containerHeight}
          getRow={getRow}
          onAddressChange={handleAddressChange}
          header={header}
        />
      </div>
    </div>
  )
}
