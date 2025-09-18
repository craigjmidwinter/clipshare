import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { prisma } from '@/lib/prisma'
import { getProcessedFilesDir } from '@/lib/data-dirs'
// Use system ffmpeg/ffprobe; auto-detect paths with optional env overrides
import axios from 'axios'
import youtubedl from 'youtube-dl-exec'

const execAsync = promisify(exec)

// Helper function to find yt-dlp binary
async function findYtDlpBinary(): Promise<string | undefined> {
  // If explicitly set via environment variable, use that
  if (process.env.YT_DLP_PATH) {
    return process.env.YT_DLP_PATH
  }

  try {
    // Try to find yt-dlp in PATH
    const { stdout } = await execAsync('which yt-dlp')
    return stdout.trim()
  } catch {
    // If not found in PATH, try common locations
    const commonPaths = [
      '/usr/local/bin/yt-dlp',
      '/usr/bin/yt-dlp',
      '/opt/homebrew/bin/yt-dlp',
      '/snap/bin/yt-dlp'
    ]
    
    for (const binaryPath of commonPaths) {
      try {
        await fs.access(binaryPath)
        return binaryPath
      } catch {
        // Continue to next path
      }
    }
  }
  
  return undefined // Let youtube-dl-exec use its default
}

let cachedFfmpegPath: string | undefined
let cachedFfprobePath: string | undefined

async function findFfmpegBinary(): Promise<string> {
  if (cachedFfmpegPath) return cachedFfmpegPath
  if (process.env.FFMPEG_PATH) {
    cachedFfmpegPath = process.env.FFMPEG_PATH
    return cachedFfmpegPath
  }
  try {
    const { stdout } = await execAsync('which ffmpeg')
    cachedFfmpegPath = stdout.trim() || 'ffmpeg'
  } catch {
    cachedFfmpegPath = 'ffmpeg'
  }
  return cachedFfmpegPath
}

async function findFfprobeBinary(): Promise<string> {
  if (cachedFfprobePath) return cachedFfprobePath
  if (process.env.FFPROBE_PATH) {
    cachedFfprobePath = process.env.FFPROBE_PATH
    return cachedFfprobePath
  }
  try {
    const { stdout } = await execAsync('which ffprobe')
    cachedFfprobePath = stdout.trim() || 'ffprobe'
  } catch {
    cachedFfprobePath = 'ffprobe'
  }
  return cachedFfprobePath
}

export interface VideoProcessingData {
  videoId: string
  workspaceId: string
  sourceType: string
  sourceUrl?: string
  plexKey?: string
  plexServerId?: string
}

export class VideoProcessingService {
  private static instance: VideoProcessingService
  private processingQueue = new Map<string, boolean>()

  static getInstance(): VideoProcessingService {
    if (!VideoProcessingService.instance) {
      VideoProcessingService.instance = new VideoProcessingService()
    }
    return VideoProcessingService.instance
  }

  async processVideo(jobId: string, data: VideoProcessingData): Promise<void> {
    const { videoId, workspaceId, sourceType } = data

    // Check if already processing
    if (this.processingQueue.get(videoId)) {
      console.log(`Video ${videoId} is already being processed`)
      return
    }

    this.processingQueue.set(videoId, true)

    try {
      console.log(`Starting processing for video ${videoId}`)
      
      // Update job status to processing
      await this.updateJobStatus(jobId, 'processing', 0)
      await this.updateVideoStatus(videoId, 'processing', 0)

      let sourceFilePath: string
      let duration: number | undefined

      // Step 1: Download/Prepare source file
      console.log(`Step 1: Preparing source file for ${sourceType}...`)
      if (sourceType === 'youtube') {
        sourceFilePath = await this.downloadYouTubeVideo(data.sourceUrl!, workspaceId, videoId, jobId)
      } else if (sourceType === 'upload') {
        sourceFilePath = data.sourceUrl!
        // Get duration from uploaded file
        duration = await this.getVideoDuration(sourceFilePath)
      } else if (sourceType === 'plex') {
        sourceFilePath = await this.downloadPlexVideo(data.plexKey!, data.plexServerId!, workspaceId, videoId)
      } else {
        throw new Error(`Unsupported source type: ${sourceType}`)
      }

      await this.updateJobProgress(jobId, 20)
      await this.updateVideoProgress(videoId, 20)

      // Step 2: Get video metadata if not already available
      if (!duration) {
        duration = await this.getVideoDuration(sourceFilePath)
      }

      // Update video with duration
      await prisma.video.update({
        where: { id: videoId },
        data: { duration }
      })

      // Step 3: Convert to MP4 H.264
      console.log(`Step 2: Converting to MP4 H.264...`)
      const mp4FilePath = await this.convertToMP4(sourceFilePath, workspaceId, videoId, jobId)
      await this.updateJobProgress(jobId, 70)
      await this.updateVideoProgress(videoId, 70)

      // Step 4: Generate thumbnail
      console.log(`Step 3: Generating thumbnail...`)
      const thumbnailPath = await this.generateThumbnail(mp4FilePath, workspaceId, videoId)
      await this.updateJobProgress(jobId, 80)
      await this.updateVideoProgress(videoId, 80)

      // Step 5: Detect shot cuts
      console.log(`Step 4: Detecting shot cuts...`)
      await this.detectShotCuts(mp4FilePath, workspaceId, videoId, jobId)
      await this.updateJobProgress(jobId, 90)
      await this.updateVideoProgress(videoId, 90)

      // Step 6: Generate preview frames
      console.log(`Step 5: Generating preview frames...`)
      await this.generatePreviewFrames(mp4FilePath, workspaceId, videoId, jobId)
      await this.updateJobProgress(jobId, 100)
      await this.updateVideoProgress(videoId, 100)

      // Mark as completed
      await this.updateJobStatus(jobId, 'completed', 100)
      await this.updateVideoStatus(videoId, 'completed', 100)

      console.log(`Video processing completed for ${videoId}`)
    } catch (error) {
      console.error(`Video processing failed for ${videoId}:`, error)
      await this.updateJobStatus(jobId, 'failed', 0, error instanceof Error ? error.message : 'Unknown error')
      await this.updateVideoStatus(videoId, 'failed', 0, error instanceof Error ? error.message : 'Unknown error')
    } finally {
      this.processingQueue.delete(videoId)
    }
  }

