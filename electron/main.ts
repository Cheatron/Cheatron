import { app, BrowserWindow } from 'electron'
import { AppVersionServer } from './ipc/app-version'
import { ProcessMemoryServer } from './ipc/memory'
import { NativeServer } from './ipc/native'
import { LoggerServer } from './ipc/logger'
import { ProcessEnvServer } from './ipc/process-env'
import { AccentColorServer } from './ipc/accent-color'
import { UpdateServer } from './ipc/update'
import { StoreServer } from './ipc/store'
import { CapstoneServer } from './ipc/capstone'

import { loadWindowContent } from '@env-electron-logic/load-window'
import { ICON_PATH } from './icon'

const __filename = url.fileURLToPath(import.meta.url)
export const MAIN_DIRNAME = path.dirname(__filename)

const LOG_CATEGORY_MAIN = 'Main'

const PRELOAD_SCRIPT_NAME = 'preload.js'

let win: BrowserWindow | null

const WINDOW_CONFIG: Electron.BrowserWindowConstructorOptions = {
  width: 1200,
  height: 800,
  icon: ICON_PATH,
  frame: false,
  transparent: true,
  webPreferences: {
    preload: '', // This will be dynamically set later
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  },
}

function createWindow() {
  logger.info(LOG_CATEGORY_MAIN, 'Creating main window')

  const preloadPath = path.join(MAIN_DIRNAME, PRELOAD_SCRIPT_NAME)
  const preloadExists = fs.existsSync(preloadPath)

  logger.info(LOG_CATEGORY_MAIN, 'Preload script check', {
    path: preloadPath,
    exists: preloadExists,
    mainDist: MAIN_DIRNAME,
  })

  if (!preloadExists) {
    logger.error(LOG_CATEGORY_MAIN, 'Preload script not found', { path: preloadPath })
  }

  win = new BrowserWindow({
    ...WINDOW_CONFIG, // Use the spread operator to include base config
    webPreferences: {
      ...WINDOW_CONFIG.webPreferences,
      preload: preloadPath, // Override preload path
    },
  })

  logger.info(LOG_CATEGORY_MAIN, 'Preload path being used:', {
    preloadPath: preloadPath,
    preloadFileExists: fs.existsSync(preloadPath),
  })

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error(LOG_CATEGORY_MAIN, 'Failed to load window', { errorCode, errorDescription })
    // Only reload if it's not a crash loop risk? For now just log.
    win?.webContents.reloadIgnoringCache()
  })

  win.webContents.on('render-process-gone', (event, details) => {
    logger.error(LOG_CATEGORY_MAIN, 'Renderer process gone', {
      reason: details.reason,
      exitCode: details.exitCode,
    })
  })

  win.webContents.on('did-finish-load', () => {
    logger.info(LOG_CATEGORY_MAIN, 'Window loaded successfully')
  })

  loadWindowContent(win).catch(error => {
    logger.error(LOG_CATEGORY_MAIN, 'Failed to load window content', { error })
  })
}

app.on('window-all-closed', () => {
  logger.info(LOG_CATEGORY_MAIN, 'All windows closed')
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  logger.info(LOG_CATEGORY_MAIN, 'App activated')
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  // Initialize IPC Servers
  const servers = [
    new AppVersionServer(),
    new ProcessMemoryServer(),
    new NativeServer(),
    new ProcessEnvServer(),
    new LoggerServer(),
    new AccentColorServer(),
    new UpdateServer(),
    new StoreServer(),
    new CapstoneServer(),
  ]
  servers.forEach(server => server.enable())

  logger.info(LOG_CATEGORY_MAIN, 'Electron app ready')
  createWindow()
})
