/**
 * Native Enums and Constants
 * Single source of truth for native constant values
 */

export enum ProcessAccess {
  QUERY_INFORMATION = 0x0400,
  VM_OPERATION = 0x0008,
  VM_READ = 0x0010,
  VM_WRITE = 0x0020,
  SYNCHRONIZE = 0x00100000,
  ALL_ACCESS = 0x1f0fff,
}

export enum MemoryState {
  COMMIT = 0x1000,
  RESERVE = 0x2000,
  FREE = 0x10000,
}

export enum MemoryProtection {
  NOACCESS = 0x01,
  READONLY = 0x02,
  READWRITE = 0x04,
  WRITECOPY = 0x08,
  EXECUTE = 0x10,
  EXECUTE_READ = 0x20,
  EXECUTE_READWRITE = 0x40,
  EXECUTE_WRITECOPY = 0x80,
  GUARD = 0x100,
  NOCACHE = 0x200,
  WRITECOMBINE = 0x400,
}

export enum CapstoneArch {
  X86 = 3,
  ARM = 0,
  ARM64 = 1,
}

export enum CapstoneMode {
  ARM = 0,
  MODE_32 = 2,
  MODE_64 = 8,
  THUMB = 16,
}

export enum CapstoneOption {
  DETAIL = 2,
  ON = 3,
  OFF = 0,
}

// Re-export as a flat object for backward compatibility with NativeConstants
export const NativeEnums = {
  PROCESS_QUERY_INFORMATION: ProcessAccess.QUERY_INFORMATION,
  PROCESS_VM_OPERATION: ProcessAccess.VM_OPERATION,
  PROCESS_VM_READ: ProcessAccess.VM_READ,
  PROCESS_VM_WRITE: ProcessAccess.VM_WRITE,
  SYNCHRONIZE: ProcessAccess.SYNCHRONIZE,
  PROCESS_ALL_ACCESS: ProcessAccess.ALL_ACCESS,

  MEM_COMMIT: MemoryState.COMMIT,
  MEM_RESERVE: MemoryState.RESERVE,
  MEM_FREE: MemoryState.FREE,

  PAGE_NOACCESS: MemoryProtection.NOACCESS,
  PAGE_READONLY: MemoryProtection.READONLY,
  PAGE_READWRITE: MemoryProtection.READWRITE,
  PAGE_WRITECOPY: MemoryProtection.WRITECOPY,
  PAGE_EXECUTE: MemoryProtection.EXECUTE,
  PAGE_EXECUTE_READ: MemoryProtection.EXECUTE_READ,
  PAGE_EXECUTE_READWRITE: MemoryProtection.EXECUTE_READWRITE,
  PAGE_EXECUTE_WRITECOPY: MemoryProtection.EXECUTE_WRITECOPY,
  PAGE_GUARD: MemoryProtection.GUARD,
  PAGE_NOCACHE: MemoryProtection.NOCACHE,
  PAGE_WRITECOMBINE: MemoryProtection.WRITECOMBINE,

  CS_ARCH_X86: CapstoneArch.X86,
  CS_ARCH_ARM: CapstoneArch.ARM,
  CS_ARCH_ARM64: CapstoneArch.ARM64,

  CS_MODE_32: CapstoneMode.MODE_32,
  CS_MODE_64: CapstoneMode.MODE_64,
  CS_MODE_ARM: CapstoneMode.ARM,
  CS_MODE_THUMB: CapstoneMode.THUMB,

  CS_OPT_DETAIL: CapstoneOption.DETAIL,
  CS_OPT_ON: CapstoneOption.ON,
  CS_OPT_OFF: CapstoneOption.OFF,
} as const
