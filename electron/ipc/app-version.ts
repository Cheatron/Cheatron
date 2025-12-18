import { IpcServer } from './ipc-server'

export class AppVersionServer extends IpcServer {
  protected setupIpc() {
    this.addHandle('app:version', () => {
      return version
    })
  }
}
