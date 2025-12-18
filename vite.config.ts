import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

import { SpawnOptions } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Build native TypeScript modules
 */
// Check if debug mode is enabled via environment variable
const isDebugMode = process.env.ELECTRON_DEBUG === '1'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production'

  return {
    base: './',
    build: {
      rollupOptions: {
        input: command === 'serve' ? 'index.dev.html' : 'index.html',
        output: {
          // manualChunks removed to prevent loading issues in Electron
        },
      },
      sourcemap: !isProduction,
    },
    plugins: [
      react(),

      electron({
        main: {
          entry: 'electron/startup.ts',
          // Pass debug flags to Electron when ELECTRON_DEBUG=1
          onstart: options => {
            const args = isDebugMode
              ? ['--inspect=9229', '--remote-debugging-port=9222', '.']
              : undefined

            // Fix for devtool issue #264: Ignore FD 3 (reserved by Chromium on Linux)
            const spawnOptions: SpawnOptions | undefined =
              process.platform === 'linux'
                ? {
                    stdio: [
                      'inherit',
                      'inherit',
                      'inherit',
                      'ignore',
                      'ipc',
                    ] as SpawnOptions['stdio'],
                  }
                : undefined

            options.startup(args, spawnOptions)
          },
          vite: {
            plugins: [],
            resolve: {
              alias: {
                // Unified environment logic alias
                '@env-logic': isProduction
                  ? path.resolve(__dirname, './core/prod')
                  : path.resolve(__dirname, './core/dev'),
                '@env-electron-logic': isProduction
                  ? path.resolve(__dirname, './electron/prod')
                  : path.resolve(__dirname, './electron/dev'),
                '@': path.resolve(__dirname, './electron'),
                '@native': path.resolve(__dirname, './native'),
                '@core': path.resolve(__dirname, './core'),
              },
            },
            build: {
              sourcemap: isProduction ? false : true,
              minify: isProduction,
              emptyOutDir: false,
              rollupOptions: {
                external: ['electron', '../native'],
                output: {
                  format: 'esm',
                  entryFileNames: 'startup.mjs',
                  sourcemapExcludeSources: false,
                },
              },
            },
          },
        },
        preload: {
          input: path.join(__dirname, 'electron/preload.ts'),
          vite: {
            plugins: [],
            build: {
              sourcemap: isProduction ? false : true,
              minify: isProduction,
              emptyOutDir: false,
              rollupOptions: {
                external: [],
                output: {
                  format: 'cjs',
                  entryFileNames: 'preload.js',
                  sourcemapExcludeSources: false,
                },
              },
            },
          },
        },
        // Polyfill the Electron and Runtime API for Renderer process.
        // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
        // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
        renderer:
          process.env.NODE_ENV === 'test'
            ? // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
              undefined
            : {},
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
