# Clipshare Testing Guide

Comprehensive guide to testing strategies, tools, and best practices for Clipshare development.

## 📖 Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Stack](#testing-stack)
3. [Test Structure](#test-structure)
4. [Unit Testing](#unit-testing)
5. [Integration Testing](#integration-testing)
6. [API Testing](#api-testing)
7. [Component Testing](#component-testing)
8. [End-to-End Testing](#end-to-end-testing)
9. [Testing Patterns](#testing-patterns)
10. [Mocking Strategies](#mocking-strategies)
11. [Coverage Requirements](#coverage-requirements)
12. [Performance Testing](#performance-testing)
13. [CI/CD Integration](#cicd-integration)

## Testing Philosophy

### Core Principles

**1. Test Pyramid:**
- **Unit Tests (70%)**: Fast, isolated, comprehensive
- **Integration Tests (20%)**: API routes, database interactions
- **End-to-End Tests (10%)**: Critical user workflows

**2. Testing Mindset:**
- Write tests that document behavior
- Test business logic, not implementation details
- Focus on user-facing functionality
- Maintain tests as first-class code

**3. Quality Gates:**
- All tests must pass before merging
- Maintain 95%+ code coverage
- No regressions in critical paths
- Performance benchmarks maintained

## Testing Stack

### Core Testing Framework
```json
{
  "test-runner": "Vitest 3.2.4",
  "assertions": "Vitest built-in (Chai-compatible)",
  "mocking": "Vitest vi utilities",
  "coverage": "v8 (default)",
  "component-testing": "React Testing Library",
  "dom-testing": "@testing-library/jest-dom"
}
```

### Testing Configuration

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95
      },
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.stories.{ts,tsx}'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

**Test Setup (src/test/setup.ts):**
```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/'
  })
}))

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated'
  })),
  getSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn()
}))

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    workspace: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    bookmark: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}))

// Global test utilities
global.fetch = vi.fn()
```

## Test Structure

### Directory Organization

```
src/
├── test/
│   ├── setup.ts              # Global test configuration
│   ├── utils/                # Test utilities and helpers
│   │   ├── factories.ts      # Data factories
│   │   ├── mocks.ts          # Mock implementations
│   │   └── render.tsx        # Custom render utilities
│   └── fixtures/             # Test data and fixtures
│       ├── users.json
│       ├── workspaces.json
│       └── bookmarks.json
├── components/
│   ├── Button.tsx
│   ├── Button.test.tsx       # Component tests
│   └── Button.stories.tsx    # Storybook stories
├── app/api/
│   ├── workspaces/
│   │   ├── route.ts
│   │   └── route.test.ts     # API route tests
│   └── bookmarks/
│       ├── route.ts
│       └── route.test.ts
└── lib/
    ├── auth.ts
    ├── auth.test.ts          # Utility tests
    ├── processing-service.ts
    └── processing-service.test.ts
```

### Naming Conventions

**Test Files:**
- `Component.test.tsx` - Component tests
- `route.test.ts` - API route tests  
- `utility.test.ts` - Utility function tests
- `integration.test.ts` - Integration tests
- `e2e.test.ts` - End-to-end tests

**Test Descriptions:**
```typescript
describe('Component/Function Name', () => {
  describe('when condition', () => {
    it('should expected behavior', () => {
      // Test implementation
    })
  })
})
```

## Unit Testing

### Testing Utilities

**Test Factories (src/test/utils/factories.ts):**
```typescript
import { User, Workspace, Bookmark } from '@prisma/client'

export const createMockUser = (overrides = {}): User => ({
  id: 'user_123',
  plexUserId: 'plex_456',
  plexUsername: 'testuser',
  plexEmail: 'test@example.com',
  plexAvatarUrl: 'https://plex.tv/avatar.jpg',
  onboardingCompleted: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
})

export const createMockWorkspace = (overrides = {}): Workspace => ({
  id: 'ws_123',
  producerId: 'user_123',
  plexKey: '/library/metadata/12345',
  plexServerId: 'server_abc',
  title: 'Test Workspace',
  description: 'A test workspace',
  contentType: 'episode',
  contentTitle: 'Test Episode',
  contentPoster: 'https://plex.tv/poster.jpg',
  contentDuration: 1800000,
  processingStatus: 'complete',
  processingProgress: 100,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
})

export const createMockBookmark = (overrides = {}): Bookmark => ({
  id: 'bm_123',
  workspaceId: 'ws_123',
  createdBy: 'user_123',
  label: 'Test Bookmark',
  publicNotes: 'Public note',
  privateNotes: 'Private note',
  startMs: 60000,
  endMs: 75000,
  lockedBy: null,
  lockedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
})
```

### Utility Function Testing

**Example: Testing auth utility (src/lib/auth.test.ts):**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getServerSession } from 'next-auth'
import { requireAuth, getUserFromSession } from './auth'
import { createMockUser } from '@/test/utils/factories'

vi.mock('next-auth')
vi.mock('@/lib/prisma')

describe('auth utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requireAuth', () => {
    it('should return user when session exists', async () => {
      const mockUser = createMockUser()
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUser.id }
      } as any)
      
      const result = await requireAuth()
      
      expect(result).toEqual(mockUser)
    })

    it('should throw error when no session', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)
      
      await expect(requireAuth()).rejects.toThrow('Unauthorized')
    })
  })

  describe('getUserFromSession', () => {
    it('should return user data from valid session', async () => {
      const mockUser = createMockUser()
      const session = { user: { id: mockUser.id } }
      
      const result = await getUserFromSession(session as any)
      
      expect(result).toEqual(mockUser)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id }
      })
    })
  })
})
```

### Business Logic Testing

**Example: Testing processing service:**
```typescript
import { describe, it, expect, vi } from 'vitest'
import { ProcessingService } from './processing-service'
import { createMockWorkspace } from '@/test/utils/factories'

