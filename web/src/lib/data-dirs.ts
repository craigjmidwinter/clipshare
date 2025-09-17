import path from 'path'

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