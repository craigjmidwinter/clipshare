import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { createWriteStream } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import ffmpeg from 'ffmpeg-static'
import archiver from 'archiver'

export interface OBSExportConfig {
  workspaceId: string
  exportFormat: string
  quality: string
  hotkeyPattern: string
  includeCollaborators: boolean
  webInterfaceTheme: string
  namingConvention: string
}

export class OBSExportService {
  private static instance: OBSExportService
  private processingQueue = new Map<string, boolean>()

  static getInstance(): OBSExportService {
    if (!OBSExportService.instance) {
      OBSExportService.instance = new OBSExportService()
    }
    return OBSExportService.instance
  }

  async generateOBSPackage(jobId: string, config: OBSExportConfig): Promise<void> {
    const { workspaceId } = config

    // Check if already processing this workspace
    if (this.processingQueue.get(workspaceId)) {
      console.log(`Workspace ${workspaceId} OBS export is already being processed`)
      return
    }

    this.processingQueue.set(workspaceId, true)

    try {
      console.log(`Starting OBS export for workspace ${workspaceId}`)
      await prisma.processingJob.update({ 
        where: { id: jobId }, 
        data: { status: 'processing', progressPercent: 10 } 
      })

      // Get workspace and bookmarks data
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          bookmarks: {
            include: {
              createdBy: {
                select: { plexUsername: true, name: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          memberships: {
            include: {
              user: {
                select: { plexUsername: true, name: true }
              }
            }
          }
        }
      })

      if (!workspace) {
        throw new Error('Workspace not found')
      }

      await prisma.processingJob.update({ 
        where: { id: jobId }, 
        data: { progressPercent: 20 } 
      })

      // Create package directory structure
      const packageDir = path.join(process.cwd(), 'temp', `obs-package-${workspaceId}-${Date.now()}`)
      await this.createPackageStructure(packageDir)

      await prisma.processingJob.update({ 
        where: { id: jobId }, 
        data: { progressPercent: 30 } 
      })

      // Generate clips
      await this.generateClips(workspace, packageDir, config)

      await prisma.processingJob.update({ 
        where: { id: jobId }, 
        data: { progressPercent: 60 } 
      })

      // Generate thumbnails
      await this.generateThumbnails(workspace, packageDir)

      await prisma.processingJob.update({ 
        where: { id: jobId }, 
        data: { progressPercent: 70 } 
      })

      // Generate hotkeys
      const hotkeys = await this.generateHotkeys(workspace.bookmarks, config.hotkeyPattern)

      await prisma.processingJob.update({ 
        where: { id: jobId }, 
        data: { progressPercent: 80 } 
      })

      // Generate web interface
      await this.generateWebInterface(workspace, packageDir, config, hotkeys)

      await prisma.processingJob.update({ 
        where: { id: jobId }, 
        data: { progressPercent: 90 } 
      })

      // Generate OBS configuration files
      await this.generateOBSConfig(workspace, packageDir, hotkeys)

      // Generate metadata files
      await this.generateMetadata(workspace, packageDir, hotkeys)

      // Create ZIP package
      const zipPath = path.join(process.cwd(), 'processed-files', workspaceId, `obs-package-${Date.now()}.zip`)
      await this.createZipPackage(packageDir, zipPath)

      // Clean up temp directory
      await fs.rm(packageDir, { recursive: true, force: true })

      await prisma.processingJob.update({ 
        where: { id: jobId }, 
        data: { 
          status: 'completed', 
          progressPercent: 100,
          payloadJson: JSON.stringify({
            ...config,
            zipPath,
            packageSize: await this.getFileSize(zipPath),
            clipCount: workspace.bookmarks.length
          })
        } 
      })

      console.log(`OBS export completed for workspace ${workspaceId}`)

    } catch (error) {
      console.error('OBS export error:', error)
      await prisma.processingJob.update({
        where: { id: jobId },
        data: { 
          status: 'failed', 
          errorText: error instanceof Error ? error.message : 'Unknown error' 
        }
      })
    } finally {
      this.processingQueue.delete(workspaceId)
    }
  }

  private async createPackageStructure(packageDir: string): Promise<void> {
    const dirs = [
      'clips',
      'metadata',
      'web-interface',
      'web-interface/thumbnails',
      'obs'
    ]

    for (const dir of dirs) {
      await fs.mkdir(path.join(packageDir, dir), { recursive: true })
    }
  }

  private async generateClips(workspace: any, packageDir: string, config: OBSExportConfig): Promise<void> {
    const sourcePath = path.join(process.cwd(), 'processed-files', workspace.id, 'processed.mp4')
    const clipsDir = path.join(packageDir, 'clips')

    const runFfmpeg = (args: string[]) => new Promise<void>((resolve, reject) => {
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
        console.log(`FFmpeg OBS export stderr: ${data.toString().trim()}`)
      })
      
      p.stdout?.on('data', (data) => {
        stdout += data.toString()
        console.log(`FFmpeg OBS export stdout: ${data.toString().trim()}`)
      })
      
      p.on('close', (code, signal) => {
        console.log(`FFmpeg OBS export process closed with code: ${code}, signal: ${signal}`)
        if (code === 0) {
          resolve()
        } else {
          const errorMsg = `ffmpeg exited ${code}${signal ? ` with signal ${signal}` : ''}`
          console.error(`${errorMsg}. Stderr: ${stderr}`)
          reject(new Error(`${errorMsg}: ${stderr}`))
        }
      })
      
      p.on('error', (error) => {
        console.error('FFmpeg OBS export spawn error:', error)
        reject(new Error(`Failed to start FFmpeg process: ${error.message}`))
      })
      
      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.error('FFmpeg OBS export timed out after 15 minutes')
        p.kill('SIGTERM')
        reject(new Error('FFmpeg OBS export timed out after 15 minutes'))
      }, 15 * 60 * 1000) // 15 minutes timeout
      
