import { BrowserWindow } from 'electron'

export const RENDERER_DIST = path.join(rootDir, 'dist')
export const INDEX_HTML_PROD = 'index.html'

export async function loadWindowContent(window: BrowserWindow) {
  logger.info('LoadWindow', 'Loading production build')
  await window.loadFile(path.join(RENDERER_DIST, INDEX_HTML_PROD))
}
