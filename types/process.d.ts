import { NativeReference } from 'types/native/reference'
import type { NativeMemoryRegion } from 'types/native/index'
import { Reference } from 'types/reference'

export type ProcessID = number

export declare class Process extends Reference {
  private readonly pid: ProcessID

  constructor(ref: NativeReference, pid: ProcessID)

  public getPID(): ProcessID

  readonly memory: {
    read(address: number | bigint, length: number): Buffer
    write(address: number | bigint, data: Buffer): number
    query(address: number | bigint): NativeMemoryRegion
  }
}
