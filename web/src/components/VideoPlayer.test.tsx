import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VideoPlayer from './VideoPlayer'

// Mock HLS.js
vi.mock('hls.js', () => {
  const mockHls = {
    destroy: vi.fn(),
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    on: vi.fn(),
    startLoad: vi.fn(),
    recoverMediaError: vi.fn()
  }

  const mockHlsClass = vi.fn(() => mockHls)
  mockHlsClass.isSupported = vi.fn(() => true)

  return {
    default: mockHlsClass,
    Events: {
      MEDIA_ATTACHED: 'hls:media-attached',
      MANIFEST_PARSED: 'hls:manifest-parsed',
      ERROR: 'hls:error'
    },
    ErrorTypes: {
      NETWORK_ERROR: 'networkError',
      MEDIA_ERROR: 'mediaError'
    }
  }
})

// Mock video element methods
const mockVideoElement = {
  play: vi.fn(),
  pause: vi.fn(),
  requestFullscreen: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  canPlayType: vi.fn(() => ''),
  currentTime: 0,
  duration: 100,
  volume: 1,
  paused: true
}

// Mock HTMLVideoElement
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: mockVideoElement.play
})

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: mockVideoElement.pause
})

Object.defineProperty(HTMLVideoElement.prototype, 'requestFullscreen', {
  writable: true,
  value: mockVideoElement.requestFullscreen
})

Object.defineProperty(HTMLVideoElement.prototype, 'addEventListener', {
  writable: true,
  value: mockVideoElement.addEventListener
})

Object.defineProperty(HTMLVideoElement.prototype, 'removeEventListener', {
  writable: true,
  value: mockVideoElement.removeEventListener
})

Object.defineProperty(HTMLVideoElement.prototype, 'canPlayType', {
  writable: true,
  value: mockVideoElement.canPlayType
})

// Mock document methods
Object.defineProperty(document, 'fullscreenElement', {
  writable: true,
  value: null
})

Object.defineProperty(document, 'exitFullscreen', {
  writable: true,
  value: vi.fn()
})

