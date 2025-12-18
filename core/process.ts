import { NativeReference } from 'types/native/reference'
import type { NativeMemoryRegion } from 'types/native/index'
import { Reference } from './reference'
import { ProcessID } from 'types/process'

export class Process extends Reference {
  private readonly pid: ProcessID

  constructor(ref: NativeReference, pid: ProcessID) {
    super(ref)
    this.pid = pid
  }

  public getPID(): ProcessID {
    return this.pid
  }

  memory = {
    read: (address: number | bigint, length: number): Buffer => {
      return nativeBinding.process.memory.read(this.ref, address, length)
    },
    write: (address: number | bigint, data: Buffer): number => {
      return nativeBinding.process.memory.write(this.ref, address, data)
    },
    query: (address: number | bigint): NativeMemoryRegion => {
      return nativeBinding.process.memory.query(this.ref, address)
    },
  }
}
