import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import { spawn } from "child_process"
import { randomUUID } from "crypto"

export async function GET(request: NextRequest) {
  try {
    // Create temp directory for ZIP
    const tempDir = path.join(process.cwd(), 'temp', randomUUID())
    await fs.mkdir(tempDir, { recursive: true })

    try {
      // Create a test file
      const testFile = path.join(tempDir, 'test.txt')
      await fs.writeFile(testFile, 'This is a test file for ZIP creation')

      // Create ZIP file
      const zipPath = path.join(tempDir, 'test.zip')
      
      // Use Promise to handle zip command
      await new Promise<void>((resolve, reject) => {
        const zip = spawn('zip', ['-r', zipPath, '.'], { cwd: tempDir })
        
        let stderr = ''
        zip.stderr?.on('data', (data) => {
          stderr += data.toString()
        })
        
        zip.on('close', (code) => {
          if (code === 0) {
            resolve()
          } else {
            console.error('ZIP creation failed:', stderr)
            reject(new Error(`ZIP creation failed with code ${code}: ${stderr}`))
          }
        })
        
        zip.on('error', (err) => {
          console.error('ZIP spawn error:', err)
          reject(err)
        })
      })

      // Read ZIP file
      const zipBuffer = await fs.readFile(zipPath)
      
      // Return ZIP file
      return new NextResponse(zipBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="test.zip"',
          'Content-Length': zipBuffer.length.toString(),
        },
      })
    } finally {
      // Clean up temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true })
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp directory:', cleanupError)
      }
    }
  } catch (error) {
    console.error("Error creating test ZIP:", error)
    return NextResponse.json(
      { error: "Failed to create test ZIP", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
