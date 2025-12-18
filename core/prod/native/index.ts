import { createRequire } from 'module'

const require = createRequire(import.meta.url)

export const NativeBinding = require(
  path.join(path.dirname(process.execPath), 'cheatron-native.node'),
)
