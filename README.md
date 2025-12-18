<div align="center">

# Cheatron

**A modern, extensible game hacking and reverse engineering platform for Windows.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-39-47848F?logo=electron)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://typescriptlang.org)
[![Bun](https://img.shields.io/badge/Bun-1.2-f9f1e1?logo=bun)](https://bun.sh)

</div>

---

## ⚠️ Disclaimer

**Cheatron** is currently an experimental, early-stage project.
Expect breaking changes, incomplete features, and potential bugs. It is not intended for production use.

## ✨ Features

- **Memory Viewer** — Hex + ASCII dual-pane with real-time inspection
- **Process Handling** — Internal process inspection (External attachment coming soon)
- **Disassembler** — Capstone-based instruction decoding (Coming Soon)
- **Advanced Scripting** — Automate operations using TypeScript/Bun via CLI (Coming Soon)
- **Native C++ Addon** — High-performance N-API bridge (LLVM/Clang)
- **Cross-Platform Dev** — Mock layer enables UI development on Linux/macOS
- **CLI Tool** — Terminal interface for memory operations
- **Modern UI** — Dark glassmorphism, Tailwind CSS v4, smooth animations

## 🚀 Why Cheatron?

Cheatron isn't just a clone; it's an evolution. While Cheat Engine set the standard, Cheatron brings game hacking into the modern era.

| Feature        | Cheatron                                                       | Legacy Tools               |
| :------------- | :------------------------------------------------------------- | :------------------------- |
| **Scripting**  | **TypeScript / JavaScript** (Modern, typed, massive ecosystem) | Lua (Limited ecosystem)    |
| **Extensions** | React + Node.js (Limitless UI/Logic possibilities)             | Proprietary / Pascal forms |
| **UI/UX**      | **Modern**, Dark Mode, Responsive, Animations                  | Dated Win32 layouts        |
| **Tech Stack** | **Electron, Vite, LLVM/Clang**                                 | Delphi / Lazarus           |
| **Community**  | Open to the massive Web & JS community                         | Niche Pascal developers    |

**Key Advantages:**

1.  **Script with Power**: Leverage the full power of Node.js and npm packages in your cheat scripts.
2.  **Modern Dev Experience**: contribute using the tools you already know (VS Code, React, TypeScript).
3.  **Future Proof**: Built on actively maintained, industry-standard technologies.

## 🛠️ Tech Stack

| Layer        | Technologies                          |
| ------------ | ------------------------------------- |
| **Frontend** | React 19, Tailwind CSS v4, Radix UI   |
| **Desktop**  | Electron 39, Vite 7, Vitest           |
| **Native**   | C++20, CMake, LLVM/Clang, Capstone    |
| **Tooling**  | Bun, TypeScript 5.9, electron-builder |

## 🗺️ Roadmap

- [x] Modern React 19 + Vite integration
- [x] Environment-specific file swapping
- [x] CMake-based native build system
- [x] Memory viewer with real-time updates
- [ ] Disassembler view
- [ ] Memory pattern scanner
- [ ] JavaScript scripting engine
- [ ] Pointer scan & cheat tables

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code guidelines, and PR process.

## 📄 License

[MIT](LICENSE) © [Serkan Aksoy](https://github.com/woldann)

---

<div align="center">

**[Documentation](https://github.com/Cheatron/Cheatron/wiki)** · **[Issues](https://github.com/Cheatron/Cheatron/issues)** · **[Releases](https://github.com/Cheatron/Cheatron/releases)**

</div>
