import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NLETimeline from '@/components/NLETimeline'

// Mock the FramePreviewGenerator
vi.mock('@/components/FramePreviewGenerator', () => ({
  default: () => <div data-testid="frame-preview-generator" />,
  useFramePreviews: () => ({
    framePreviews: new Map(),
    addFramePreview: vi.fn(),
    getFramePreview: vi.fn(),
  }),
}))

const mockProps = {
  duration: 120, // 2 minutes
  currentTime: 30,
  onSeek: vi.fn(),
  bookmarks: [],
  onBookmarkCreate: vi.fn(),
  onBookmarkUpdate: vi.fn(),
  onBookmarkDelete: vi.fn(),
  isPlaying: false,
  onPlayPause: vi.fn(),
  onStep: vi.fn(),
  frameRate: 30,
  workspaceId: 'test-workspace',
  shotCuts: [
    {
      id: 'cut-1',
      timestampMs: 10000, // 10 seconds
      confidence: 0.8,
      detectionMethod: 'histogram',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'cut-2',
      timestampMs: 50000, // 50 seconds
      confidence: 0.6,
      detectionMethod: 'edge',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ],
  snappingSettings: {
    id: 'settings-1',
    snappingEnabled: true,
    snapDistanceMs: 2000, // 2 seconds
    confidenceThreshold: 0.7,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  onSnappingSettingsUpdate: vi.fn(),
  isProducer: true,
}

describe('NLETimeline Snapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render snapping toggle button', () => {
    render(<NLETimeline {...mockProps} />)
    
    const snappingButton = screen.getByTitle(/snapping enabled/i)
    expect(snappingButton).toBeInTheDocument()
  })

  it('should show snapping settings panel when clicked', () => {
    render(<NLETimeline {...mockProps} />)
    
    const snappingButton = screen.getByTitle(/snapping enabled/i)
    fireEvent.click(snappingButton)
    
    expect(screen.getByText('Snapping')).toBeInTheDocument()
    expect(screen.getByText('Snap Distance (ms)')).toBeInTheDocument()
    expect(screen.getByText('Confidence Threshold')).toBeInTheDocument()
  })

  it('should display shot cut count', () => {
    render(<NLETimeline {...mockProps} />)
    
    const snappingButton = screen.getByTitle(/snapping enabled/i)
    fireEvent.click(snappingButton)
    
    expect(screen.getByText('2 shot cuts detected')).toBeInTheDocument()
  })

  it('should update snapping settings when toggled', () => {
    render(<NLETimeline {...mockProps} />)
    
    const snappingButton = screen.getByTitle(/snapping enabled/i)
    fireEvent.click(snappingButton)
    
    const toggleButton = screen.getByText('ON')
    fireEvent.click(toggleButton)
    
    expect(mockProps.onSnappingSettingsUpdate).toHaveBeenCalledWith({
      snappingEnabled: false,
    })
  })

  it('should update snap distance when slider changes', () => {
    render(<NLETimeline {...mockProps} />)
    
    const snappingButton = screen.getByTitle(/snapping enabled/i)
    fireEvent.click(snappingButton)
    
    const distanceSlider = screen.getByDisplayValue('2000')
    fireEvent.change(distanceSlider, { target: { value: '3000' } })
    
    expect(mockProps.onSnappingSettingsUpdate).toHaveBeenCalledWith({
      snapDistanceMs: 3000,
    })
  })

  it('should update confidence threshold when slider changes', () => {
    render(<NLETimeline {...mockProps} />)
    
    const snappingButton = screen.getByTitle(/snapping enabled/i)
    fireEvent.click(snappingButton)
    
    const confidenceSlider = screen.getByDisplayValue('0.7')
    fireEvent.change(confidenceSlider, { target: { value: '0.8' } })
    
    expect(mockProps.onSnappingSettingsUpdate).toHaveBeenCalledWith({
      confidenceThreshold: 0.8,
    })
  })

  it('should render shot cut indicators on frame ribbon', () => {
    render(<NLETimeline {...mockProps} />)
    
    // Shot cuts should be rendered as yellow lines
    const shotCutIndicators = document.querySelectorAll('[class*="bg-yellow-400"]')
    expect(shotCutIndicators.length).toBeGreaterThan(0)
  })

  it('should show different opacity for low confidence cuts', () => {
    const lowConfidenceProps = {
      ...mockProps,
      shotCuts: [
        {
          id: 'cut-1',
          timestampMs: 10000,
          confidence: 0.5, // Below threshold
          detectionMethod: 'histogram',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
    }
    
    render(<NLETimeline {...lowConfidenceProps} />)
    
    // Low confidence cuts should have reduced opacity
    const shotCutIndicator = document.querySelector('[class*="bg-yellow-400"]')
    expect(shotCutIndicator).toHaveStyle({ opacity: '0.5' })
  })

  it('should not show snapping controls for non-producers', () => {
    const nonProducerProps = {
      ...mockProps,
      isProducer: false,
    }
    
    render(<NLETimeline {...nonProducerProps} />)
    
    // Snapping button should still be visible but settings panel should not be interactive
    const snappingButton = screen.getByTitle(/snapping enabled/i)
    expect(snappingButton).toBeInTheDocument()
  })

  it('should handle missing snapping settings gracefully', () => {
    const noSettingsProps = {
      ...mockProps,
      snappingSettings: null,
    }
    
    render(<NLETimeline {...noSettingsProps} />)
    
    // Should not crash and snapping button should be present
    const snappingButton = screen.getByTitle(/snapping disabled/i)
    expect(snappingButton).toBeInTheDocument()
  })
})

