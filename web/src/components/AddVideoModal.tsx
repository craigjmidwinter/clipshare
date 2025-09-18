"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { 
  XMarkIcon,
  CloudArrowUpIcon,
  LinkIcon,
  PlayIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline"
import VideoAccessControlModal from "./VideoAccessControlModal"

interface AddVideoModalProps {
  isOpen: boolean
  onClose: () => void
  onAddVideo: (formData: FormData) => Promise<void>
  workspaceId: string
}

export default function AddVideoModal({
  isOpen,
  onClose,
  onAddVideo,
  workspaceId
}: AddVideoModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'youtube' | 'plex'>('upload')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAccessControl, setShowAccessControl] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const metadataTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (metadataTimeoutRef.current) {
        clearTimeout(metadataTimeoutRef.current)
      }
    }
  }, [])

  const validateYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/
    return youtubeRegex.test(url)
  }

  const fetchYouTubeMetadata = async (url: string) => {
    if (!validateYouTubeUrl(url)) return

    try {
      setFetchingMetadata(true)
      setError('')

      const response = await fetch(`/api/youtube/metadata?url=${encodeURIComponent(url)}`)
      const data = await response.json()

      if (data.success && data.metadata) {
        const { title: videoTitle, description: videoDescription } = data.metadata
        
        // Auto-populate title if it's empty or if user hasn't manually entered one
        setTitle(currentTitle => {
          // Only auto-populate if the current title is empty
          return currentTitle.trim() ? currentTitle : videoTitle
        })
        
        // Auto-populate description if it's empty
        setDescription(currentDescription => {
          return currentDescription.trim() ? currentDescription : videoDescription
        })
      } else {
        throw new Error(data.error || 'Failed to fetch video metadata')
      }
    } catch (err) {
      console.error('Error fetching YouTube metadata:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch video metadata')
    } finally {
      setFetchingMetadata(false)
    }
  }

  const handleYouTubeUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setYoutubeUrl(url)
    
    // Clear existing timeout
    if (metadataTimeoutRef.current) {
      clearTimeout(metadataTimeoutRef.current)
    }
    
    // Fetch metadata when URL is valid and complete
    if (url.trim() && validateYouTubeUrl(url)) {
      // Debounce the API call
      metadataTimeoutRef.current = setTimeout(() => {
        fetchYouTubeMetadata(url)
      }, 1000)
    }
  }, [])

  if (!isOpen) return null

  const handleClose = () => {
    setTitle('')
    setDescription('')
    setYoutubeUrl('')
    setError('')
    setActiveTab('upload')
    setPendingFormData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  const handleSubmit = async (isPublicToWorkspace: boolean, accessControlWarned: boolean) => {
    if (!pendingFormData) return

    try {
      setLoading(true)
      setError('')

      // Add access control fields to form data
      pendingFormData.set('isPublicToWorkspace', isPublicToWorkspace.toString())
      pendingFormData.set('accessControlWarned', accessControlWarned.toString())

      await onAddVideo(pendingFormData)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add video')
    } finally {
      setLoading(false)
      setPendingFormData(null)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Title is required for upload and plex, but optional for YouTube (will be auto-populated)
    if (activeTab !== 'youtube' && !title.trim()) {
      setError('Title is required')
      return
    }

    // Validate based on active tab
    if (activeTab === 'youtube' && !youtubeUrl.trim()) {
      setError('YouTube URL is required')
      return
    }

    if (activeTab === 'upload') {
      const file = fileInputRef.current?.files?.[0]
      if (!file) {
        setError('Please select a video file')
        return
      }

      // Validate file type
      if (!file.type.startsWith('video/')) {
        setError('Please select a valid video file')
        return
      }

      // Validate file size (max 2GB)
      const maxSize = 2 * 1024 * 1024 * 1024 // 2GB
      if (file.size > maxSize) {
        setError('File size must be less than 2GB')
        return
      }
    }

    // Create form data
    const formData = new FormData()
    formData.set('title', title || '') // Allow empty title for YouTube videos
    formData.set('description', description)
    formData.set('sourceType', activeTab)

    if (activeTab === 'upload') {
      const file = fileInputRef.current!.files![0]
      formData.set('file', file)
    } else if (activeTab === 'youtube') {
      formData.set('sourceUrl', youtubeUrl)
    }

    // Show access control modal
    setPendingFormData(formData)
    setShowAccessControl(true)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Add Video to Workspace
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'upload'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <CloudArrowUpIcon className="h-5 w-5 inline mr-2" />
                  Upload File
                </button>
                <button
                  onClick={() => setActiveTab('youtube')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'youtube'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <PlayIcon className="h-5 w-5 inline mr-2" />
                  YouTube URL
                </button>
                <button
                  onClick={() => setActiveTab('plex')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'plex'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <LinkIcon className="h-5 w-5 inline mr-2" />
                  Plex Content
                </button>
              </nav>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700">
                  <p className="font-medium mb-1">Producer Access Warning</p>
                  <p>
                    Producers have full access to all videos in this workspace, including the ability 
                    to play them through VTR systems and download clips during production/post.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Video Title {activeTab !== 'youtube' ? '*' : ''}
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder={activeTab === 'youtube' ? 'Title will be auto-filled from YouTube video' : 'Enter video title'}
                  required={activeTab !== 'youtube'}
                />
                {activeTab === 'youtube' && fetchingMetadata && (
                  <p className="mt-1 text-sm text-blue-600">
                    Fetching video information...
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter video description (optional)"
                />
              </div>

              {/* Tab Content */}
              {activeTab === 'upload' && (
                <div>
                  <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                    Video File *
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                    <div className="space-y-1 text-center">
                      <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-orange-500"
                        >
                          <span>Upload a file</span>
                          <input
                            ref={fileInputRef}
                            id="file"
                            name="file"
                            type="file"
                            accept="video/*"
                            className="sr-only"
                            required
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">MP4, MOV, AVI up to 2GB</p>
                      {fileInputRef.current?.files?.[0] && (
                        <p className="text-sm text-gray-900 mt-2">
                          Selected: {fileInputRef.current.files[0].name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'youtube' && (
                <div>
                  <label htmlFor="youtubeUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    YouTube URL *
                  </label>
                  <input
                    type="url"
                    id="youtubeUrl"
                    value={youtubeUrl}
                    onChange={handleYouTubeUrlChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                  />
                  {youtubeUrl && !validateYouTubeUrl(youtubeUrl) && (
                    <p className="mt-1 text-sm text-red-600">
                      Please enter a valid YouTube URL
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'plex' && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Plex integration coming soon</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || (activeTab === 'youtube' && youtubeUrl && !validateYouTubeUrl(youtubeUrl))}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Access Control Modal */}
      <VideoAccessControlModal
        isOpen={showAccessControl}
        onClose={() => setShowAccessControl(false)}
        onConfirm={handleSubmit}
        videoTitle={title || 'this video'}
      />
    </>
  )
}