describe('ProcessingService', () => {
  let service: ProcessingService

  beforeEach(() => {
    service = new ProcessingService()
    vi.clearAllMocks()
  })

  describe('processWorkspace', () => {
    it('should process workspace successfully', async () => {
      const workspace = createMockWorkspace({
        processingStatus: 'pending'
      })

      const result = await service.processWorkspace(workspace.id)

      expect(result.success).toBe(true)
      expect(result.jobId).toBeDefined()
    })

    it('should handle processing errors', async () => {
      const workspace = createMockWorkspace({
        plexKey: 'invalid-key'
      })

      await expect(
        service.processWorkspace(workspace.id)
      ).rejects.toThrow('Invalid Plex content')
    })

    it('should prevent duplicate processing', async () => {
      const workspace = createMockWorkspace({
        processingStatus: 'processing'
      })

      await expect(
        service.processWorkspace(workspace.id)
      ).rejects.toThrow('Workspace already processing')
    })
  })
})
```

## Integration Testing

### Database Integration

**Testing with Real Database:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { createMockUser, createMockWorkspace } from '@/test/utils/factories'

describe('Workspace Database Integration', () => {
  beforeEach(async () => {
    // Clean database before each test
    await prisma.bookmark.deleteMany()
    await prisma.membership.deleteMany()
    await prisma.workspace.deleteMany()
    await prisma.user.deleteMany()
  })

  afterEach(async () => {
    // Clean up after tests
    await prisma.bookmark.deleteMany()
    await prisma.membership.deleteMany()
    await prisma.workspace.deleteMany()
    await prisma.user.deleteMany()
  })

  it('should create workspace with memberships', async () => {
    // Create test user
    const user = await prisma.user.create({
      data: createMockUser()
    })

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        ...createMockWorkspace({ producerId: user.id }),
        memberships: {
          create: [
            { userId: user.id, role: 'producer' }
          ]
        }
      },
      include: {
        memberships: true
      }
    })

    expect(workspace.memberships).toHaveLength(1)
    expect(workspace.memberships[0].role).toBe('producer')
  })
})
```

### External Service Integration

**Testing Plex Integration:**
```typescript
import { describe, it, expect, vi } from 'vitest'
import { PlexService } from '@/lib/plex-service'

describe('Plex Service Integration', () => {
  let plexService: PlexService

  beforeEach(() => {
    plexService = new PlexService({
      serverUrl: 'http://localhost:32400',
      serverToken: 'test-token'
    })
  })

  it('should fetch library content', async () => {
    // Mock fetch response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        MediaContainer: {
          Metadata: [
            {
              key: '/library/metadata/123',
              title: 'Test Movie',
              type: 'movie'
            }
          ]
        }
      })
    })

    const content = await plexService.getLibraryContent('1')

    expect(content).toHaveLength(1)
    expect(content[0].title).toBe('Test Movie')
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:32400/library/sections/1/all',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Plex-Token': 'test-token'
        })
      })
    )
  })
})
```

