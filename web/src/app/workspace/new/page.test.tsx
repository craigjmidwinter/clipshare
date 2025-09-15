import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import NewWorkspacePage from './page'

// Mock dependencies
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

const mockPush = vi.fn()
const mockBack = vi.fn()
const mockRouter = {
  push: mockPush,
  back: mockBack,
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

describe('NewWorkspacePage', () => {
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

  it('should render loading state initially', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<NewWorkspacePage />)

    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
  })

  it('should render library selection step initially', async () => {
    const mockLibraries = [
      {
        key: '1',
        title: 'Movies',
        type: 'movie',
      },
      {
        key: '2',
        title: 'TV Shows',
        type: 'show',
      },
    ]

    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        libraries: mockLibraries,
      }),
    } as any)

    render(<NewWorkspacePage />)

    await waitFor(() => {
      expect(screen.getByText('Select a Plex Library')).toBeInTheDocument()
      expect(screen.getByText('Movies')).toBeInTheDocument()
      expect(screen.getByText('TV Shows')).toBeInTheDocument()
    })
  })

  it('should handle library selection', async () => {
    const mockLibraries = [
      {
        key: '1',
        title: 'Movies',
        type: 'movie',
      },
    ]

    const mockContent = [
      {
        key: 'movie-1',
        title: 'Test Movie',
        summary: 'A test movie',
        year: 2023,
        duration: 7200000,
        thumb: 'thumb.jpg',
        art: 'art.jpg',
        type: 'movie',
      },
    ]

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          libraries: mockLibraries,
        }),
      } as any)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          items: mockContent,
        }),
      } as any)

    render(<NewWorkspacePage />)

    await waitFor(() => {
      expect(screen.getByText('Movies')).toBeInTheDocument()
    })

    const moviesLibrary = screen.getByText('Movies').closest('button')
    fireEvent.click(moviesLibrary!)

    await waitFor(() => {
      expect(screen.getByText('Choose a Movie')).toBeInTheDocument()
      expect(screen.getByText('Test Movie')).toBeInTheDocument()
    })
  })

  it('should handle content selection', async () => {
    const mockLibraries = [
      {
        key: '1',
        title: 'Movies',
        type: 'movie',
      },
    ]

    const mockContent = [
      {
        key: 'movie-1',
        title: 'Test Movie',
        summary: 'A test movie',
        year: 2023,
        duration: 7200000,
        thumb: 'thumb.jpg',
        art: 'art.jpg',
        type: 'movie',
      },
    ]

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          libraries: mockLibraries,
        }),
      } as any)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          items: mockContent,
        }),
      } as any)

    render(<NewWorkspacePage />)

    // Select library
    await waitFor(() => {
      expect(screen.getByText('Movies')).toBeInTheDocument()
    })

    const moviesLibrary = screen.getByText('Movies').closest('button')
    fireEvent.click(moviesLibrary!)

    // Select content
    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeInTheDocument()
    })

    const movieCard = screen.getByText('Test Movie').closest('button')
    fireEvent.click(movieCard!)

    await waitFor(() => {
      expect(screen.getByText('Create Workspace')).toBeInTheDocument()
      expect(screen.getByText('Selected Content')).toBeInTheDocument()
    })
  })

  it('should handle workspace creation', async () => {
    const mockLibraries = [
      {
        key: '1',
        title: 'Movies',
        type: 'movie',
      },
    ]

    const mockContent = [
      {
        key: 'movie-1',
        title: 'Test Movie',
        summary: 'A test movie',
        year: 2023,
        duration: 7200000,
        thumb: 'thumb.jpg',
        art: 'art.jpg',
        type: 'movie',
      },
    ]

    const mockWorkspace = {
      id: 'workspace-1',
      title: 'My Workspace',
      description: 'A test workspace',
    }

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          libraries: mockLibraries,
        }),
      } as any)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          items: mockContent,
        }),
      } as any)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          workspace: mockWorkspace,
        }),
      } as any)

    render(<NewWorkspacePage />)

    // Navigate through steps
    await waitFor(() => {
      expect(screen.getByText('Movies')).toBeInTheDocument()
    })

    const moviesLibrary = screen.getByText('Movies').closest('button')
    fireEvent.click(moviesLibrary!)

    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeInTheDocument()
    })

    const movieCard = screen.getByText('Test Movie').closest('button')
    fireEvent.click(movieCard!)

    await waitFor(() => {
      expect(screen.getByText('Create Workspace')).toBeInTheDocument()
    })

    // Fill form and submit
    const titleInput = screen.getByDisplayValue('Test Movie')
    fireEvent.change(titleInput, { target: { value: 'My Workspace' } })

    const descriptionInput = screen.getByPlaceholderText('Describe what this workspace is for...')
    fireEvent.change(descriptionInput, { target: { value: 'A test workspace' } })

    const createButton = screen.getByText('Create Workspace')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/workspace/workspace-1')
    })
  })

  it('should handle search functionality', async () => {
    const mockLibraries = [
      {
        key: '1',
        title: 'Movies',
        type: 'movie',
      },
    ]

    const mockContent = [
      {
        key: 'movie-1',
        title: 'Test Movie',
        summary: 'A test movie',
        year: 2023,
        duration: 7200000,
        thumb: 'thumb.jpg',
        art: 'art.jpg',
        type: 'movie',
      },
    ]

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          libraries: mockLibraries,
        }),
      } as any)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          items: mockContent,
        }),
      } as any)

    render(<NewWorkspacePage />)

    // Select library
    await waitFor(() => {
      expect(screen.getByText('Movies')).toBeInTheDocument()
    })

    const moviesLibrary = screen.getByText('Movies').closest('button')
    fireEvent.click(moviesLibrary!)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search movies...')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search movies...')
    fireEvent.change(searchInput, { target: { value: 'test' } })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test')
      )
    })
  })

  it('should handle back navigation', async () => {
    const mockLibraries = [
      {
        key: '1',
        title: 'Movies',
        type: 'movie',
      },
    ]

    const mockContent = [
      {
        key: 'movie-1',
        title: 'Test Movie',
        summary: 'A test movie',
        year: 2023,
        duration: 7200000,
        thumb: 'thumb.jpg',
        art: 'art.jpg',
        type: 'movie',
      },
    ]

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          libraries: mockLibraries,
        }),
      } as any)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          items: mockContent,
        }),
      } as any)

    render(<NewWorkspacePage />)

    // Navigate to content step
    await waitFor(() => {
      expect(screen.getByText('Movies')).toBeInTheDocument()
    })

    const moviesLibrary = screen.getByText('Movies').closest('button')
    fireEvent.click(moviesLibrary!)

    await waitFor(() => {
      expect(screen.getByText('Change Library')).toBeInTheDocument()
    })

    const changeLibraryButton = screen.getByText('Change Library')
    fireEvent.click(changeLibraryButton)

    await waitFor(() => {
      expect(screen.getByText('Select a Plex Library')).toBeInTheDocument()
    })
  })

  it('should handle fetch errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

    render(<NewWorkspacePage />)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should redirect to login when unauthenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as any)

    render(<NewWorkspacePage />)

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

    render(<NewWorkspacePage />)

    expect(mockPush).toHaveBeenCalledWith('/welcome')
  })
})
