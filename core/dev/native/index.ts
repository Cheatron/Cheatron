import { NativeBindingType } from 'types/native/index'
import { MockNative } from './mock'
import { createRequire } from 'module'

const load = (candidates: string[]) => {
  logger.info('Native', 'Loading native module from candidates', candidates)
  const require = createRequire(import.meta.url)
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const addon = require(candidate)
        logger.info('Native', 'Loaded native module from', candidate)
        return addon
      } catch (error: unknown) {
        logger.error('Native', `Failed to load from ${candidate}`, error)
      }
    }
  }
  return null
}
const nativeDir = path.join(rootDir, 'native')
const nativeBuildDir = path.join(nativeDir, 'build')
const nativeBin = 'cheatron-native.node'

const candidates = [
  path.join(nativeBuildDir, nativeBin),
  path.join(nativeBuildDir, 'Debug', nativeBin),
  path.join(nativeBuildDir, 'Release', nativeBin),
  path.join(nativeDir, nativeBin),
  path.join(rootDir, nativeBin),
]

const nativeBinding = load(candidates)

export const NativeBinding = (nativeBinding ? nativeBinding : new MockNative()) as NativeBindingType
