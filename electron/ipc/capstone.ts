import { IpcServer } from './ipc-server'
import { Capstone } from '@core/capstone'
import { randomUUID } from 'crypto'

export class CapstoneServer extends IpcServer {
  private _instances: Map<string, Capstone> = new Map()

  protected setupIpc() {
    this.addHandle('capstone:open', async (_event, arch: number, mode: number) => {
      try {
        const instance = native.capstone.open(arch, mode)
        const id = randomUUID()
        this._instances.set(id, instance)
        return id
      } catch (err) {
        console.error('Failed to open Capstone:', err)
        throw err
      }
    })

    this.addHandle('capstone:close', async (_event, id: string) => {
      const instance = this._instances.get(id)
      if (instance) {
        try {
          instance.close()
        } catch (err) {
          console.error(`Failed to close Capstone instance ${id}:`, err)
        } finally {
          this._instances.delete(id)
        }
      }
    })
  }
}
