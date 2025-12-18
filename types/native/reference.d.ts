export interface NativeReference {
  getAddress(): string | null
  isValid(): boolean
  release(): void
}

export interface NativeReferenceClass {
  new (address: number | bigint | string): NativeReference
}

export interface ReferenceType {
  isValid: boolean
  address: string | null
  release(): void
}
