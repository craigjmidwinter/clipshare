import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import WorkspaceDetailPage from './page'

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn()
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn()
}))

// Mock fetch
global.fetch = vi.fn()

const mockUseSession = vi.mocked(useSession)
const mockUseRouter = vi.mocked(useRouter)
const mockUseParams = vi.mocked(useParams)

describe('WorkspaceDetailPage', () => {
  const mockRouter = {
    push: vi.fn(),
    back: vi.fn()
  }

  const mockSession = {
    user: {
      id: 'user1',
      name: 'Test User',
      email: 'test@example.com',
      onboardingCompleted: true
    }
  }

  const mockWorkspace = {
    id: 'workspace1',
    title: 'Test Workspace',
    description: 'Test description',
    contentType: 'episode',
    contentTitle: 'Test Episode',
    contentPoster: null,
    contentDuration: 60000,
    plexKey: 'plex-key-123',
    plexServerId: 'server1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    producer: {
      id: 'user1',
      name: 'Test User',
      plexUsername: 'testuser',
      plexAvatarUrl: null
    },
    memberships: [
      {
        id: 'membership1',
        role: 'producer',
        user: {
          id: 'user1',
          name: 'Test User',
          plexUsername: 'testuser',
          plexAvatarUrl: null
        }
      }
    ],
    bookmarks: [
      {
        id: 'bookmark1',
        label: 'Test Bookmark',
        publicNotes: 'Public note',
        privateNotes: 'Private note',
        startMs: 10000,
        endMs: 20000,
        publicSlug: 'slug-123',
        isPublicRevoked: false,
        lockedById: null,
        lockedAt: null,
        createdAt: '2023-01-01T00:00:00Z',
        createdBy: {
          id: 'user1',
          name: 'Test User',
          plexUsername: 'testuser'
        },
        lockedBy: null
      },
      {
        id: 'bookmark2',
        label: 'Locked Bookmark',
        publicNotes: null,
        privateNotes: null,
        startMs: 30000,
        endMs: 40000,
        publicSlug: 'slug-456',
        isPublicRevoked: false,
        lockedById: 'user2',
        lockedAt: '2023-01-01T00:00:00Z',
        createdAt: '2023-01-01T00:00:00Z',
        createdBy: {
          id: 'user1',
          name: 'Test User',
          plexUsername: 'testuser'
        },
        lockedBy: {
          id: 'user2',
          name: 'Producer',
          plexUsername: 'producer'
        }
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    } as any)
    
    mockUseRouter.mockReturnValue(mockRouter as any)
    
    mockUseParams.mockReturnValue({
      id: 'workspace1'
    })
    
    // Mock successful workspace fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, workspace: mockWorkspace })
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render workspace details and bookmarks', async () => {
    render(<WorkspaceDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument()
      expect(screen.getByText('Test Episode')).toBeInTheDocument()
      expect(screen.getByText('Test Bookmark')).toBeInTheDocument()
      expect(screen.getByText('Locked Bookmark')).toBeInTheDocument()
    })
  })

  it('should show bookmark filtering options', async () => {
    render(<WorkspaceDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument()
      expect(screen.getByText('Mine')).toBeInTheDocument()
      expect(screen.getByText('Others')).toBeInTheDocument()
      expect(screen.getByText('Locked')).toBeInTheDocument()
      expect(screen.getByText('Unlocked')).toBeInTheDocument()
    })
  })

  it('should filter bookmarks by creator', async () => {
    const user = userEvent.setup()
    render(<WorkspaceDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Bookmark')).toBeInTheDocument()
    })
    
    // Click "Mine" filter
    const mineFilter = screen.getByText('Mine')
    await user.click(mineFilter)
    
    // Both bookmarks should still be visible since user1 created both
    expect(screen.getByText('Test Bookmark')).toBeInTheDocument()
    expect(screen.getByText('Locked Bookmark')).toBeInTheDocument()
  })

  it('should filter bookmarks by lock status', async () => {
    const user = userEvent.setup()
    render(<WorkspaceDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Bookmark')).toBeInTheDocument()
    })
    
    // Click "Locked" filter
    const lockedFilter = screen.getByText('Locked')
    await user.click(lockedFilter)
    
    // Only locked bookmark should be visible
    expect(screen.queryByText('Test Bookmark')).not.toBeInTheDocument()
    expect(screen.getByText('Locked Bookmark')).toBeInTheDocument()
    
    // Click "Unlocked" filter
    const unlockedFilter = screen.getByText('Unlocked')
    await user.click(unlockedFilter)
    
    // Only unlocked bookmark should be visible
    expect(screen.getByText('Test Bookmark')).toBeInTheDocument()
    expect(screen.queryByText('Locked Bookmark')).not.toBeInTheDocument()
  })

  it('should allow inline editing of bookmark labels', async () => {
    const user = userEvent.setup()
    render(<WorkspaceDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Bookmark')).toBeInTheDocument()
    })
    
    // Mock successful update
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, workspace: mockWorkspace })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    
    // Click edit button
    const editButtons = screen.getAllByTitle('Edit bookmark')
    await user.click(editButtons[0])
    
    // Should show inline edit input
    const editInput = screen.getByDisplayValue('Test Bookmark')
    expect(editInput).toBeInTheDocument()
    
    // Type new label
    await user.clear(editInput)
    await user.type(editInput, 'Updated Bookmark')
    
    // Press Enter to save
    await user.keyboard('{Enter}')
    
    // Should call API to update bookmark
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/bookmarks/bookmark1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Updated Bookmark' })
      })
    })
  })

  it('should cancel inline editing with Escape key', async () => {
    const user = userEvent.setup()
    render(<WorkspaceDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Bookmark')).toBeInTheDocument()
    })
    
    // Click edit button
    const editButtons = screen.getAllByTitle('Edit bookmark')
    await user.click(editButtons[0])
    
    // Should show inline edit input
    const editInput = screen.getByDisplayValue('Test Bookmark')
    expect(editInput).toBeInTheDocument()
    
    // Press Escape to cancel
    await user.keyboard('{Escape}')
    
    // Should return to display mode
    expect(screen.getByText('Test Bookmark')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Test Bookmark')).not.toBeInTheDocument()
  })

  it('should show lock/unlock buttons for producers', async () => {
    render(<WorkspaceDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Bookmark')).toBeInTheDocument()
    })
    
    // Should show lock buttons for producer
    const lockButtons = screen.getAllByTitle(/Lock bookmark/)
    expect(lockButtons).toHaveLength(1) // One for unlocked bookmark
    
    const unlockButtons = screen.getAllByTitle(/Unlock bookmark/)
    expect(unlockButtons).toHaveLength(1) // One for locked bookmark
  })

  it('should lock/unlock bookmarks', async () => {
    const user = userEvent.setup()
    render(<WorkspaceDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Bookmark')).toBeInTheDocument()
    })
    
    // Mock successful lock
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, workspace: mockWorkspace })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    
    // Click lock button
    const lockButton = screen.getByTitle('Lock bookmark')
    await user.click(lockButton)
    
    // Should call API to lock bookmark
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/bookmarks/bookmark1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: true })
      })
    })
  })

  it('should delete bookmarks', async () => {
    const user = userEvent.setup()
    render(<WorkspaceDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Bookmark')).toBeInTheDocument()
    })
    
    // Mock successful delete
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, workspace: mockWorkspace })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    
    // Mock confirm dialog
    global.confirm = vi.fn(() => true)
    
    // Click delete button
    const deleteButton = screen.getByTitle('Delete bookmark')
    await user.click(deleteButton)
    
    // Should show confirmation dialog
    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this bookmark?')
    
    // Should call API to delete bookmark
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/bookmarks/bookmark1', {
        method: 'DELETE'
      })
    })
  })

  it('should show visibility indicators for notes', async () => {
    render(<WorkspaceDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Public note')).toBeInTheDocument()
      expect(screen.getByText('Private note')).toBeInTheDocument()
    })
    
    // Should show visibility icons
    const publicIcon = screen.getByTitle('Public notes')
    const privateIcon = screen.getByTitle('Private notes (only visible to you)')
    
    expect(publicIcon).toBeInTheDocument()
    expect(privateIcon).toBeInTheDocument()
  })

  it('should show lock status information', async () => {
    render(<WorkspaceDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Locked Bookmark')).toBeInTheDocument()
    })
    
    // Should show lock icon and status
    const lockIcon = screen.getByTitle('Locked')
    expect(lockIcon).toBeInTheDocument()
    
    expect(screen.getByText(/Locked by producer/)).toBeInTheDocument()
  })

  it('should prevent editing locked bookmarks by non-producers', async () => {
    const collaboratorSession = {
      user: {
        id: 'user2',
        name: 'Collaborator',
        email: 'collaborator@example.com',
        onboardingCompleted: true
      }
    }
    
    const workspaceWithCollaborator = {
      ...mockWorkspace,
      producer: { ...mockWorkspace.producer, id: 'user1' },
      memberships: [
        {
          id: 'membership2',
          role: 'collaborator',
          user: {
            id: 'user2',
            name: 'Collaborator',
            plexUsername: 'collaborator',
            plexAvatarUrl: null
          }
        }
      ]
    }
    
    mockUseSession.mockReturnValue({
      data: collaboratorSession,
      status: 'authenticated'
    } as any)
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, workspace: workspaceWithCollaborator })
    })
    
    render(<WorkspaceDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Locked Bookmark')).toBeInTheDocument()
    })
    
    // Should not show edit button for locked bookmark
    const editButtons = screen.getAllByTitle('Edit bookmark')
    expect(editButtons).toHaveLength(0) // No edit buttons for locked bookmarks
  })

  it('should search bookmarks by label and notes', async () => {
    const user = userEvent.setup()
    render(<WorkspaceDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Bookmark')).toBeInTheDocument()
    })
    
    // Type in search box
    const searchInput = screen.getByPlaceholderText('Search bookmarks...')
    await user.type(searchInput, 'Locked')
    
    // Should filter to show only locked bookmark
    expect(screen.queryByText('Test Bookmark')).not.toBeInTheDocument()
    expect(screen.getByText('Locked Bookmark')).toBeInTheDocument()
    
    // Clear search
    await user.clear(searchInput)
    
    // Should show all bookmarks again
    expect(screen.getByText('Test Bookmark')).toBeInTheDocument()
    expect(screen.getByText('Locked Bookmark')).toBeInTheDocument()
  })

  it('should redirect to login for unauthenticated users', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    } as any)
    
    render(<WorkspaceDetailPage />)
    
    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })

  it('should redirect to welcome for users without onboarding', () => {
    const sessionWithoutOnboarding = {
      user: {
        ...mockSession.user,
        onboardingCompleted: false
      }
    }
    
    mockUseSession.mockReturnValue({
      data: sessionWithoutOnboarding,
      status: 'authenticated'
    } as any)
    
    render(<WorkspaceDetailPage />)
    
    expect(mockRouter.push).toHaveBeenCalledWith('/welcome')
  })

  it('should handle workspace loading errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    
    render(<WorkspaceDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should handle workspace not found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false, error: 'Workspace not found' })
    })
    
    render(<WorkspaceDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Workspace Not Found')).toBeInTheDocument()
    })
  })
})
