import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import WelcomeWizard from '@/app/welcome/page'

// Mock fetch
global.fetch = vi.fn()

describe('WelcomeWizard', () => {
  it('renders welcome step initially', () => {
    render(<WelcomeWizard />)
    
    expect(screen.getByText('Welcome to Clipshare!')).toBeInTheDocument()
    expect(screen.getByText('Get Started')).toBeInTheDocument()
  })

  it('progresses through wizard steps', () => {
    render(<WelcomeWizard />)
    
    // Step 1: Welcome
    expect(screen.getByText('Welcome to Clipshare!')).toBeInTheDocument()
    
    // Go to step 2
    const getStartedButton = screen.getByText('Get Started')
    fireEvent.click(getStartedButton)
    
    expect(screen.getByText('Plex Server Configuration')).toBeInTheDocument()
    expect(screen.getByLabelText('Server URL')).toBeInTheDocument()
    expect(screen.getByLabelText('Server Token')).toBeInTheDocument()
  })
})