## API Testing

### API Route Testing Pattern

**Example: Testing workspace API routes:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/workspaces/route'
import { createMockUser, createMockWorkspace } from '@/test/utils/factories'

vi.mock('@/lib/auth')
vi.mock('@/lib/prisma')

describe('/api/workspaces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return workspaces for authenticated user', async () => {
      const mockUser = createMockUser()
      const mockWorkspaces = [createMockWorkspace()]

      vi.mocked(requireAuth).mockResolvedValue(mockUser)
      vi.mocked(prisma.workspace.findMany).mockResolvedValue(mockWorkspaces)

      const request = new NextRequest('http://localhost/api/workspaces')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].id).toBe(mockWorkspaces[0].id)
    })

    it('should return 401 for unauthenticated users', async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'))

      const request = new NextRequest('http://localhost/api/workspaces')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should handle pagination parameters', async () => {
      const mockUser = createMockUser()
      vi.mocked(requireAuth).mockResolvedValue(mockUser)

      const request = new NextRequest(
        'http://localhost/api/workspaces?page=2&pageSize=10'
      )
      const response = await GET(request)

      expect(prisma.workspace.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10
        })
      )
    })
  })

  describe('POST', () => {
    it('should create workspace with valid data', async () => {
      const mockUser = createMockUser()
      const mockWorkspace = createMockWorkspace()

      vi.mocked(requireAuth).mockResolvedValue(mockUser)
      vi.mocked(prisma.workspace.create).mockResolvedValue(mockWorkspace)

      const request = new NextRequest('http://localhost/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Workspace',
          plexKey: '/library/metadata/123',
          description: 'Test workspace'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(mockWorkspace.id)
    })

    it('should validate required fields', async () => {
      const mockUser = createMockUser()
      vi.mocked(requireAuth).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })
})
```

### Request/Response Testing

**Testing Complex API Interactions:**
```typescript
describe('Bookmark API Workflows', () => {
  it('should handle complete bookmark lifecycle', async () => {
    const mockUser = createMockUser()
    const mockWorkspace = createMockWorkspace()
    const mockBookmark = createMockBookmark()

    // Setup mocks
    vi.mocked(requireAuth).mockResolvedValue(mockUser)
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace)
    vi.mocked(prisma.bookmark.create).mockResolvedValue(mockBookmark)
    vi.mocked(prisma.bookmark.update).mockResolvedValue({
      ...mockBookmark,
      label: 'Updated Label'
    })

    // Create bookmark
    const createRequest = new NextRequest('http://localhost/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: mockWorkspace.id,
        label: 'Test Bookmark',
        startMs: 60000,
        endMs: 75000
      })
    })

    const createResponse = await POST(createRequest)
    const createData = await createResponse.json()

    expect(createResponse.status).toBe(201)
    expect(createData.data.id).toBe(mockBookmark.id)

    // Update bookmark
    const updateRequest = new NextRequest(
      `http://localhost/api/bookmarks/${mockBookmark.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          label: 'Updated Label'
        })
      }
    )

    const updateResponse = await PUT(updateRequest)
    const updateData = await updateResponse.json()

    expect(updateResponse.status).toBe(200)
    expect(updateData.data.label).toBe('Updated Label')
  })
})
```

## Component Testing

### React Component Testing

**Custom Render Utility (src/test/utils/render.tsx):**
```typescript
import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { createMockUser } from './factories'

interface CustomRenderOptions extends RenderOptions {
  session?: any
}

export const renderWithProviders = (
  ui: React.ReactElement,
  { session = null, ...renderOptions }: CustomRenderOptions = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

export const renderWithAuth = (
  ui: React.ReactElement,
  userOverrides = {}
) => {
  const mockUser = createMockUser(userOverrides)
  const session = {
    user: mockUser,
    expires: '2024-12-31'
  }

  return renderWithProviders(ui, { session })
}
```

**Component Test Example:**
```typescript
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { WorkspaceCard } from './WorkspaceCard'
import { renderWithAuth } from '@/test/utils/render'
import { createMockWorkspace } from '@/test/utils/factories'

describe('WorkspaceCard', () => {
  const mockWorkspace = createMockWorkspace()

  it('should render workspace information', () => {
    renderWithAuth(<WorkspaceCard workspace={mockWorkspace} />)

    expect(screen.getByText(mockWorkspace.title)).toBeInTheDocument()
    expect(screen.getByText(mockWorkspace.description)).toBeInTheDocument()
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })

  it('should handle workspace navigation', async () => {
    const mockPush = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      pathname: '/',
      query: {},
      asPath: '/'
    } as any)

    renderWithAuth(<WorkspaceCard workspace={mockWorkspace} />)

    fireEvent.click(screen.getByRole('button', { name: /open workspace/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/workspace/${mockWorkspace.id}`)
    })
  })

  it('should show processing status', () => {
    const processingWorkspace = createMockWorkspace({
      processingStatus: 'processing',
      processingProgress: 75
    })

    renderWithAuth(<WorkspaceCard workspace={processingWorkspace} />)

    expect(screen.getByText('Processing (75%)')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '75')
  })

  it('should handle producer vs collaborator views', () => {
    // Test producer view
    renderWithAuth(
      <WorkspaceCard workspace={mockWorkspace} />,
      { id: mockWorkspace.producerId }
    )

    expect(screen.getByText('Producer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()

    // Test collaborator view
    renderWithAuth(
      <WorkspaceCard workspace={mockWorkspace} />,
      { id: 'different-user' }
    )

    expect(screen.getByText('Collaborator')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /settings/i })).not.toBeInTheDocument()
  })
})
```

### Testing User Interactions

**Complex Interaction Testing:**
```typescript
describe('BookmarkTimeline', () => {
  it('should create bookmark via timeline interaction', async () => {
    const mockOnCreateBookmark = vi.fn()
    const user = userEvent.setup()

    renderWithAuth(
      <BookmarkTimeline
        duration={180000}
        bookmarks={[]}
        onCreateBookmark={mockOnCreateBookmark}
      />
    )

    // Click timeline to set start point
    const timeline = screen.getByRole('slider')
    await user.click(timeline)

    // Timeline position should update
    expect(timeline).toHaveAttribute('value', expect.any(String))

    // Click create bookmark button
    await user.click(screen.getByRole('button', { name: /create bookmark/i }))

    // Modal should appear
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Fill in bookmark details
    await user.type(
      screen.getByLabelText(/bookmark label/i),
      'Test Bookmark'
    )

    // Submit bookmark
    await user.click(screen.getByRole('button', { name: /save bookmark/i }))

    await waitFor(() => {
      expect(mockOnCreateBookmark).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Test Bookmark',
          startMs: expect.any(Number),
          endMs: expect.any(Number)
        })
      )
    })
  })
})
```

## End-to-End Testing

### E2E Testing Setup

**Playwright Configuration:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Critical User Journey Tests

**Example: Complete Workspace Workflow:**
```typescript
import { test, expect } from '@playwright/test'

