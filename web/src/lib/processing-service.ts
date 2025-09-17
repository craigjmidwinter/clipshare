import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { createWriteStream } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getProcessedFilesDir } from '@/lib/data-dirs'
import ffmpeg from 'ffmpeg-static'
import axios from 'axios'

export interface ProcessingJobData {
  workspaceId: string
  plexKey: string
  plexServerId: string
  contentTitle: string
  steps?: {
    download?: boolean
    convert?: boolean
    frames?: boolean
    shotCuts?: boolean
  }
}

export class WorkspaceProcessingService {
  private static instance: WorkspaceProcessingService
  private processingQueue: Map<string, boolean> = new Map()

  static getInstance(): WorkspaceProcessingService {
    if (!WorkspaceProcessingService.instance) {
      WorkspaceProcessingService.instance = new WorkspaceProcessingService()
    }
    return WorkspaceProcessingService.instance
  }

  async processWorkspace(jobId: string, data: ProcessingJobData): Promise<void> {
    const { workspaceId, plexKey, plexServerId, contentTitle, steps } = data
    const doDownload = steps?.download !== false
    const doConvert = steps?.convert !== false
    const doFrames = steps?.frames !== false
    const doShotCuts = steps?.shotCuts !== false

    console.log(`=== PROCESSING SERVICE START ===`)
    console.log(`Job ID: ${jobId}`)
    console.log(`Workspace ID: ${workspaceId}`)
    console.log(`Plex Key: ${plexKey}`)
    console.log(`Plex Server ID: ${plexServerId}`)
    console.log(`Content Title: ${contentTitle}`)

    // Check if already processing this workspace
    if (this.processingQueue.get(workspaceId)) {
      console.log(`Workspace ${workspaceId} is already being processed`)
      return
    }

    this.processingQueue.set(workspaceId, true)

    try {
      console.log(`Starting processing for workspace ${workspaceId}`)
      
      // Update job status to processing
      console.log(`Updating job status to processing...`)
      await this.updateJobStatus(jobId, 'processing', 0)
      console.log(`Job status updated successfully`)
      
      console.log(`Updating workspace status to processing...`)
      await this.updateWorkspaceStatus(workspaceId, 'processing', 0)
      console.log(`Workspace status updated successfully`)

      // Step 1: Download source file from Plex (10% progress)
      let sourceFilePath = path.join(getProcessedFilesDir(), workspaceId, 'source.mp4')
      if (doDownload) {
        console.log('Step 1: Downloading source file from Plex...')
        sourceFilePath = await this.downloadSourceFile(plexKey, plexServerId, workspaceId)
      }
      await this.updateJobProgress(jobId, 10)
      await this.updateWorkspaceProgress(workspaceId, 10)

      // Step 2: Convert to MP4 H.264 (70% progress)
      let mp4FilePath = path.join(getProcessedFilesDir(), workspaceId, 'processed.mp4')
      if (doConvert) {
        console.log('Step 2: Converting to MP4 H.264...')
        mp4FilePath = await this.convertToMP4(sourceFilePath, workspaceId, jobId)
      }
      await this.updateJobProgress(jobId, 80)
      await this.updateWorkspaceProgress(workspaceId, 80)

          // Step 3: Detect shot cuts (10% progress) - must be before frame generation
          if (doShotCuts) {
            console.log('Step 3: Detecting shot cuts...')
            await this.detectShotCuts(mp4FilePath, workspaceId, jobId)
          }
          
          // Step 4: Generate shot-aware preview frames (20% progress)
          if (doFrames) {
            console.log('Step 4: Generating shot-aware preview frames...')
            await this.generatePreviewFrames(mp4FilePath, workspaceId, jobId)
          }
      
      // Generate clips for bookmarks after frames
      await this.generateClipsForBookmarks(mp4FilePath, workspaceId)
      await this.updateJobProgress(jobId, 100)
      await this.updateWorkspaceProgress(workspaceId, 100)

      // Clean up source file if we downloaded it (not if it's a local file)
      if (doDownload && sourceFilePath.includes('processed-files')) {
        await this.cleanupSourceFile(sourceFilePath)
      }

      // Mark as completed
      await this.updateJobStatus(jobId, 'completed', 100)
      await this.updateWorkspaceStatus(workspaceId, 'completed', 100)

      console.log(`Processing completed for workspace ${workspaceId}`)

    } catch (error) {
      console.error(`Processing failed for workspace ${workspaceId}:`, error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      // Mark as failed
      await this.updateJobStatus(jobId, 'failed', 0, error instanceof Error ? error.message : 'Unknown error')
      await this.updateWorkspaceStatus(workspaceId, 'failed', 0)
    } finally {
      this.processingQueue.delete(workspaceId)
    }
  }

  private async downloadSourceFile(plexKey: string, plexServerId: string, workspaceId: string): Promise<string> {
    const outputDir = path.join(getProcessedFilesDir(), workspaceId)
    await fs.mkdir(outputDir, { recursive: true })

    const sourceFilePath = path.join(outputDir, 'source.mp4')
    
    console.log(`Starting file access check for Plex key: ${plexKey}`)
    
    // Get Plex configuration
    const plexConfig = await prisma.plexConfig.findFirst({
      where: { isActive: true }
    })

    if (!plexConfig) {
      throw new Error("Plex configuration not found")
    }

    console.log(`Using Plex server: ${plexConfig.serverUrl}`)

    // First, get media info to extract the file path and part ID
    const mediaUrl = `${plexConfig.serverUrl}${plexKey}`
    console.log(`Fetching media info from: ${mediaUrl}`)
    
    const mediaResponse = await axios.get(mediaUrl, {
      headers: {
        "X-Plex-Token": plexConfig.serverToken,
        "Accept": "application/json",
        "X-Plex-Product": "ClipShare",
        "X-Plex-Version": "1.0",
        "X-Plex-Client-Identifier": "clipshare-web",
        "X-Plex-Device": "Web",
        "X-Plex-Device-Name": "ClipShare Web",
        "X-Plex-Platform": "Web"
      },
      timeout: 30000 // 30 second timeout
    })
    
    const mediaData = mediaResponse.data as any
    console.log("Media data received:", JSON.stringify(mediaData, null, 2))
    
    if (!mediaData.MediaContainer?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.id) {
      throw new Error("Invalid media data structure - no part ID found")
    }
    
    const mediaContainer = mediaData.MediaContainer.Metadata[0]
    const mediaPart = mediaContainer.Media[0].Part[0]
    const partId = mediaPart.id
    
    console.log(`Found part ID: ${partId}`)
    
    // Check if we can access the file locally first
    const localFilePath = await this.checkLocalFileAccess(mediaPart, plexConfig.serverUrl)
    if (localFilePath) {
      console.log(`✅ File accessible locally: ${localFilePath}`)
      // Return the local file path directly - no need to copy since we'll convert it
      return localFilePath
    }
    
    console.log(`❌ File not accessible locally, downloading from Plex...`)
    
    // Construct the download URL using the same format as your curl example
    const downloadUrl = `${plexConfig.serverUrl}/library/parts/${partId}/file?download=1&X-Plex-Token=${plexConfig.serverToken}`
    console.log(`Downloading from: ${downloadUrl}`)
    
    // Download the file
    const downloadResponse = await axios.get(downloadUrl, {
      responseType: 'stream',
      timeout: 300000, // 5 minute timeout for large files
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8',
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
      }
    })
    
    // Get file size for progress tracking
    const contentLength = downloadResponse.headers['content-length']
    const totalSize = contentLength ? parseInt(contentLength) : 0
    console.log(`File size: ${totalSize} bytes`)
    
    // Create write stream
    const writer = createWriteStream(sourceFilePath)
    
    // Track download progress
    let downloadedSize = 0
    
    downloadResponse.data.on('data', (chunk: Buffer) => {
      downloadedSize += chunk.length
      if (totalSize > 0) {
        const progress = Math.round((downloadedSize / totalSize) * 10) // 0-10% for download
        console.log(`Download progress: ${progress}% (${downloadedSize}/${totalSize} bytes)`)
      }
    })
    
    // Pipe the download stream to file
    downloadResponse.data.pipe(writer)
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Download completed: ${sourceFilePath}`)
        resolve(sourceFilePath)
      })
      
      writer.on('error', (error) => {
        console.error('Download error:', error)
        reject(error)
      })
      
      downloadResponse.data.on('error', (error) => {
        console.error('Download stream error:', error)
        reject(error)
      })
    })
  }

  private async checkLocalFileAccess(mediaPart: any, plexServerUrl: string): Promise<string | null> {
    try {
      // Check if the Part object has a 'file' field with the local file path
      const filePath = mediaPart.file
      if (!filePath) {
        console.log(`No 'file' field found in media part`)
        return null
      }

      console.log(`Found file path in Plex data: ${filePath}`)
      
      // Check if the file exists and is readable
      try {
        await fs.access(filePath, fs.constants.R_OK)
        console.log(`✅ File is accessible locally: ${filePath}`)
        return filePath
      } catch (accessError) {
        console.log(`❌ File not accessible locally: ${filePath} - ${accessError}`)
        return null
      }
    } catch (error) {
      console.log(`Error checking local file access: ${error}`)
      return null
    }
  }

  private async convertToMP4(sourceFilePath: string, workspaceId: string, jobId: string): Promise<string> {
    const outputDir = path.join(getProcessedFilesDir(), workspaceId)
    const mp4FilePath = path.join(outputDir, 'processed.mp4')

    return new Promise((resolve, reject) => {
      console.log(`Converting ${sourceFilePath} to MP4 H.264 using FFmpeg...`)
      
      // Use system FFmpeg for conversion (more reliable than ffmpeg-static)
      const conversionProcess = spawn('ffmpeg', [
        '-i', sourceFilePath,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '18', // High quality
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y', // Overwrite output file
        mp4FilePath
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        // Prevent process from being killed by Docker
        detached: false,
        // Set process group to handle signals properly
        shell: false
      })

      let progress = 0
      let isCompleted = false
      const progressInterval = setInterval(async () => {
        if (isCompleted) {
          clearInterval(progressInterval)
          return
        }
        progress += 7 // Spread 70% progress over ~10 seconds
        if (progress <= 70) {
          await this.updateJobProgress(jobId, 10 + progress)
          await this.updateWorkspaceProgress(workspaceId, 10 + progress)
        }
      }, 1000)

      // Handle FFmpeg output for better error reporting
      let stderr = ''
      let stdout = ''
      
      conversionProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
        console.log(`FFmpeg stderr: ${data.toString().trim()}`)
      })

      conversionProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
        console.log(`FFmpeg stdout: ${data.toString().trim()}`)
      })

      // Handle process termination gracefully
      conversionProcess.on('close', async (code, signal) => {
        isCompleted = true
        clearInterval(progressInterval)
        
        console.log(`FFmpeg process closed with code: ${code}, signal: ${signal}`)
        
        if (code === 0) {
          console.log(`Conversion completed: ${mp4FilePath}`)
          resolve(mp4FilePath)
        } else {
          const errorMsg = `FFmpeg process exited with code ${code}${signal ? ` and signal ${signal}` : ''}`
          console.error(`${errorMsg}. Stderr: ${stderr}`)
          reject(new Error(`${errorMsg}: ${stderr}`))
        }
      })

      conversionProcess.on('error', (error) => {
        isCompleted = true
        clearInterval(progressInterval)
        console.error('FFmpeg spawn error:', error)
        reject(new Error(`Failed to start FFmpeg process: ${error.message}`))
      })


      // Set a timeout to prevent hanging processes
      const timeout = setTimeout(() => {
        if (!isCompleted) {
          isCompleted = true
          clearInterval(progressInterval)
          console.error('FFmpeg conversion timed out after 30 minutes')
          conversionProcess.kill('SIGTERM')
          reject(new Error('FFmpeg conversion timed out after 30 minutes'))
        }
      }, 30 * 60 * 1000) // 30 minutes timeout

      // Clear timeout when process completes
      conversionProcess.on('close', () => {
        clearTimeout(timeout)
      })
    })
  }

  private async generatePreviewFrames(mp4FilePath: string, workspaceId: string, jobId: string): Promise<void> {
    const outputDir = path.join(getProcessedFilesDir(), workspaceId)
    const framesDir = path.join(outputDir, 'frames')
    await fs.mkdir(framesDir, { recursive: true })

    console.log(`Generating shot-aware preview frames for ${mp4FilePath} using FFmpeg...`)

    // Get existing shot cuts to generate frames at shot boundaries
    const shotCuts = await prisma.shotCut.findMany({
      where: { workspaceId },
      orderBy: { timestampMs: 'asc' }
    })

    // Get workspace duration
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { contentDuration: true }
    })

    if (!workspace) {
      throw new Error("Workspace not found")
    }

    // Create frame generation points: shot cuts + regular intervals
    const frameTimes: number[] = []
    
    // Add shot cut times (in seconds)
    shotCuts.forEach(cut => {
      const timeSeconds = cut.timestampMs / 1000
      if (timeSeconds >= 0 && timeSeconds <= workspace.contentDuration) {
        frameTimes.push(timeSeconds)
      }
    })

    // Add regular intervals (every 10 seconds) to fill gaps
    for (let sec = 0; sec <= workspace.contentDuration; sec += 10) {
      if (!frameTimes.some(t => Math.abs(t - sec) < 1)) { // Avoid duplicates
        frameTimes.push(sec)
      }
    }

    // Sort frame times
    frameTimes.sort((a, b) => a - b)

    console.log(`Generating ${frameTimes.length} frames at shot cuts and regular intervals`)

    // Validate frame count to prevent excessive processing
    if (frameTimes.length > 100000) {
      console.warn(`Warning: Very large number of frames (${frameTimes.length}). This may take a long time to process.`)
      console.warn(`Consider reducing shot cut density or increasing regular interval spacing.`)
    }

    // Batch frame generation to avoid E2BIG error (command line too long)
    const BATCH_SIZE = 1000 // Process frames in batches of 1000 to avoid command line limits
    let frameIndex = 0
    
    for (let i = 0; i < frameTimes.length; i += BATCH_SIZE) {
      const batch = frameTimes.slice(i, i + BATCH_SIZE)
      const batchStartIndex = frameIndex
      
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(frameTimes.length / BATCH_SIZE)} (${batch.length} frames)`)
      
