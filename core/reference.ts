import { ReferenceType, NativeReference } from 'types/native/reference'

export class Reference implements ReferenceType {
  protected ref: NativeReference

  constructor(ref: NativeReference) {
    this.ref = ref
  }

  get isValid(): boolean {
    return !!this.ref
  }

  get address() {
    return this.ref.getAddress()
  }

  release() {
    this.ref.release()
  }
}