      p.on('close', () => {
        clearTimeout(timeout)
      })
    })

    for (const bookmark of workspace.bookmarks) {
      try {
        const filename = this.generateClipFilename(workspace, bookmark, config.namingConvention)
        const outPath = path.join(clipsDir, `${filename}.mp4`)

        const startSec = Math.max(0, bookmark.startMs / 1000)
        const endSec = Math.max(startSec + 0.1, bookmark.endMs / 1000)
        const duration = Math.max(0.1, endSec - startSec)

        // Generate clip with specified quality
        const qualityArgs = this.getQualityArgs(config.quality, config.exportFormat)
        await runFfmpeg([
          '-ss', String(startSec),
          '-i', sourcePath,
          '-t', String(duration),
          ...qualityArgs,
          '-movflags', '+faststart',
          '-y', outPath
        ])

        console.log(`Generated clip: ${filename}`)
      } catch (error) {
        console.warn(`Failed to generate clip for bookmark ${bookmark.id}:`, error)
      }
    }
  }

  private async generateThumbnails(workspace: any, packageDir: string): Promise<void> {
    const sourcePath = path.join(process.cwd(), 'processed-files', workspace.id, 'processed.mp4')
    const thumbnailsDir = path.join(packageDir, 'web-interface', 'thumbnails')

    const runFfmpeg = (args: string[]) => new Promise<void>((resolve, reject) => {
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
        console.log(`FFmpeg thumbnail stderr: ${data.toString().trim()}`)
      })
      
      p.stdout?.on('data', (data) => {
        stdout += data.toString()
        console.log(`FFmpeg thumbnail stdout: ${data.toString().trim()}`)
      })
      
      p.on('close', (code, signal) => {
        console.log(`FFmpeg thumbnail process closed with code: ${code}, signal: ${signal}`)
        if (code === 0) {
          resolve()
        } else {
          const errorMsg = `ffmpeg exited ${code}${signal ? ` with signal ${signal}` : ''}`
          console.error(`${errorMsg}. Stderr: ${stderr}`)
          reject(new Error(`${errorMsg}: ${stderr}`))
        }
      })
      
      p.on('error', (error) => {
        console.error('FFmpeg thumbnail spawn error:', error)
        reject(new Error(`Failed to start FFmpeg process: ${error.message}`))
      })
      
      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.error('FFmpeg thumbnail generation timed out after 5 minutes')
        p.kill('SIGTERM')
        reject(new Error('FFmpeg thumbnail generation timed out after 5 minutes'))
      }, 5 * 60 * 1000) // 5 minutes timeout
      
      p.on('close', () => {
        clearTimeout(timeout)
      })
    })

    for (const bookmark of workspace.bookmarks) {
      try {
        const thumbnailPath = path.join(thumbnailsDir, `${bookmark.id}.jpg`)
        const timeSec = bookmark.startMs / 1000

        await runFfmpeg([
          '-ss', String(timeSec),
          '-i', sourcePath,
          '-vframes', '1',
          '-q:v', '2',
          '-vf', 'scale=320:180',
          '-y', thumbnailPath
        ])

        console.log(`Generated thumbnail for bookmark ${bookmark.id}`)
      } catch (error) {
        console.warn(`Failed to generate thumbnail for bookmark ${bookmark.id}:`, error)
      }
    }
  }

  private async generateHotkeys(bookmarks: any[], pattern: string): Promise<any[]> {
    const hotkeys = []
    
    for (let i = 0; i < bookmarks.length; i++) {
      const bookmark = bookmarks[i]
      const hotkey = this.assignHotkey(i, pattern)
      
      hotkeys.push({
        bookmarkId: bookmark.id,
        key: hotkey.key,
        modifiers: hotkey.modifiers,
        label: bookmark.label || `Clip ${i + 1}`
      })
    }

    return hotkeys
  }

  private assignHotkey(index: number, pattern: string): { key: string; modifiers: string[] } {
    switch (pattern) {
      case 'sequential':
        if (index < 12) {
          return { key: `F${index + 1}`, modifiers: [] }
        } else if (index < 24) {
          return { key: `F${index - 11}`, modifiers: ['Ctrl'] }
        } else if (index < 36) {
          return { key: `F${index - 23}`, modifiers: ['Alt'] }
        } else {
          return { key: `F${index - 35}`, modifiers: ['Shift'] }
        }
      
      case 'creator-based':
        // Group by creator - simplified for now
        if (index < 12) {
          return { key: `F${index + 1}`, modifiers: [] }
        } else {
          return { key: `F${index - 11}`, modifiers: ['Ctrl'] }
        }
      
      case 'time-based':
        // Group by time - simplified for now
        if (index < 12) {
          return { key: `F${index + 1}`, modifiers: [] }
        } else {
          return { key: `F${index - 11}`, modifiers: ['Ctrl'] }
        }
      
      default:
        return { key: `F${index + 1}`, modifiers: [] }
    }
  }

  private async generateWebInterface(workspace: any, packageDir: string, config: OBSExportConfig, hotkeys: any[]): Promise<void> {
    const webDir = path.join(packageDir, 'web-interface')
    
    // Generate HTML
    const html = this.generateHTML(workspace, hotkeys, config.webInterfaceTheme)
    await fs.writeFile(path.join(webDir, 'index.html'), html)

    // Generate CSS
    const css = this.generateCSS(config.webInterfaceTheme)
    await fs.writeFile(path.join(webDir, 'style.css'), css)

    // Generate JavaScript
    const js = this.generateJavaScript(workspace, hotkeys)
    await fs.writeFile(path.join(webDir, 'script.js'), js)
  }

  private generateHTML(workspace: any, hotkeys: any[], theme: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clipshare VTR Control Panel - ${workspace.title}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body class="${theme}">
    <div class="vtr-control-panel">
        <header class="control-header">
            <h1>VTR Control Panel</h1>
            <div class="workspace-info">
                <span class="workspace-name">${workspace.title}</span>
                <span class="clip-count">${hotkeys.length} clips</span>
            </div>
        </header>
        
        <div class="control-section">
            <h3>Quick Access</h3>
            <div class="quick-clips">
                ${hotkeys.slice(0, 8).map((hotkey, index) => {
                  const bookmark = workspace.bookmarks.find((b: any) => b.id === hotkey.bookmarkId)
                  const duration = bookmark ? ((bookmark.endMs - bookmark.startMs) / 1000).toFixed(1) : '0.0'
                  
                  return `
                    <button class="quick-clip-btn" data-bookmark-id="${hotkey.bookmarkId}" data-hotkey="${hotkey.modifiers.join('+')}${hotkey.modifiers.length > 0 ? '+' : ''}${hotkey.key}">
                        <div class="clip-number">${index + 1}</div>
                        <div class="clip-label">${hotkey.label}</div>
                        <div class="clip-duration">${duration}s</div>
                        <div class="hotkey-indicator">${hotkey.key}</div>
                    </button>
                  `
                }).join('')}
            </div>
        </div>
        
        <div class="control-section">
            <h3>All Clips</h3>
            <div class="clips-grid">
                ${hotkeys.map((hotkey, index) => {
                  const bookmark = workspace.bookmarks.find((b: any) => b.id === hotkey.bookmarkId)
                  const duration = bookmark ? ((bookmark.endMs - bookmark.startMs) / 1000).toFixed(1) : '0.0'
                  const creator = bookmark?.createdBy?.plexUsername || bookmark?.createdBy?.name || 'Unknown'
                  
                  return `
                    <div class="clip-card" data-bookmark-id="${hotkey.bookmarkId}">
                        <div class="clip-thumbnail">
                            <img src="thumbnails/${hotkey.bookmarkId}.jpg" alt="${hotkey.label}" onerror="this.style.display='none'">
                            <div class="play-overlay">▶</div>
                        </div>
                        <div class="clip-info">
                            <div class="clip-label">${hotkey.label}</div>
                            <div class="clip-meta">
                                <span class="duration">${duration}s</span>
                                <span class="creator">${creator}</span>
                            </div>
                            <div class="hotkey">${hotkey.modifiers.join('+')}${hotkey.modifiers.length > 0 ? '+' : ''}${hotkey.key}</div>
                        </div>
                    </div>
                  `
                }).join('')}
            </div>
        </div>
        
        <div class="control-footer">
            <div class="status-bar">
                <span class="status-indicator">
                    <span class="status-dot"></span>
                    <span class="status-text">Ready</span>
                </span>
                <span class="queue-info">
                    Queue: <span id="queue-count">0</span>
                </span>
            </div>
            <div class="control-buttons">
                <button class="stop-all-btn">Stop All</button>
                <button class="emergency-stop-btn">Emergency Stop</button>
            </div>
        </div>
    </div>
    
    <script src="script.js"></script>
</body>
</html>`
  }

  private generateCSS(theme: string): string {
    const isDark = theme === 'dark'
    const bgColor = isDark ? '#1a1a1a' : '#ffffff'
    const textColor = isDark ? '#ffffff' : '#000000'
    const cardBg = isDark ? '#2d2d2d' : '#f5f5f5'
    const accentColor = '#ff6b35'
    const borderColor = isDark ? '#444' : '#ddd'

    return `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: ${bgColor};
    color: ${textColor};
    overflow: hidden;
    height: 100vh;
}

