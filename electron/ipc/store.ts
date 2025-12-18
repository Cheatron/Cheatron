import { IpcServer } from './ipc-server'

const LOG_CATEGORY = 'StoreServer'

type ElectronStoreType = import('electron-store').default
type ElectronStoreCtor = (typeof import('electron-store'))['default']

export class StoreServer extends IpcServer {
  private storeInstance: ElectronStoreType | null = null
  private fallbackStore = new Map<string, unknown>()
  private storeFallbackActive = false

  protected setupIpc() {
    this.addHandle('store:get', async (_event, key: string) => {
      try {
        const store = await this.ensureStore()
        return store.get(key)
      } catch (error) {
        this.logStoreError(`get:${key}`, error)
        return this.fallbackStore.get(key)
      }
    })

    this.addHandle('store:set', async (_event, key: string, value: unknown) => {
      try {
        const store = await this.ensureStore()
        store.set(key, value)
      } catch (error) {
        this.logStoreError(`set:${key}`, error)
        this.fallbackStore.set(key, value)
      }
      return true
    })

    this.addHandle('store:delete', async (_event, key: string) => {
      try {
        const store = await this.ensureStore()
        store.delete(key)
      } catch (error) {
        this.logStoreError(`delete:${key}`, error)
        this.fallbackStore.delete(key)
      }
      return true
    })
  }

  private async ensureStore(): Promise<ElectronStoreType> {
    if (this.storeInstance) {
      return this.storeInstance
    }

    try {
      const module = await import('electron-store')
      const StoreCtor: ElectronStoreCtor = module.default
      this.storeInstance = new StoreCtor()
      this.storeFallbackActive = false
      return this.storeInstance
    } catch (error) {
      this.logStoreError('init', error)
      throw error
    }
  }

  private logStoreError(phase: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (this.storeFallbackActive) {
      logger.debug(LOG_CATEGORY, `electron-store ${phase} failed`, { message })
    } else {
      logger.warn(LOG_CATEGORY, `electron-store ${phase} failed`, { message })
      this.storeFallbackActive = true
    }
  }
}
