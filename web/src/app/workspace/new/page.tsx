"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ChevronLeftIcon, MagnifyingGlassIcon, FilmIcon, TvIcon } from "@heroicons/react/24/outline"

interface PlexLibrary {
  key: string
  title: string
  type: string
}

interface PlexItem {
  key: string
  title: string
  summary: string
  year: number
  duration: number
  thumb: string
  art: string
  type: string
  showTitle?: string
  seasonNumber?: number
  episodeNumber?: number
}

interface PlexSeason {
  key: string
  title: string
  summary: string
  thumb: string
  seasonNumber: number
  episodeCount: number
}

interface PlexEpisode {
  key: string
  title: string
  summary: string
  thumb: string
  episodeNumber: number
  duration: number
  year: number
}

export default function NewWorkspacePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [step, setStep] = useState<"libraries" | "content" | "seasons" | "episodes" | "create">("libraries")
  const [libraries, setLibraries] = useState<PlexLibrary[]>([])
  const [selectedLibrary, setSelectedLibrary] = useState<PlexLibrary | null>(null)
  const [content, setContent] = useState<PlexItem[]>([])
  const [selectedContent, setSelectedContent] = useState<PlexItem | null>(null)
  const [seasons, setSeasons] = useState<PlexSeason[]>([])
  const [selectedSeason, setSelectedSeason] = useState<PlexSeason | null>(null)
  const [episodes, setEpisodes] = useState<PlexEpisode[]>([])
  const [selectedEpisode, setSelectedEpisode] = useState<PlexEpisode | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [contentType, setContentType] = useState<"all" | "movie" | "episode" | "show">("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated" && !session?.user?.onboardingCompleted) {
      router.push("/welcome")
    }
  }, [status, session, router])

  useEffect(() => {
    if (step === "libraries") {
      fetchLibraries()
    }
  }, [step])

  useEffect(() => {
    if (step === "content" && selectedLibrary) {
      fetchContent()
    }
  }, [step, selectedLibrary, searchQuery, contentType])

  const fetchLibraries = async () => {
    try {
      setLoading(true)
      setError("")
      
      const response = await fetch("/api/plex/library")
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch libraries")
      }
      
      setLibraries(data.libraries)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch libraries")
    } finally {
      setLoading(false)
    }
  }

  const fetchContent = async () => {
    if (!selectedLibrary) return
    
    try {
      setLoading(true)
      setError("")
      
      const params = new URLSearchParams({
        libraryKey: selectedLibrary.key,
        ...(searchQuery && { search: searchQuery }),
        ...(contentType !== "all" && { type: contentType })
      })
      
      const response = await fetch(`/api/plex/library?${params}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch content")
      }
      
      setContent(data.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch content")
    } finally {
      setLoading(false)
    }
  }

  const fetchSeasons = async (showKey: string) => {
    try {
      setLoading(true)
      setError("")
      
      console.log("Fetching seasons for show key:", showKey)
      const response = await fetch(`/api/plex/library?key=${showKey}`)
      const data = await response.json()
      
      console.log("Seasons API response:", data)
      
      if (!data.success) {
        console.error("API Error:", data.error)
        throw new Error(data.error || "Failed to fetch seasons")
      }
      
      const seasons = data.items?.map((item: any) => ({
        key: item.key,
        title: item.title,
        summary: item.summary,
        thumb: item.thumb,
        seasonNumber: item.index,
        episodeCount: item.leafCount || 0
      })) || []
      
      console.log("Mapped seasons:", seasons)
      setSeasons(seasons)
      setStep("seasons")
    } catch (err) {
      console.error("Error fetching seasons:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch seasons")
    } finally {
      setLoading(false)
    }
  }

  const fetchEpisodes = async (seasonKey: string) => {
    try {
      setLoading(true)
      setError("")
      
      const response = await fetch(`/api/plex/library?key=${seasonKey}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch episodes")
      }
      
      const episodes = data.items?.map((item: any) => ({
        key: item.key,
        title: item.title,
        summary: item.summary,
        thumb: item.thumb,
        episodeNumber: item.index,
        duration: item.duration,
        year: item.year
      })) || []
      
      setEpisodes(episodes)
      setStep("episodes")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch episodes")
    } finally {
      setLoading(false)
    }
  }

  const handleLibrarySelect = (library: PlexLibrary) => {
    setSelectedLibrary(library)
    setStep("content")
  }

  const handleContentSelect = (item: PlexItem) => {
    if (item.type === "show") {
      // For TV shows, fetch seasons first
      setSelectedContent(item)
      fetchSeasons(item.key)
    } else {
      // For movies and episodes, go directly to create
      setSelectedContent(item)
      setStep("create")
    }
  }

  const handleSeasonSelect = (season: PlexSeason) => {
    setSelectedSeason(season)
    fetchEpisodes(season.key)
  }

  const handleEpisodeSelect = (episode: PlexEpisode) => {
    setSelectedEpisode(episode)
    setStep("create")
  }

  const generateWorkspaceDescription = () => {
    if (selectedEpisode && selectedContent && selectedSeason) {
      return `Workspace for ${selectedContent.title} Season ${selectedSeason.seasonNumber}, Episode ${selectedEpisode.episodeNumber}: ${selectedEpisode.title}`
    } else if (selectedContent) {
      if (selectedContent.type === "movie") {
        return `Workspace for the movie "${selectedContent.title}"${selectedContent.year ? ` (${selectedContent.year})` : ''}`
      } else if (selectedContent.type === "show") {
        return `Workspace for the TV show "${selectedContent.title}"`
      } else if (selectedContent.type === "episode") {
        return `Workspace for ${selectedContent.showTitle || selectedContent.title} Season ${selectedContent.seasonNumber}, Episode ${selectedContent.episodeNumber}: ${selectedContent.title}`
      }
    }
    return ""
  }

  const generateWorkspaceTitle = () => {
    if (selectedEpisode && selectedContent && selectedSeason) {
      // Episode: "Breaking Bad S01E02 - Episode Title"
      return `${selectedContent.title} S${selectedSeason.seasonNumber.toString().padStart(2, '0')}E${selectedEpisode.episodeNumber.toString().padStart(2, '0')} - ${selectedEpisode.title}`
    } else if (selectedContent) {
      if (selectedContent.type === "movie") {
        // Movie: "Movie Title (2023)"
        return `${selectedContent.title}${selectedContent.year ? ` (${selectedContent.year})` : ''}`
      } else if (selectedContent.type === "show") {
        // Show: "Show Title"
        return selectedContent.title
      } else if (selectedContent.type === "episode") {
        // Individual episode: "Show Title S01E02 - Episode Title"
        return `${selectedContent.showTitle || selectedContent.title} S${selectedContent.seasonNumber?.toString().padStart(2, '0')}E${selectedContent.episodeNumber?.toString().padStart(2, '0')} - ${selectedContent.title}`
      }
    }
    return "New Workspace"
  }

  const handleCreateWorkspace = async (formData: FormData) => {
    if (!selectedContent) return
    
    try {
      setLoading(true)
      setError("")
      
      // Determine the content to create workspace for
      const contentToUse = selectedEpisode || selectedContent
      const workspaceData = {
        plexKey: contentToUse.key,
        plexServerId: "default", // TODO: Get from config
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        contentType: selectedEpisode ? "episode" : selectedContent.type,
        contentTitle: contentToUse.title,
        contentPoster: contentToUse.thumb,
        contentDuration: contentToUse.duration,
        collaborators: [], // TODO: Add collaborator management
        // For episodes, include show and season info
        ...(selectedEpisode && selectedContent && selectedSeason && {
          plexShowTitle: selectedContent.title,
          plexSeasonNumber: selectedSeason.seasonNumber,
          plexEpisodeNumber: selectedEpisode.episodeNumber
        })
      }
      
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workspaceData)
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || "Failed to create workspace")
      }
      
      router.push(`/workspace/${data.workspace.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace")
    } finally {
      setLoading(false)
    }
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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <ChevronLeftIcon className="h-5 w-5 mr-1" />
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Create Workspace</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-8">
              <div className={`flex items-center ${step === "libraries" ? "text-orange-600" : step === "content" || step === "seasons" || step === "episodes" || step === "create" ? "text-green-600" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "libraries" ? "bg-orange-600 text-white" : step === "content" || step === "seasons" || step === "episodes" || step === "create" ? "bg-green-600 text-white" : "bg-gray-300 text-gray-600"}`}>
                  1
                </div>
                <span className="ml-2 font-medium">Select Library</span>
              </div>
              <div className={`flex items-center ${step === "content" ? "text-orange-600" : step === "seasons" || step === "episodes" || step === "create" ? "text-green-600" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "content" ? "bg-orange-600 text-white" : step === "seasons" || step === "episodes" || step === "create" ? "bg-green-600 text-white" : "bg-gray-300 text-gray-600"}`}>
                  2
                </div>
                <span className="ml-2 font-medium">Choose Content</span>
              </div>
              {step === "seasons" && (
                <div className="flex items-center text-orange-600">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-orange-600 text-white">
                    3
                  </div>
                  <span className="ml-2 font-medium">Select Season</span>
                </div>
              )}
              {step === "episodes" && (
                <div className="flex items-center text-orange-600">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-orange-600 text-white">
                    4
                  </div>
                  <span className="ml-2 font-medium">Select Episode</span>
                </div>
              )}
              <div className={`flex items-center ${step === "create" ? "text-orange-600" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "create" ? "bg-orange-600 text-white" : "bg-gray-300 text-gray-600"}`}>
                  {step === "seasons" ? "4" : step === "episodes" ? "5" : "3"}
                </div>
                <span className="ml-2 font-medium">Create Workspace</span>
              </div>
            </div>
          </div>

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

          {/* Step 1: Library Selection */}
          {step === "libraries" && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Select a Plex Library</h2>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {libraries.map((library) => (
                    <button
                      key={library.key}
                      onClick={() => handleLibrarySelect(library)}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
                    >
                      <div className="flex items-center mb-4">
                        {library.type === "movie" ? (
                          <FilmIcon className="h-8 w-8 text-orange-600 mr-3" />
                        ) : (
                          <TvIcon className="h-8 w-8 text-orange-600 mr-3" />
                        )}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{library.title}</h3>
                          <p className="text-sm text-gray-500 capitalize">{library.type}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Click to browse {library.type === "movie" ? "movies" : "TV shows"} in this library
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Content Selection */}
          {step === "content" && selectedLibrary && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Choose {selectedLibrary.type === "movie" ? "a Movie" : contentType === "episode" ? "an Episode" : contentType === "show" ? "a Show" : "Content"}
                  </h2>
                  <p className="text-sm text-gray-600">From {selectedLibrary.title}</p>
                </div>
                <button
                  onClick={() => setStep("libraries")}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Change Library
                </button>
              </div>

              {/* Search and Filter */}
              <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder={`Search ${selectedLibrary.type === "movie" ? "movies" : "episodes"}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                    />
                  </div>
                </div>
                {selectedLibrary.type === "show" && (
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as "all" | "movie" | "episode" | "show")}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                  >
                    <option value="all">All Content</option>
                    <option value="episode">Episodes Only</option>
                    <option value="show">Shows Only</option>
                  </select>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {content.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => handleContentSelect(item)}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow text-left"
                    >
                      <div className="aspect-w-2 aspect-h-3">
                        <img
                          src={item.thumb ? `/api/plex/proxy?url=${encodeURIComponent(item.thumb)}` : "/placeholder-poster.jpg"}
                          alt={item.title}
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-gray-900 mb-1">{item.title}</h3>
                        {item.showTitle && (
                          <p className="text-sm text-gray-600 mb-1">{item.showTitle}</p>
                        )}
                        {item.seasonNumber && item.episodeNumber && (
                          <p className="text-sm text-gray-500 mb-2">
                            S{item.seasonNumber}E{item.episodeNumber}
                          </p>
                        )}
                        {item.year && (
                          <p className="text-sm text-gray-500">{item.year}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Seasons Selection */}
          {step === "seasons" && selectedContent && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Choose a Season
                  </h2>
                  <p className="text-sm text-gray-600">From {selectedContent.title}</p>
                </div>
                <button
                  onClick={() => setStep("content")}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Back to Shows
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {seasons.map((season) => (
                    <button
                      key={season.key}
                      onClick={() => handleSeasonSelect(season)}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow text-left"
                    >
                      <div className="aspect-w-2 aspect-h-3">
                        <img
                          src={season.thumb ? `/api/plex/proxy?url=${encodeURIComponent(season.thumb)}` : "/placeholder-poster.jpg"}
                          alt={season.title}
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-gray-900 mb-1">{season.title}</h3>
                        <p className="text-sm text-gray-500 mb-2">
                          {season.episodeCount} episodes
                        </p>
                        {season.summary && (
                          <p className="text-sm text-gray-600 line-clamp-2">{season.summary}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Episodes Selection */}
          {step === "episodes" && selectedSeason && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Choose an Episode
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selectedContent?.title} - {selectedSeason.title}
                  </p>
                </div>
                <button
                  onClick={() => setStep("seasons")}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Back to Seasons
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {episodes.map((episode) => (
                    <button
                      key={episode.key}
                      onClick={() => handleEpisodeSelect(episode)}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow text-left"
                    >
                      <div className="aspect-w-2 aspect-h-3">
                        <img
                          src={episode.thumb ? `/api/plex/proxy?url=${encodeURIComponent(episode.thumb)}` : "/placeholder-poster.jpg"}
                          alt={episode.title}
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-gray-900 mb-1">{episode.title}</h3>
                        <p className="text-sm text-gray-500 mb-2">
                          Episode {episode.episodeNumber}
                        </p>
                        {episode.duration && (
                          <p className="text-sm text-gray-500 mb-2">
                            {Math.floor(episode.duration / 60000)} min
                          </p>
                        )}
                        {episode.summary && (
                          <p className="text-sm text-gray-600 line-clamp-2">{episode.summary}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Workspace Creation */}
          {step === "create" && selectedContent && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Create Workspace</h2>
                <button
                  onClick={() => {
                    if (selectedEpisode) {
                      setStep("episodes")
                    } else if (selectedContent?.type === "show") {
                      setStep("seasons")
                    } else {
                      setStep("content")
                    }
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Change Content
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Content Preview */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Selected Content</h3>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="aspect-w-2 aspect-h-3">
                      <img
                        src={(selectedEpisode || selectedContent)?.thumb ? `/api/plex/proxy?url=${encodeURIComponent((selectedEpisode || selectedContent)!.thumb)}` : "/placeholder-poster.jpg"}
                        alt={(selectedEpisode || selectedContent)?.title}
                        className="w-full h-64 object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900 mb-2">{(selectedEpisode || selectedContent)?.title}</h4>
                      {selectedEpisode && selectedContent && (
                        <p className="text-sm text-gray-600 mb-2">{selectedContent.title}</p>
                      )}
                      {selectedEpisode && selectedSeason && (
                        <p className="text-sm text-gray-500 mb-2">
                          S{selectedSeason.seasonNumber}E{selectedEpisode.episodeNumber}
                        </p>
                      )}
                      {selectedContent?.showTitle && (
                        <p className="text-sm text-gray-600 mb-2">{selectedContent.showTitle}</p>
                      )}
                      {selectedContent?.seasonNumber && selectedContent?.episodeNumber && (
                        <p className="text-sm text-gray-500 mb-2">
                          S{selectedContent.seasonNumber}E{selectedContent.episodeNumber}
                        </p>
                      )}
                      {(selectedEpisode || selectedContent)?.year && (
                        <p className="text-sm text-gray-500 mb-2">{(selectedEpisode || selectedContent)!.year}</p>
                      )}
                      {(selectedEpisode || selectedContent)?.summary && (
                        <p className="text-sm text-gray-600">{(selectedEpisode || selectedContent)!.summary}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Workspace Form */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Workspace Details</h3>
                  <form action={handleCreateWorkspace} className="space-y-6">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                        Workspace Title *
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        required
                        defaultValue={generateWorkspaceTitle()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        rows={4}
                        placeholder="Describe what this workspace is for..."
                        defaultValue={generateWorkspaceDescription()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                      />
                    </div>

                    <div className="flex justify-end space-x-4">
                      <button
                        type="button"
                        onClick={() => setStep("content")}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? "Creating..." : "Create Workspace"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
