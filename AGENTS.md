# Cheatron AI Coding Instructions

## Architecture Overview

Cheatron is a **memory editor** (Cheat Engine alternative) built with **Electron**, **React 19**, and **Native C++ Modules**. Uses a **Monorepo** structure managed by **Bun**.

```
┌─────────────────────────────────────────────────────────────┐
│                       Renderer (React 19)                   │
│  src/pages/*.tsx → src/components/ → src/hooks/             │
│  Uses: window.* APIs from preload (never import electron)   │
└─────────────────────────┬───────────────────────────────────┘
                          │ IPC (contextBridge)
┌─────────────────────────┴───────────────────────────────────┐
│                   Main Process (Electron)                   │
│  electron/main.ts → electron/ipc/*.ts (IpcServer pattern)   │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                      Shared Core                            │
│  core/*.ts — Globals, Native wrapper, Memory utils          │
│  ↳ core/dev/  (mock implementations for Linux/macOS)        │
│  ↳ core/prod/ (real native bindings for Windows)            │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│  Native Addon (C++20/N-API) │ CLI (Bun + Ink)               │
│  native/src/*.cpp            │ cli/index.tsx                │
│  Built via CMake + LLVM      │ Uses core/ directly          │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **UI (React)** → IPC via `window.*` APIs → **Main Process**
2. **Main Process** → bridges to **Native Layer** via `nativeBinding`
3. **Native Layer** → low-level OS operations (memory R/W) → returns results

## Critical Pattern: `@env-logic` Alias

**Zero-overhead file swapping** — Vite/TS resolves `@env-logic/*` to different directories:

| Build Mode  | `@env-logic` resolves to | Purpose                          |
| ----------- | ------------------------ | -------------------------------- |
| Development | `core/dev/*`             | Mock native, enables Linux/macOS |
| Production  | `core/prod/*`            | Real Windows native bindings     |

```typescript
import { VITE_DEV_SERVER_URL } from '@env-logic/env'
import '@env-logic/global-pre' // Sets rootDir differently per env
```

## IPC Communication Pattern

All IPC handlers extend `IpcServer` base class in [electron/ipc/ipc-server.ts](electron/ipc/ipc-server.ts):

```typescript
export class MyServer extends IpcServer {
  protected setupIpc() {
    this.addHandle('myprefix:action', (event, arg) => {
      /* ... */
    })
    this.addOn('myprefix:event', (event, data) => {
      /* ... */
    })
  }
}
// Instantiate & enable in electron/main.ts
```

**Channel naming**: `memory:*`, `native:*`, `logger:*`, `store:*`, `capstone:*`

## Preload Bridge (Critical)

Renderer **must** use `window.*` APIs from [electron/preload.ts](electron/preload.ts):

```tsx
// ✓ Correct
window.logger.info('Component', 'message')
const version = await window.app.getVersion()

// ✗ WRONG — breaks sandbox
import { ipcRenderer } from 'electron'
```

When adding preload APIs → update types in [src/vite-env.d.ts](src/vite-env.d.ts).

## Global Variables

Bootstrapped in [core/core.ts](core/core.ts):

- `logger` — Winston-based: `logger.info('Category', 'message', { data })`
- `nativeBinding` — Raw N-API bindings (prefer `native` wrapper)
- `native` — High-level wrapper: `native.process.open(pid)`
- `rootDir`, `fs`, `path`, `os` — Runtime builtins made global

## Commands

| Task                    | Command                         |
| ----------------------- | ------------------------------- |
| Dev server              | `bun run dev`                   |
| Dev + inspector         | `bun run dev:debug`             |
| Full debug session      | `bun run debug`                 |
| Full build (Windows)    | `bun run build`                 |
| Native build (release)  | `bun run native:build:release`  |
| Native build (Electron) | `bun run native:build:electron` |
| Type-check all          | `bun run tsc -b`                |
| Tests                   | `bun run test`                  |
| Lint                    | `bun run lint`                  |
| CLI dev                 | `bun run --cwd cli dev`         |

## Path Aliases

| Alias        | Maps to      | Context          |
| ------------ | ------------ | ---------------- |
| `@/`         | `src/`       | Renderer         |
| `@/`         | `electron/`  | Main process     |
| `@core`      | `core/`      | All              |
| `@native`    | `native/`    | All              |
| `@env-logic` | `core/dev/`  | Dev (see above)  |
| `@env-logic` | `core/prod/` | Prod (see above) |

## TypeScript Project References

Solution-style with 3 sub-projects in [tsconfig.json](tsconfig.json):

- `tsconfig.electron.json` — Main process + preload
- `tsconfig.cli.json` — CLI app
- `tsconfig.web.json` — Renderer

## Native Addon

- **Location**: `native/` with CMake + LLVM/Clang
- **API**: N-API only (no V8/NAN)
- **Submodules**: Capstone (disassembler), Neptune, NThread, NHook
- **Mock**: [core/native/mock/index.ts](core/native/mock/index.ts) — enables Linux/macOS dev

## Codebase Map

```
src/
├── components/     # Reusable UI components
├── hooks/          # React hooks (useMemoryGrid, etc.)
├── pages/          # Route components (MemoryViewer, Settings)
└── stores/         # Zustand state management

electron/
├── ipc/            # IpcServer implementations
├── main.ts         # Window creation, IPC setup
└── preload.ts      # contextBridge APIs

core/
├── dev/            # Mock implementations
├── prod/           # Real native bindings
├── globals/        # Global variable setup
└── native/mock/    # MockNative class
```

## Key Conventions

1. **Logging**: `logger.info('Category', 'message', { data })`
2. **Types**: Shared definitions in `types/` directory
3. **State**: Zustand for renderer stores (`src/stores/`)
4. **Styling**: Tailwind CSS v4 + CSS variables (`var(--primary)`)
5. **Icons**: Lucide React exclusively
6. **UI System**: shadcn/ui (Radix UI primitives) in `src/components/ui`
7. **Memory**: `NetworkedMemoryGrid` for IPC-bridged memory views
