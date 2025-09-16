'use client'

import React, { useState } from 'react'
import NLETimeline from '@/components/NLETimeline'

// Mock data for testing
const mockBookmarks = [
  {
    id: 'bookmark-1',
    label: 'Opening Scene',
    startMs: 5000, // 5 seconds
    endMs: 15000,  // 15 seconds
    createdBy: {
      id: 'user-1',
      name: 'John Doe',
      plexUsername: 'johndoe',
    },
    lockedById: null,
    lockedAt: null,
  },
  {
    id: 'bookmark-2',
    label: 'Action Sequence',
    startMs: 30000, // 30 seconds
    endMs: 45000,   // 45 seconds
    createdBy: {
      id: 'user-2',
      name: 'Jane Smith',
      plexUsername: 'janesmith',
    },
    lockedById: null,
    lockedAt: null,
  },
  {
    id: 'bookmark-3',
    label: 'Locked Bookmark',
    startMs: 60000, // 60 seconds
    endMs: 75000,   // 75 seconds
    createdBy: {
      id: 'user-3',
      name: 'Bob Wilson',
      plexUsername: 'bobwilson',
    },
    lockedById: 'user-3',
    lockedAt: new Date().toISOString(),
  },
]

export default function TestTimelinePage() {
  const [currentTime, setCurrentTime] = useState(0)
  const [bookmarks, setBookmarks] = useState(mockBookmarks)
  const [events, setEvents] = useState<string[]>([])

  const addEvent = (event: string) => {
    setEvents(prev => [`${new Date().toLocaleTimeString()}: ${event}`, ...prev.slice(0, 9)])
  }

  const handleSeek = (time: number) => {
    setCurrentTime(time)
    addEvent(`Seeked to ${time.toFixed(2)}s`)
  }

  const handleBookmarkCreate = (startMs: number, endMs: number) => {
    const newBookmark = {
      id: `bookmark-${Date.now()}`,
      label: 'New Bookmark',
      startMs,
      endMs,
      createdBy: {
        id: 'current-user',
        name: 'Current User',
        plexUsername: 'currentuser',
      },
      lockedById: null,
      lockedAt: null,
    }
    setBookmarks(prev => [...prev, newBookmark])
    addEvent(`Created bookmark: ${(startMs/1000).toFixed(2)}s → ${(endMs/1000).toFixed(2)}s`)
  }

  const handleBookmarkUpdate = (bookmarkId: string, startMs: number, endMs: number) => {
    setBookmarks(prev => prev.map(bookmark => 
      bookmark.id === bookmarkId 
        ? { ...bookmark, startMs, endMs }
        : bookmark
    ))
    addEvent(`Updated bookmark ${bookmarkId}: ${(startMs/1000).toFixed(2)}s → ${(endMs/1000).toFixed(2)}s`)
  }

  const handleBookmarkDelete = (bookmarkId: string) => {
    setBookmarks(prev => prev.filter(bookmark => bookmark.id !== bookmarkId))
    addEvent(`Deleted bookmark ${bookmarkId}`)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">NLETimeline Test Page</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timeline */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">Timeline Component</h2>
              <NLETimeline
                duration={120} // 2 minutes
                frameRate={30}
                currentTime={currentTime}
                videoElement={null}
                bookmarks={bookmarks}
                onSeek={handleSeek}
                onBookmarkCreate={handleBookmarkCreate}
                onBookmarkUpdate={handleBookmarkUpdate}
                onBookmarkDelete={handleBookmarkDelete}
              />
            </div>
          </div>

          {/* Controls and Events */}
          <div className="space-y-6">
            {/* Current State */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Current State</h3>
              <div className="space-y-2 text-sm">
                <div>Current Time: {currentTime.toFixed(2)}s</div>
                <div>Bookmarks: {bookmarks.length}</div>
                <div>Duration: 120s</div>
              </div>
            </div>

            {/* Test Controls */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Test Controls</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setCurrentTime(0)}
                  className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm"
                >
                  Reset to Start
                </button>
                <button
                  onClick={() => setCurrentTime(60)}
                  className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm"
                >
                  Go to 1 Minute
                </button>
                <button
                  onClick={() => setBookmarks(mockBookmarks)}
                  className="w-full bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm"
                >
                  Reset Bookmarks
                </button>
                <button
                  onClick={() => setEvents([])}
                  className="w-full bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded text-sm"
                >
                  Clear Events
                </button>
              </div>
            </div>

            {/* Event Log */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Event Log</h3>
              <div className="space-y-1 text-xs max-h-64 overflow-y-auto">
                {events.length === 0 ? (
                  <div className="text-gray-400">No events yet...</div>
                ) : (
                  events.map((event, index) => (
                    <div key={index} className="text-green-400 font-mono">
                      {event}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Test Instructions</h3>
              <div className="text-sm space-y-2">
                <div>• Click on timeline to seek</div>
                <div>• Drag bookmark bodies to move</div>
                <div>• Drag green handles to resize start</div>
                <div>• Drag red handles to resize end</div>
                <div>• Ctrl+Click for IN point</div>
                <div>• Shift+Click for OUT point</div>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-8 bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Debug Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Bookmarks:</h4>
              <pre className="bg-gray-900 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(bookmarks, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Component Props:</h4>
              <pre className="bg-gray-900 p-2 rounded text-xs">
                {JSON.stringify({
                  duration: 120,
                  frameRate: 30,
                  currentTime,
                  bookmarksCount: bookmarks.length,
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