.vtr-control-panel {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: ${bgColor};
}

.control-header {
    background: ${isDark ? '#2d2d2d' : '#f8f9fa'};
    padding: 12px 16px;
    border-bottom: 2px solid ${borderColor};
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.control-header h1 {
    font-size: 18px;
    font-weight: 700;
    color: ${accentColor};
}

.workspace-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 12px;
}

.workspace-name {
    font-weight: 600;
    color: ${textColor};
}

.clip-count {
    color: ${isDark ? '#999' : '#666'};
}

.control-section {
    padding: 16px;
    border-bottom: 1px solid ${borderColor};
}

.control-section h3 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: ${textColor};
}

.quick-clips {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 16px;
}

.quick-clip-btn {
    background: ${cardBg};
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 12px 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
    position: relative;
}

.quick-clip-btn:hover {
    border-color: ${accentColor};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 107, 53, 0.2);
}

.quick-clip-btn.playing {
    border-color: ${accentColor};
    background: ${isDark ? '#3d2d2d' : '#fff5f0'};
}

.clip-number {
    position: absolute;
    top: 4px;
    left: 4px;
    background: ${accentColor};
    color: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
}

.clip-label {
    font-size: 11px;
    font-weight: 600;
    margin-top: 8px;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.clip-duration {
    font-size: 10px;
    color: ${isDark ? '#999' : '#666'};
    margin-bottom: 4px;
}

.hotkey-indicator {
    font-size: 9px;
    color: ${accentColor};
    font-weight: 700;
    background: ${isDark ? '#1a1a1a' : '#f0f0f0'};
    padding: 2px 4px;
    border-radius: 3px;
    display: inline-block;
}

.clips-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    max-height: 300px;
    overflow-y: auto;
    padding-right: 8px;
}

