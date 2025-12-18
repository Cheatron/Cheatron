/**
 * Mock native module for development and testing
 */
import {
  NativeBindingType,
  NativeBindingCapstoneType,
  NativeBindingMemoryType,
  NativeBindingProcessType,
  NativeMemoryRegion,
} from 'types/native/index'
import { NativeConstantsType } from 'types/native/constants'

import { NativeEnums } from './constants'

/** Mock Constants object */
export const mockConstants: NativeConstantsType = NativeEnums

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(global as any).native = mockConstants

import { NativeReference } from 'types/native/reference'

/** Mock Reference class for process memory operations */
export class MockReference implements NativeReference {
  private ptr: number
  private valid: boolean

  constructor(address: number | bigint | string) {
    let ptr = 0
    if (typeof address === 'number') {
      ptr = address
    } else if (typeof address === 'bigint') {
      ptr = Number(address)
    } else if (typeof address === 'string') {
      ptr = parseInt(address, 16) || 0
    }
    this.ptr = ptr
    this.valid = true
  }

  getAddress(): string | null {
    return this.valid ? `0x${this.ptr.toString(16).padStart(8, '0')}` : null
  }

  isValid(): boolean {
    return this.valid
  }

  release(): void {
    this.valid = false
  }
}

/** Class for handling Process-related Mock Operations */
export class MockProcess implements NativeBindingProcessType {
  getMockRegions(): NativeMemoryRegion[] {
    const regions: NativeMemoryRegion[] = []
    const baseAddr = 0x100000

    for (let i = 0; i < 10; i++) {
      regions.push({
        base: baseAddr + i * 0x10000,
        size: 0x1000 + i * 0x100, // Varying sizes
        protection: i % 2 === 0 ? 0x04 : 0x02, // PAGE_READWRITE / PAGE_READONLY
      })
    }

    // Add a specific region at 0x400000 for default view
    regions.push({
      base: 0x400000,
      size: 0x10000,
      protection: 0x04,
    })

    return regions
  }

  getCurrent = () => {
    return new MockReference((Math.random() * 0xffffffff) | 0)
  }

  open = (pid: number) => {
    if (!Number.isFinite(pid)) {
      throw new Error('Invalid PID')
    }
    return new MockReference((Math.random() * 0xffffffff) | 0)
  }

  // Memory namespace
  public memory: NativeBindingMemoryType = {
    read: (ref: unknown, address: number | bigint, length: number): Buffer => {
      const mockRef = ref as MockReference | null
      if (!mockRef || typeof mockRef.isValid !== 'function' || !mockRef.isValid()) {
        throw new Error('Invalid reference')
      }

      // Basic validation
      if (length <= 0) {
        throw new Error('Invalid address or length')
      }
      // BigInt safe validation
      const addrBi = BigInt(address)
      const lenBi = BigInt(length)

      // Regions
      const regions = this.getMockRegions()
      const endBi = addrBi + lenBi

      // Find region containing the range start
      const region = regions.find(r => {
        const rBase = BigInt(r.base)
        const rSize = BigInt(r.size)
        return addrBi >= rBase && addrBi < rBase + rSize
      })

      if (!region) {
        throw new Error('Invalid address or length')
      }

      const rBase = BigInt(region.base)
      const rEnd = rBase + BigInt(region.size)

      // Strict mock: Require full containment in one region
      if (endBi > rEnd) {
        throw new Error('Invalid address or length')
      }

      if (MemoryUtils.isNoAccess(region.protection)) {
        throw new Error('Invalid address or length')
      }

      // Generate data
      const buf = Buffer.alloc(length)
      const now = Date.now()
      const tick = Math.floor(now / 1000) // Change every second
      const fastTick = Math.floor(now / 200) // Change 5x per second

      for (let i = 0; i < length; i++) {
        // Deterministic patter based on address
        const curr = addrBi + BigInt(i)

        let val = Number((curr & 0xffn) ^ ((curr >> 8n) & 0xffn))

        // Add dynamic noise to simulate changing memory
        // Change specific "addresses" based on time to test live updates
        if (curr % 32n === 0n) {
          val = (val + tick) % 256
        } else if (curr % 19n === 0n) {
          val = (val + fastTick) % 256
        }

        buf[i] = val
      }
      return buf
    },

    write: (ref: unknown, address: number | bigint, data: Buffer): number => {
      const mockRef = ref as MockReference | null
      if (!mockRef || typeof mockRef.isValid !== 'function' || !mockRef.isValid()) {
        throw new Error('Invalid reference')
      }

      // BigInt safe
      const addrBi = BigInt(address)
      const lenBi = BigInt(data.length)

      if (lenBi === 0n) return 0

      const regions = this.getMockRegions()
      const endBi = addrBi + lenBi

      const region = regions.find(r => {
        const rBase = BigInt(r.base)
        const rSize = BigInt(r.size)
        return addrBi >= rBase && addrBi < rBase + rSize
      })

      if (!region) {
        throw new Error('Invalid address or length')
      }

      const rBase = BigInt(region.base)
      const rEnd = rBase + BigInt(region.size)

      if (endBi > rEnd) {
        throw new Error(
          `Memory Access Violation: Write spans across region boundaries. Region limit: 0x${rEnd.toString(16)}, Requested end: 0x${endBi.toString(16)}`,
        )
      }

      if (!MemoryUtils.canWrite(region.protection)) {
        throw new Error(
          `Memory Access Violation: Write to non-writable region (Protection: ${MemoryUtils.getProtectionString(region.protection)}) at 0x${addrBi.toString(16)}`,
        )
      }

      return data.length
    },

    query: (ref: unknown, address: number | bigint) => {
      const mockRef = ref as MockReference | null
      if (!mockRef || typeof mockRef.isValid !== 'function' || !mockRef.isValid()) {
        throw new Error('Invalid reference')
      }

      const addrBi = BigInt(address)
      const regions = this.getMockRegions()

      // Filter by address (check if address falls within a region)
      const found = regions.find(r => {
        const rBase = BigInt(r.base)
        const rSize = BigInt(r.size)
        return addrBi >= rBase && addrBi < rBase + rSize
      })

      if (found) {
        return found
      }

      // If not found, return a free region
      // Align to page boundary (4KB = 0x1000)
      const pageMask = ~0xfffn
      const alignedBase = addrBi & pageMask

      return {
        base: alignedBase,
        size: 0x1000n,
        protection: 0x01,
      }
    },
  }
}

/** Class for handling Capstone-related Mock Operations */
export class MockCapstone implements NativeBindingCapstoneType {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  open = (_arch: number, _mode: number) => {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      disasm: (_buffer: Uint8Array, _addr: bigint) => {
        return []
      },
      close: () => {},
    }
  }
}

/**
 * Main Mock Native Module Class
 */
export class MockNative implements NativeBindingType {
  private version: string
  private logCallback: ((level: string, message: string) => void) | null = null
  public process: MockProcess
  public cs: MockCapstone
  public Reference = MockReference

  constructor(version = '1.0.0-mock') {
    this.version = version
    this.process = new MockProcess()
    this.cs = new MockCapstone()
  }

  private log = (level: string, msg: string) => {
    if (this.logCallback) this.logCallback(level, msg)
  }

  public getVersion = () => {
    return this.version
  }

  public getConstants = () => {
    return mockConstants
  }

  public initialize = (cb: (level: string, message: string) => void) => {
    this.logCallback = cb
    this.log('info', 'Mock: Log callback registered')
    return true
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}
