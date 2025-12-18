import { ipcMain, IpcMainInvokeEvent, IpcMainEvent } from 'electron'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HandlerFn = (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ListenerFn = (event: IpcMainEvent, ...args: any[]) => void

interface IpcHandler {
  type: 'handle' | 'on'
  channel: string
  listener: HandlerFn | ListenerFn
}

export abstract class IpcServer {
  private handlers: IpcHandler[] = []
  private isEnabled = false

  constructor() {
    this.setupIpc()
  }

  protected abstract setupIpc(): void

  protected addHandle(channel: string, listener: HandlerFn) {
    this.handlers.push({ type: 'handle', channel, listener })
  }

  protected addOn(channel: string, listener: ListenerFn) {
    this.handlers.push({ type: 'on', channel, listener })
  }

  public enable() {
    if (this.isEnabled) return
    this.handlers.forEach(h => {
      if (h.type === 'handle') {
        ipcMain.handle(h.channel, h.listener as HandlerFn)
      } else {
        ipcMain.on(h.channel, h.listener as ListenerFn)
      }
    })
    this.isEnabled = true
  }

  public disable() {
    if (!this.isEnabled) return
    this.handlers.forEach(h => {
      if (h.type === 'handle') {
        ipcMain.removeHandler(h.channel)
      } else {
        ipcMain.removeListener(h.channel, h.listener as ListenerFn)
      }
    })
    this.isEnabled = false
  }
}