  private async downloadYouTubeVideo(url: string, workspaceId: string, videoId: string, jobId: string): Promise<string> {
    try {
      // Validate URL
      if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
        throw new Error('Invalid YouTube URL')
      }

      // Create workspace directory
      const workspaceDir = path.join(getProcessedFilesDir(), workspaceId, 'videos')
      await fs.mkdir(workspaceDir, { recursive: true })

      console.log(`Downloading YouTube video: ${url}`)

      // Get video info first
      const ytDlpPath = await findYtDlpBinary()
      const ytdlp = ytDlpPath ? youtubedl.create(ytDlpPath) : youtubedl
      const info = await ytdlp(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: [
          'referer:youtube.com',
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]
      })

      // Extract video title and clean it for filename use
      const videoTitle = (info as any).title || 'Untitled Video'
      const cleanTitle = videoTitle
        .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 100) // Limit length

      // Update video with metadata including title
      await prisma.video.update({
        where: { id: videoId },
        data: {
          title: videoTitle,
          duration: (info as any).duration ? (info as any).duration * 1000 : null, // Convert to milliseconds
          thumbnailUrl: (info as any).thumbnail || (info as any).thumbnails?.[0]?.url
        }
      })

      // Download video with title-based filename
      const outputPath = path.join(workspaceDir, `${cleanTitle}_${videoId}.mp4`)
      
      console.log(`Starting download to: ${outputPath}`)
      
      await ytdlp(url, {
        output: outputPath.replace('.mp4', '.%(ext)s'),
        format: 'best[height<=1080]/best',
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: [
          'referer:youtube.com',
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]
      })
      
      console.log(`Download completed for: ${url}`)

      // If the downloaded file doesn't have .mp4 extension, rename it
      const files = await fs.readdir(workspaceDir)
      const downloadedFile = files.find(f => f.startsWith(`${cleanTitle}_${videoId}.`) && f !== `${cleanTitle}_${videoId}.mp4`)
      
      if (downloadedFile) {
        const downloadedPath = path.join(workspaceDir, downloadedFile)
        await fs.rename(downloadedPath, outputPath)
      }

      return outputPath
    } catch (error) {
      console.error('YouTube download error details:', error)
      throw new Error(`Failed to download YouTube video: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async downloadPlexVideo(plexKey: string, plexServerId: string, workspaceId: string, videoId: string): Promise<string> {
    // This would integrate with your existing Plex download logic
    // For now, we'll use the existing workspace processing logic
    const workspaceDir = path.join(getProcessedFilesDir(), workspaceId, 'videos')
    await fs.mkdir(workspaceDir, { recursive: true })
    
    const outputPath = path.join(workspaceDir, `${videoId}_source.mp4`)
    
    // TODO: Implement Plex video download
    // This should use your existing Plex API integration
    
    throw new Error('Plex video download not yet implemented')
  }

  private async convertToMP4(sourcePath: string, workspaceId: string, videoId: string, jobId: string): Promise<string> {
    const workspaceDir = path.join(getProcessedFilesDir(), workspaceId, 'videos')
    const outputPath = path.join(workspaceDir, `${videoId}_processed.mp4`)

    const ffmpegPath = await findFfmpegBinary()
    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn(ffmpegPath, [
        '-i', sourcePath,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y', outputPath
      ])

      let totalDuration = 0
      let processedDuration = 0

      ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString()
        
        // Extract duration
        const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/)
        if (durationMatch && totalDuration === 0) {
          const hours = parseInt(durationMatch[1])
          const minutes = parseInt(durationMatch[2])
          const seconds = parseFloat(durationMatch[3])
          totalDuration = hours * 3600 + minutes * 60 + seconds
        }

        // Extract progress
        const progressMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/)
        if (progressMatch && totalDuration > 0) {
          const hours = parseInt(progressMatch[1])
          const minutes = parseInt(progressMatch[2])
          const seconds = parseFloat(progressMatch[3])
          processedDuration = hours * 3600 + minutes * 60 + seconds
          
          const progress = Math.round((processedDuration / totalDuration) * 100)
          this.updateJobProgress(jobId, 20 + (progress * 0.5)) // 20-70% for conversion
          this.updateVideoProgress(videoId, 20 + (progress * 0.5))
        }
      })

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath)
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}`))
        }
      })

      ffmpegProcess.on('error', reject)
    })
  }

  private async generateThumbnail(videoPath: string, workspaceId: string, videoId: string): Promise<string> {
    const workspaceDir = path.join(getProcessedFilesDir(), workspaceId, 'videos')
    const thumbnailPath = path.join(workspaceDir, `${videoId}_thumbnail.jpg`)

    const ffmpegPath = await findFfmpegBinary()
    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn(ffmpegPath, [
        '-i', videoPath,
        '-ss', '00:00:01',
        '-vframes', '1',
        '-q:v', '2',
        '-y', thumbnailPath
      ])

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          // Update video with thumbnail URL
          prisma.video.update({
            where: { id: videoId },
            data: { 
              thumbnailUrl: `/api/workspaces/${workspaceId}/videos/${videoId}/thumbnail`
            }
          }).catch(console.error)
          resolve(thumbnailPath)
        } else {
          reject(new Error(`Thumbnail generation failed with code ${code}`))
        }
      })

      ffmpegProcess.on('error', reject)
    })
  }

  private async detectShotCuts(videoPath: string, workspaceId: string, videoId: string, jobId: string): Promise<void> {
    // This would use your existing shot cut detection logic
    // For now, we'll create a placeholder implementation
    
    // Clear existing shot cuts for this video
    await prisma.shotCut.deleteMany({
      where: { videoId }
    })

    // TODO: Implement actual shot cut detection
    // This should use your existing ShotCutDetectionService but adapted for individual videos
    console.log('Shot cut detection for video not yet implemented')
  }

  private async generatePreviewFrames(videoPath: string, workspaceId: string, videoId: string, jobId: string): Promise<void> {
    const framesDir = path.join(getProcessedFilesDir(), workspaceId, 'videos', videoId, 'frames')
    await fs.mkdir(framesDir, { recursive: true })

    // Generate frames every 10 seconds
    const ffmpegPath = await findFfmpegBinary()
    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn(ffmpegPath, [
        '-i', videoPath,
        '-vf', 'fps=1/10',
        '-q:v', '2',
        '-y', path.join(framesDir, 'frame_%06d.jpg')
      ])

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Frame generation failed with code ${code}`))
        }
      })

      ffmpegProcess.on('error', reject)
    })
  }

  private async getVideoDuration(videoPath: string): Promise<number> {
    const ffprobePath = await findFfprobeBinary()
    return new Promise((resolve, reject) => {
      const ffprobeProcess = spawn(ffprobePath, [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        videoPath
      ])

      let output = ''
      ffprobeProcess.stdout.on('data', (data) => {
        output += data.toString()
      })

      ffprobeProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output)
            const duration = parseFloat(info.format.duration) * 1000 // Convert to milliseconds
            resolve(duration)
          } catch (error) {
            reject(new Error('Failed to parse video duration'))
          }
        } else {
          reject(new Error(`FFprobe failed with code ${code}`))
        }
      })

      ffprobeProcess.on('error', reject)
    })
  }

  private async updateJobStatus(jobId: string, status: string, progress: number, error?: string): Promise<void> {
    try {
      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status,
          progressPercent: progress,
          ...(error && { errorText: error })
        }
      })
    } catch (error) {
      console.error('Failed to update job status:', error)
    }
  }

  private async updateJobProgress(jobId: string, progress: number): Promise<void> {
    try {
      await prisma.processingJob.update({
        where: { id: jobId },
        data: { progressPercent: progress }
      })
    } catch (error) {
      console.error('Failed to update job progress:', error)
    }
  }

  private async updateVideoStatus(videoId: string, status: string, progress: number, error?: string): Promise<void> {
    try {
      await prisma.video.update({
        where: { id: videoId },
        data: {
          processingStatus: status,
          processingProgress: progress,
          ...(error && { processingError: error })
        }
      })
    } catch (error) {
      console.error('Failed to update video status:', error)
    }
  }

  private async updateVideoProgress(videoId: string, progress: number): Promise<void> {
    try {
      await prisma.video.update({
        where: { id: videoId },
        data: { processingProgress: progress }
      })
    } catch (error) {
      console.error('Failed to update video progress:', error)
    }
  }
}
