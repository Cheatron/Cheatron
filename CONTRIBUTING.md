# Contributing to Cheatron

Thank you for your interest in contributing! This guide covers development setup, conventions, and the PR process.

## 🚀 Development Setup

### Prerequisites

- **Bun** (v1.2+) — Package manager and runtime
- **Git** — With submodule support

#### Windows (Native Addon)

1.  **Install [Visual Studio 2022 Build Tools](https://visualstudio.microsoft.com/downloads/)**:
    - Workload: **Desktop development with C++**
    - **Required Components** (select in "Individual components" tab if not default):
      - MSVC v143 - VS 2022 C++ x64/x86 build tools
      - Windows 11 SDK (or Windows 10 SDK)
      - **C++ CMake tools for Windows**
      - **C++ Clang Compiler for Windows** (Essential for our toolchain)
      - **C++ ATL for v143 build tools** (x86 & x64)
    - **Install [NASM](https://www.nasm.us/)**: Ensure it's in your PATH.

2.  **Verify Setup**:
    Open "x64 Native Tools Command Prompt for VS 2022" and ensure `clang --version` and `cmake --version` work.

#### Linux (Dev & Native)

Install build essentials, LLVM/Clang, and cross-compilation tools (Wine/MinGW) if you intend to build the native module for Windows:

```bash
# Enable 32-bit architecture (required for Wine)
sudo dpkg --add-architecture i386
sudo apt-get update

# Install build tools, cross-compilers, and runtime
sudo apt-get install -y --no-install-recommends \
  build-essential cmake llvm lld clang ninja-build pkg-config \
  mingw-w64 nasm \
  wine wine32 wine64 libwine \
  libgtk-3-dev libwebkit2gtk-4.0-dev
```

### Clone & Install

```bash
git clone --recursive https://github.com/Cheatron/Cheatron.git
cd Cheatron
bun install
# Windows users (optional): Build native module for dev
# bun run native:build:electron
bun run dev
```

> **Linux/macOS:** Native layer uses mocks — full UI development works without Windows.
> **Windows:** Runs with mocks by default. Run `native:build:electron` to use real native module.

### 📁 Project Structure

```
├── src/               # React renderer (UI)
│   ├── components/    # Reusable UI components (shadcn/ui)
│   ├── pages/         # Application routes/views
│   ├── hooks/         # Custom React hooks
│   └── stores/        # Zustand state management
├── electron/          # Main process (Node.js)
│   ├── dev/           # Development-specific implementations
│   ├── prod/          # Production-specific implementations
│   ├── ipc/           # IPC handlers (e.g., memory, update)
│   ├── main.ts        # App entry point & window management
│   └── preload.ts     # Context bridge (secure API exposure)
├── core/              # Shared business logic
│   ├── dev/           # Mock implementations (Linux/macOS support)
│   └── prod/          # Real native bindings (Windows)
├── native/            # C++20 Native Addon (CMake + LLVM)
│   ├── src/           # C++ source files
│   └── submodules/    # Dependencies (Capstone, Neptune, etc.)
├── cli/               # Command-line interface (Bun + Ink)
├── scripts/           # Build & signing utilities (TypeScript)
├── types/             # Global TypeScript definitions
└── tests/             # Unit tests (Vitest)
```

### ⚡ Architecture

Cheatron uses **Zero-Overhead File Swapping** via build-time aliases:

```typescript
// Automatically resolves to dev or prod implementation based on build mode
import { ICON_PATH } from '@env-electron-logic/icon'
import { native } from '@env-logic/native'
```

| Build Mode  | `@env-logic` → | `@env-electron-logic` → | Purpose                   |
| ----------- | -------------- | ----------------------- | ------------------------- |
| Development | `core/dev/*`   | `electron/dev/*`        | Mocks for Linux/macOS     |
| Production  | `core/prod/*`  | `electron/prod/*`       | Real Windows native calls |

## 🛠️ Workflow

```bash
bun run dev          # Dev server + Electron
bun run dev:debug    # With inspector (--inspect=9229)
bun run debug        # Build dev + debugger
bun run test         # Vitest
bun run lint         # ESLint
bun run format       # Prettier
bun run tsc -b       # Type-check all projects
```

### Building

```bash
bun run build              # Full production build (Windows)
bun run native:build       # C++ addon only
```

## 📐 Code Guidelines

### General

- **TypeScript everywhere** — Avoid `any` without `eslint-disable`
- **Prettier** — Run `bun run format` before commits
- **ESLint** — Fix all warnings before PR

### Renderer (React)

```tsx
// ✓ Use preload bridge
window.logger.info('Component', 'message', { data })
const version = await window.app.getVersion()

// ✗ Never import electron directly
import { ipcRenderer } from 'electron' // breaks sandbox!
```

- **Zustand** for state → `src/stores/`
- **Tailwind CSS** → Use `var(--primary)` not hardcoded colors
- **Lucide React** for icons

### Main Process (Electron)

- **IpcServer pattern** → Extend `IpcServer` in `electron/ipc/`
- **Channel naming** → `memory:*`, `native:*`, `logger:*`, `store:*`
- **Preload types** → Update `src/vite-env.d.ts`

### Native Addon (C++)

- **N-API only** — No V8/NAN
- **RAII** — Avoid raw pointers
- **Error handling** — Return meaningful errors to JS

## ➕ Adding Features

### New Page

1. Create `src/pages/YourPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation in `src/components/Sidebar.tsx`

### New IPC Endpoint

1. Create/extend `IpcServer` in `electron/ipc/`
2. Enable in `electron/main.ts`
3. Expose in `electron/preload.ts`
4. Add types in `src/vite-env.d.ts`

### New Native Function

1. Implement in `native/src/*.cpp`
2. Build: `bun run native:build`
3. Add IPC + preload + types (above)

## 🔀 Pull Request Process

1. **Fork** and create branch:

   ```bash
   git checkout -b feat/your-feature
   # or fix/your-fix
   ```

2. **Commit** with conventional format:
   - `feat: add memory scanner`
   - `fix: resolve crash on detach`
   - `docs: update README`
   - `refactor: simplify IPC`
   - `chore: update deps`

3. **Test** before pushing:

   ```bash
   bun run test && bun run lint && bun run tsc -b
   ```

4. **Open PR** against `main`

### PR Checklist

- [ ] Follows code style
- [ ] Self-reviewed
- [ ] Tests added/updated
- [ ] No breaking changes (or documented)

## 🐛 Reporting Issues

### Bug Reports

- OS and version
- Cheatron version
- Steps to reproduce
- Expected vs actual behavior
- Logs (`~/.config/cheatron/logs/`)

### Feature Requests

- Describe use case
- Why existing features don't work
- Suggested approach (optional)

## 📄 License

By contributing, you agree to license your work under [MIT](LICENSE).

---

Questions? Open a [Discussion](https://github.com/Cheatron/Cheatron/discussions).
