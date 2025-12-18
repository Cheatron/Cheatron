import { NativeReference } from 'types/native/reference'
import { Reference } from './reference'
import { CapstoneArchType, CapstoneModeType } from 'types/capstone'

export class Capstone extends Reference {
  private readonly arch: CapstoneArchType
  private readonly mode: CapstoneModeType

  constructor(ref: NativeReference, arch: CapstoneArchType, mode: CapstoneModeType) {
    super(ref)
    this.arch = arch
    this.mode = mode
  }

  public getArch(): CapstoneArchType {
    return this.arch
  }

  public getMode(): CapstoneModeType {
    return this.mode
  }

  public close(): void {
    this.ref.release()
  }
}
