import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import NLETimeline from './NLETimeline'

// Mock the FramePreviewGenerator component
const MockFramePreviewGenerator = () => (
  <div style={{ height: '48px', background: 'linear-gradient(90deg, #666, #888)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px' }}>
    Frame Preview Generator (Mocked)
  </div>
)

// Mock the useFramePreviews hook
const mockUseFramePreviews = () => ({
  framePreviews: new Map(),
  addFramePreview: () => {},
  getFramePreview: () => null,
})

// Mock the FramePreviewGenerator module
jest.mock('./FramePreviewGenerator', () => ({
  __esModule: true,
  default: MockFramePreviewGenerator,
  useFramePreviews: mockUseFramePreviews,
}))

const meta: Meta<typeof NLETimeline> = {
  title: 'Components/NLETimeline',
  component: NLETimeline,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A professional NLE-style timeline component for video editing with bookmark management and drag functionality.',
      },
    },
  },
  argTypes: {
    duration: {
      control: { type: 'number', min: 1, max: 7200 },
      description: 'Duration of the video in seconds',
    },
    frameRate: {
      control: { type: 'number', min: 24, max: 60 },
      description: 'Frame rate of the video',
    },
    currentTime: {
      control: { type: 'number', min: 0, max: 100 },
      description: 'Current playback time in seconds',
    },
    onSeek: {
      action: 'seeked',
      description: 'Callback when user seeks to a new time',
    },
    onBookmarkCreate: {
      action: 'bookmark created',
      description: 'Callback when a new bookmark is created',
    },
    onBookmarkUpdate: {
      action: 'bookmark updated',
      description: 'Callback when a bookmark is updated',
    },
    onBookmarkDelete: {
      action: 'bookmark deleted',
      description: 'Callback when a bookmark is deleted',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const mockBookmarks = [
  {
    id: 'bookmark-1',
    label: 'Opening Scene',
    startMs: 5000, // 5 seconds
    endMs: 15000,  // 15 seconds
    createdBy: {
      id: 'user-1',
      name: 'John Doe',
      plexUsername: 'johndoe',
    },
    lockedById: null,
    lockedAt: null,
  },
  {
    id: 'bookmark-2',
    label: 'Action Sequence',
    startMs: 30000, // 30 seconds
    endMs: 45000,   // 45 seconds
    createdBy: {
      id: 'user-2',
      name: 'Jane Smith',
      plexUsername: 'janesmith',
    },
    lockedById: null,
    lockedAt: null,
  },
  {
    id: 'bookmark-3',
    label: 'Locked Bookmark',
    startMs: 60000, // 60 seconds
    endMs: 75000,   // 75 seconds
    createdBy: {
      id: 'user-3',
      name: 'Bob Wilson',
      plexUsername: 'bobwilson',
    },
    lockedById: 'user-3',
    lockedAt: new Date().toISOString(),
  },
]

export const Default: Story = {
  args: {
    duration: 120, // 2 minutes
    frameRate: 30,
    currentTime: 0,
    videoElement: null,
    bookmarks: mockBookmarks,
    onSeek: () => {},
    onBookmarkCreate: () => {},
    onBookmarkUpdate: () => {},
    onBookmarkDelete: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic timeline with sample bookmarks. Try dragging the bookmark bodies and handles.',
      },
    },
  },
}

export const LongVideo: Story = {
  args: {
    duration: 3600, // 1 hour
    frameRate: 30,
    currentTime: 1800, // 30 minutes in
    videoElement: null,
    bookmarks: [
      {
        id: 'bookmark-long-1',
        label: 'Chapter 1',
        startMs: 0,
        endMs: 900000, // 15 minutes
        createdBy: {
          id: 'user-1',
          name: 'Editor',
          plexUsername: 'editor',
        },
        lockedById: null,
        lockedAt: null,
      },
      {
        id: 'bookmark-long-2',
        label: 'Chapter 2',
        startMs: 900000, // 15 minutes
        endMs: 1800000, // 30 minutes
        createdBy: {
          id: 'user-1',
          name: 'Editor',
          plexUsername: 'editor',
        },
        lockedById: null,
        lockedAt: null,
      },
    ],
    onSeek: () => {},
    onBookmarkCreate: () => {},
    onBookmarkUpdate: () => {},
    onBookmarkDelete: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Timeline for a long video (1 hour) with chapter bookmarks. Notice how the zoom and scroll work with longer content.',
      },
    },
  },
}

export const NoBookmarks: Story = {
  args: {
    duration: 60, // 1 minute
    frameRate: 30,
    currentTime: 0,
    videoElement: null,
    bookmarks: [],
    onSeek: () => {},
    onBookmarkCreate: () => {},
    onBookmarkUpdate: () => {},
    onBookmarkDelete: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty timeline with no bookmarks. Click to seek, use Ctrl/Cmd+Click for IN point, Shift+Click for OUT point.',
      },
    },
  },
}

export const InteractiveDragTest: Story = {
  args: {
    duration: 120,
    frameRate: 30,
    currentTime: 30,
    videoElement: null,
    bookmarks: mockBookmarks,
    onSeek: () => {},
    onBookmarkCreate: () => {},
    onBookmarkUpdate: () => {},
    onBookmarkDelete: () => {},
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    
    // Test bookmark body drag
    const bookmarkBody = canvas.getByTitle('Opening Scene - 0:05:00 → 0:15:00')
    await userEvent.pointer([
      { keys: '[MouseLeft>]', target: bookmarkBody },
      { coords: { x: 100, y: 50 } },
      { keys: '[/MouseLeft]' }
    ])
    
    // Verify that onBookmarkUpdate was called
    expect(args.onBookmarkUpdate).toHaveBeenCalled()
    
    // Test bookmark handle drag
    const startHandle = canvas.getByTitle('Adjust start time: 0:05:00')
    await userEvent.pointer([
      { keys: '[MouseLeft>]', target: startHandle },
      { coords: { x: 80, y: 50 } },
      { keys: '[/MouseLeft]' }
    ])
    
    // Verify that onBookmarkUpdate was called for handle drag
    expect(args.onBookmarkUpdate).toHaveBeenCalled()
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive test that automatically performs drag operations to verify functionality.',
      },
    },
  },
}

export const ZoomTest: Story = {
  args: {
    duration: 300, // 5 minutes
    frameRate: 30,
    currentTime: 0,
    videoElement: null,
    bookmarks: mockBookmarks,
    onSeek: () => {},
    onBookmarkCreate: () => {},
    onBookmarkUpdate: () => {},
    onBookmarkDelete: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // Test zoom in
    const zoomInButton = canvas.getByTitle('Zoom in')
    await userEvent.click(zoomInButton)
    
    // Test zoom out
    const zoomOutButton = canvas.getByTitle('Zoom out')
    await userEvent.click(zoomOutButton)
    
    // Test fit to window
    const fitButton = canvas.getByTitle('Fit to window')
    await userEvent.click(fitButton)
  },
  parameters: {
    docs: {
      description: {
        story: 'Test the zoom functionality - zoom in, zoom out, and fit to window.',
      },
    },
  },
}
