import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { createWriteStream } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
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
      let sourceFilePath = path.join(process.cwd(), 'processed-files', workspaceId, 'source.mp4')
      if (doDownload) {
        console.log('Step 1: Downloading source file from Plex...')
        sourceFilePath = await this.downloadSourceFile(plexKey, plexServerId, workspaceId)
      }
      await this.updateJobProgress(jobId, 10)
      await this.updateWorkspaceProgress(workspaceId, 10)

      // Step 2: Convert to MP4 H.264 (70% progress)
      let mp4FilePath = path.join(process.cwd(), 'processed-files', workspaceId, 'processed.mp4')
      if (doConvert) {
        console.log('Step 2: Converting to MP4 H.264...')
        mp4FilePath = await this.convertToMP4(sourceFilePath, workspaceId, jobId)
      }
      await this.updateJobProgress(jobId, 80)
      await this.updateWorkspaceProgress(workspaceId, 80)

      // Step 3: Generate preview frames (20% progress)
      if (doFrames) {
        console.log('Step 3: Generating preview frames...')
        await this.generatePreviewFrames(mp4FilePath, workspaceId, jobId)
      }
      await this.updateJobProgress(jobId, 100)
      await this.updateWorkspaceProgress(workspaceId, 100)

      // Clean up source file if we downloaded it now
      if (doDownload) {
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
    const outputDir = path.join(process.cwd(), 'processed-files', workspaceId)
    await fs.mkdir(outputDir, { recursive: true })

    const sourceFilePath = path.join(outputDir, 'source.mp4')
    
    console.log(`Starting real download from Plex for key: ${plexKey}`)
    
    // Get Plex configuration
    const plexConfig = await prisma.plexConfig.findFirst({
      where: { isActive: true }
    })

    if (!plexConfig) {
      throw new Error("Plex configuration not found")
    }

    console.log(`Using Plex server: ${plexConfig.serverUrl}`)

    // First, get media info to extract the part ID
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

  private async convertToMP4(sourceFilePath: string, workspaceId: string, jobId: string): Promise<string> {
    const outputDir = path.join(process.cwd(), 'processed-files', workspaceId)
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
        stdio: ['pipe', 'pipe', 'pipe']
      })

      let progress = 0
      const progressInterval = setInterval(async () => {
        progress += 7 // Spread 70% progress over ~10 seconds
        if (progress <= 70) {
          await this.updateJobProgress(jobId, 10 + progress)
          await this.updateWorkspaceProgress(workspaceId, 10 + progress)
        }
      }, 1000)

      // Handle FFmpeg output for better error reporting
      let stderr = ''
      conversionProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
        console.log(`FFmpeg: ${data.toString().trim()}`)
      })

      conversionProcess.on('close', async (code) => {
        clearInterval(progressInterval)
        if (code === 0) {
          console.log(`Conversion completed: ${mp4FilePath}`)
          resolve(mp4FilePath)
        } else {
          console.error(`FFmpeg stderr: ${stderr}`)
          reject(new Error(`FFmpeg process exited with code ${code}: ${stderr}`))
        }
      })

      conversionProcess.on('error', (error) => {
        clearInterval(progressInterval)
        console.error('FFmpeg error:', error)
        reject(error)
      })
    })
  }

  private async generatePreviewFrames(mp4FilePath: string, workspaceId: string, jobId: string): Promise<void> {
    const outputDir = path.join(process.cwd(), 'processed-files', workspaceId)
    const framesDir = path.join(outputDir, 'frames')
    await fs.mkdir(framesDir, { recursive: true })

    console.log(`Generating preview frames for ${mp4FilePath} using FFmpeg...`)

    // Use system FFmpeg to extract frames (1 fps, scaled small like YouTube thumbnails)
    return new Promise((resolve, reject) => {
      const frameProcess = spawn('ffmpeg', [
        '-i', mp4FilePath,
        '-vf', 'fps=1,scale=160:-1:flags=lanczos', // 1 frame/sec, small size
        '-q:v', '4', // reasonable thumbnail quality
        path.join(framesDir, 'frame_s%06d.jpg'),
        '-y'
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      let progress = 0
      const progressInterval = setInterval(async () => {
        progress += 4 // Spread 20% progress over ~5 seconds
        if (progress <= 20) {
          await this.updateJobProgress(jobId, 80 + progress)
          await this.updateWorkspaceProgress(workspaceId, 80 + progress)
        }
      }, 500)

      // Handle FFmpeg output for better error reporting
      let stderr = ''
      frameProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
        console.log(`FFmpeg frames: ${data.toString().trim()}`)
      })

      frameProcess.on('close', async (code) => {
        clearInterval(progressInterval)
        if (code === 0) {
          console.log(`Preview frames generated in ${framesDir}`)
          resolve()
        } else {
          console.error(`FFmpeg frames stderr: ${stderr}`)
          reject(new Error(`Frame generation process exited with code ${code}: ${stderr}`))
        }
      })

      frameProcess.on('error', (error) => {
        clearInterval(progressInterval)
        console.error('Frame generation error:', error)
        reject(error)
      })
    })
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
