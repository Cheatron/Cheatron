// In development, rootDir is the project root (CWD when running vite)
// We use process.cwd() as a reliable way to get the project root in dev.

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
global.rootDir = path.join(__dirname, '..')

export {}
