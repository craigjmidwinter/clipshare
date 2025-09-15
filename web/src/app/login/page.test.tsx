import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { signIn, getSession } from 'next-auth/react'
import LoginPage from './page'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  getSession: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

const mockRouter = {
  push: vi.fn(),
}

const mockSignIn = vi.mocked(signIn)
const mockGetSession = vi.mocked(getSession)
const mockFetch = vi.mocked(fetch)

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue(mockRouter)
  })

  it('should render login form when Plex is configured', async () => {
    // Mock Plex status check
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ isConfigured: true }),
    } as Response)

    // Mock session check
    mockGetSession.mockResolvedValue(null)

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Sign in with Plex')).toBeInTheDocument()
    })

    expect(screen.getByText('Clipshare')).toBeInTheDocument()
    expect(screen.getByText('Internal Video Collaboration Tool')).toBeInTheDocument()
  })

  it('should redirect to admin-setup when Plex is not configured', async () => {
    // Mock Plex status check
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ isConfigured: false }),
    } as Response)

    render(<LoginPage />)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/admin-setup')
    })
  })

  it('should redirect to workspaces when user is already logged in and onboarded', async () => {
    // Mock Plex status check
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ isConfigured: true }),
    } as Response)

    // Mock session check
    mockGetSession.mockResolvedValue({
      user: {
        onboardingCompleted: true,
      },
    } as any)

    render(<LoginPage />)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/workspaces')
    })
  })

  it('should redirect to welcome when user is logged in but not onboarded', async () => {
    // Mock Plex status check
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ isConfigured: true }),
    } as Response)

    // Mock session check
    mockGetSession.mockResolvedValue({
      user: {
        onboardingCompleted: false,
      },
    } as any)

    render(<LoginPage />)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/welcome')
    })
  })

  it('should initiate Plex PIN authentication flow', async () => {
    // Mock Plex status check
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ isConfigured: true }),
    } as Response)

    // Mock session check
    mockGetSession.mockResolvedValue(null)

    // Mock PIN generation
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        pinId: 'pin-id',
        pinCode: 'ABCD',
        authUrl: 'https://app.plex.tv/auth#?code=ABCD',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }),
    } as Response)

    // Mock window.open
    const mockOpen = vi.fn()
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true,
    })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Sign in with Plex')).toBeInTheDocument()
    })

    const plexButton = screen.getByText('Sign in with Plex')
    fireEvent.click(plexButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/plex/pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })

    await waitFor(() => {
      expect(screen.getByText('ABCD')).toBeInTheDocument()
      expect(screen.getByText('Enter this code on plex.tv:')).toBeInTheDocument()
    })

    expect(mockOpen).toHaveBeenCalledWith(
      'https://app.plex.tv/auth#?code=ABCD',
      'plex-auth',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    )
  })

  it('should handle Plex authentication errors', async () => {
    // Mock Plex status check
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ isConfigured: true }),
    } as Response)

    // Mock session check
    mockGetSession.mockResolvedValue(null)

    // Mock PIN generation failure
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: false,
        error: 'Failed to generate PIN',
      }),
    } as Response)

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Sign in with Plex')).toBeInTheDocument()
    })

    const plexButton = screen.getByText('Sign in with Plex')
    fireEvent.click(plexButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to generate Plex PIN')).toBeInTheDocument()
    })
  })

  it('should show credentials form when toggle is clicked', async () => {
    // Mock Plex status check
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ isConfigured: true }),
    } as Response)

    // Mock session check
    mockGetSession.mockResolvedValue(null)

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Sign in with Plex')).toBeInTheDocument()
    })

    const toggleButton = screen.getByText('Show email/password sign in')
    fireEvent.click(toggleButton)

    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByText('Hide email/password sign in')).toBeInTheDocument()
  })

  it('should handle credentials sign in', async () => {
    // Mock Plex status check
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ isConfigured: true }),
    } as Response)

    // Mock session check
    mockGetSession.mockResolvedValue(null)

    // Mock successful sign in
    mockSignIn.mockResolvedValue({
      ok: true,
      error: null,
    } as any)

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Sign in with Plex')).toBeInTheDocument()
    })

    // Show credentials form
    const toggleButton = screen.getByText('Show email/password sign in')
    fireEvent.click(toggleButton)

    // Fill in credentials
    const emailInput = screen.getByPlaceholderText('Email address')
    const passwordInput = screen.getByPlaceholderText('Password')
    const signInButton = screen.getByText('Sign in')

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(signInButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
      })
    })

    expect(mockRouter.push).toHaveBeenCalledWith('/workspaces')
  })
})