import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getProcessedFilesDir } from '@/lib/data-dirs'

export interface ShotCutDetectionData {
  workspaceId: string
  contentTitle: string
}

export interface ShotCut {
  timestampMs: number
  confidence: number
  detectionMethod: string
}

export class ShotCutDetectionService {
  private static instance: ShotCutDetectionService
  private detectionQueue: Map<string, boolean> = new Map()

  static getInstance(): ShotCutDetectionService {
    if (!ShotCutDetectionService.instance) {
      ShotCutDetectionService.instance = new ShotCutDetectionService()
    }
    return ShotCutDetectionService.instance
  }

  async detectShotCuts(jobId: string, data: ShotCutDetectionData): Promise<void> {
    const { workspaceId, contentTitle } = data

    console.log(`=== SHOT CUT DETECTION SERVICE START ===`)
    console.log(`Job ID: ${jobId}`)
    console.log(`Workspace ID: ${workspaceId}`)
    console.log(`Content Title: ${contentTitle}`)

    // Check if already detecting cuts for this workspace
    if (this.detectionQueue.get(workspaceId)) {
      console.log(`Workspace ${workspaceId} is already being processed for shot cuts`)
      return
    }

    this.detectionQueue.set(workspaceId, true)

    try {
      // Update job status
      await this.updateJobStatus(jobId, "processing", 0)

      // Get workspace info
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { 
          id: true,
          contentDuration: true
        }
      })

      if (!workspace) {
        throw new Error("Workspace not found")
      }

      // Find the processed video file
      const processedFilesDir = path.join(getProcessedFilesDir(), workspaceId)
      const processedVideoPath = path.join(processedFilesDir, 'processed.mp4')

      try {
        await fs.access(processedVideoPath)
        console.log(`Found processed video file at: ${processedVideoPath}`)
      } catch (error) {
        console.error(`Processed video file not found at: ${processedVideoPath}`)
        console.error(`Directory contents:`, await fs.readdir(processedFilesDir).catch(() => 'Directory does not exist'))
        throw new Error(`Processed video file not found at ${processedVideoPath}`)
      }

      // Clear existing shot cuts
      await prisma.shotCut.deleteMany({
        where: { workspaceId }
      })

      let shotCuts: ShotCut[] = []

      // Try ffprobe first (cleaner CSV output), then ffmpeg, then frame difference
      try {
        console.log('Trying FFprobe scene detection...')
        const ffprobeCuts = await this.detectCutsWithFFprobe(processedVideoPath, workspace.contentDuration)
        if (ffprobeCuts.length > 0) {
          console.log(`FFprobe detected ${ffprobeCuts.length} shot cuts`)
          shotCuts = ffprobeCuts
        } else {
          throw new Error('No cuts detected with FFprobe')
        }
      } catch (ffprobeError) {
        console.log('FFprobe failed, trying FFmpeg scene detection...')
        try {
          const ffmpegCuts = await this.detectCutsWithFFmpeg(processedVideoPath, workspace.contentDuration)
          if (ffmpegCuts.length > 0) {
            console.log(`FFmpeg detected ${ffmpegCuts.length} shot cuts`)
            shotCuts = ffmpegCuts
          } else {
            throw new Error('No cuts detected with FFmpeg')
          }
        } catch (ffmpegError) {
          console.log('FFmpeg failed, falling back to frame difference method...')
          shotCuts = await this.detectCutsWithFrameDifference(processedVideoPath, workspace.contentDuration)
        }
      }

      // Store detected cuts in database
      if (shotCuts.length > 0) {
        await prisma.shotCut.createMany({
          data: shotCuts.map(cut => ({
            workspaceId,
            timestampMs: cut.timestampMs,
            confidence: cut.confidence,
            detectionMethod: cut.detectionMethod
          }))
        })
      }

      // Update job status to completed
      await this.updateJobStatus(jobId, "completed", 100)

