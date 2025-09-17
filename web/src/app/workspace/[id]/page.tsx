"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { 
  ArrowLeftIcon, 
  UsersIcon, 
  BookmarkIcon, 
  PlayIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  LockClosedIcon,
  LockOpenIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from "@heroicons/react/24/outline"
import VideoPlayer from "@/components/VideoPlayer"
import NLETimeline from "@/components/NLETimeline"
import OBSExportModal from "@/components/OBSExportModal"

interface Workspace {
  id: string
  title: string
  description: string | null
  contentType: string
  contentTitle: string
  contentPoster: string | null
  contentDuration: number
  plexKey: string
  plexServerId: string
  processingStatus: string
  processingProgress: number
  createdAt: string
  updatedAt: string
  producer: {
    id: string
    name: string | null
    plexUsername: string | null
    plexAvatarUrl: string | null
  }
  memberships: Array<{
    id: string
    role: string
    user: {
      id: string
      name: string | null
      plexUsername: string | null
      plexAvatarUrl: string | null
    }
  }>
  bookmarks: Array<{
    id: string
    label: string | null
    publicNotes: string | null
    privateNotes: string | null
    startMs: number
    endMs: number
    lockedById: string | null
    lockedAt: string | null
    createdAt: string
    createdBy: {
      id: string
      name: string | null
      plexUsername: string | null
    }
    lockedBy: {
      id: string
      name: string | null
      plexUsername: string | null
    } | null
  }>
  processingJobs?: Array<{
    id: string
    type: string
    status: string
    progressPercent: number
    errorText: string | null
    createdAt: string
    updatedAt: string
  }>
}

