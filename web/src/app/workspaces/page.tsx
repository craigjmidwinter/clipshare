"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { PlusIcon, FilmIcon, TvIcon, UsersIcon, BookmarkIcon } from "@heroicons/react/24/outline"

interface Workspace {
  id: string
  title: string
  description: string | null
  contentType: string
  contentTitle: string
  contentPoster: string | null
  contentDuration: number
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
  _count: {
    bookmarks: number
    memberships: number
  }
}

export default function WorkspacesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated" && !session?.user?.onboardingCompleted) {
      router.push("/welcome")
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === "authenticated") {
      fetchWorkspaces()
    }
  }, [status])

  const fetchWorkspaces = async () => {
    try {
      setLoading(true)
      setError("")
      
      const response = await fetch("/api/workspaces")
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch workspaces")
      }
      
      setWorkspaces(data.workspaces)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch workspaces")
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
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

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Clipshare</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img
                  src={session?.user?.image || "/default-avatar.png"}
                  alt="Profile"
                  className="h-8 w-8 rounded-full"
                />
                <span className="text-sm font-medium text-gray-700">
                  {session?.user?.name || session?.user?.email}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Your Workspaces</h2>
              <p className="text-lg text-gray-600 mt-2">
                Collaborate on video content from your Plex library
              </p>
            </div>
            <button
              onClick={() => router.push("/workspace/new")}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Workspace
            </button>
          </div>

          {/* Profile Sync Status */}
          {session?.user?.plexUsername && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Connected to Plex as: {session.user.plexUsername}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Workspaces Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
                <FilmIcon className="h-24 w-24" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workspaces yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first workspace to start collaborating on video content.
              </p>
              <button
                onClick={() => router.push("/workspace/new")}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                Create Your First Workspace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  onClick={() => router.push(`/workspace/${workspace.id}`)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                >
                  {/* Poster */}
                  <div className="aspect-w-16 aspect-h-9">
                    <img
                      src={workspace.contentPoster ? `/api/plex/proxy?url=${encodeURIComponent(workspace.contentPoster)}` : "/placeholder-poster.jpg"}
                      alt={workspace.contentTitle}
                      className="w-full h-48 object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {workspace.title}
                      </h3>
                      <div className="flex items-center text-gray-500 ml-2">
                        {workspace.contentType === "movie" ? (
                          <FilmIcon className="h-5 w-5" />
                        ) : (
                          <TvIcon className="h-5 w-5" />
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {workspace.contentTitle}
                    </p>

                    {workspace.description && (
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                        {workspace.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <UsersIcon className="h-4 w-4 mr-1" />
                          {workspace._count.memberships}
                        </div>
                        <div className="flex items-center">
                          <BookmarkIcon className="h-4 w-4 mr-1" />
                          {workspace._count.bookmarks}
                        </div>
                      </div>
                      <span>{formatDuration(workspace.contentDuration)}</span>
                    </div>

                    {/* Producer */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center">
                        <img
                          src={workspace.producer.plexAvatarUrl || "/default-avatar.png"}
                          alt={workspace.producer.plexUsername || workspace.producer.name || "Producer"}
                          className="h-6 w-6 rounded-full mr-2"
                        />
                        <span className="text-sm text-gray-600">
                          {workspace.producer.plexUsername || workspace.producer.name || "Producer"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
