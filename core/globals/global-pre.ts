import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import url from 'node:url'

global.version = '0.0.1'

try {
  global.fs = fs
  global.path = path
  global.os = os
  global.url = url
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (e) {
  /* empty */
}