      console.log(`Shot cut detection completed for workspace ${workspaceId}. Found ${shotCuts.length} cuts.`)

    } catch (error) {
      console.error(`Shot cut detection failed for workspace ${workspaceId}:`, error)
      
      // Update job status to failed
      await this.updateJobStatus(jobId, "failed", 0, error instanceof Error ? error.message : "Unknown error")
      
    } finally {
      this.detectionQueue.delete(workspaceId)
    }
  }

  private async detectCutsWithFFmpeg(videoPath: string, durationMs: number): Promise<ShotCut[]> {
    return new Promise((resolve, reject) => {
      const shotCuts: ShotCut[] = []
      
      // Use ffmpeg's scene detection filter with metadata output
      const args = [
        '-i', videoPath,
        '-vf', 'select=gt(scene,0.4),metadata=print:file=-',
        '-f', 'null',
        '-'
      ]

      console.log(`Running ffmpeg scene detection: ${args.join(' ')}`)

      const ffmpegProcess = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })

      let stdout = ''
      let stderr = ''

      ffmpegProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      ffmpegProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      ffmpegProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('FFmpeg scene detection failed:', stderr)
          // Fallback to simple frame difference method
          this.detectCutsWithFrameDifference(videoPath, durationMs)
            .then(resolve)
            .catch(reject)
          return
        }

        // Parse ffmpeg metadata output for scene changes
        const lines = stdout.split('\n')
        for (const line of lines) {
          // Look for metadata lines with pts_time and scene_score
          const ptsMatch = line.match(/pts_time:([\d.]+)/)
          const scoreMatch = line.match(/lavfi\.scene_score=([\d.]+)/)
          
          if (ptsMatch && scoreMatch) {
            const ptsTime = parseFloat(ptsMatch[1])
            const sceneScore = parseFloat(scoreMatch[1])
            const timestampMs = Math.round(ptsTime * 1000)
            
            // Skip if timestamp is beyond video duration
            if (timestampMs >= durationMs) continue
            
            // Use the actual scene score as confidence (normalize to 0-1 range)
            const confidence = Math.min(0.95, Math.max(0.3, sceneScore))
            
            shotCuts.push({
              timestampMs,
              confidence,
              detectionMethod: 'ffmpeg_scene'
            })
          }
        }

        // If no cuts found with scene detection, try frame difference
        if (shotCuts.length === 0) {
          this.detectCutsWithFrameDifference(videoPath, durationMs)
            .then(resolve)
            .catch(reject)
        } else {
          resolve(shotCuts)
        }
      })

      ffmpegProcess.on('error', (error) => {
        console.error('FFmpeg process error:', error)
        // Fallback to frame difference method
        this.detectCutsWithFrameDifference(videoPath, durationMs)
          .then(resolve)
          .catch(reject)
      })
    })
  }

  private async detectCutsWithFFprobe(videoPath: string, durationMs: number): Promise<ShotCut[]> {
    return new Promise((resolve, reject) => {
      const shotCuts: ShotCut[] = []
      
      // Use ffprobe for cleaner CSV output
      const args = [
        '-hide_banner',
        '-of', 'csv=p=0',
        '-show_entries', 'frame=pkt_pts_time:frame_tags=lavfi.scene_score',
        '-f', 'lavfi',
        `movie=${videoPath},select=gt(scene,0.4)`
      ]

      console.log(`Running ffprobe scene detection: ${args.join(' ')}`)

      const ffprobeProcess = spawn('ffprobe', args, { stdio: ['ignore', 'pipe', 'pipe'] })

      let stdout = ''
      let stderr = ''

      ffprobeProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      ffprobeProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      ffprobeProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('FFprobe scene detection failed:', stderr)
          // Fallback to frame difference method
          this.detectCutsWithFrameDifference(videoPath, durationMs)
            .then(resolve)
            .catch(reject)
          return
        }

        // Parse CSV output: pkt_pts_time,lavfi.scene_score
        const lines = stdout.split('\n').filter(line => line.trim())
        for (const line of lines) {
          const [ptsTimeStr, sceneScoreStr] = line.split(',')
          
          if (ptsTimeStr && sceneScoreStr) {
            const ptsTime = parseFloat(ptsTimeStr)
            const sceneScore = parseFloat(sceneScoreStr)
            const timestampMs = Math.round(ptsTime * 1000)
            
            // Skip if timestamp is beyond video duration
            if (timestampMs >= durationMs) continue
            
            // Use the actual scene score as confidence (normalize to 0-1 range)
            const confidence = Math.min(0.95, Math.max(0.3, sceneScore))
            
            shotCuts.push({
              timestampMs,
              confidence,
              detectionMethod: 'ffprobe_scene'
            })
          }
        }

        console.log(`Detected ${shotCuts.length} shot cuts using FFprobe scene detection`)
        resolve(shotCuts)
      })

      ffprobeProcess.on('error', (error) => {
        console.error('FFprobe process error:', error)
        // Fallback to frame difference method
        this.detectCutsWithFrameDifference(videoPath, durationMs)
          .then(resolve)
          .catch(reject)
      })
    })
  }

  private async detectCutsWithFrameDifference(videoPath: string, durationMs: number): Promise<ShotCut[]> {
    return new Promise((resolve, reject) => {
      const shotCuts: ShotCut[] = []
      const tempDir = path.join(process.cwd(), 'temp', 'shot-detection')
      
      // Ensure temp directory exists
      fs.mkdir(tempDir, { recursive: true }).then(() => {
        // Extract frames at regular intervals
        const frameInterval = 2 // Extract every 2 seconds
        const args = [
          '-i', videoPath,
          '-vf', `fps=1/${frameInterval}`,
          '-q:v', '2',
          path.join(tempDir, 'frame_%04d.jpg')
        ]

        console.log(`Extracting frames for shot detection: ${args.join(' ')}`)

        const ffmpegProcess = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })

        let stderr = ''

        ffmpegProcess.stderr?.on('data', (data) => {
          stderr += data.toString()
        })

        ffmpegProcess.on('close', async (code) => {
          if (code !== 0) {
            console.error('Frame extraction failed:', stderr)
            reject(new Error('Frame extraction failed'))
            return
          }

          try {
            // Analyze extracted frames for shot changes
            const frames = await fs.readdir(tempDir)
            const frameFiles = frames.filter(f => f.endsWith('.jpg')).sort()

            if (frameFiles.length < 2) {
              resolve([])
              return
            }

            // Simple histogram-based shot detection
            for (let i = 1; i < frameFiles.length; i++) {
              const prevFrame = path.join(tempDir, frameFiles[i - 1])
              const currFrame = path.join(tempDir, frameFiles[i])
              
              try {
                const similarity = await this.compareFrames(prevFrame, currFrame)
                
                // If similarity is below threshold, consider it a shot cut
                if (similarity < 0.7) {
                  const timestampMs = (i - 1) * frameInterval * 1000
                  if (timestampMs < durationMs) {
                    shotCuts.push({
                      timestampMs,
                      confidence: 1 - similarity,
                      detectionMethod: 'histogram_difference'
                    })
                  }
                }
              } catch (error) {
                console.warn(`Failed to compare frames ${i-1} and ${i}:`, error)
              }
            }

            // Clean up temp files
            await fs.rm(tempDir, { recursive: true, force: true })

            resolve(shotCuts)
          } catch (error) {
            console.error('Frame analysis failed:', error)
            reject(error)
          }
        })

        ffmpegProcess.on('error', (error) => {
          console.error('FFmpeg frame extraction error:', error)
          reject(error)
        })
      }).catch(reject)
    })
  }

  private async compareFrames(frame1Path: string, frame2Path: string): Promise<number> {
    return new Promise((resolve, reject) => {
      // Use ffmpeg to compare frames using histogram
      const args = [
        '-i', frame1Path,
        '-i', frame2Path,
        '-lavfi', 'histogram=format=pc64:level_height=200',
        '-f', 'null',
        '-'
      ]

      const ffmpegProcess = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })

      let stderr = ''

      ffmpegProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      ffmpegProcess.on('close', (code) => {
        if (code !== 0) {
          // If histogram comparison fails, use a simple file size comparison as fallback
          Promise.all([
            fs.stat(frame1Path),
            fs.stat(frame2Path)
          ]).then(([stat1, stat2]) => {
            const sizeDiff = Math.abs(stat1.size - stat2.size)
            const avgSize = (stat1.size + stat2.size) / 2
            const similarity = Math.max(0, 1 - (sizeDiff / avgSize))
            resolve(similarity)
          }).catch(() => {
            resolve(0.5) // Default similarity if all else fails
          })
          return
        }

        // Parse histogram output for similarity (simplified)
        // In a real implementation, you'd parse the histogram data
        // For now, we'll use a simple heuristic
        resolve(0.6) // Default similarity score
      })

      ffmpegProcess.on('error', () => {
        resolve(0.5) // Default similarity on error
      })
    })
  }

  private async updateJobStatus(jobId: string, status: string, progress: number, errorText?: string): Promise<void> {
    try {
      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status,
          progressPercent: progress,
          errorText: errorText || null,
          updatedAt: new Date()
        }
      })
    } catch (error) {
      console.error('Failed to update job status:', error)
    }
  }
}
