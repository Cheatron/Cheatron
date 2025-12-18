import { NativeReference } from 'types/native/reference'
import { Reference } from './reference'
import { NativeConstants } from 'types/native/constants'

export type CapstoneArchType = typeof NativeConstants.CS_ARCH_X86
export type CapstoneModeType = typeof NativeConstants.CS_MODE_32

export declare class Capstone extends Reference {
  private readonly arch: CapstoneArchType
  private readonly mode: CapstoneModeType

  constructor(ref: NativeReference, arch: CapstoneArchType, mode: CapstoneModeType)

  public getArch(): CapstoneArchType
  public getMode(): CapstoneModeType
  public close(): void
}
