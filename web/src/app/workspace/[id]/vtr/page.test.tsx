import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import VTRControlPage from './page'

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn()
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn()
}))

// Mock OBS WebSocket
vi.mock('obs-websocket-js', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      call: vi.fn().mockImplementation((method, params) => {
        if (method === 'GetVersion') {
          return Promise.resolve({ version: '1.0.0' })
        }
        if (method === 'GetInputSettings') {
          return Promise.resolve({
            inputSettings: {
              looping: false,
              is_local_file: false,
              local_file: '',
              restart_on_activate: false,
              close_when_inactive: true,
              hw_decode: true,
              show_nothing_when_inactive: true,
              speed_percent: 100,
              clear_on_media_end: true,
              linear_alpha: false
            }
          })
        }
        if (method === 'SetInputSettings') {
          return Promise.resolve(undefined)
        }
        if (method === 'TriggerMediaInputAction') {
          return Promise.resolve(undefined)
        }
        if (method === 'GetCurrentProgramScene') {
          return Promise.resolve({ currentProgramSceneName: 'Scene 1' })
        }
        if (method === 'GetSceneItemList') {
          return Promise.resolve({ sceneItems: [] })
        }
        if (method === 'CreateInput') {
          return Promise.resolve(undefined)
        }
        if (method === 'RemoveInput') {
          return Promise.resolve(undefined)
        }
        if (method === 'CreateSceneItem') {
          return Promise.resolve({ sceneItemId: 1 })
        }
        if (method === 'SetSceneItemTransform') {
          return Promise.resolve(undefined)
        }
        if (method === 'SetInputVolume') {
          return Promise.resolve(undefined)
        }
        if (method === 'ToggleInputMute') {
          return Promise.resolve(undefined)
        }
        return Promise.resolve(undefined)
      }),
      on: vi.fn()
    }))
  }
})

// Mock fetch
global.fetch = vi.fn()

describe('VTRControlPage', () => {
  const mockSession = {
    user: { id: 'user1', name: 'Test User' }
  }

  const mockWorkspace = {
    id: 'workspace1',
    title: 'Test Workspace',
    description: 'Test Description',
    contentType: 'movie',
    contentTitle: 'Test Movie',
    contentPoster: null,
    contentDuration: 60000,
    processingStatus: 'completed',
    processingProgress: 100,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    producer: {
      id: 'user1',
      name: 'Test Producer',
      plexUsername: 'producer',
      plexAvatarUrl: null
    },
    memberships: [],
    bookmarks: [
      {
        id: 'bookmark1',
        label: 'Test Clip',
        publicNotes: null,
        privateNotes: null,
        startMs: 10000,
        endMs: 20000,
        lockedById: null,
        lockedAt: null,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        createdBy: {
          id: 'user1',
          name: 'Test User',
          plexUsername: 'testuser',
          plexAvatarUrl: null
        }
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock session
    ;(useSession as any).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    // Mock router
    ;(useRouter as any).mockReturnValue({
      push: vi.fn(),
      back: vi.fn()
    })

    // Mock params
    ;(useParams as any).mockReturnValue({
      id: 'workspace1'
    })

    // Mock fetch for workspace data and other API calls
    ;(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          workspace: mockWorkspace
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          workspace: mockWorkspace
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          workspace: mockWorkspace
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          token: 'test-token'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test zip content']))
      })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          token: 'test-token'
        })
      })
  })

  it('should render VTR control page', async () => {
    render(<VTRControlPage />)
    
    await waitFor(() => {
      expect(screen.getByText('VTR Control - Test Workspace')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Connect to OBS')).toBeInTheDocument()
  })

  it('should connect to OBS and show controls', async () => {
    render(<VTRControlPage />)
    
    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText('Connect to OBS')).toBeInTheDocument()
    })

    // Click connect button
    const connectButton = screen.getByText('Connect to OBS')
    fireEvent.click(connectButton)

    // Wait for connection
    await waitFor(() => {
      expect(screen.getByText('OBS Connected')).toBeInTheDocument()
    })

    // Check that loop button is present and shows correct state
    const loopButton = screen.getByText('Loop')
    expect(loopButton).toBeInTheDocument()
    expect(loopButton).toHaveClass('bg-gray-200') // Should be disabled by default
  })

  it('should toggle looping setting correctly', async () => {
    render(<VTRControlPage />)
    
    // Wait for page to load and connect
    await waitFor(() => {
      expect(screen.getByText('Connect to OBS')).toBeInTheDocument()
    })

    const connectButton = screen.getByText('Connect to OBS')
    fireEvent.click(connectButton)

    await waitFor(() => {
      expect(screen.getByText('OBS Connected')).toBeInTheDocument()
    })

    // Find and click the loop button
    const loopButton = screen.getByText('Loop')
    fireEvent.click(loopButton)

    // Check that the button state changed
    await waitFor(() => {
      expect(loopButton).toHaveClass('bg-orange-600')
    })
  })

  it('should play clips with correct looping setting', async () => {
    render(<VTRControlPage />)
    
    // Wait for page to load and connect
    await waitFor(() => {
      expect(screen.getByText('Connect to OBS')).toBeInTheDocument()
    })

    const connectButton = screen.getByText('Connect to OBS')
    fireEvent.click(connectButton)

    await waitFor(() => {
      expect(screen.getByText('OBS Connected')).toBeInTheDocument()
    })

    // Click on a clip to play it (use getAllByText to get the first one which is the button)
    const clipButtons = screen.getAllByText('Test Clip')
    const clipButton = clipButtons[0] // First one is the clickable button
    fireEvent.click(clipButton)

    // The clip should start playing
    await waitFor(() => {
      expect(screen.getByText('Playing: Test Clip')).toBeInTheDocument()
    })
  })
})
