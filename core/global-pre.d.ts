import type { LoggerHelpers } from './logger'

export {}

declare global {
  var rootDir: string
  var version: string
  var logger: LoggerHelpers
  var logFilePath: string | null
  var fs: typeof import('node:fs')
  var os: typeof import('node:os')
  var path: typeof import('node:path')
  var url: typeof import('node:url')
}