export default function WorkspaceDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.id as string
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAddCollaborator, setShowAddCollaborator] = useState(false)
  const [newCollaborator, setNewCollaborator] = useState("")
  const [addingCollaborator, setAddingCollaborator] = useState(false)
  const [bookmarkSearch, setBookmarkSearch] = useState("")
  const [bookmarkFilter, setBookmarkFilter] = useState<"all" | "mine" | "others" | "locked" | "unlocked">("all")
  const [creatingBookmark, setCreatingBookmark] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState("")
  const [downloadingBookmarks, setDownloadingBookmarks] = useState<string[]>([])
  const [clipProgress, setClipProgress] = useState<Record<string, { status: string; progress: number }>>({})
  const [showReprocessDialog, setShowReprocessDialog] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const [showOBSExportModal, setShowOBSExportModal] = useState(false)
  const [showEditWorkspaceModal, setShowEditWorkspaceModal] = useState(false)
  const [showDeleteWorkspaceModal, setShowDeleteWorkspaceModal] = useState(false)
  const [editingWorkspace, setEditingWorkspace] = useState(false)
  const [deletingWorkspace, setDeletingWorkspace] = useState(false)
  const [workspaceEditData, setWorkspaceEditData] = useState({
    title: "",
    description: ""
  })
  
  // Video player state for timeline integration
  const [currentTime, setCurrentTime] = useState(0)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated" && !session?.user?.onboardingCompleted) {
      router.push("/welcome")
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === "authenticated" && workspaceId) {
      fetchWorkspace()
    }
  }, [status, workspaceId])

  const fetchWorkspace = async () => {
    try {
      setLoading(true)
      setError("")
      
      const response = await fetch(`/api/workspaces?id=${workspaceId}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch workspace")
      }
      
      setWorkspace(data.workspace)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch workspace")
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`
    }
    return `${minutes}m`
  }

  const formatTimecode = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const isProducer = workspace?.producer.id === session?.user?.id

  const handleAddCollaborator = async () => {
    if (!newCollaborator.trim() || !workspace) return

    try {
      setAddingCollaborator(true)
      setError("")

      const response = await fetch("/api/workspaces", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: workspace.id,
          collaborators: [...workspace.memberships.filter(m => m.role === "collaborator").map(m => m.user.plexUsername), newCollaborator.trim()]
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to add collaborator")
      }

      // Refresh workspace data
      await fetchWorkspace()
      setNewCollaborator("")
      setShowAddCollaborator(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add collaborator")
    } finally {
      setAddingCollaborator(false)
    }
  }

  const handleRemoveCollaborator = async (userId: string) => {
    if (!workspace) return

    try {
      setError("")

      const response = await fetch("/api/workspaces", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: workspace.id,
          collaborators: workspace.memberships
            .filter(m => m.role === "collaborator" && m.user.id !== userId)
            .map(m => m.user.plexUsername)
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to remove collaborator")
      }

      // Refresh workspace data
      await fetchWorkspace()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove collaborator")
    }
  }

  const handleCreateBookmark = async (bookmarkData: {
    label?: string
    publicNotes?: string
    privateNotes?: string
    startMs: number
    endMs: number
  }) => {
    if (!workspace) return

    try {
      setCreatingBookmark(true)
      setError("")

      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          ...bookmarkData
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to create bookmark")
      }

      // Update workspace state with new bookmark
      if (workspace) {
        setWorkspace({
          ...workspace,
          bookmarks: [...workspace.bookmarks, data.bookmark]
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bookmark")
    } finally {
      setCreatingBookmark(false)
    }
  }

  const handleEditBookmark = async (bookmarkId: string, updates: {
    label?: string
    publicNotes?: string
    privateNotes?: string
    startMs?: number
    endMs?: number
    isLocked?: boolean
  }) => {
    try {
      setError("")
      
      console.log('handleEditBookmark called:', { bookmarkId, updates })

      const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates)
      })

      console.log('API response status:', response.status)
      const data = await response.json()
      console.log('API response data:', data)

      if (!data.success) {
        throw new Error(data.error || "Failed to update bookmark")
      }

      // Update workspace state with updated bookmark
      if (workspace) {
        setWorkspace({
          ...workspace,
          bookmarks: workspace.bookmarks.map(b => 
            b.id === bookmarkId ? { ...b, ...data.bookmark } : b
          )
        })
      }
      
      console.log('Bookmark updated successfully')
    } catch (err) {
      console.error('Error updating bookmark:', err)
      setError(err instanceof Error ? err.message : "Failed to update bookmark")
    }
  }

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      setError("")

      const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: "DELETE"
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to delete bookmark")
      }

      // Update workspace state by removing deleted bookmark
      if (workspace) {
        setWorkspace({
          ...workspace,
          bookmarks: workspace.bookmarks.filter(b => b.id !== bookmarkId)
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete bookmark")
    }
  }

  // Wrapper function to convert timeline's onBookmarkUpdate parameters to handleEditBookmark format
  const handleBookmarkUpdate = async (bookmarkId: string, startMs: number, endMs: number) => {
    await handleEditBookmark(bookmarkId, { startMs, endMs })
  }

  const handleLockBookmark = async (bookmarkId: string, isLocked: boolean) => {
    try {
      setError("")

      const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isLocked
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to update bookmark")
      }

      // Update workspace state with updated bookmark
      if (workspace) {
        setWorkspace({
          ...workspace,
          bookmarks: workspace.bookmarks.map(b => 
            b.id === bookmarkId ? { ...b, ...data.bookmark } : b
          )
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update bookmark")
    }
  }

  const handleInlineEdit = (bookmarkId: string, currentLabel: string) => {
    setEditingBookmark(bookmarkId)
    setEditingLabel(currentLabel || "")
  }

  const handleSaveInlineEdit = async (bookmarkId: string) => {
    try {
      setError("")

      const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: editingLabel.trim() || null
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to update bookmark")
      }

      // Update workspace state with updated bookmark
      if (workspace) {
        setWorkspace({
          ...workspace,
          bookmarks: workspace.bookmarks.map(b => 
            b.id === bookmarkId ? { ...b, ...data.bookmark } : b
          )
        })
      }
      setEditingBookmark(null)
      setEditingLabel("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update bookmark")
    }
  }

  const handleCancelInlineEdit = () => {
    setEditingBookmark(null)
    setEditingLabel("")
  }

  const handleDownloadBookmark = async (bookmarkId: string) => {
    if (!workspace) return

    try {
      setDownloadingBookmarks(prev => [...prev, bookmarkId])
      setError("")

      console.log("Starting individual download for bookmark:", bookmarkId)

      // Direct download - no job creation needed since clips are pre-generated
      const downloadUrl = `/api/workspaces/${workspace.id}/clips/${bookmarkId}/download`
      
      // Create temporary link and trigger download
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = '' // Let the server set the filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log("Download link clicked for:", downloadUrl)

    } catch (err) {
      console.error("Individual download error:", err)
      setError(err instanceof Error ? err.message : "Failed to download clip")
    } finally {
      setDownloadingBookmarks(prev => prev.filter(id => id !== bookmarkId))
    }
  }

  const handleBulkDownload = async () => {
    if (!workspace || workspace.bookmarks.length === 0) return

    try {
      setError("")

      console.log("Starting bulk download for workspace:", workspace.id)

      // Create ZIP download via POST request
      const response = await fetch(`/api/workspaces/${workspace.id}/clips/bulk-download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log("Bulk download response status:", response.status)
      console.log("Bulk download response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Bulk download error:", errorData)
        throw new Error(errorData.error || 'Failed to create bulk download')
      }

      // Check if response is actually a ZIP file
      const contentType = response.headers.get('content-type')
      console.log("Response content type:", contentType)

      if (contentType !== 'application/zip') {
        const text = await response.text()
        console.error("Expected ZIP but got:", text)
        throw new Error('Server returned non-ZIP response')
      }

      // Get the ZIP file blob
      const blob = await response.blob()
      console.log("ZIP blob size:", blob.size)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${workspace.title.replace(/[^a-zA-Z0-9-_]/g, '_')}_clips.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
    } catch (err) {
      console.error("Bulk download error:", err)
      setError(err instanceof Error ? err.message : "Failed to create bulk download")
    }
  }

  const handleReprocessWorkspace = async (options?: { download?: boolean; convert?: boolean; frames?: boolean }) => {
    if (!workspace) return

    try {
      setReprocessing(true)
      setError("")

      const response = await fetch(`/api/workspaces/${workspace.id}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          download: options?.download ?? true,
          convert: options?.convert ?? true,
          frames: options?.frames ?? true,
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to start reprocessing")
      }

      // Refresh workspace data to show updated processing status
      await fetchWorkspace()
      setShowReprocessDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start reprocessing")
    } finally {
      setReprocessing(false)
    }
  }

  // Video player handlers for timeline integration
  const handleVideoSeek = (time: number) => {
    setCurrentTime(time)
    if (videoElement) {
      videoElement.currentTime = time
    }
  }

  const handleVideoPlayPause = () => {
    if (videoElement) {
      if (videoElement.paused) {
        videoElement.play()
        setIsPlaying(true)
      } else {
        videoElement.pause()
        setIsPlaying(false)
      }
    }
  }

  const handleVideoStep = (direction: 'forward' | 'backward', frames: number) => {
    if (videoElement) {
      const frameTime = frames / 30 // Assuming 30fps
      const newTime = direction === 'forward' 
        ? videoElement.currentTime + frameTime
        : videoElement.currentTime - frameTime
      videoElement.currentTime = Math.max(0, Math.min(videoElement.duration, newTime))
      setCurrentTime(videoElement.currentTime)
    }
  }

  // Workspace management functions
  const handleEditWorkspace = async () => {
    if (!workspace) return

    try {
      setEditingWorkspace(true)
      setError("")

      const response = await fetch("/api/workspaces", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: workspace.id,
          title: workspaceEditData.title,
          description: workspaceEditData.description
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to update workspace")
      }

      // Update workspace state
      setWorkspace({
        ...workspace,
        title: workspaceEditData.title,
        description: workspaceEditData.description
      })

      setShowEditWorkspaceModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update workspace")
    } finally {
      setEditingWorkspace(false)
    }
  }

  const handleDeleteWorkspace = async () => {
    if (!workspace) return

    try {
      setDeletingWorkspace(true)
      setError("")

      const response = await fetch(`/api/workspaces?id=${workspace.id}`, {
        method: "DELETE"
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to delete workspace")
      }

      // Redirect to workspaces page
      router.push("/workspaces")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete workspace")
    } finally {
      setDeletingWorkspace(false)
    }
  }

  const openEditWorkspaceModal = () => {
    if (workspace) {
      setWorkspaceEditData({
        title: workspace.title,
        description: workspace.description || ""
      })
      setShowEditWorkspaceModal(true)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/workspaces")}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
          >
            Back to Workspaces
          </button>
        </div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Workspace Not Found</h2>
          <p className="text-gray-600 mb-6">The workspace you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={() => router.push("/workspaces")}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
          >
            Back to Workspaces
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/workspaces")}
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-1" />
                Back
              </button>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900">{workspace.title}</h1>
                  {/* Only show edit/delete buttons if user is the producer */}
                  {workspace.producer.id === session?.user?.id && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={openEditWorkspaceModal}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Edit workspace"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteWorkspaceModal(true)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete workspace"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600">{workspace.contentTitle}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Processing Status */}
              <div className="flex items-center space-x-2">
                {workspace.processingStatus === "processing" && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <ClockIcon className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Processing... {workspace.processingProgress}%</span>
                  </div>
                )}
                {workspace.processingStatus === "completed" && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span className="text-sm">Ready</span>
                  </div>
                )}
                {workspace.processingStatus === "failed" && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <span className="text-sm">Processing Failed</span>
                  </div>
                )}
                {workspace.processingStatus === "pending" && (
                  <div className="flex items-center space-x-2 text-yellow-600">
                    <ClockIcon className="h-4 w-4" />
                    <span className="text-sm">Pending</span>
                  </div>
                )}
              </div>

              {isProducer && (
                <>
                  {workspace.processingStatus !== "processing" && (
                    <div className="relative">
                      <details className="group">
                        <summary className="list-none cursor-pointer text-sm text-blue-500 hover:text-blue-700 flex items-center">
                          <ArrowPathIcon className="h-4 w-4 mr-1" />
                          Re-process
                        </summary>
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded shadow z-10">
                          <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100" onClick={() => handleReprocessWorkspace({ download: false, convert: false, frames: true })}>Regenerate frames</button>
                          <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100" onClick={() => handleReprocessWorkspace({ download: false, convert: true, frames: false })}>Reconvert MP4</button>
                          <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100" onClick={() => handleReprocessWorkspace({ download: true, convert: false, frames: false })}>Re-download source</button>
                          <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setShowReprocessDialog(true)}>Full re-process…</button>
                        </div>
                      </details>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Processing Status Notice */}
      {workspace.processingStatus !== "completed" && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex">
              <div className="flex-shrink-0">
                {workspace.processingStatus === "processing" ? (
                  <ClockIcon className="h-5 w-5 text-yellow-400 animate-spin" />
                ) : workspace.processingStatus === "failed" ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                ) : (
                  <ClockIcon className="h-5 w-5 text-yellow-400" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {workspace.processingStatus === "processing" && (
                    <>Workspace is being processed ({workspace.processingProgress}%). Some features may be limited until processing completes.</>
                  )}
                  {workspace.processingStatus === "failed" && (
                    <>Workspace processing failed. Please try re-processing or contact support.</>
                  )}
                  {workspace.processingStatus === "pending" && (
                    <>Workspace processing is pending. Some features may be limited until processing completes.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Video Player */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Video Player */}
                <div className="aspect-w-16 aspect-h-9">
                  <VideoPlayer
                    workspaceId={workspace.id}
                    plexKey={workspace.plexKey}
                    plexServerId={workspace.plexServerId}
                    contentDuration={workspace.contentDuration}
                    onBookmarkCreate={handleCreateBookmark}
                    onBookmarkUpdate={handleEditBookmark}
                    onBookmarkDelete={handleDeleteBookmark}
                    onVideoElementReady={setVideoElement}
                    onTimeUpdate={setCurrentTime}
                    onPlayStateChange={setIsPlaying}
                    bookmarks={workspace.bookmarks}
                    currentUserId={session?.user?.id || ""}
                    useNLETimeline={false}
                    showTimelineBelow={false}
                  />
                </div>
                
                {/* Video Info */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">{workspace.contentTitle}</h2>
                    <span className="text-sm text-gray-500">{formatDuration(workspace.contentDuration)}</span>
                  </div>
                  
                  {workspace.description && (
                    <p className="text-gray-600 mb-4">{workspace.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Created {new Date(workspace.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Last updated {new Date(workspace.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* NLE Timeline - Outside Video Player */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-700 overflow-hidden">
                <NLETimeline
                  duration={workspace.contentDuration / 1000} // Convert ms to seconds
                  currentTime={currentTime}
                  onSeek={handleVideoSeek}
                  bookmarks={workspace.bookmarks}
                  onBookmarkCreate={handleCreateBookmark}
                  onBookmarkUpdate={handleBookmarkUpdate}
                  onBookmarkDelete={handleDeleteBookmark}
                  videoElement={videoElement}
                  frameRate={30}
                  isPlaying={isPlaying}
                  onPlayPause={handleVideoPlayPause}
                  onStep={handleVideoStep}
                  workspaceId={workspace.id}
                />
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Collaborators */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <UsersIcon className="h-5 w-5 mr-2" />
                  Collaborators
                </h3>
                
                <div className="space-y-3">
                  {workspace.memberships.map((membership) => (
                    <div key={membership.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <img
                          src={membership.user.plexAvatarUrl || "/default-avatar.png"}
                          alt={membership.user.plexUsername || membership.user.name || "User"}
                          className="h-8 w-8 rounded-full mr-3"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {membership.user.plexUsername || membership.user.name || "Unknown User"}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">{membership.role}</p>
                        </div>
                      </div>
                      {isProducer && membership.role === "collaborator" && (
                        <button
                          onClick={() => handleRemoveCollaborator(membership.user.id)}
                          className="text-gray-400 hover:text-red-500 p-1"
                          title="Remove collaborator"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                {isProducer && (
                  <div className="mt-4">
                    {!showAddCollaborator ? (
                      <button 
                        onClick={() => setShowAddCollaborator(true)}
                        className="w-full text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center justify-center"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Collaborator
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder="Plex username"
                            value={newCollaborator}
                            onChange={(e) => setNewCollaborator(e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddCollaborator()}
                          />
                          <button
                            onClick={handleAddCollaborator}
                            disabled={addingCollaborator || !newCollaborator.trim()}
                            className="px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {addingCollaborator ? "Adding..." : "Add"}
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setShowAddCollaborator(false)
                            setNewCollaborator("")
                          }}
                          className="w-full text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bookmarks */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <BookmarkIcon className="h-5 w-5 mr-2" />
                    Bookmarks ({workspace.bookmarks.length})
                  </h3>
                  <div className="flex items-center space-x-2">
                    {workspace.processingStatus === "completed" && workspace.bookmarks.length > 0 && (
                      <>
                        <button
                          onClick={handleBulkDownload}
                          className="text-sm text-green-600 hover:text-green-700 flex items-center"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                          Download All
                        </button>
                        {isProducer && (
                          <>
                            <button
                              onClick={() => router.push(`/workspace/${workspaceId}/vtr`)}
                              className="text-sm text-purple-600 hover:text-purple-700 flex items-center"
                            >
                              <PlayIcon className="h-4 w-4 mr-1" />
                              VTR Control
                            </button>
                            <button
                              onClick={() => setShowOBSExportModal(true)}
                              className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                              Export for OBS
                            </button>
                          </>
                        )}
                      </>
                    )}
                    {creatingBookmark && (
                      <div className="text-sm text-orange-600">Creating...</div>
                    )}
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="space-y-3 mb-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search bookmarks..."
                      value={bookmarkSearch}
                      onChange={(e) => setBookmarkSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setBookmarkFilter("all")}
                      className={`px-3 py-1 text-xs rounded-full ${
                        bookmarkFilter === "all"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setBookmarkFilter("mine")}
                      className={`px-3 py-1 text-xs rounded-full ${
                        bookmarkFilter === "mine"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Mine
                    </button>
                    <button
                      onClick={() => setBookmarkFilter("others")}
                      className={`px-3 py-1 text-xs rounded-full ${
                        bookmarkFilter === "others"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Others
                    </button>
                    <button
                      onClick={() => setBookmarkFilter("locked")}
                      className={`px-3 py-1 text-xs rounded-full ${
                        bookmarkFilter === "locked"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <LockClosedIcon className="h-3 w-3 inline mr-1" />
                      Locked
                    </button>
                    <button
                      onClick={() => setBookmarkFilter("unlocked")}
                      className={`px-3 py-1 text-xs rounded-full ${
                        bookmarkFilter === "unlocked"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <LockOpenIcon className="h-3 w-3 inline mr-1" />
                      Unlocked
                    </button>
                  </div>
                </div>
                
                {workspace.bookmarks.length === 0 ? (
                  <div className="text-center py-8">
                    <BookmarkIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-4">No bookmarks yet</p>
                    <p className="text-xs text-gray-400">
                      Bookmarks will appear here when collaborators start marking important moments.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {workspace.bookmarks
                      .filter((bookmark) => {
                        // Apply search filter
                        if (bookmarkSearch) {
                          const searchLower = bookmarkSearch.toLowerCase()
                          const matchesLabel = bookmark.label?.toLowerCase().includes(searchLower)
                          const matchesPublicNotes = bookmark.publicNotes?.toLowerCase().includes(searchLower)
                          const matchesCreator = bookmark.createdBy.plexUsername?.toLowerCase().includes(searchLower)
                          if (!matchesLabel && !matchesPublicNotes && !matchesCreator) {
                            return false
                          }
                        }
                        
                        // Apply creator filter
                        if (bookmarkFilter === "mine") {
                          return bookmark.createdBy.id === session?.user?.id
                        } else if (bookmarkFilter === "others") {
                          return bookmark.createdBy.id !== session?.user?.id
                        } else if (bookmarkFilter === "locked") {
                          return !!bookmark.lockedById
                        } else if (bookmarkFilter === "unlocked") {
                          return !bookmark.lockedById
                        }
                        
                        return true
                      })
                      .map((bookmark) => {
                        const isCreator = bookmark.createdBy.id === session?.user?.id
                        const isProducer = workspace.producer.id === session?.user?.id
                        const canEdit = isCreator || isProducer
                        const canDelete = isCreator || isProducer
                        
                        return (
                          <div key={bookmark.id} className={`border rounded-lg p-3 hover:bg-gray-50 ${
                            bookmark.lockedById ? 'border-red-200 bg-red-50' : 'border-gray-200'
                          }`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                {editingBookmark === bookmark.id ? (
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="text"
                                      value={editingLabel}
                                      onChange={(e) => setEditingLabel(e.target.value)}
                                      className="text-sm font-medium bg-white border border-gray-300 rounded px-2 py-1 flex-1"
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveInlineEdit(bookmark.id)
                                        } else if (e.key === 'Escape') {
                                          handleCancelInlineEdit()
                                        }
                                      }}
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSaveInlineEdit(bookmark.id)}
                                      className="text-green-600 hover:text-green-700"
                                      title="Save"
                                    >
                                      <XMarkIcon className="h-4 w-4 rotate-45" />
                                    </button>
                                    <button
                                      onClick={handleCancelInlineEdit}
                                      className="text-gray-400 hover:text-gray-600"
                                      title="Cancel"
                                    >
                                      <XMarkIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <h4 className="text-sm font-medium text-gray-900 flex-1">
                                      {bookmark.label || "Untitled Bookmark"}
                                    </h4>
                                    {bookmark.lockedById && (
                                      <LockClosedIcon className="h-4 w-4 text-red-500" title="Locked" />
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center space-x-1">
                                {workspace.processingStatus === "completed" && (
                                  <button 
                                    className="text-gray-400 hover:text-green-600"
                                    title="Download bookmark"
                                    onClick={() => handleDownloadBookmark(bookmark.id)}
                                    disabled={downloadingBookmarks.includes(bookmark.id)}
                                  >
                                    {downloadingBookmarks.includes(bookmark.id) ? (
                                      <ClockIcon className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <ArrowDownTrayIcon className="h-4 w-4" />
                                    )}
                                  </button>
                                )}
                                {canEdit && !bookmark.lockedById && (
                                  <button 
                                    className="text-gray-400 hover:text-blue-600"
                                    title="Edit bookmark"
                                    onClick={() => handleInlineEdit(bookmark.id, bookmark.label || "")}
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                )}
                                {isProducer && (
                                  <button 
                                    className={bookmark.lockedById ? "text-red-500 hover:text-red-700" : "text-gray-400 hover:text-yellow-600"}
                                    title={bookmark.lockedById ? "Unlock bookmark" : "Lock bookmark"}
                                    onClick={() => handleLockBookmark(bookmark.id, !bookmark.lockedById)}
                                  >
                                    {bookmark.lockedById ? (
                                      <LockOpenIcon className="h-4 w-4" />
                                    ) : (
                                      <LockClosedIcon className="h-4 w-4" />
                                    )}
                                  </button>
                                )}
                                {canDelete && (
                                  <button 
                                    className="text-gray-400 hover:text-red-600"
                                    title="Delete bookmark"
                                    onClick={() => {
                                      if (confirm("Are you sure you want to delete this bookmark?")) {
                                        handleDeleteBookmark(bookmark.id)
                                      }
                                    }}
                                    disabled={!!(bookmark.lockedById && !isProducer)}
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-500 mb-2">
                              {formatTimecode(bookmark.startMs)} → {formatTimecode(bookmark.endMs)}
                            </div>
                            
                            {/* Notes with visibility indicators */}
                            <div className="space-y-1 mb-2">
                              {bookmark.publicNotes && (
                                <div className="flex items-start space-x-2">
                                  <EyeIcon className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" title="Public notes" />
                                  <p className="text-sm text-gray-600">{bookmark.publicNotes}</p>
                                </div>
                              )}
                              {bookmark.privateNotes && isCreator && (
                                <div className="flex items-start space-x-2">
                                  <EyeSlashIcon className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" title="Private notes (only visible to you)" />
                                  <p className="text-sm text-gray-600 italic">{bookmark.privateNotes}</p>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <img
                                  src="/default-avatar.png"
                                  alt={bookmark.createdBy.plexUsername || "User"}
                                  className="h-4 w-4 rounded-full"
                                />
                                <span className="text-xs text-gray-500">
                                  {bookmark.createdBy.plexUsername || bookmark.createdBy.name || "Unknown"}
                                </span>
                                {isCreator && (
                                  <span className="text-xs text-orange-600 font-medium">You</span>
                                )}
                                {bookmark.lockedById && bookmark.lockedBy && (
                                  <span className="text-xs text-red-600">
                                    Locked by {bookmark.lockedBy.plexUsername || bookmark.lockedBy.name || "Producer"}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-400">
                                  {new Date(bookmark.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Reprocess Confirmation Dialog */}
      {showReprocessDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <ArrowPathIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Re-process Workspace</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  This will re-download and process the source video file. This may take several minutes. 
                  Are you sure you want to continue?
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowReprocessDialog(false)}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReprocessWorkspace}
                    disabled={reprocessing}
                    className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reprocessing ? "Processing..." : "Re-process"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OBS Export Modal */}
      <OBSExportModal
        isOpen={showOBSExportModal}
        onClose={() => setShowOBSExportModal(false)}
        workspaceId={workspaceId}
        workspaceTitle={workspace?.title || ''}
        bookmarkCount={workspace?.bookmarks.length || 0}
      />

      {/* Edit Workspace Modal */}
      {showEditWorkspaceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Workspace</h2>
              <button
                onClick={() => setShowEditWorkspaceModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="workspace-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  id="workspace-title"
                  value={workspaceEditData.title}
                  onChange={(e) => setWorkspaceEditData({ ...workspaceEditData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter workspace title"
                />
              </div>

              <div>
                <label htmlFor="workspace-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="workspace-description"
                  value={workspaceEditData.description}
                  onChange={(e) => setWorkspaceEditData({ ...workspaceEditData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter workspace description"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowEditWorkspaceModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={editingWorkspace}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditWorkspace}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  disabled={editingWorkspace || !workspaceEditData.title.trim()}
                >
                  {editingWorkspace ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Workspace Modal */}
      {showDeleteWorkspaceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Delete Workspace</h2>
              <button
                onClick={() => setShowDeleteWorkspaceModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mt-0.5" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Are you sure?</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    This will permanently delete the workspace "{workspace?.title}" and all its bookmarks. 
                    This action cannot be undone.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowDeleteWorkspaceModal(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                      disabled={deletingWorkspace}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteWorkspace}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      disabled={deletingWorkspace}
                    >
                      {deletingWorkspace ? "Deleting..." : "Delete Workspace"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
