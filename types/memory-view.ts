export interface MemoryCell {
  address: number
  value: number
}

export interface RenderedRow {
  address: bigint
  cells: MemoryCell[]
  hex: string[]
  ascii: string[]
}
