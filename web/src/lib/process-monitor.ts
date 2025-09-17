import { spawn, ChildProcess } from 'child_process'

export interface ProcessMonitorOptions {
  timeout?: number
  maxRetries?: number
  retryDelay?: number
  logPrefix?: string
}

export class ProcessMonitor {
  private static activeProcesses = new Map<string, ChildProcess>()
  private static processStats = new Map<string, { startTime: number; retries: number }>()

  static async spawnWithMonitoring(
    command: string,
    args: string[],
    options: ProcessMonitorOptions = {}
  ): Promise<void> {
    const {
      timeout = 30 * 60 * 1000, // 30 minutes default
      maxRetries = 3,
      retryDelay = 5000, // 5 seconds
      logPrefix = 'Process'
    } = options

    const processId = `${command}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    return new Promise((resolve, reject) => {
      let retryCount = 0
      let isCompleted = false

      const attemptSpawn = () => {
        if (isCompleted) return

        console.log(`${logPrefix}: Starting ${command} ${args.join(' ')} (attempt ${retryCount + 1})`)
        
        const process = spawn(command, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          detached: false,
          shell: false
        })

        this.activeProcesses.set(processId, process)
        this.processStats.set(processId, { startTime: Date.now(), retries: retryCount })

        let stderr = ''
        let stdout = ''

        process.stderr?.on('data', (data) => {
          stderr += data.toString()
          console.log(`${logPrefix} stderr: ${data.toString().trim()}`)
        })

        process.stdout?.on('data', (data) => {
          stdout += data.toString()
          console.log(`${logPrefix} stdout: ${data.toString().trim()}`)
        })

        // Set timeout
        const timeoutHandle = setTimeout(() => {
          if (!isCompleted) {
            isCompleted = true
            console.error(`${logPrefix}: Process timed out after ${timeout}ms`)
            process.kill('SIGTERM')
            
            setTimeout(() => {
              if (!process.killed) {
                process.kill('SIGKILL')
              }
            }, 5000)
            
            this.cleanupProcess(processId)
            reject(new Error(`${logPrefix}: Process timed out after ${timeout}ms`))
          }
        }, timeout)

        process.on('close', (code, signal) => {
          if (isCompleted) return
          
          clearTimeout(timeoutHandle)
          this.cleanupProcess(processId)
          
          console.log(`${logPrefix}: Process closed with code: ${code}, signal: ${signal}`)
          
          if (code === 0) {
            isCompleted = true
            resolve()
          } else {
            const errorMsg = `Process exited with code ${code}${signal ? ` and signal ${signal}` : ''}`
            console.error(`${logPrefix}: ${errorMsg}. Stderr: ${stderr}`)
            
            // Retry logic
            if (retryCount < maxRetries) {
              retryCount++
              console.log(`${logPrefix}: Retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`)
              setTimeout(attemptSpawn, retryDelay)
            } else {
              isCompleted = true
              reject(new Error(`${logPrefix}: ${errorMsg}: ${stderr}`))
            }
          }
        })

        process.on('error', (error) => {
          if (isCompleted) return
          
          clearTimeout(timeoutHandle)
          this.cleanupProcess(processId)
          
          console.error(`${logPrefix}: Spawn error:`, error)
          
          // Retry logic for spawn errors
          if (retryCount < maxRetries) {
            retryCount++
            console.log(`${logPrefix}: Retrying spawn in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`)
            setTimeout(attemptSpawn, retryDelay)
          } else {
            isCompleted = true
            reject(new Error(`${logPrefix}: Failed to start process after ${maxRetries + 1} attempts: ${error.message}`))
          }
        })

        process.on('exit', (code, signal) => {
          if (!isCompleted) {
            isCompleted = true
            clearTimeout(timeoutHandle)
            this.cleanupProcess(processId)
            console.error(`${logPrefix}: Process exited unexpectedly with code: ${code}, signal: ${signal}`)
            reject(new Error(`${logPrefix}: Process terminated unexpectedly: code ${code}, signal ${signal}`))
          }
        })
      }

      attemptSpawn()
    })
  }

  private static cleanupProcess(processId: string) {
    this.activeProcesses.delete(processId)
    this.processStats.delete(processId)
  }

  static getActiveProcesses(): Array<{ id: string; process: ChildProcess; stats: { startTime: number; retries: number } }> {
    const result: Array<{ id: string; process: ChildProcess; stats: { startTime: number; retries: number } }> = []
    
    for (const [id, process] of this.activeProcesses) {
      const stats = this.processStats.get(id)
      if (stats) {
        result.push({ id, process, stats })
      }
    }
    
    return result
  }

  static killAllProcesses(): void {
    console.log(`Killing ${this.activeProcesses.size} active processes`)
    
    for (const [id, process] of this.activeProcesses) {
      try {
        console.log(`Killing process ${id}`)
        process.kill('SIGTERM')
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL')
          }
        }, 5000)
      } catch (error) {
        console.error(`Error killing process ${id}:`, error)
      }
    }
    
    this.activeProcesses.clear()
    this.processStats.clear()
  }

  static getProcessStats(): { activeCount: number; totalRuntime: number } {
    const activeCount = this.activeProcesses.size
    let totalRuntime = 0
    
    for (const stats of this.processStats.values()) {
      totalRuntime += Date.now() - stats.startTime
    }
    
    return { activeCount, totalRuntime }
  }
}

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, cleaning up processes...')
  ProcessMonitor.killAllProcesses()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('Received SIGINT, cleaning up processes...')
  ProcessMonitor.killAllProcesses()
  process.exit(0)
})

// Health check endpoint data
export function getProcessHealthStatus() {
  const stats = ProcessMonitor.getProcessStats()
  const activeProcesses = ProcessMonitor.getActiveProcesses()
  
  return {
    healthy: stats.activeCount < 10, // Consider unhealthy if more than 10 processes
    activeProcessCount: stats.activeCount,
    totalRuntime: stats.totalRuntime,
    processes: activeProcesses.map(({ id, stats: processStats }) => ({
      id,
      runtime: Date.now() - processStats.startTime,
      retries: processStats.retries
    }))
  }
}
