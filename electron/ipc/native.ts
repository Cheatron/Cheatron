import { native } from '@core/native'
import { IpcServer } from './ipc-server'

export class NativeServer extends IpcServer {
  protected setupIpc() {
    this.addHandle('native:version', () => {
      return native.version
    })
    this.addHandle('native:constants', () => {
      return native.constants
    })
  }
}
