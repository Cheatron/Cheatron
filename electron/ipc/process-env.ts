import { IpcServer } from './ipc-server'

export class ProcessEnvServer extends IpcServer {
  protected setupIpc() {
    // Process handlers
    this.addHandle('process:platform', () => process.platform)
    this.addHandle('process:arch', () => process.arch)
    this.addHandle('process:versions', () => process.versions)

    // Main process handlers
    this.addHandle('process:main:pid', () => process.pid)
    this.addHandle('process:main:ppid', () => process.ppid)
  }
}
