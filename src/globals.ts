// Initialize global variables on startup

import { NativeConstantsType } from 'types/native/constants'

export const initGlobals = async () => {
  try {
    // Parallel fetch for speed
    const [
      mainProcessID,
      mainParentProcessID,
      processPlatform,
      processArch,
      nativeVersion,
      nativeConstants,
      processVersions,
      appVersion,
    ] = await Promise.all([
      window.process.main.getPID(),
      window.process.main.getPPID(),
      window.process.getPlatform(),
      window.process.getArch(),
      window.native.getVersion(),
      window.native.getConstants(),
      window.process.getVersions(),
      window.app.getVersion(),
    ])

    // Store constants globally

    window.platform = processPlatform
    window.arch = processArch
    window.mainPID = mainProcessID
    window.mainPPID = mainParentProcessID

    window.nativeConstants = nativeConstants as NativeConstantsType
    window.nativeVersion = nativeVersion

    window.version = appVersion

    window.versions = {
      ...processVersions,
      app: appVersion,
      native: nativeVersion,
    }
  } catch (err) {
    if (window.logger) window.logger.error('Globals', 'Init failed', err)
  }
}

// Execute immediately
