export type OpaqueHandle<K, T> = T & { __brand: K }

export type CapstoneHandle = OpaqueHandle<'CapstoneHandle', string>
export type MemoryHandle = OpaqueHandle<'MemoryHandle', string>
