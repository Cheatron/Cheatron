import { contextBridge, ipcRenderer } from 'electron'

console.log('[Preload] Script started')
ipcRenderer.send('renderer-log', {
  level: 'info',
  category: 'Preload',
  message: 'Preload script started via IPC',
})

// Expose logging functions to renderer
contextBridge.exposeInMainWorld('logger', {
  debug: (category: string, message: string, data?: unknown) => {
    ipcRenderer.send('renderer-log', { level: 'debug', category, message, data })
  },
  info: (category: string, message: string, data?: unknown) => {
    ipcRenderer.send('renderer-log', { level: 'info', category, message, data })
  },
  warn: (category: string, message: string, data?: unknown) => {
    ipcRenderer.send('renderer-log', { level: 'warn', category, message, data })
  },
  error: (category: string, message: string, data?: unknown) => {
    ipcRenderer.send('renderer-log', { level: 'error', category, message, data })
  },
  open: () => {
    ipcRenderer.invoke('logger:openLogFile')
  },
})

contextBridge.exposeInMainWorld('process', {
  getPlatform: () => ipcRenderer.invoke('process:platform'),
  getArch: () => ipcRenderer.invoke('process:arch'),
  getVersions: () => ipcRenderer.invoke('process:versions'),
  main: {
    getPID: () => ipcRenderer.invoke('process:main:pid'),
    getPPID: () => ipcRenderer.invoke('process:main:ppid'),
  },
})

contextBridge.exposeInMainWorld('app', {
  getVersion: () => ipcRenderer.invoke('app:version'),
})

contextBridge.exposeInMainWorld('system', {
  getAccentColor: () => ipcRenderer.invoke('system:getAccentColor'),
})

contextBridge.exposeInMainWorld('native', {
  getVersion: () => ipcRenderer.invoke('native:version'),
  getConstants: () => ipcRenderer.invoke('native:constants'),
})

contextBridge.exposeInMainWorld('cs', {
  open: (arch: number, mode: number) => ipcRenderer.invoke('capstone:open', arch, mode),
  close: (handle: string) => ipcRenderer.invoke('capstone:close', handle),
})

contextBridge.exposeInMainWorld('memory', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (config: any) => ipcRenderer.invoke('memory:create', config),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (config: any) => ipcRenderer.invoke('memory:update', config),
  destroy: (id: string) => ipcRenderer.invoke('memory:destroy', id),
  onData: (id: string, callback: (data: ArrayBuffer) => void) => {
    // Wrap callback to handle event argument if needed
    ipcRenderer.on(`memory:data:${id}`, (_event, data) => callback(data))
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  offData: (id: string, _callback: (data: ArrayBuffer) => void) => {
    // Note: removing listener by function reference across bridge is tricky.
    // Ideally we'd remove all for specific ID, or manage a map.
    // For now, simpler implementation:
    ipcRenderer.removeAllListeners(`memory:data:${id}`)
  },
})

// Minimal store API proxied to main process via IPC. Use for light config persistence.
contextBridge.exposeInMainWorld('store', {
  get: (key: string) => ipcRenderer.invoke('store:get', key),
  set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
  delete: (key: string) => ipcRenderer.invoke('store:delete', key),
})

const validChannels = [
  'updater:available',
  'updater:not-available',
  'updater:progress',
  'updater:downloaded',
  'updater:error',
]

contextBridge.exposeInMainWorld('updater', {
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  quitAndInstall: () => ipcRenderer.invoke('updater:install'),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (channel: string, callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback)
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off: (channel: string, callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback)
    }
  },
})

contextBridge.exposeInMainWorld('cheatron', {
  openFile: (path: string) => ipcRenderer.invoke('cheatron:openFile', path),
})
