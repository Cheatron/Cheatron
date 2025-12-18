import { IpcServer } from './ipc-server'
import { shell } from 'electron'

export class LoggerServer extends IpcServer {
  protected setupIpc() {
    // Listen for logs from renderer process
    this.addOn('renderer-log', (_event, logData) => {
      const { level, category, message, data } = logData
      // Log with [Renderer] prefix to distinguish from main process
      const rendererCategory = `Renderer/${category}`
      const logFn = logger[level as keyof typeof logger]
      if (typeof logFn === 'function') {
        logFn(rendererCategory, message, data)
      }
    })

    this.addHandle('logger:openLogFile', () => {
      if (global.logFilePath) {
        shell.openPath(global.logFilePath)
      }
    })
  }
}
