import { NativeReference, ReferenceType } from './native/reference'

export declare class Reference implements ReferenceType {
  constructor(ref: NativeReference)
  get isValid(): boolean
  get address(): string | null
  release(): void
}
