import { IpcServer } from '../../ipc/ipc-server'
import type { UpdaterCheckResponse } from 'types/updater'

const LOG_CATEGORY = 'UpdateServer(Dev)'

export class UpdateServer extends IpcServer {
  constructor() {
    super()
    logger.info(LOG_CATEGORY, 'Initialized (Disabled in Dev)')
  }

  protected setupIpc() {
    this.addHandle('updater:check', async (): Promise<UpdaterCheckResponse> => {
      logger.info(LOG_CATEGORY, 'Update check requested (Mocked)')
      return { status: 'unsupported', reason: 'Dev mode' }
    })

    this.addHandle('updater:download', async () => {
      logger.warn(LOG_CATEGORY, 'Update download requested (Disabled)')
      throw new Error('Updates are disabled in development')
    })

    this.addHandle('updater:install', async () => {
      logger.warn(LOG_CATEGORY, 'Update install requested (Disabled)')
      throw new Error('Updates are disabled in development')
    })
  }
}