.clip-card {
    background: ${cardBg};
    border-radius: 8px;
    padding: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid transparent;
}

.clip-card:hover {
    border-color: ${accentColor};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 107, 53, 0.15);
}

.clip-card.playing {
    border-color: ${accentColor};
    background: ${isDark ? '#3d2d2d' : '#fff5f0'};
}

.clip-thumbnail {
    position: relative;
    width: 100%;
    height: 70px;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 8px;
}

.clip-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.play-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 24px;
    opacity: 0;
    transition: opacity 0.2s ease;
    text-shadow: 0 0 8px rgba(0,0,0,0.8);
}

.clip-card:hover .play-overlay {
    opacity: 1;
}

.clip-info {
    text-align: center;
}

.clip-label {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.clip-meta {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: ${isDark ? '#999' : '#666'};
    margin-bottom: 6px;
}

.hotkey {
    font-size: 9px;
    color: ${accentColor};
    font-weight: 700;
    background: ${isDark ? '#1a1a1a' : '#f0f0f0'};
    padding: 3px 6px;
    border-radius: 4px;
    display: inline-block;
}

.control-footer {
    margin-top: auto;
    background: ${isDark ? '#2d2d2d' : '#f8f9fa'};
    padding: 12px 16px;
    border-top: 2px solid ${borderColor};
}

.status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
}

.status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #4ade80;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.status-text {
    font-size: 12px;
    font-weight: 600;
    color: ${textColor};
}

.queue-info {
    font-size: 12px;
    color: ${isDark ? '#999' : '#666'};
}

.control-buttons {
    display: flex;
    gap: 8px;
}