      try {
        await new Promise<void>((resolve, reject) => {
          const frameProcess = spawn('ffmpeg', [
            '-i', mp4FilePath,
            '-vf', `select='${batch.map(t => `eq(t,${t})`).join('+')}',scale=160:-1:flags=lanczos`,
            '-vsync', 'vfr', // Variable frame rate to match our selection
            '-q:v', '4', // reasonable thumbnail quality
            path.join(framesDir, `shot_frame_%06d.jpg`),
            '-y'
          ], {
            stdio: ['pipe', 'pipe', 'pipe']
          })

          // Handle FFmpeg output for better error reporting
          let stderr = ''
          frameProcess.stderr?.on('data', (data) => {
            stderr += data.toString()
            console.log(`FFmpeg batch ${Math.floor(i / BATCH_SIZE) + 1}: ${data.toString().trim()}`)
          })

          frameProcess.on('close', async (code) => {
            if (code === 0) {
              console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} completed successfully`)
              frameIndex += batch.length
              resolve()
            } else {
              console.error(`FFmpeg batch ${Math.floor(i / BATCH_SIZE) + 1} stderr: ${stderr}`)
              reject(new Error(`Shot frame generation batch ${Math.floor(i / BATCH_SIZE) + 1} exited with code ${code}: ${stderr}`))
            }
          })

          frameProcess.on('error', (error) => {
            console.error(`Shot frame generation batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error)
            reject(error)
          })
        })
      } catch (error) {
        console.error(`Failed to process batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error)
        throw new Error(`Frame generation failed at batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error instanceof Error ? error.message : String(error)}`)
      }
      
      // Update progress
      const progress = Math.min(20, Math.floor((i + BATCH_SIZE) / frameTimes.length * 20))
      await this.updateJobProgress(jobId, 80 + progress)
      await this.updateWorkspaceProgress(workspaceId, 80 + progress)
    }

    console.log(`Shot-aware preview frames generated in ${framesDir}`)
    
    // Store frame metadata for shot-aware lookup
    await this.storeFrameMetadata(workspaceId, frameTimes, shotCuts)
  }

  private async storeFrameMetadata(workspaceId: string, frameTimes: number[], shotCuts: any[]): Promise<void> {
    // Store frame metadata in a JSON file for shot-aware lookup
    const outputDir = path.join(getProcessedFilesDir(), workspaceId)
    const metadataFile = path.join(outputDir, 'frame_metadata.json')
    
    const metadata = {
      frameTimes,
      shotCuts: shotCuts.map(cut => ({
        timestampMs: cut.timestampMs,
        confidence: cut.confidence,
        detectionMethod: cut.detectionMethod
      })),
      generatedAt: new Date().toISOString()
    }
    
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2))
    console.log(`Frame metadata stored in ${metadataFile}`)
  }

  private async detectShotCuts(mp4FilePath: string, workspaceId: string, jobId: string): Promise<void> {
    console.log(`Detecting shot cuts for ${mp4FilePath}...`)

    // Get workspace info for duration and title
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { contentTitle: true, contentDuration: true }
    })

    if (!workspace) {
      throw new Error("Workspace not found")
    }

    // Import and use the shot cut detection service
    const { ShotCutDetectionService } = await import('@/lib/shot-cut-detection-service')
    const detectionService = ShotCutDetectionService.getInstance()
    
    // Use the actual job ID for shot cut detection
    await detectionService.detectShotCuts(jobId, {
      workspaceId,
      contentTitle: workspace.contentTitle || 'Unknown Content'
    })

    console.log(`Shot cut detection completed for workspace ${workspaceId}`)
  }

  private async generateClipsForBookmarks(mp4FilePath: string, workspaceId: string): Promise<void> {
    const clipsDir = path.join(getProcessedFilesDir(), workspaceId, 'clips')
    await fs.mkdir(clipsDir, { recursive: true })

    const bookmarks = await prisma.bookmark.findMany({
      where: { workspaceId },
      select: { id: true, startMs: true, endMs: true }
    })

    const runFfmpeg = (args: string[]) => new Promise<void>((resolve, reject) => {
      const p = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
      p.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))
      p.on('error', reject)
    })

    for (const b of bookmarks) {
      try {
        const outPath = path.join(clipsDir, `${b.id}.mp4`)
        // Skip if already exists
        try {
          await fs.stat(outPath)
          continue
        } catch {}

        const startSec = Math.max(0, b.startMs / 1000)
        const endSec = Math.max(startSec + 0.1, b.endMs / 1000)
        const duration = Math.max(0.1, endSec - startSec)

        // Use re-encoding for better browser compatibility
        await runFfmpeg([
          '-ss', String(Math.max(0, startSec - 0.1)), // Add small padding before
          '-i', mp4FilePath,
          '-ss', '0.1', // Skip the padding
          '-t', String(duration),
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '28',
          '-profile:v', 'baseline',
          '-level', '3.0',
          '-pix_fmt', 'yuv420p',
          '-g', '30', // Keyframe interval
          '-keyint_min', '30',
          '-c:a', 'aac',
          '-b:a', '96k',
          '-ar', '44100', // Standard web audio sample rate
          '-ac', '2', // Stereo
          '-avoid_negative_ts', 'make_zero', // Fix negative timestamps
          '-movflags', '+faststart',
          '-y', outPath
        ])
      } catch (e) {
        console.warn('clip generation failed for bookmark', b.id, e)
      }
    }
  }

  private async cleanupSourceFile(sourceFilePath: string): Promise<void> {
    try {
      await fs.unlink(sourceFilePath)
      console.log(`Cleaned up source file: ${sourceFilePath}`)
    } catch (error) {
      console.warn(`Failed to cleanup source file: ${error}`)
    }
  }

  private async updateJobStatus(jobId: string, status: string, progress: number, errorText?: string): Promise<void> {
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status,
        progressPercent: progress,
        ...(errorText && { errorText })
      }
    })
  }

  private async updateJobProgress(jobId: string, progress: number): Promise<void> {
    await prisma.processingJob.update({
      where: { id: jobId },
      data: { progressPercent: progress }
    })
  }

  private async updateWorkspaceStatus(workspaceId: string, status: string, progress: number): Promise<void> {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        processingStatus: status,
        processingProgress: progress
      }
    })
  }

  private async updateWorkspaceProgress(workspaceId: string, progress: number): Promise<void> {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { processingProgress: progress }
    })
  }
}
