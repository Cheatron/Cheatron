import { WebContents } from 'electron'
import { NetworkedMemoryGrid } from '@core/network/memory-protocol'
import { native } from '@core/native'
import { IpcServer } from './ipc-server'

import { MemoryCreatePayload, MemoryUpdatePayload } from 'types/memory'

export class ProcessMemoryServer extends IpcServer {
  private _grids: Map<string, NetworkedMemoryGrid> = new Map()
  private _webContents: Map<string, WebContents> = new Map()

  protected setupIpc() {
    this.addHandle('memory:create', (event, config: MemoryCreatePayload) => {
      this._createGrid(event.sender, config)
    })

    this.addHandle('memory:update', (event, config: MemoryUpdatePayload) => {
      this._updateGrid(config)
    })

    this.addHandle('memory:destroy', (event, id: string) => {
      this._destroyGrid(id)
    })
  }

  private _createGrid(sender: WebContents, config: MemoryCreatePayload) {
    if (this._grids.has(config.id)) {
      this._destroyGrid(config.id)
    }

    const proc = native.process.current

    // MemoryGridOptions requires rows (bigint) and cols (number)
    // plus optional MemoryViewerOptions
    const grid = new NetworkedMemoryGrid(
      proc,
      {
        cols: config.cols,
        rows: config.rows,
        minAddress: config.minAddress,
        cacheDistance: config.cacheDistance,
        debounceMs: config.debounceMs ?? 400,
        autoRefreshMs: config.autoRefreshMs ?? 1000,
        readLength: config.readLength ?? 0,
        cursor: config.cursor ?? 0n,
      },
      (packet: Buffer) => {
        // Send data back to renderer
        // Channel: 'memory:data:[id]'
        if (!sender.isDestroyed()) {
          sender.send(`memory:data:${config.id}`, packet)
        }
      },
    )

    this._grids.set(config.id, grid)
    this._webContents.set(config.id, sender)

    grid.start()
  }

  private _updateGrid(config: MemoryUpdatePayload) {
    logger.info('Memory', 'Update Grid Config', config)
    const grid = this._grids.get(config.id)
    if (!grid) return

    if (config.cursor !== undefined) grid.setCursor(config.cursor)
    if (config.readLength !== undefined) grid.setReadLength(config.readLength)
    if (config.debounceMs !== undefined) grid.debounce = config.debounceMs
    if (config.autoRefreshMs !== undefined) grid.autoRefresh = config.autoRefreshMs
  }

  private _destroyGrid(id: string) {
    const grid = this._grids.get(id)
    if (grid) {
      grid.stop()
      this._grids.delete(id)
      this._webContents.delete(id)
    }
  }
}
