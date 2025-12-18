import { createLogger } from '@core/logger'

// Create logs directory
const logsDir = path.join(os.homedir(), '.config', 'cheatron', 'logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
const logFileName = `cheatron-${date}.json`

const { helpers, logFilePath: filePath } = createLogger(logsDir, logFileName)

helpers.info('Logger', 'Logger initialized', filePath)

global.logger = helpers
global.logFilePath = filePath
