import { NativeConstantsType } from 'types/native/constants'
import { NativeReference, NativeReferenceClass } from 'types/native/reference'

export interface NativeMemoryRegion {
  base: number | bigint
  size: number | bigint
  protection: number
}

export interface NativeBindingMemoryType {
  read: (ref: NativeReference, address: number | bigint, length: number) => Buffer
  write: (ref: NativeReference, address: number | bigint, data: Buffer) => number
  query: (ref: NativeReference, address: number | bigint) => NativeMemoryRegion
}

export interface NativeBindingProcessType {
  getCurrent: () => NativeReference
  open: (pid: number) => NativeReference
  memory: NativeBindingMemoryType
}

export interface NativeBindingCapstoneType {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  open: (arch: number, mode: number) => any
}

export interface NativeBindingType {
  getVersion: () => string
  getConstants: () => NativeConstantsType
  process: NativeBindingProcessType
  cs: NativeBindingCapstoneType
  initialize: (callback: (level: string, message: string) => void) => boolean
  Reference: NativeReferenceClass
}
