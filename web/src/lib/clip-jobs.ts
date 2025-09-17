import { prisma } from '@/lib/prisma'
import { getProcessedFilesDir } from '@/lib/data-dirs'
import path from 'path'
import { promises as fs } from 'fs'
import { spawn } from 'child_process'

type BookmarkSpec = { id: string; workspaceId: string; startMs: number; endMs: number }

const debounceTimers = new Map<string, NodeJS.Timeout>()

async function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn('ffmpeg', args, { 
      stdio: ['ignore', 'pipe', 'pipe'],
      // Prevent process from being killed by Docker
      detached: false,
      shell: false
    })
    
    let stderr = ''
    let stdout = ''
    
    p.stderr?.on('data', (data) => {
      stderr += data.toString()
      console.log(`FFmpeg clip stderr: ${data.toString().trim()}`)
    })
    
    p.stdout?.on('data', (data) => {
      stdout += data.toString()
      console.log(`FFmpeg clip stdout: ${data.toString().trim()}`)
    })
    
    p.on('close', (code, signal) => {
      console.log(`FFmpeg clip process closed with code: ${code}, signal: ${signal}`)
      if (code === 0) {
        resolve()
      } else {
        const errorMsg = `ffmpeg exited ${code}${signal ? ` with signal ${signal}` : ''}`
        console.error(`${errorMsg}. Stderr: ${stderr}`)
        reject(new Error(`${errorMsg}: ${stderr}`))
      }
    })
    
    p.on('error', (error) => {
      console.error('FFmpeg clip spawn error:', error)
      reject(new Error(`Failed to start FFmpeg process: ${error.message}`))
    })
    
    // Set timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.error('FFmpeg clip generation timed out after 10 minutes')
      p.kill('SIGTERM')
      reject(new Error('FFmpeg clip generation timed out after 10 minutes'))
    }, 10 * 60 * 1000) // 10 minutes timeout
    
    p.on('close', () => {
      clearTimeout(timeout)
    })
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

      const workspaceDir = path.join(getProcessedFilesDir(), spec.workspaceId)
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
  const clipPath = path.join(getProcessedFilesDir(), workspaceId, 'clips', `${bookmarkId}.mp4`)
  try { await fs.rm(clipPath, { force: true }) } catch {}
}


