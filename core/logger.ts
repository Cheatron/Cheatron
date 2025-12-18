// Polyfill for BigInt serialization
BigInt.prototype.toJSON = function () {
  return this.toString()
}

import winston from 'winston'
import path from 'node:path'

// Custom JSON format for file - one JSON object per line (JSONL/NDJSON format)
const jsonLineFormat = winston.format.printf(info => {
  const { timestamp, level, category, message, data, stack } = info
  const logObj: Record<string, unknown> = { timestamp, level, category, message }
  if (data) logObj.data = data
  if (stack) logObj.stack = stack
  return JSON.stringify(logObj)
})

export interface LoggerHelpers {
  debug: (category: string, message: string, data?: unknown) => void
  info: (category: string, message: string, data?: unknown) => void
  warn: (category: string, message: string, data?: unknown) => void
  error: (category: string, message: string, data?: unknown) => void
}

export function createLogger(
  logsDir?: string,
  logFileName?: string,
): { logger: winston.Logger; helpers: LoggerHelpers; logFilePath: string | null } {
  const logFilePath = logsDir && logFileName ? path.join(logsDir, logFileName) : null

  const transports: winston.transport[] = [
    // Console output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, category, data, stack, timestamp }) => {
          const cat = category ? `[${category}]` : ''
          let dt = ''

          if (stack) {
            dt += `\n${stack}`
          }

          if (data) {
            const d = data as Record<string, unknown>
            if (typeof d === 'object' && d !== null && d.stack && typeof d.stack === 'string') {
              dt += `\n${d.stack}`
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { stack, ...rest } = d
              if (Object.keys(rest).length > 0) {
                dt += `\n${JSON.stringify(rest, null, 2)}`
              }
            } else {
              dt += `\n${JSON.stringify(data, null, 2)}`
            }
          }

          return `${timestamp} ${level} ${cat}: ${message}${dt}`
        }),
      ),
    }),
  ]

  if (logFilePath) {
    transports.push(
      // Single JSON Lines file (one JSON per line)
      new winston.transports.File({
        filename: logFilePath,
        format: jsonLineFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 30, // Keep 30 days
        tailable: true,
      }),
    )
  }

  // Create logger
  const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
    ),
    transports,
  })

  // Helper functions
  const helpers: LoggerHelpers = {
    debug: (category: string, message: string, data?: unknown) => {
      logger.debug({ level: 'debug', category, message, data })
    },
    info: (category: string, message: string, data?: unknown) => {
      logger.info({ level: 'info', category, message, data })
    },
    warn: (category: string, message: string, data?: unknown) => {
      logger.warn({ level: 'warn', category, message, data })
    },
    error: (category: string, message: string, data?: unknown) => {
      logger.error({ level: 'error', category, message, data })
    },
  }

  return { logger, helpers, logFilePath }
}

export default createLogger
