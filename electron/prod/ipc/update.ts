import { app, type WebContents } from 'electron'
import { IpcServer } from '../../ipc/ipc-server'
import path from 'path'
import fs from 'fs'
import type { ReleaseNoteEntry, UpdaterCheckResponse } from 'types/updater'

const LOG_CATEGORY = 'UpdateServer'

type AutoUpdaterInstance = (typeof import('electron-updater'))['autoUpdater']

export class UpdateServer extends IpcServer {
  private autoUpdater: AutoUpdaterInstance | null = null
  private autoUpdaterUnavailableReason: string | null = null
  private manualUpdateCheckInFlight = false
  private sender: WebContents | null = null

  constructor() {
    super()
    this.initAutoUpdater()
  }

  protected setupIpc() {
    this.addHandle('updater:check', async (event): Promise<UpdaterCheckResponse> => {
      this.sender = event.sender
      return this.handleCheckUpdate()
    })

    this.addHandle('updater:download', async event => {
      this.sender = event.sender
      if (!this.autoUpdater) throw new Error('Auto-updater not initialized')
      logger.info(LOG_CATEGORY, 'Manual update download requested')
      return this.autoUpdater.downloadUpdate()
    })

    this.addHandle('updater:install', async event => {
      this.sender = event.sender
      if (!this.autoUpdater) throw new Error('Auto-updater not initialized')
      logger.info(LOG_CATEGORY, 'Manual update install requested')
      this.autoUpdater.quitAndInstall()
    })
  }

