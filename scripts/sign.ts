#!/usr/bin/env bun
import { sign } from '@electron/windows-sign'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'

/**
 * Cheatron Signing Utility
 * Refactored to remove builder-util dependency.
 */

async function main() {
  const filesToSign = process.argv.slice(2)

  if (filesToSign.length === 0) {
    console.error('Usage: bun run sign:win <file1> <file2> ...')
    process.exit(1)
  }

  // Certificate settings from environment
  const certFile = (process.env.CSC_LINK || '').replace('$HOME', homedir())
  const certPassword = process.env.CSC_KEY_PASSWORD

  if (!certFile || !certPassword) {
    if (!certFile) {
      console.warn(
        '[sign] Warning: CSC_LINK environment variable is missing. Skipping code signing.',
      )
    } else {
      console.warn(
        '[sign] Warning: CSC_KEY_PASSWORD environment variable is missing. Skipping code signing.',
      )
    }
    process.exit(0)
  }

  const timestampServer = 'http://timestamp.sectigo.com'

  console.log(`[sign] Cert: ${certFile}`)
  console.log(`[sign] Timestamp Server: ${timestampServer}`)

  for (const file of filesToSign) {
    if (!existsSync(file)) {
      console.warn(`[sign] Warning: File not found: ${file}`)
      continue
    }

    console.log(`[sign] Signing: ${file}...`)

    try {
      await sign({
        files: [file],
        certificateFile: certFile,
        certificatePassword: certPassword,
        timestampServer: timestampServer,
      })
      console.log(`[sign] Successfully signed: ${file}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[sign] Failed to sign ${file}: ${message}`)
      process.exit(1)
    }
  }

  console.log('[sign] All files processed successfully.')
}

main().catch(err => {
  console.error(`[sign] Unhandled error: ${err.message}`)
  process.exit(1)
})
