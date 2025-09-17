import React, { useState, useEffect } from 'react'
import { XMarkIcon, ArrowDownTrayIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface OBSExportModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  workspaceTitle: string
  bookmarkCount: number
}

interface ExportConfig {
  exportFormat: string
  quality: string
  hotkeyPattern: string
  includeCollaborators: boolean
  webInterfaceTheme: string
  namingConvention: string
}

interface ExportJob {
  jobId: string
  status: string
  progressPercent: number
  errorText?: string
}

export default function OBSExportModal({ 
  isOpen, 
  onClose, 
  workspaceId, 
  workspaceTitle, 
  bookmarkCount 
}: OBSExportModalProps) {
  const [config, setConfig] = useState<ExportConfig>({
    exportFormat: 'mp4',
    quality: '1080p',
    hotkeyPattern: 'sequential',
    includeCollaborators: true,
    webInterfaceTheme: 'dark',
    namingConvention: 'workspace-content-label'
  })

  const [exportJob, setExportJob] = useState<ExportJob | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (exportJob?.jobId) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/workspaces/${workspaceId}/export/obs-package?jobId=${exportJob.jobId}`
          )
          const data = await response.json()
          
          if (data.status === 'completed') {
            setExportJob({ ...data, status: 'completed' })
            setIsExporting(false)
            clearInterval(interval)
          } else if (data.status === 'failed') {
            setExportJob({ ...data, status: 'failed' })
            setIsExporting(false)
            setError(data.errorText || 'Export failed')
            clearInterval(interval)
          } else {
            setExportJob(data)
          }
        } catch (err) {
          console.error('Error checking export status:', err)
        }
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [exportJob?.jobId, workspaceId])

  const handleExport = async () => {
    try {
      setIsExporting(true)
      setError(null)

      const response = await fetch(`/api/workspaces/${workspaceId}/export/obs-package`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start export')
      }

      setExportJob({
        jobId: data.jobId,
        status: 'pending',
        progressPercent: 0
      })
    } catch (err) {
      console.error('Export error:', err)
      setError(err instanceof Error ? err.message : 'Failed to start export')
      setIsExporting(false)
    }
  }

  const handleDownload = async () => {
    if (!exportJob?.jobId) return

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/export/obs-package/${exportJob.jobId}/download`
      )

      if (!response.ok) {
        throw new Error('Failed to download package')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${workspaceTitle.replace(/[^a-zA-Z0-9-_]/g, '_')}_obs-package.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      setError(err instanceof Error ? err.message : 'Failed to download package')
    }
  }

  const getHotkeyPreview = () => {
    const patterns = {
      sequential: 'F1-F12, Ctrl+F1-F12, Alt+F1-F12...',
      'creator-based': 'F1-F4 (Producer), Ctrl+F1-F4 (Collaborators)...',
      'time-based': 'F1-F4 (Early), Ctrl+F1-F4 (Late)...'
    }
    return patterns[config.hotkeyPattern as keyof typeof patterns] || patterns.sequential
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Export for OBS Studio
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Export Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {exportJob?.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Export Complete</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Your OBS package is ready for download.
                  </p>
                </div>
              </div>
            </div>
          )}

          {exportJob && exportJob.status !== 'completed' && exportJob.status !== 'failed' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <ClockIcon className="h-5 w-5 text-blue-400" />
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-blue-800">Exporting Package</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Generating clips, thumbnails, and OBS configuration files...
                  </p>
                  <div className="mt-2">
                    <div className="bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${exportJob.progressPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 mt-1">{exportJob.progressPercent}% complete</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Package Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Export Format
                  </label>
                  <select
                    value={config.exportFormat}
                    onChange={(e) => setConfig({ ...config, exportFormat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                  >
                    <option value="mp4">MP4 H.264</option>
                    <option value="mov">MOV ProRes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quality
                  </label>
                  <select
                    value={config.quality}
                    onChange={(e) => setConfig({ ...config, quality: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                  >
                    <option value="1080p">1080p (Full HD)</option>
                    <option value="720p">720p (HD)</option>
                    <option value="480p">480p (SD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hotkey Pattern
                  </label>
                  <select
                    value={config.hotkeyPattern}
                    onChange={(e) => setConfig({ ...config, hotkeyPattern: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                  >
                    <option value="sequential">Sequential (F1-F12, Ctrl+F1-F12...)</option>
                    <option value="creator-based">Creator-based Grouping</option>
                    <option value="time-based">Time-based Grouping</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Web Interface Theme
                  </label>
                  <select
                    value={config.webInterfaceTheme}
                    onChange={(e) => setConfig({ ...config, webInterfaceTheme: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                  >
                    <option value="dark">Dark Theme</option>
                    <option value="light">Light Theme</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File Naming Convention
                </label>
                <select
                  value={config.namingConvention}
                  onChange={(e) => setConfig({ ...config, namingConvention: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="workspace-content-label">Workspace-Content-Label</option>
                  <option value="content-label">Content-Label</option>
                  <option value="label-only">Label Only</option>
                </select>
              </div>

              <div className="mt-4 flex items-center">
                <input
                  type="checkbox"
                  id="includeCollaborators"
                  checked={config.includeCollaborators}
                  onChange={(e) => setConfig({ ...config, includeCollaborators: e.target.checked })}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="includeCollaborators" className="ml-2 text-sm text-gray-700">
                  Include all collaborators' clips
                </label>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Package Preview</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Workspace:</strong> {workspaceTitle}</p>
                <p><strong>Clips:</strong> {bookmarkCount} bookmarks</p>
                <p><strong>Hotkeys:</strong> {getHotkeyPreview()}</p>
                <p><strong>Format:</strong> {config.exportFormat.toUpperCase()} {config.quality}</p>
                <p><strong>Theme:</strong> {config.webInterfaceTheme}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Cancel
          </button>
          
          {exportJob?.status === 'completed' ? (
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Download Package
            </button>
          ) : (
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isExporting ? (
                <>
                  <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                'Export for OBS'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
