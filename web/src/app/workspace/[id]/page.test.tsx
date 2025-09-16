import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import WorkspaceDetailPage from './page'

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn()
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn()
}))

const { useParams } = await import('next/navigation')

// Mock fetch
global.fetch = vi.fn()

// Mock components
vi.mock('@/components/VideoPlayer', () => ({
  default: ({ workspaceId, onBookmarkCreate }: any) => (
    <div data-testid="video-player" data-workspace-id={workspaceId}>
      <button onClick={() => onBookmarkCreate({ startMs: 1000, endMs: 5000 })}>
        Create Bookmark
      </button>
    </div>
  )
}))

vi.mock('@/components/NLETimeline', () => ({
  default: ({ bookmarks, onBookmarkCreate }: any) => (
    <div data-testid="nle-timeline">
      <div data-testid="bookmark-count">{bookmarks.length}</div>
      <button onClick={() => onBookmarkCreate({ startMs: 2000, endMs: 6000 })}>
        Timeline Create Bookmark
      </button>
    </div>
  )
}))

describe('WorkspaceDetailPage', () => {
  const mockSession = {
    user: {
      id: 'user1',
      onboardingCompleted: true
    }
  }

  const mockWorkspace = {
    id: 'workspace1',
    title: 'Test Workspace',
    description: 'Test Description',
    contentType: 'episode',
    contentTitle: 'Test Episode',
    contentPoster: null,
    contentDuration: 3600000, // 1 hour
    plexKey: 'plex-key',
    plexServerId: 'server1',
    processingStatus: 'completed',
    processingProgress: 100,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    producer: {
      id: 'user1',
      name: 'Producer',
      plexUsername: 'producer',
      plexAvatarUrl: null
    },
    memberships: [
      {
        id: 'membership1',
        role: 'producer',
        user: {
          id: 'user1',
          name: 'Producer',
          plexUsername: 'producer',
          plexAvatarUrl: null
        }
      }
    ],
    bookmarks: [
      {
        id: 'bookmark1',
        label: 'Test Bookmark',
        publicNotes: 'Public notes',
        privateNotes: 'Private notes',
        startMs: 1000,
        endMs: 5000,
        lockedById: null,
        lockedAt: null,
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: {
          id: 'user1',
          name: 'Producer',
          plexUsername: 'producer'
        },
        lockedBy: null
      }
    ],
    processingJobs: []
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn()
    })
    vi.mocked(useParams).mockReturnValue({
      id: 'workspace1'
    })
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ success: true, workspace: mockWorkspace })
    } as Response)
  })

  it('should render workspace with completed processing status', async () => {
    render(<WorkspaceDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Test Episode' })).toBeInTheDocument()
      expect(screen.getByText('Ready')).toBeInTheDocument()
    })
  })

  it('should show processing status notice when not completed', async () => {
    const processingWorkspace = {
      ...mockWorkspace,
      processingStatus: 'processing',
      processingProgress: 50
    }
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ success: true, workspace: processingWorkspace })
    } as Response)

    render(<WorkspaceDetailPage />)

    await waitFor(() => {
      expect(screen.getByText(/Workspace is being processed \(50%\)/)).toBeInTheDocument()
    })
  })

  it('should show reprocess button for producer when not processing', async () => {
    const pendingWorkspace = {
      ...mockWorkspace,
      processingStatus: 'pending'
    }
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ success: true, workspace: pendingWorkspace })
    } as Response)

    render(<WorkspaceDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Re-process')).toBeInTheDocument()
    })
  })

  it('should show download buttons when processing is completed', async () => {
    render(<WorkspaceDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Download All')).toBeInTheDocument()
      expect(screen.getByTitle('Download bookmark')).toBeInTheDocument()
    })
  })

  it('should handle bookmark download', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, workspace: mockWorkspace })
    } as Response)
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, message: 'Download started' })
    } as Response)

    render(<WorkspaceDetailPage />)

    await waitFor(() => {
      expect(screen.getByTitle('Download bookmark')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('Download bookmark'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/downloads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookmarkIds: ['bookmark1'],
          workspaceId: 'workspace1',
          bulkDownload: false
        })
      })
    })
  })

  it('should handle bulk download', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, workspace: mockWorkspace })
    } as Response)
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, message: 'Bulk download started' })
    } as Response)

    render(<WorkspaceDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Download All')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Download All'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/downloads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookmarkIds: ['bookmark1'],
          workspaceId: 'workspace1',
          bulkDownload: true
        })
      })
    })
  })

  it('should show reprocess confirmation dialog', async () => {
    render(<WorkspaceDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Re-process')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Re-process'))

    expect(screen.getByText('Re-process Workspace')).toBeInTheDocument()
    expect(screen.getByText(/This will re-download and process the source video file/)).toBeInTheDocument()
  })

  it('should handle reprocess confirmation', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, workspace: mockWorkspace })
    } as Response)
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, message: 'Processing started' })
    } as Response)

    render(<WorkspaceDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Re-process')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Re-process'))
    fireEvent.click(screen.getByRole('button', { name: 'Re-process' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/workspaces/workspace1/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
    })
  })

  it('should not show download buttons when processing is not completed', async () => {
    const processingWorkspace = {
      ...mockWorkspace,
      processingStatus: 'processing',
      processingProgress: 50
    }
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ success: true, workspace: processingWorkspace })
    } as Response)

    render(<WorkspaceDetailPage />)

    await waitFor(() => {
      expect(screen.queryByText('Download All')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Download bookmark')).not.toBeInTheDocument()
    })
  })

  it('should redirect to login for unauthenticated users', () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    })

    const mockPush = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn()
    })

    render(<WorkspaceDetailPage />)

    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('should redirect to welcome for users who have not completed onboarding', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { ...mockSession, user: { ...mockSession.user, onboardingCompleted: false } },
      status: 'authenticated'
    })

    const mockPush = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn()
    })

    render(<WorkspaceDetailPage />)

    expect(mockPush).toHaveBeenCalledWith('/welcome')
  })
})