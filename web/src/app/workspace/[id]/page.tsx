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
  FunnelIcon
} from "@heroicons/react/24/outline"
import VideoPlayer from "@/components/VideoPlayer"

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
    publicSlug: string
    isPublicRevoked: boolean
    createdAt: string
    createdBy: {
      id: string
      name: string | null
      plexUsername: string | null
    }
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
  const [bookmarkFilter, setBookmarkFilter] = useState<"all" | "mine" | "others">("all")
  const [creatingBookmark, setCreatingBookmark] = useState(false)

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

      // Refresh workspace data to get updated bookmarks
      await fetchWorkspace()
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
  }) => {
    try {
      setError("")

      const response = await fetch("/api/bookmarks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: bookmarkId,
          ...updates
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to update bookmark")
      }

      // Refresh workspace data
      await fetchWorkspace()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update bookmark")
    }
  }

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      setError("")

      const response = await fetch(`/api/bookmarks?id=${bookmarkId}`, {
        method: "DELETE"
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to delete bookmark")
      }

      // Refresh workspace data
      await fetchWorkspace()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete bookmark")
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
                <h1 className="text-2xl font-bold text-gray-900">{workspace.title}</h1>
                <p className="text-sm text-gray-600">{workspace.contentTitle}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isProducer && (
                <>
                  <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center">
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  <button className="text-sm text-red-500 hover:text-red-700 flex items-center">
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

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
                    bookmarks={workspace.bookmarks}
                    currentUserId={session?.user?.id || ""}
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
                  {creatingBookmark && (
                    <div className="text-sm text-orange-600">Creating...</div>
                  )}
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
                  
                  <div className="flex space-x-2">
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
                        }
                        
                        return true
                      })
                      .map((bookmark) => {
                        const isCreator = bookmark.createdBy.id === session?.user?.id
                        const isProducer = workspace.producer.id === session?.user?.id
                        const canEdit = isCreator || isProducer
                        const canDelete = isCreator || isProducer
                        
                        return (
                          <div key={bookmark.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                {bookmark.label || "Untitled Bookmark"}
                              </h4>
                              <div className="flex items-center space-x-1">
                                <button 
                                  className="text-gray-400 hover:text-gray-600"
                                  title="Share bookmark"
                                >
                                  <ShareIcon className="h-4 w-4" />
                                </button>
                                {canEdit && (
                                  <button 
                                    className="text-gray-400 hover:text-blue-600"
                                    title="Edit bookmark"
                                    onClick={() => {
                                      const newLabel = prompt("Edit label:", bookmark.label || "")
                                      if (newLabel !== null) {
                                        handleEditBookmark(bookmark.id, { label: newLabel })
                                      }
                                    }}
                                  >
                                    <PencilIcon className="h-4 w-4" />
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
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-500 mb-2">
                              {formatTimecode(bookmark.startMs)} - {formatTimecode(bookmark.endMs)}
                            </div>
                            
                            {bookmark.publicNotes && (
                              <p className="text-sm text-gray-600 mb-2">{bookmark.publicNotes}</p>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <img
                                  src={bookmark.createdBy.plexAvatarUrl || "/default-avatar.png"}
                                  alt={bookmark.createdBy.plexUsername || "User"}
                                  className="h-4 w-4 rounded-full"
                                />
                                <span className="text-xs text-gray-500">
                                  {bookmark.createdBy.plexUsername || bookmark.createdBy.name || "Unknown"}
                                </span>
                                {isCreator && (
                                  <span className="text-xs text-orange-600 font-medium">You</span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">
                                {new Date(bookmark.createdAt).toLocaleDateString()}
                              </span>
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
    </div>
  )
}
