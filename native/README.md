# Cheatron Native Module

Native C++ module for Cheatron using N-API.

## Building

```bash
cd native
bun install
bun run build
```

## Usage

```typescript
import cheatronNative from './native'

// Simple function
const greeting = cheatronNative.sayHello('World')
console.log(greeting) // "Hello from C++, World!"

// Math operation
const sum = cheatronNative.add(10, 20)
console.log(sum) // 30

// Get version
const version = cheatronNative.getVersion()
console.log(version) // { major: 1, minor: 0, patch: 0, name: 'cheatron-native' }

// System info
const memory = cheatronNative.getSystemMemory()
console.log(memory) // { totalPhysical: ..., availablePhysical: ..., usagePercent: ... }

const cpu = cheatronNative.getCPUInfo()
console.log(cpu) // { cores: 8, model: '...', speed: 3600 }

// Async operation
cheatronNative.doAsyncWork(1000, (err, result) => {
  if (err) {
    console.error(err)
  } else {
    console.log(result) // "Async operation completed!"
  }
})
```

## Development

The module provides example functions to get started. You can add your own C++ functions in `src/cheatron-native.cpp`.

### Adding New Functions

1. Write C++ function in `src/cheatron-native.cpp`
2. Export it in the `Init` function
3. Add TypeScript definitions in `cheatron-native.d.ts`
4. Rebuild with `bun run build`

## Platform Support

- ✅ Windows
- ✅ Linux
- ✅ macOS

## Requirements

- Node.js 18+
- C++ compiler (MSVC on Windows, GCC on Linux, Clang on macOS)
- Python 3 (for node-gyp)