describe('VideoPlayer', () => {
  const defaultProps = {
    workspaceId: 'workspace-1',
    plexKey: '/library/metadata/123',
    plexServerId: 'server-1',
    contentDuration: 100000,
    onBookmarkCreate: vi.fn(),
    bookmarks: [],
    currentUserId: 'user-1'
  }

  let mockHlsClass: any
  let mockHls: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockVideoElement.currentTime = 0
    mockVideoElement.duration = 100
    mockVideoElement.volume = 1
    mockVideoElement.paused = true
    
    // Get the mocked HLS class
    const HlsModule = await import('hls.js')
    mockHlsClass = HlsModule.default
    mockHls = mockHlsClass()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render video player with loading state initially', () => {
    render(<VideoPlayer {...defaultProps} />)
    
    expect(screen.getByText('Loading video...')).toBeInTheDocument()
    expect(screen.getByRole('video')).toBeInTheDocument()
  })

  it('should initialize HLS.js when supported', async () => {
    render(<VideoPlayer {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockHlsClass).toHaveBeenCalledWith({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
        debug: false
      })
    })
    
    expect(mockHls.loadSource).toHaveBeenCalledWith('/api/plex/hls?key=/library/metadata/123&serverId=server-1')
    expect(mockHls.attachMedia).toHaveBeenCalled()
  })

  it('should handle HLS manifest parsed event', async () => {
    render(<VideoPlayer {...defaultProps} />)
    
    // Simulate HLS manifest parsed event
    const manifestParsedCallback = mockHls.on.mock.calls.find(
      call => call[0] === 'hls:manifest-parsed'
    )?.[1]
    
    if (manifestParsedCallback) {
      manifestParsedCallback()
    }
    
    await waitFor(() => {
      expect(screen.queryByText('Loading video...')).not.toBeInTheDocument()
    })
  })

  it('should handle HLS network errors with recovery', async () => {
    render(<VideoPlayer {...defaultProps} />)
    
    // Simulate HLS network error
    const errorCallback = mockHls.on.mock.calls.find(
      call => call[0] === 'hls:error'
    )?.[1]
    
    if (errorCallback) {
      errorCallback('hls:error', {
        type: 'networkError',
        fatal: true
      })
    }
    
    expect(mockHls.startLoad).toHaveBeenCalled()
  })

  it('should handle HLS media errors with recovery', async () => {
    render(<VideoPlayer {...defaultProps} />)
    
    // Simulate HLS media error
    const errorCallback = mockHls.on.mock.calls.find(
      call => call[0] === 'hls:error'
    )?.[1]
    
    if (errorCallback) {
      errorCallback('hls:error', {
        type: 'mediaError',
        fatal: true
      })
    }
    
    expect(mockHls.recoverMediaError).toHaveBeenCalled()
  })

  it('should show error message for fatal HLS errors', async () => {
    render(<VideoPlayer {...defaultProps} />)
    
    // Simulate fatal HLS error
    const errorCallback = mockHls.on.mock.calls.find(
      call => call[0] === 'hls:error'
    )?.[1]
    
    if (errorCallback) {
      errorCallback('hls:error', {
        type: 'otherError',
        fatal: true
      })
    }
    
    await waitFor(() => {
      expect(screen.getByText('Video playback failed. Please try again.')).toBeInTheDocument()
    })
  })

  it('should use native HLS support on Safari', async () => {
    mockHlsClass.isSupported.mockReturnValue(false)
    mockVideoElement.canPlayType.mockReturnValue('application/vnd.apple.mpegurl')
    
    render(<VideoPlayer {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockHlsClass).not.toHaveBeenCalled()
    })
  })

  it('should fallback to direct proxy when HLS is not supported', async () => {
    mockHlsClass.isSupported.mockReturnValue(false)
    mockVideoElement.canPlayType.mockReturnValue('')
    
    render(<VideoPlayer {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockHlsClass).not.toHaveBeenCalled()
    })
  })

  it('should handle play/pause functionality', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...defaultProps} />)
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading video...')).not.toBeInTheDocument()
    })
    
    const playButton = screen.getByRole('button', { name: /play/i })
    await user.click(playButton)
    
    expect(mockVideoElement.play).toHaveBeenCalled()
  })

  it('should handle volume changes', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...defaultProps} />)
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading video...')).not.toBeInTheDocument()
    })
    
    const volumeSlider = screen.getByRole('slider', { name: /vol/i })
    await user.type(volumeSlider, '0.5')
    
    expect(mockVideoElement.volume).toBe(0.5)
  })

  it('should handle seeking', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...defaultProps} />)
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading video...')).not.toBeInTheDocument()
    })
    
    const progressSlider = screen.getByRole('slider')
    await user.type(progressSlider, '50')
    
    expect(mockVideoElement.currentTime).toBe(50)
  })

  it('should handle fullscreen toggle', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...defaultProps} />)
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading video...')).not.toBeInTheDocument()
    })
    
    const fullscreenButton = screen.getByRole('button', { name: /fullscreen/i })
    await user.click(fullscreenButton)
    
    expect(mockVideoElement.requestFullscreen).toHaveBeenCalled()
  })

  it('should handle bookmark creation', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...defaultProps} />)
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading video...')).not.toBeInTheDocument()
    })
    
    const bookmarkButton = screen.getByRole('button', { name: /bookmark/i })
    await user.click(bookmarkButton)
    
    // Should show bookmark modal
    expect(screen.getByText('Create Bookmark')).toBeInTheDocument()
  })

  it('should handle keyboard shortcuts', async () => {
    render(<VideoPlayer {...defaultProps} />)
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading video...')).not.toBeInTheDocument()
    })
    
    // Test spacebar for play/pause
    fireEvent.keyDown(document, { key: ' ' })
    expect(mockVideoElement.play).toHaveBeenCalled()
    
    // Test 'I' for bookmark start
    fireEvent.keyDown(document, { key: 'I' })
    expect(screen.getByText(/selecting range/i)).toBeInTheDocument()
  })

  it('should clean up HLS instance on unmount', () => {
    const { unmount } = render(<VideoPlayer {...defaultProps} />)
    
    unmount()
    
    expect(mockHls.destroy).toHaveBeenCalled()
  })

  it('should display bookmarks on progress bar', () => {
    const bookmarks = [
      {
        id: '1',
        label: 'Test Bookmark',
        publicNotes: null,
        privateNotes: null,
        startMs: 10000,
        endMs: 20000,
        createdBy: {
          id: 'user-1',
          plexUsername: 'testuser'
        }
      }
    ]
    
    render(<VideoPlayer {...defaultProps} bookmarks={bookmarks} />)
    
    // Wait for loading to complete
    waitFor(() => {
      expect(screen.queryByText('Loading video...')).not.toBeInTheDocument()
    })
    
    // Bookmark should be rendered as a blue bar on the progress slider
    const bookmarkBar = screen.getByTitle('Test Bookmark - 0:10 - 0:20')
    expect(bookmarkBar).toBeInTheDocument()
  })
})