test.describe('Workspace Creation and Collaboration', () => {
  test('producer can create workspace and collaborate with team', async ({ page, context }) => {
    // Login as producer
    await page.goto('/login')
    await page.click('text=Sign in with Plex')
    
    // Mock Plex authentication
    await page.route('**/api/auth/**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      })
    })

    await page.waitForURL('/workspaces')

    // Create new workspace
    await page.click('text=Create Workspace')
    await page.waitForSelector('[data-testid=plex-content-browser]')

    // Select content from Plex
    await page.click('[data-testid=library-movies]')
    await page.click('[data-testid=content-item]:first-child')

    // Configure workspace
    await page.fill('[data-testid=workspace-title]', 'E2E Test Workspace')
    await page.fill('[data-testid=workspace-description]', 'End-to-end testing')
    await page.fill('[data-testid=collaborator-email]', 'collaborator@test.com')

    // Create workspace
    await page.click('[data-testid=create-workspace-button]')

    // Wait for workspace creation and processing
    await page.waitForURL(/\/workspace\/ws_/)
    await expect(page.locator('[data-testid=processing-status]')).toContainText('Complete')

    // Create bookmark
    await page.click('[data-testid=video-timeline]', { position: { x: 200, y: 10 } })
    await page.click('[data-testid=create-bookmark-button]')

    await page.fill('[data-testid=bookmark-label]', 'E2E Test Bookmark')
    await page.fill('[data-testid=bookmark-notes]', 'Created via E2E test')
    await page.click('[data-testid=save-bookmark-button]')

    // Verify bookmark appears
    await expect(page.locator('[data-testid=bookmark-list]')).toContainText('E2E Test Bookmark')

    // Test collaboration features
    const collaboratorPage = await context.newPage()
    await collaboratorPage.goto('/workspace/ws_123') // Use actual workspace ID

    // Verify collaborator can see bookmark
    await expect(collaboratorPage.locator('[data-testid=bookmark-list]')).toContainText('E2E Test Bookmark')

    // Collaborator creates their own bookmark
    await collaboratorPage.click('[data-testid=video-timeline]', { position: { x: 400, y: 10 } })
    await collaboratorPage.click('[data-testid=create-bookmark-button]')
    await collaboratorPage.fill('[data-testid=bookmark-label]', 'Collaborator Bookmark')
    await collaboratorPage.click('[data-testid=save-bookmark-button]')

    // Verify real-time updates
    await expect(page.locator('[data-testid=bookmark-list]')).toContainText('Collaborator Bookmark')
  })

  test('should handle OBS export workflow', async ({ page }) => {
    // Navigate to processed workspace
    await page.goto('/workspace/ws_test_processed')

    // Export OBS package
    await page.click('[data-testid=export-obs-button]')
    await page.waitForSelector('[data-testid=obs-export-modal]')

    // Configure export settings
    await page.selectOption('[data-testid=export-quality]', '1080p')
    await page.selectOption('[data-testid=hotkey-pattern]', 'sequential')
    await page.check('[data-testid=include-web-interface]')

    // Start export
    await page.click('[data-testid=start-export-button]')

    // Wait for processing
    await expect(page.locator('[data-testid=export-progress]')).toBeVisible()
    await page.waitForSelector('[data-testid=download-package-button]', { timeout: 60000 })

    // Verify download link
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid=download-package-button]')
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/.*\.zip$/)
  })
})
```

## Testing Patterns

### Arrange-Act-Assert Pattern

```typescript
describe('UserService', () => {
  it('should create user with valid data', async () => {
    // Arrange
    const userData = {
      plexUsername: 'testuser',
      plexEmail: 'test@example.com'
    }
    const expectedUser = createMockUser(userData)
    vi.mocked(prisma.user.create).mockResolvedValue(expectedUser)

    // Act
    const result = await userService.createUser(userData)

    // Assert
    expect(result).toEqual(expectedUser)
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining(userData)
    })
  })
})
```

### Test Data Builders

```typescript
class WorkspaceBuilder {
  private workspace: Partial<Workspace> = {}