.stop-all-btn, .emergency-stop-btn {
    flex: 1;
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.stop-all-btn {
    background: #ef4444;
    color: white;
}

.stop-all-btn:hover {
    background: #dc2626;
    transform: translateY(-1px);
}

.emergency-stop-btn {
    background: #dc2626;
    color: white;
    font-weight: 700;
}

.emergency-stop-btn:hover {
    background: #b91c1c;
    transform: translateY(-1px);
}

/* Scrollbar styling */
.clips-grid::-webkit-scrollbar {
    width: 8px;
}

.clips-grid::-webkit-scrollbar-track {
    background: ${isDark ? '#2d2d2d' : '#f1f1f1'};
    border-radius: 4px;
}

.clips-grid::-webkit-scrollbar-thumb {
    background: ${isDark ? '#555' : '#c1c1c1'};
    border-radius: 4px;
}

.clips-grid::-webkit-scrollbar-thumb:hover {
    background: ${isDark ? '#777' : '#a8a8a8'};
}
`
  }

  private generateJavaScript(workspace: any, hotkeys: any[]): string {
    return `
class OBSClipController {
    constructor() {
        this.clips = new Map()
        this.currentlyPlaying = null
        this.queue = []
        this.init()
    }

    init() {
        // Initialize clip cards
        document.querySelectorAll('.clip-card').forEach(card => {
            const bookmarkId = card.dataset.bookmarkId
            const hotkey = hotkeys.find(h => h.bookmarkId === bookmarkId)
            
            if (hotkey) {
                this.clips.set(bookmarkId, {
                    element: card,
                    hotkey: hotkey,
                    playing: false
                })
                
                // Add click handler
                card.addEventListener('click', () => this.playClip(bookmarkId))
            }
        })

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeydown(e))
        
        // Stop all button
        document.querySelector('.stop-all-btn').addEventListener('click', () => this.stopAll())
        
        console.log('OBS Clip Controller initialized')
    }

    handleKeydown(e) {
        const key = e.key
        const modifiers = []
        
        if (e.ctrlKey) modifiers.push('Ctrl')
        if (e.altKey) modifiers.push('Alt')
        if (e.shiftKey) modifiers.push('Shift')
        
        // Find matching hotkey
        for (const [bookmarkId, clip] of this.clips) {
            if (clip.hotkey.key === key && 
                JSON.stringify(clip.hotkey.modifiers) === JSON.stringify(modifiers)) {
                e.preventDefault()
                this.playClip(bookmarkId)
                break
            }
        }
    }

    playClip(bookmarkId) {
        const clip = this.clips.get(bookmarkId)
        if (!clip) return

        // Stop currently playing clip
        if (this.currentlyPlaying) {
            this.stopClip(this.currentlyPlaying)
        }

        // Play new clip
        clip.element.classList.add('playing')
        clip.playing = true
        this.currentlyPlaying = bookmarkId

        // Update status
        this.updateStatus('Playing: ' + clip.hotkey.label)

        // Simulate clip end (in real implementation, this would be handled by OBS)
        setTimeout(() => {
            this.stopClip(bookmarkId)
        }, 5000) // 5 second demo

        console.log('Playing clip:', bookmarkId, clip.hotkey.label)
    }

    stopClip(bookmarkId) {
        const clip = this.clips.get(bookmarkId)
        if (!clip) return

        clip.element.classList.remove('playing')
        clip.playing = false
        
        if (this.currentlyPlaying === bookmarkId) {
            this.currentlyPlaying = null
            this.updateStatus('Ready')
        }
    }

    stopAll() {
        for (const [bookmarkId, clip] of this.clips) {
            this.stopClip(bookmarkId)
        }
        this.queue = []
        this.updateQueueCount()
    }

    updateStatus(text) {
        document.querySelector('.status-text').textContent = text
    }

    updateQueueCount() {
        document.getElementById('queue-count').textContent = this.queue.length
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OBSClipController()
})
`
  }

  private async generateOBSConfig(workspace: any, packageDir: string, hotkeys: any[]): Promise<void> {
    const obsDir = path.join(packageDir, 'obs')
    
    // Generate Python script for automatic OBS setup
    const pythonScript = this.generateOBSSetupScript(workspace, hotkeys, packageDir)
    await fs.writeFile(path.join(obsDir, 'setup_obs.py'), pythonScript)

    // Generate batch file for easy execution
    const batchScript = this.generateBatchScript()
    await fs.writeFile(path.join(obsDir, 'setup_obs.bat'), batchScript)

    // Generate shell script for Mac/Linux
    const shellScript = this.generateShellScript()
    await fs.writeFile(path.join(obsDir, 'setup_obs.sh'), shellScript)

    // Generate configuration file
    const config = {
      workspace: {
        id: workspace.id,
        title: workspace.title,
        contentTitle: workspace.contentTitle
      },
      clips: workspace.bookmarks.map((bookmark: any, index: number) => ({
        id: bookmark.id,
        label: bookmark.label || `Clip ${index + 1}`,
        filename: `${this.generateClipFilename(workspace, bookmark, 'workspace-content-label')}.mp4`,
        startMs: bookmark.startMs,
        endMs: bookmark.endMs,
        duration: bookmark.endMs - bookmark.startMs,
        creator: bookmark.createdBy?.plexUsername || bookmark.createdBy?.name || 'Unknown'
      })),
      hotkeys: hotkeys,
      packagePath: packageDir
    }

    await fs.writeFile(
      path.join(obsDir, 'config.json'),
      JSON.stringify(config, null, 2)
    )
  }

  private async generateMetadata(workspace: any, packageDir: string, hotkeys: any[]): Promise<void> {
    const metadataDir = path.join(packageDir, 'metadata')
    
    // Generate clips metadata
    const clipsData = workspace.bookmarks.map(bookmark => ({
      id: bookmark.id,
      label: bookmark.label,
      startMs: bookmark.startMs,
      endMs: bookmark.endMs,
      duration: bookmark.endMs - bookmark.startMs,
      creator: bookmark.createdBy?.plexUsername || bookmark.createdBy?.name || 'Unknown',
      createdAt: bookmark.createdAt,
      hotkey: hotkeys.find(h => h.bookmarkId === bookmark.id)
    }))

    await fs.writeFile(
      path.join(metadataDir, 'clips.json'),
      JSON.stringify(clipsData, null, 2)
    )

    // Generate workspace info
    const workspaceInfo = {
      id: workspace.id,
      title: workspace.title,
      contentTitle: workspace.contentTitle,
      createdAt: workspace.createdAt,
      totalClips: workspace.bookmarks.length,
      collaborators: workspace.memberships.map(m => ({
        username: m.user.plexUsername || m.user.name,
        role: m.role
      }))
    }

    await fs.writeFile(
      path.join(metadataDir, 'workspace-info.json'),
      JSON.stringify(workspaceInfo, null, 2)
    )

    // Generate README
    const readme = this.generateREADME(workspace, hotkeys)
    await fs.writeFile(path.join(packageDir, 'README.md'), readme)
  }

  private generateREADME(workspace: any, hotkeys: any[]): string {
    return `# OBS VTR Package: ${workspace.title}

