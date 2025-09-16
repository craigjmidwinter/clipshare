import { prisma } from '@/lib/prisma'
import path from 'path'
import { promises as fs } from 'fs'
import { spawn } from 'child_process'

type BookmarkSpec = { id: string; workspaceId: string; startMs: number; endMs: number }

const debounceTimers = new Map<string, NodeJS.Timeout>()

async function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))))
    p.on('error', reject)
  })
}

export async function scheduleClipGeneration(spec: BookmarkSpec, debounceMs = 1200) {
  const key = `${spec.workspaceId}:${spec.id}`

  // Cancel any in-flight debounce
  const existing = debounceTimers.get(key)
  if (existing) clearTimeout(existing)

  // Mark any existing pending/processing jobs as cancelled
  await prisma.processingJob.updateMany({
    where: {
      type: 'export_clip',
      status: { in: ['pending', 'processing'] },
      payloadJson: { contains: `"bookmarkId":"${spec.id}"` }
    },
    data: { status: 'cancelled', errorText: 'Superseded by newer edit' }
  })

  const job = await prisma.processingJob.create({
    data: {
      workspaceId: spec.workspaceId,
      type: 'export_clip',
      status: 'pending',
      payloadJson: JSON.stringify({ bookmarkId: spec.id, startMs: spec.startMs, endMs: spec.endMs }),
      progressPercent: 0,
    }
  })

  const timer = setTimeout(async () => {
    try {
      console.log('[clips] start job', { bookmarkId: spec.id, workspaceId: spec.workspaceId })
      await prisma.processingJob.update({ where: { id: job.id }, data: { status: 'processing', progressPercent: 10 } })

      const workspaceDir = path.join(process.cwd(), 'processed-files', spec.workspaceId)
      const sourcePath = path.join(workspaceDir, 'processed.mp4')
      const clipsDir = path.join(workspaceDir, 'clips')
      await fs.mkdir(clipsDir, { recursive: true })

      const outPath = path.join(clipsDir, `${spec.id}.mp4`)

      const startSec = Math.max(0, spec.startMs / 1000)
      const endSec = Math.max(startSec + 0.1, spec.endMs / 1000)
      const duration = Math.max(0.1, endSec - startSec)

      // Try copy then transcode
      try {
        await runFfmpeg(['-ss', String(startSec), '-i', sourcePath, '-t', String(duration), '-c', 'copy', '-movflags', '+faststart', '-y', outPath])
      } catch {
        await runFfmpeg(['-ss', String(startSec), '-i', sourcePath, '-t', String(duration), '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '18', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-y', outPath])
      }

      await prisma.processingJob.update({ where: { id: job.id }, data: { status: 'completed', progressPercent: 100 } })
      console.log('[clips] completed job', { bookmarkId: spec.id })
    } catch (e) {
      console.error('[clips] failed job', e)
      await prisma.processingJob.update({ where: { id: job.id }, data: { status: 'failed', errorText: e instanceof Error ? e.message : 'error' } })
    } finally {
      debounceTimers.delete(key)
    }
  }, debounceMs)

  debounceTimers.set(key, timer)
}

export async function deleteClipForBookmark(workspaceId: string, bookmarkId: string) {
  const clipPath = path.join(process.cwd(), 'processed-files', workspaceId, 'clips', `${bookmarkId}.mp4`)
  try { await fs.rm(clipPath, { force: true }) } catch {}
}


