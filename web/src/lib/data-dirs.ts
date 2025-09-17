import path from 'path'
import fs from 'fs-extra'

/**
 * Get the base data directory for the application.
 * In Docker: /app/data
 * In development: process.cwd()
 */
export function getDataDir(): string {
  return process.env.DATA_DIR || process.cwd()
}

/**
 * Get the processed files directory
 */
export function getProcessedFilesDir(): string {
  return path.join(getDataDir(), 'processed-files')
}

/**
 * Get the temporary files directory
 */
export function getTempDir(): string {
  return path.join(getDataDir(), 'temp')
}

/**
 * Get the database directory
 */
export function getDbDir(): string {
  return path.join(getDataDir(), 'db')
}

/**
 * Get the logs directory
 */
export function getLogsDir(): string {
  return path.join(getDataDir(), 'logs')
}

/**
 * Ensure all required data directories exist
 */
export async function ensureDataDirs(): Promise<void> {
  const dirs = [
    getDataDir(),
    getProcessedFilesDir(),
    getTempDir(),
    getDbDir(),
    getLogsDir()
  ]
  
  for (const dir of dirs) {
    await fs.ensureDir(dir)
  }
}