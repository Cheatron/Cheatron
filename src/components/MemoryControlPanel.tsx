import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { KeyboardEvent } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'

export type ViewMode = 'hex' | 'decimal'
export type ValueType = 'byte' | 'word' | 'dword' | 'qword'

export interface MemoryControlPanelProps {
  // Address
  addressInput: string
  onAddressInputChange: (value: string) => void
  onGoToAddress: () => void
  onKeyDown: (e: KeyboardEvent) => void

  // Settings
  bytesPerRow: number
  onBytesPerRowChange: (value: number) => void
  buffer: number
  onBufferChange: (value: number) => void

  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  valueType: ValueType
  onValueTypeChange: (type: ValueType) => void

  // Status
  error?: string | null
}

const MIN_BYTES_PER_ROW = 8
const MAX_BYTES_PER_ROW = 64
const MIN_BUFFER = 8
const MAX_BUFFER = 128

export function MemoryControlPanel({
  addressInput,
  onAddressInputChange,
  onGoToAddress,
  onKeyDown,
  bytesPerRow,
  onBytesPerRowChange,
  buffer,
  onBufferChange,
  viewMode,
  onViewModeChange,
  valueType,
  onValueTypeChange,
  error,
}: MemoryControlPanelProps) {
  const viewModeLabels: Record<ViewMode, string> = {
    hex: 'Hex',
    decimal: 'Decimal',
  }

  const valueTypeLabels: Record<ValueType, string> = {
    byte: 'Byte',
    word: 'Word',
    dword: 'DWord',
    qword: 'QWord',
  }

  return (
    <Card className="p-3 shrink-0">
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="text-lg font-semibold">Memory Viewer</h2>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Address (0x...)"
            value={addressInput}
            onChange={e => onAddressInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-40 font-mono text-sm"
          />
          <Button onClick={onGoToAddress} size="sm" variant="secondary">
            Go
          </Button>
        </div>

        <div className="text-xs text-muted-foreground ml-auto">
          <span className="text-green-500">● Live</span>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Columns:</span>
          <Slider
            value={[bytesPerRow]}
            onValueChange={v => onBytesPerRowChange(v[0])}
            min={MIN_BYTES_PER_ROW}
            max={MAX_BYTES_PER_ROW}
            step={8}
            className="w-20"
          />
          <span className="text-xs font-mono w-6">{bytesPerRow}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Buffer:</span>
          <Slider
            value={[buffer]}
            onValueChange={v => onBufferChange(v[0])}
            min={MIN_BUFFER}
            max={MAX_BUFFER}
            step={8}
            className="w-20"
          />
          <span className="text-xs font-mono w-8">{buffer}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">View:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 gap-1 bg-secondary border-muted-foreground/20"
              >
                {viewModeLabels[viewMode]}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={() => onViewModeChange('hex')}>Hex</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewModeChange('decimal')}>
                Decimal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Type:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 gap-1 bg-secondary border-muted-foreground/20"
              >
                {valueTypeLabels[valueType]}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={() => onValueTypeChange('byte')}>Byte</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onValueTypeChange('word')}>Word</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onValueTypeChange('dword')}>DWord</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onValueTypeChange('qword')}>QWord</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error && (
        <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}
    </Card>
  )
}