  withTitle(title: string) {
    this.workspace.title = title
    return this
  }

  withProducer(producerId: string) {
    this.workspace.producerId = producerId
    return this
  }

  withProcessingStatus(status: ProcessingStatus) {
    this.workspace.processingStatus = status
    return this
  }

  build(): Workspace {
    return createMockWorkspace(this.workspace)
  }
}

// Usage in tests
const workspace = new WorkspaceBuilder()
  .withTitle('Complex Test Workspace')
  .withProcessingStatus('complete')
  .build()
```

### Parameterized Testing

```typescript
describe.each([
  ['producer', 'producer', true],
  ['collaborator', 'collaborator', false],
  ['non-member', null, false]
])('Workspace permissions for %s', (role, userRole, canEdit) => {
  it(`should ${canEdit ? 'allow' : 'deny'} editing`, async () => {
    const workspace = createMockWorkspace()
    const user = createMockUser()
    
    vi.mocked(getUserRole).mockResolvedValue(userRole)

    const result = await canEditWorkspace(workspace.id, user.id)

    expect(result).toBe(canEdit)
  })
})
```

## Mocking Strategies

### External Service Mocking

**Plex API Mocking:**
```typescript
// Mock successful Plex responses
const mockPlexResponse = (data: any) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      MediaContainer: data
    })
  })
}

// Mock Plex errors
const mockPlexError = (status = 500) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: 'Server Error'
  })
}
```

**Database Mocking:**
```typescript
// Create reusable mock implementations
const createPrismaMock = () => ({
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  workspace: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  // ... other models
})

