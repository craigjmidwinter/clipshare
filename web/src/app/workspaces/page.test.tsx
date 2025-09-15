import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import WorkspacesPage from './page'

// Mock dependencies
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

const mockPush = vi.fn()
const mockRouter = {
  push: mockPush,
  back: vi.fn(),
}

const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    plexUsername: 'testuser',
    onboardingCompleted: true,
  },
}

// Mock fetch
global.fetch = vi.fn()

describe('WorkspacesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    } as any)
    vi.mocked(useRouter).mockReturnValue(mockRouter as any)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render loading state initially', async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<WorkspacesPage />)

    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
  })

  it('should render empty state when no workspaces', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        workspaces: [],
      }),
    } as any)

    render(<WorkspacesPage />)

    await waitFor(() => {
      expect(screen.getByText('No workspaces yet')).toBeInTheDocument()
      expect(screen.getByText('Create your first workspace to start collaborating on video content.')).toBeInTheDocument()
    })

    const createButton = screen.getByText('Create Your First Workspace')
    expect(createButton).toBeInTheDocument()
  })

  it('should render workspaces when available', async () => {
    const mockWorkspaces = [
      {
        id: 'workspace-1',
        title: 'Test Workspace',
        description: 'Test Description',
        contentType: 'movie',
        contentTitle: 'Test Movie',
        contentPoster: 'poster.jpg',
        contentDuration: 7200000,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        producer: {
          id: 'user-1',
          name: 'Test User',
          plexUsername: 'testuser',
          plexAvatarUrl: 'avatar.jpg',
        },
        memberships: [],
        _count: {
          bookmarks: 5,
          memberships: 3,
        },
      },
      {
        id: 'workspace-2',
        title: 'Another Workspace',
        description: null,
        contentType: 'episode',
        contentTitle: 'Test Episode',
        contentPoster: null,
        contentDuration: 1800000,
        createdAt: '2023-01-02T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
        producer: {
          id: 'user-1',
          name: 'Test User',
          plexUsername: 'testuser',
          plexAvatarUrl: 'avatar.jpg',
        },
        memberships: [],
        _count: {
          bookmarks: 2,
          memberships: 1,
        },
      },
    ]

    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        workspaces: mockWorkspaces,
      }),
    } as any)

    render(<WorkspacesPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument()
      expect(screen.getByText('Another Workspace')).toBeInTheDocument()
    })

    expect(screen.getByText('Test Movie')).toBeInTheDocument()
    expect(screen.getByText('Test Episode')).toBeInTheDocument()
    expect(screen.getByText('2h 0m')).toBeInTheDocument() // 7200000ms
    expect(screen.getByText('30m')).toBeInTheDocument() // 1800000ms
  })

  it('should handle workspace click navigation', async () => {
    const mockWorkspaces = [
      {
        id: 'workspace-1',
        title: 'Test Workspace',
        description: 'Test Description',
        contentType: 'movie',
        contentTitle: 'Test Movie',
        contentPoster: 'poster.jpg',
        contentDuration: 7200000,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        producer: {
          id: 'user-1',
          name: 'Test User',
          plexUsername: 'testuser',
          plexAvatarUrl: 'avatar.jpg',
        },
        memberships: [],
        _count: {
          bookmarks: 5,
          memberships: 3,
        },
      },
    ]

    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        workspaces: mockWorkspaces,
      }),
    } as any)

    render(<WorkspacesPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument()
    })

    const workspaceCard = screen.getByText('Test Workspace').closest('div')
    fireEvent.click(workspaceCard!)

    expect(mockPush).toHaveBeenCalledWith('/workspace/workspace-1')
  })

  it('should handle new workspace button click', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        workspaces: [],
      }),
    } as any)

    render(<WorkspacesPage />)

    await waitFor(() => {
      expect(screen.getByText('Create Your First Workspace')).toBeInTheDocument()
    })

    const newWorkspaceButton = screen.getByText('New Workspace')
    fireEvent.click(newWorkspaceButton)

    expect(mockPush).toHaveBeenCalledWith('/workspace/new')
  })

  it('should display Plex connection status', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        workspaces: [],
      }),
    } as any)

    render(<WorkspacesPage />)

    await waitFor(() => {
      expect(screen.getByText('Connected to Plex as: testuser')).toBeInTheDocument()
    })
  })

  it('should handle fetch errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

    render(<WorkspacesPage />)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should redirect to login when unauthenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as any)

    render(<WorkspacesPage />)

    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('should redirect to welcome when onboarding not completed', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        ...mockSession.user,
        onboardingCompleted: false,
      },
      status: 'authenticated',
    } as any)

    render(<WorkspacesPage />)

    expect(mockPush).toHaveBeenCalledWith('/welcome')
  })

  it('should handle sign out', async () => {
    const mockSignOut = vi.fn()
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      signOut: mockSignOut,
    } as any)

    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        workspaces: [],
      }),
    } as any)

    render(<WorkspacesPage />)

    await waitFor(() => {
      expect(screen.getByText('Sign out')).toBeInTheDocument()
    })

    const signOutButton = screen.getByText('Sign out')
    fireEvent.click(signOutButton)

    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/login' })
  })
})
