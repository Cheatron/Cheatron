import { BrowserWindow } from 'electron'

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const INDEX_HTML_DEV = 'index.dev.html'

export async function loadWindowContent(window: BrowserWindow) {
  logger.info('LoadWindow', 'Loading development server', { url: VITE_DEV_SERVER_URL })
  await window.loadURL(`${VITE_DEV_SERVER_URL}${INDEX_HTML_DEV}`)
}