// Setup in tests
beforeEach(() => {
  vi.mocked(prisma).mockImplementation(createPrismaMock())
})
```

### Conditional Mocking

```typescript
// Mock based on test environment
if (process.env.NODE_ENV === 'test') {
  vi.mock('@/lib/plex-service', () => ({
    PlexService: vi.fn().mockImplementation(() => ({
      getLibraries: vi.fn().mockResolvedValue([]),
      getContent: vi.fn().mockResolvedValue([])
    }))
  }))
} else {
  // Use real implementation in integration tests
}
```

## Coverage Requirements

### Coverage Configuration

**Target Metrics:**
- **Lines**: 95%
- **Functions**: 95%
- **Branches**: 95%
- **Statements**: 95%

**Exclusions:**
```typescript
// vitest.config.ts coverage exclusions
exclude: [
  'node_modules/',
  'src/test/',
  '**/*.test.{ts,tsx}',
  '**/*.stories.{ts,tsx}',
  'src/types/',
  '**/*.d.ts',
  'next.config.*',
  'tailwind.config.*'
]
```

### Coverage Reporting

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# Coverage thresholds enforced
# Build fails if coverage drops below thresholds
```

### Testing Uncovered Code

**Finding Uncovered Code:**
```bash
# Run with coverage and identify gaps
npm run test:coverage -- --reporter=verbose

# Focus on specific files
npm run test:coverage src/lib/processing-service.ts
```

## Performance Testing

### Performance Test Setup

```typescript
// performance.test.ts
import { describe, it, expect } from 'vitest'
import { performance } from 'perf_hooks'

describe('Performance Tests', () => {
  it('should process large workspace efficiently', async () => {
    const startTime = performance.now()
    
    // Create workspace with many bookmarks
    const workspace = createMockWorkspace()
    const bookmarks = Array.from({ length: 1000 }, (_, i) =>
      createMockBookmark({ id: `bm_${i}` })
    )

    await processWorkspaceBookmarks(workspace, bookmarks)

    const endTime = performance.now()
    const duration = endTime - startTime

    // Should complete within reasonable time
    expect(duration).toBeLessThan(5000) // 5 seconds
  })

  it('should handle concurrent bookmark creation', async () => {
    const concurrentRequests = 10
    const startTime = performance.now()

    const promises = Array.from({ length: concurrentRequests }, () =>
      createBookmark({
        workspaceId: 'ws_test',
        label: 'Concurrent Bookmark',
        startMs: Math.random() * 100000,
        endMs: Math.random() * 100000 + 5000
      })
    )

    await Promise.all(promises)

    const endTime = performance.now()
    const duration = endTime - startTime

    // All requests should complete quickly
    expect(duration).toBeLessThan(2000) // 2 seconds
  })
})
```

### Memory Leak Testing

```typescript
describe('Memory Usage', () => {
  it('should not leak memory during large operations', async () => {
    const initialMemory = process.memoryUsage().heapUsed

    // Perform memory-intensive operation
    for (let i = 0; i < 1000; i++) {
      await processWorkspace(`ws_${i}`)
    }

    // Force garbage collection
    global.gc?.()

    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = finalMemory - initialMemory

    // Memory increase should be reasonable
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // 50MB
  })
})
```

## CI/CD Integration

### GitHub Actions Test Workflow

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 'web/package-lock.json'

      - name: Install dependencies
        run: |
          cd web
          npm ci

      - name: Run linting
        run: |
          cd web
          npm run lint

      - name: Run type checking
        run: |
          cd web
          npm run type-check

      - name: Run unit tests
        run: |
          cd web
          npm run test:coverage

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./web/coverage/lcov.info
          fail_ci_if_error: true

      - name: Run E2E tests
        run: |
          cd web
          npm run test:e2e

  build:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd web
          npm ci

      - name: Build application
        run: |
          cd web
          npm run build
```

### Quality Gates

**Pre-commit Hooks:**
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "npm run test -- --passWithNoTests"
    ]
  }
}
```

**Branch Protection Rules:**
- All tests must pass
- Coverage must be ≥95%
- No ESLint errors
- Code review required
- Up-to-date with main branch

---

This comprehensive testing guide ensures high-quality, maintainable code throughout the Clipshare application. Regular testing practices and continuous integration help catch issues early and maintain system reliability.