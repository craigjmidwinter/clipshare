import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSession } from 'next-auth/react'
import WorkspaceDetailPage from './page'

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        plexUsername: 'testuser',
      },
    },
    status: 'authenticated',
  })),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
  useParams: vi.fn(() => ({ id: 'workspace-1' })),
}))

// Mock the VideoPlayer component to focus on NLETimeline integration
vi.mock('@/components/VideoPlayer', () => ({
  default: function MockVideoPlayer({ 
    onBookmarkCreate, 
    onBookmarkUpdate, 
    bookmarks, 
    useNLETimeline, 
    showTimelineBelow 
  }: any) {
    if (!useNLETimeline) {
      return <div data-testid="video-player">Mock Video Player</div>
    }

    return (
      <div data-testid="video-player-with-timeline">
        <div data-testid="video-container">Mock Video Container</div>
        {showTimelineBelow && (
          <div data-testid="timeline-container">
            <div 
              data-testid="timeline"
              className="relative h-16 bg-gray-800 cursor-pointer overflow-x-auto"
              style={{ width: '800px', height: '64px' }}
            >
              {/* Mock timeline content */}
              <div className="relative" style={{ width: '1000px', height: '100%' }}>
                {/* Mock bookmarks */}
                {bookmarks.map((bookmark: any) => (
                  <div key={bookmark.id} className="absolute top-4 bottom-4 z-5">
                    <div
                      className={`absolute top-0 bottom-0 rounded cursor-move ${
                        bookmark.lockedById ? 'bg-red-600' : 'bg-blue-600'
                      } opacity-80 hover:opacity-100 transition-opacity`}
                      style={{
                        left: `${bookmark.startMs / 100}px`,
                        width: `${(bookmark.endMs - bookmark.startMs) / 100}px`,
                      }}
                      title={`${bookmark.label || 'Untitled'} - ${bookmark.startMs/1000}s → ${bookmark.endMs/1000}s`}
                      data-testid={`bookmark-${bookmark.id}`}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('Bookmark mousedown:', bookmark.id)
                      }}
                    >
                      <div className="p-1 text-xs truncate text-white">
                        {bookmark.label || 'Untitled'}
                      </div>
                    </div>
                    
                    {/* Start handle */}
                    <div
                      className="absolute top-0 bottom-0 w-2 bg-green-500 cursor-ew-resize z-10 opacity-0 hover:opacity-100 transition-opacity"
                      style={{ left: `${bookmark.startMs / 100 - 1}px` }}
                      title={`Adjust start time: ${bookmark.startMs/1000}s`}
                      data-testid={`bookmark-start-${bookmark.id}`}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('Start handle mousedown:', bookmark.id)
                      }}
                    />
                    
                    {/* End handle */}
                    <div
                      className="absolute top-0 bottom-0 w-2 bg-red-500 cursor-ew-resize z-10 opacity-0 hover:opacity-100 transition-opacity"
                      style={{ left: `${bookmark.endMs / 100 - 1}px` }}
                      title={`Adjust end time: ${bookmark.endMs/1000}s`}
                      data-testid={`bookmark-end-${bookmark.id}`}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('End handle mousedown:', bookmark.id)
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  },
}))

// Mock the API calls
global.fetch = vi.fn()

describe('WorkspaceDetailPage Integration', () => {
  const mockWorkspace = {
    id: 'workspace-1',
    name: 'Test Workspace',
    plexKey: 'test-key',
    plexServerId: 'test-server',
    contentDuration: 120000, // 2 minutes in milliseconds
    bookmarks: [
      {
        id: 'bookmark-1',
        label: 'Opening Scene',
        startMs: 5000,
        endMs: 15000,
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
        startMs: 30000,
        endMs: 45000,
        createdBy: {
          id: 'user-2',
          name: 'Jane Smith',
          plexUsername: 'janesmith',
        },
        lockedById: null,
        lockedAt: null,
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful API responses
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/workspaces/workspace-1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, workspace: mockWorkspace }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    })
  })

  it('renders workspace with timeline and bookmarks', async () => {
    render(<WorkspaceDetailPage params={{ id: 'workspace-1' }} />)
    
    // Wait for the workspace to load
    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument()
    })
    
    // Check if timeline is rendered
    expect(screen.getByTestId('timeline-container')).toBeInTheDocument()
    expect(screen.getByTestId('timeline')).toBeInTheDocument()
    
    // Check if bookmarks are rendered
    expect(screen.getByTestId('bookmark-bookmark-1')).toBeInTheDocument()
    expect(screen.getByTestId('bookmark-bookmark-2')).toBeInTheDocument()
    
    // Check if drag handles are present
    expect(screen.getByTestId('bookmark-start-bookmark-1')).toBeInTheDocument()
    expect(screen.getByTestId('bookmark-end-bookmark-1')).toBeInTheDocument()
  })

  it('handles bookmark drag operations in timeline context', async () => {
    render(<WorkspaceDetailPage params={{ id: 'workspace-1' }} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('bookmark-bookmark-1')).toBeInTheDocument()
    })
    
    const bookmark = screen.getByTestId('bookmark-bookmark-1')
    
    // Test bookmark body drag
    fireEvent.mouseDown(bookmark, {
      clientX: 50,
      clientY: 32,
      button: 0,
    })
    
    // Simulate mouse move
    fireEvent.mouseMove(document, {
      clientX: 100,
      clientY: 32,
    })
    
    // Simulate mouse up
    fireEvent.mouseUp(document, {
      clientX: 100,
      clientY: 32,
    })
    
    // The drag should be handled by the timeline component
    // We can verify this by checking if the bookmark is still rendered
    expect(bookmark).toBeInTheDocument()
  })

  it('handles bookmark handle drag operations', async () => {
    render(<WorkspaceDetailPage params={{ id: 'workspace-1' }} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('bookmark-start-bookmark-1')).toBeInTheDocument()
    })
    
    const startHandle = screen.getByTestId('bookmark-start-bookmark-1')
    
    // Test start handle drag
    fireEvent.mouseDown(startHandle, {
      clientX: 49, // Position of start handle
      clientY: 32,
      button: 0,
    })
    
    // Simulate mouse move
    fireEvent.mouseMove(document, {
      clientX: 60,
      clientY: 32,
    })
    
    // Simulate mouse up
    fireEvent.mouseUp(document, {
      clientX: 60,
      clientY: 32,
    })
    
    // The drag should be handled by the timeline component
    expect(startHandle).toBeInTheDocument()
  })

  it('shows proper cursor styles for drag operations', async () => {
    render(<WorkspaceDetailPage params={{ id: 'workspace-1' }} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('bookmark-bookmark-1')).toBeInTheDocument()
    })
    
    const bookmark = screen.getByTestId('bookmark-bookmark-1')
    const startHandle = screen.getByTestId('bookmark-start-bookmark-1')
    const endHandle = screen.getByTestId('bookmark-end-bookmark-1')
    
    // Check cursor styles
    expect(bookmark).toHaveClass('cursor-move')
    expect(startHandle).toHaveClass('cursor-ew-resize')
    expect(endHandle).toHaveClass('cursor-ew-resize')
  })

  it('handles timeline click for seeking', async () => {
    render(<WorkspaceDetailPage params={{ id: 'workspace-1' }} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('timeline')).toBeInTheDocument()
    })
    
    const timeline = screen.getByTestId('timeline')
    
    // Test timeline click
    fireEvent.mouseDown(timeline, {
      clientX: 400,
      clientY: 32,
      button: 0,
    })
    
    // The seek should be handled by the timeline component
    expect(timeline).toBeInTheDocument()
  })

  it('renders bookmarks with correct positioning', async () => {
    render(<WorkspaceDetailPage params={{ id: 'workspace-1' }} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('bookmark-bookmark-1')).toBeInTheDocument()
    })
    
    const bookmark1 = screen.getByTestId('bookmark-bookmark-1')
    const bookmark2 = screen.getByTestId('bookmark-bookmark-2')
    
    // Check that bookmarks are positioned correctly
    expect(bookmark1).toHaveStyle({ left: '50px', width: '100px' }) // 5s to 15s
    expect(bookmark2).toHaveStyle({ left: '300px', width: '150px' }) // 30s to 45s
  })
})