  private async initAutoUpdater() {
    if (!app.isPackaged) return

    try {
      // Search for app-update.yml
      const possiblePaths = [
        process.resourcesPath ? path.join(process.resourcesPath, 'app-update.yml') : null,
        path.join(__dirname, 'resources', 'app-update.yml'),
        path.join(app.getAppPath(), 'dist-electron', 'resources', 'app-update.yml'),
      ].filter((p): p is string => p !== null)

      const defaultConfigPath = possiblePaths.find(p => fs.existsSync(p)) || null

      if (!defaultConfigPath) {
        this.autoUpdaterUnavailableReason = 'Auto-update configuration (app-update.yml) not found.'
        logger.warn(LOG_CATEGORY, 'Skipping auto-updater init', {
          reason: this.autoUpdaterUnavailableReason,
        })
        return
      }

      const updaterModule = await import('electron-updater')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = updaterModule as any
      const autoUpdater = mod.autoUpdater || mod.default?.autoUpdater || mod.default

      if (!autoUpdater) {
        throw new Error('Failed to import autoUpdater')
      }

      let configuredConfigPath = null
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        configuredConfigPath = (autoUpdater as any).updateConfigPath || defaultConfigPath
      } catch {
        configuredConfigPath = defaultConfigPath
      }

      if (configuredConfigPath && fs.existsSync(configuredConfigPath)) {
        autoUpdater.updateConfigPath = configuredConfigPath
        autoUpdater.autoDownload = false
        autoUpdater.autoInstallOnAppQuit = false
        autoUpdater.disableDifferentialDownload = false
        autoUpdater.disableWebInstaller = true
        autoUpdater.fullChangelog = true

        autoUpdater.logger = {
          info: (msg: string) => logger.info(LOG_CATEGORY, msg),
          warn: (msg: string) => logger.warn(LOG_CATEGORY, msg),
          error: (msg: string) => logger.error(LOG_CATEGORY, msg),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any

        this.autoUpdater = autoUpdater

        // Bind events
        this.bindEvents(autoUpdater)

        logger.info(LOG_CATEGORY, 'Auto-updater initialized', {
          configPath: configuredConfigPath,
        })
      } else {
        this.autoUpdaterUnavailableReason = `Config missing at ${configuredConfigPath}`
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      this.autoUpdaterUnavailableReason = message
      logger.warn(LOG_CATEGORY, 'Failed to init auto-updater', { message })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sendToRenderer(channel: string, ...args: any[]) {
    if (this.sender && !this.sender.isDestroyed()) {
      this.sender.send(channel, ...args)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private bindEvents(autoUpdater: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autoUpdater.on('update-available', (info: any) => {
      logger.info(LOG_CATEGORY, 'Update available', info)
      this.sendToRenderer('updater:available', info)
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autoUpdater.on('update-not-available', (info: any) => {
      logger.info(LOG_CATEGORY, 'Update not available', info)
      this.sendToRenderer('updater:not-available', info)
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autoUpdater.on('download-progress', (progressObj: any) => {
      this.sendToRenderer('updater:progress', progressObj)
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autoUpdater.on('update-downloaded', (info: any) => {
      logger.info(LOG_CATEGORY, 'Update downloaded', info)
      this.sendToRenderer('updater:downloaded', info)
    })

    autoUpdater.on('error', (err: Error) => {
      logger.error(LOG_CATEGORY, 'Updater error', { error: String(err) })
      this.sendToRenderer('updater:error', String(err))
    })
  }

  private async handleCheckUpdate(): Promise<UpdaterCheckResponse> {
    if (!app.isPackaged) return { status: 'unsupported', reason: 'Dev mode' }
    if (!this.autoUpdater)
      return {
        status: 'unavailable',
        reason: this.autoUpdaterUnavailableReason ?? 'Not initialized',
      }
    if (this.manualUpdateCheckInFlight) return { status: 'checking' }

    this.manualUpdateCheckInFlight = true
    const checkedAt = new Date().toISOString()

    try {
      const result = await this.autoUpdater.checkForUpdates()
      const updateInfo = this.extractUpdateInfo(result)

      if (!updateInfo || !updateInfo.version) {
        return {
          status: 'up-to-date',
          checkedAt,
          notes: updateInfo ? this.normaliseReleaseNotes(updateInfo.releaseNotes) : [],
        }
      }

      const releaseNotes = this.normaliseReleaseNotes(updateInfo.releaseNotes)
      if (updateInfo.version === app.getVersion()) {
        return {
          status: 'up-to-date',
          checkedAt,
          version: updateInfo.version,
          releaseName: updateInfo.releaseName,
          releaseDate: updateInfo.releaseDate,
          notes: releaseNotes,
        }
      }

      return {
        status: 'update-available',
        checkedAt,
        version: updateInfo.version,
        releaseName: updateInfo.releaseName,
        releaseDate: updateInfo.releaseDate,
        notes: releaseNotes,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      return { status: 'error', checkedAt, message }
    } finally {
      this.manualUpdateCheckInFlight = false
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractUpdateInfo(result: any) {
    if (!result?.updateInfo) return null
    const info = result.updateInfo
    return {
      version: typeof info.version === 'string' ? info.version : null,
      releaseName: typeof info.releaseName === 'string' ? info.releaseName : null,
      releaseDate: typeof info.releaseDate === 'string' ? info.releaseDate : null,
      releaseNotes: info.releaseNotes,
    }
  }

  private normaliseReleaseNotes(raw: unknown): ReleaseNoteEntry[] {
    // Simplified version of the one in main.ts
    if (!raw) return []
    const entries: ReleaseNoteEntry[] = []

    // ... logic from main.ts ...
    const pushEntry = (body: string, title?: string) => {
      const cleaned = body.trim()
      if (cleaned.length > 0) entries.push({ body: cleaned, title })
    }

    if (typeof raw === 'string') {
      pushEntry(raw)
      return entries
    }

    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (!item) continue
        if (typeof item === 'string') {
          pushEntry(item)
          continue
        }
        if (typeof item === 'object') {
          // ... extract body/title ...
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const noteObject = item as any
          const body = noteObject.note || ''
          if (body) pushEntry(body, noteObject.title || noteObject.version)
        }
      }
    }
    return entries
  }
}
