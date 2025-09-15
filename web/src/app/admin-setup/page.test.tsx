import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import AdminSetupPage from '@/app/admin-setup/page'

// Mock fetch
global.fetch = vi.fn()

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('AdminSetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Ensure fetch is properly mocked
    global.fetch = vi.fn()
  })

  it('renders admin setup page', () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isConfigured: false }),
    } as Response)

    render(<AdminSetupPage />)
    
    expect(screen.getByText('Clipshare Admin Setup')).toBeInTheDocument()
    expect(screen.getByText('Configure Plex server connection for your organization')).toBeInTheDocument()
  })

  it('redirects to login if Plex is already configured', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isConfigured: true }),
    } as Response)

    render(<AdminSetupPage />)
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })
})
