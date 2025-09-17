import { getDbDir, ensureDataDirs } from './data-dirs'
import path from 'path'

// Set default DATABASE_URL if not provided - must be done before importing PrismaClient
if (!process.env.DATABASE_URL) {
  const dbDir = getDbDir()
  const dbPath = path.join(dbDir, 'clipshare.db')
  process.env.DATABASE_URL = `file:${dbPath}`
}

// Ensure data directories exist before creating Prisma client
ensureDataDirs().catch(console.error)

// Import PrismaClient after setting DATABASE_URL
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