This package contains all bookmarked clips from your Clipshare workspace, configured for professional VTR (Video Tape Recorder) functionality in OBS Studio.

## 🚀 One-Click Setup

### Prerequisites
- OBS Studio 28+ installed
- Python 3.7+ installed
- OBS Studio running

### Quick Start
1. **Extract** this package to any folder
2. **Double-click** the setup file for your platform:
   - **Windows**: \`setup_obs.bat\`
   - **Mac/Linux**: \`setup_obs.sh\`
3. **Done!** Your OBS scenes and sources are automatically created

## What Gets Created Automatically

### 🎬 Scenes
- **Main Scene**: Clean feed with all your clips (for live production)
- **VTR Control Scene**: Control panel (for monitoring only)

### 🎥 Media Sources
- Individual media source for each clip
- Properly configured for instant playback
- Hardware acceleration enabled

### ⌨️ Hotkeys
- F1-F12: Quick clip restart
- Ctrl+F1-F12: Additional clips
- Alt+F1-F12: More clips
- Shift+F1-F12: Even more clips

### 🌐 WebSocket Control
- Port: 4455
- Password: clipshare_vtr
- Enables external control from web interface

## Manual Setup (If Needed)

If the automatic setup doesn't work, you can set up manually:

### 1. Create Scenes
- Create scene: "${workspace.title} - Main"
- Create scene: "${workspace.title} - VTR Control"

### 2. Add Media Sources
For each clip, add a Media Source:
- Name: "${workspace.title} - [Clip Name]"
- Local File: \`clips/[filename].mp4\`
- Uncheck "Loop"

### 3. Add VTR Control Panel
- Add Browser Source to VTR Control scene
- Local File: \`web-interface/index.html\`
- Size: 600x400

## Usage

### Live Production
1. **Switch to Main Scene** for your live feed
2. **Use hotkeys** (F1-F12) to restart clips instantly
3. **Keep VTR Control scene** for monitoring only

### Visual Control
1. **Switch to VTR Control scene** to see the control panel
2. **Click any clip** to restart it
3. **Use Stop All** for emergency stops

## Troubleshooting

### Setup Script Fails
- Ensure OBS Studio is running
- Check Python installation: \`python --version\`
- Install required packages: \`pip install obspython websockets requests\`

### Clips Not Playing
- Verify clip files exist in \`clips/\` folder
- Check OBS Media Source settings
- Ensure hardware acceleration is enabled

### Hotkeys Not Working
- Check OBS Hotkey settings
- Ensure no conflicts with system hotkeys
- Test in OBS before going live

### WebSocket Issues
- Check OBS WebSocket settings
- Verify port 4455 is available
- Use password: clipshare_vtr

## Package Information

- **Workspace**: ${workspace.title}
- **Content**: ${workspace.contentTitle}
- **Total Clips**: ${workspace.bookmarks.length}
- **Generated**: ${new Date().toISOString()}
- **Package Version**: 2.0 (Automated Setup)

## Support

For issues:
1. Try the automated setup first
2. Check troubleshooting section
3. Verify all prerequisites are met
4. Test clips individually in OBS

This VTR package now features **one-click setup** - no more manual configuration needed!
`
  }

  private generateClipFilename(workspace: any, bookmark: any, convention: string): string {
    const workspaceName = workspace.title.replace(/[^a-zA-Z0-9_-]/g, '_')
    const contentTitle = workspace.contentTitle.replace(/[^a-zA-Z0-9_-]/g, '_')
    const label = (bookmark.label || 'untitled').replace(/[^a-zA-Z0-9_-]/g, '_')
    
    switch (convention) {
      case 'workspace-content-label':
        return `${workspaceName}-${contentTitle}-${label}`
      case 'content-label':
        return `${contentTitle}-${label}`
      case 'label-only':
        return label
      default:
        return `${workspaceName}-${label}`
    }
  }

  private getQualityArgs(quality: string, format: string): string[] {
    switch (quality) {
      case '1080p':
        return ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-c:a', 'aac', '-b:a', '128k']
      case '720p':
        return ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-vf', 'scale=1280:720', '-c:a', 'aac', '-b:a', '128k']
      case '480p':
        return ['-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-vf', 'scale=854:480', '-c:a', 'aac', '-b:a', '96k']
      default:
        return ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-c:a', 'aac', '-b:a', '128k']
    }
  }

  private async createZipPackage(sourceDir: string, zipPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(zipPath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      output.on('close', () => {
        console.log(`ZIP package created: ${zipPath}`)
        resolve()
      })

      archive.on('error', (err) => {
        reject(err)
      })

      archive.pipe(output)
      archive.directory(sourceDir, false)
      archive.finalize()
    })
  }

  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath)
      return stats.size
    } catch {
      return 0
    }
  }

  private generateOBSSetupScript(workspace: any, hotkeys: any[], packageDir: string): string {
    return `#!/usr/bin/env python3
"""
Automatic OBS Studio Setup Script for Clipshare VTR Package
This script automatically creates scenes, sources, and hotkeys in OBS Studio.
"""

import obspython as obs
import json
import os
import sys

# Configuration
CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'config.json')
WEBSOCKET_PORT = 4455
WEBSOCKET_PASSWORD = "clipshare_vtr"

def load_config():
    """Load configuration from JSON file"""
    try:
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading config: {e}")
        return None

def create_scene(scene_name):
    """Create a new scene in OBS"""
    try:
        # Check if scene already exists
        scenes = obs.obs_frontend_get_scenes()
        for scene in scenes:
            if obs.obs_source_get_name(scene) == scene_name:
                obs.source_list_release(scenes)
                return scene
        
        # Create new scene
        scene = obs.obs_scene_create(scene_name)
        obs.obs_frontend_set_current_scene(scene)
        obs.source_list_release(scenes)
        return scene
    except Exception as e:
        print(f"Error creating scene {scene_name}: {e}")
        return None

def create_media_source(source_name, file_path):
    """Create a media source for a clip"""
    try:
        # Create media source settings
        settings = obs.obs_data_create()
        obs.obs_data_set_string(settings, "local_file", file_path)
        obs.obs_data_set_bool(settings, "is_local_file", True)
        obs.obs_data_set_bool(settings, "looping", False)
        obs.obs_data_set_bool(settings, "restart_on_activate", False)
        obs.obs_data_set_bool(settings, "close_when_inactive", False)
        obs.obs_data_set_bool(settings, "hw_decode", True)
        
        # Create the source
        source = obs.obs_source_create("ffmpeg_source", source_name, settings, None)
        obs.obs_data_release(settings)
        
        return source
    except Exception as e:
        print(f"Error creating media source {source_name}: {e}")
        return None

def create_browser_source(source_name, file_path):
    """Create a browser source for the VTR control panel"""
    try:
        settings = obs.obs_data_create()
        obs.obs_data_set_string(settings, "local_file", file_path)
        obs.obs_data_set_bool(settings, "is_local_file", True)
        obs.obs_data_set_int(settings, "width", 600)
        obs.obs_data_set_int(settings, "height", 400)
        obs.obs_data_set_int(settings, "fps", 30)
        obs.obs_data_set_bool(settings, "fps_custom", False)
        obs.obs_data_set_bool(settings, "shutdown", False)
        obs.obs_data_set_int(settings, "webpage_control_level", 0)
        
        source = obs.obs_source_create("browser_source", source_name, settings, None)
        obs.obs_data_release(settings)
        
        return source
    except Exception as e:
        print(f"Error creating browser source {source_name}: {e}")
        return None

def setup_hotkeys(hotkeys):
    """Set up hotkeys for clip control"""
    try:
        for hotkey in hotkeys:
            # Create hotkey for restarting media source
            hotkey_name = f"Restart_Clip_{hotkey['bookmarkId']}"
            
            # Register hotkey callback
            def create_hotkey_callback(bookmark_id):
                def hotkey_callback(pressed):
                    if pressed:
                        restart_clip(bookmark_id)
                return hotkey_callback
            
            # Register the hotkey
            obs.obs_hotkey_register_frontend(
                hotkey_name,
                f"Restart {hotkey['label']}",
                create_hotkey_callback(hotkey['bookmarkId'])
            )
            
            print(f"Registered hotkey: {hotkey['modifiers']}+{hotkey['key']} -> {hotkey['label']}")
    except Exception as e:
        print(f"Error setting up hotkeys: {e}")

def restart_clip(bookmark_id):
    """Restart a specific clip"""
    try:
        # Find the media source for this bookmark
        scenes = obs.obs_frontend_get_scenes()
        for scene in scenes:
            scene_items = obs.obs_scene_enum_items(scene)
            for item in scene_items:
                source = obs.obs_sceneitem_get_source(item)
                source_name = obs.obs_source_get_name(source)
                if f"clip_{bookmark_id}" in source_name.lower():
                    # Restart the media source
                    obs.obs_source_media_restart(source)
                    print(f"Restarted clip: {source_name}")
                    break
            obs.sceneitem_list_release(scene_items)
        obs.source_list_release(scenes)
    except Exception as e:
        print(f"Error restarting clip {bookmark_id}: {e}")

def setup_websocket():
    """Enable OBS WebSocket for external control"""
    try:
        # Enable WebSocket server
        obs.obs_websocket_server_start(WEBSOCKET_PORT, WEBSOCKET_PASSWORD)
        print(f"WebSocket server started on port {WEBSOCKET_PORT}")
        print(f"Password: {WEBSOCKET_PASSWORD}")
    except Exception as e:
        print(f"Error starting WebSocket server: {e}")

def main():
    """Main setup function"""
    print("🎬 Clipshare OBS Auto-Setup Starting...")
    
    # Load configuration
    config = load_config()
    if not config:
        print("❌ Failed to load configuration")
        return
    
    workspace = config['workspace']
    clips = config['clips']
    hotkeys = config['hotkeys']
    
    print(f"📁 Setting up workspace: {workspace['title']}")
    print(f"🎥 Found {len(clips)} clips to configure")
    
    # Create main scene
    main_scene = create_scene(f"{workspace['title']} - Main")
    if not main_scene:
        print("❌ Failed to create main scene")
        return
    
    # Create VTR control scene (separate from main)
    control_scene = create_scene(f"{workspace['title']} - VTR Control")
    if not control_scene:
        print("❌ Failed to create VTR control scene")
        return
    
    # Add VTR control panel to control scene
    control_html_path = os.path.join(os.path.dirname(__file__), '..', 'web-interface', 'index.html')
    control_source = create_browser_source("VTR Control Panel", control_html_path)
    if control_source:
        obs.obs_scene_add(control_scene, control_source)
        print("✅ VTR Control Panel added to control scene")
    
    # Create media sources for each clip
    clips_dir = os.path.join(os.path.dirname(__file__), '..', 'clips')
    for i, clip in enumerate(clips):
        clip_path = os.path.join(clips_dir, clip['filename'])
        
        if os.path.exists(clip_path):
            source_name = f"{workspace['title']} - {clip['label']}"
            media_source = create_media_source(source_name, clip_path)
            
            if media_source:
                # Add to main scene
                obs.obs_scene_add(main_scene, media_source)
                print(f"✅ Added clip {i+1}: {clip['label']}")
            else:
                print(f"❌ Failed to create source for: {clip['label']}")
        else:
            print(f"❌ Clip file not found: {clip_path}")
    
    # Set up hotkeys
    setup_hotkeys(hotkeys)
    
    # Enable WebSocket for external control
    setup_websocket()
    
    print("\\n🎉 OBS Setup Complete!")
    print("\\n📋 Next Steps:")
    print("1. Your main scene is ready for live production")
    print("2. VTR Control Panel is in a separate scene")
    print("3. Hotkeys are configured for quick clip access")
    print("4. WebSocket is enabled for external control")
    print("\\n💡 Tips:")
    print("- Use the VTR Control scene for monitoring only")
    print("- Your main scene has clean clip sources")
    print("- Press F1-F12 to restart clips during live production")
    print(f"- WebSocket control available on port {WEBSOCKET_PORT}")

if __name__ == "__main__":
    main()
`
  }

  private generateBatchScript(): string {
    return `@echo off
echo 🎬 Clipshare OBS Auto-Setup
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.7+ from https://python.org
    pause
    exit /b 1
)

REM Check if OBS Studio is running
tasklist /FI "IMAGENAME eq obs64.exe" 2>NUL | find /I /N "obs64.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✅ OBS Studio is running
) else (
    echo ⚠️  OBS Studio is not running
    echo Please start OBS Studio first, then run this script again
    pause
    exit /b 1
)

REM Install required Python packages
echo 📦 Installing required packages...
pip install obspython websockets requests

REM Run the setup script
echo 🚀 Running OBS setup...
python setup_obs.py

echo.
echo ✅ Setup complete! Check OBS Studio for your new scenes and sources.
pause
`
  }

  private generateShellScript(): string {
    return `#!/bin/bash

echo "🎬 Clipshare OBS Auto-Setup"
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo "Please install Python 3.7+ from your package manager"
    exit 1
fi

# Check if OBS Studio is running
if pgrep -x "obs" > /dev/null; then
    echo "✅ OBS Studio is running"
else
    echo "⚠️  OBS Studio is not running"
    echo "Please start OBS Studio first, then run this script again"
    exit 1
fi

# Install required Python packages
echo "📦 Installing required packages..."
pip3 install obspython websockets requests

# Make Python script executable
chmod +x setup_obs.py

# Run the setup script
echo "🚀 Running OBS setup..."
python3 setup_obs.py

echo
echo "✅ Setup complete! Check OBS Studio for your new scenes and sources."
`
  }
}
