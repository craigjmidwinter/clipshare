import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from './route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    workspace: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    membership: {
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    plexUsername: 'testuser',
  },
}

describe('/api/workspaces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
  })

  describe('GET', () => {
    it('should return workspaces for authenticated user', async () => {
      const mockWorkspaces = [
        {
          id: 'workspace-1',
          title: 'Test Workspace',
          description: 'Test Description',
          contentType: 'movie',
          contentTitle: 'Test Movie',
          contentPoster: 'poster.jpg',
          contentDuration: 7200000,
          createdAt: new Date(),
          updatedAt: new Date(),
          producer: {
            id: 'user-1',
            name: 'Test User',
            plexUsername: 'testuser',
            plexAvatarUrl: 'avatar.jpg',
          },
          memberships: [],
          _count: {
            bookmarks: 0,
            memberships: 1,
          },
        },
      ]

      vi.mocked(prisma.workspace.findMany).mockResolvedValue(mockWorkspaces as any)

      const request = new NextRequest('http://localhost:3000/api/workspaces')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.workspaces).toEqual(mockWorkspaces)
      expect(prisma.workspace.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { producerId: 'user-1' },
            { 
              memberships: {
                some: { userId: 'user-1' }
              }
            }
          ]
        },
        include: expect.any(Object),
        orderBy: { updatedAt: 'desc' }
      })
    })

    it('should return specific workspace when id is provided', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        title: 'Test Workspace',
        description: 'Test Description',
        contentType: 'movie',
        contentTitle: 'Test Movie',
        contentPoster: 'poster.jpg',
        contentDuration: 7200000,
        createdAt: new Date(),
        updatedAt: new Date(),
        producer: {
          id: 'user-1',
          name: 'Test User',
          plexUsername: 'testuser',
          plexAvatarUrl: 'avatar.jpg',
        },
        memberships: [],
        bookmarks: [],
      }

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as any)

      const request = new NextRequest('http://localhost:3000/api/workspaces?id=workspace-1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.workspace).toEqual(mockWorkspace)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/workspaces')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 for non-existent workspace', async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/workspaces?id=non-existent')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Workspace not found')
    })

    it('should return 403 for workspace user has no access to', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'other-user',
        memberships: [],
      }

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as any)

      const request = new NextRequest('http://localhost:3000/api/workspaces?id=workspace-1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })
  })

  describe('POST', () => {
    it('should create workspace with valid data', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'user-1',
        plexKey: 'plex-key-1',
        plexServerId: 'default',
        title: 'Test Workspace',
        description: 'Test Description',
        contentType: 'movie',
        contentTitle: 'Test Movie',
        contentPoster: 'poster.jpg',
        contentDuration: 7200000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.workspace.create).mockResolvedValue(mockWorkspace as any)
      vi.mocked(prisma.membership.create).mockResolvedValue({} as any)
      vi.mocked(prisma.user.findMany).mockResolvedValue([])
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ...mockWorkspace,
        producer: mockSession.user,
        memberships: [],
      } as any)

      const requestBody = {
        plexKey: 'plex-key-1',
        plexServerId: 'default',
        title: 'Test Workspace',
        description: 'Test Description',
        contentType: 'movie',
        contentTitle: 'Test Movie',
        contentPoster: 'poster.jpg',
        contentDuration: 7200000,
        collaborators: [],
      }

      const request = new NextRequest('http://localhost:3000/api/workspaces', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.workspace.create).toHaveBeenCalledWith({
        data: {
          producerId: 'user-1',
          plexKey: 'plex-key-1',
          plexServerId: 'default',
          title: 'Test Workspace',
          description: 'Test Description',
          contentType: 'movie',
          contentTitle: 'Test Movie',
          contentPoster: 'poster.jpg',
          contentDuration: 7200000,
        }
      })
      expect(prisma.membership.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'workspace-1',
          userId: 'user-1',
          role: 'producer'
        }
      })
    })

    it('should return 400 for missing required fields', async () => {
      const requestBody = {
        title: 'Test Workspace',
        // Missing required fields
      }

      const request = new NextRequest('http://localhost:3000/api/workspaces', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields')
    })

    it('should add collaborators when provided', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'user-1',
        plexKey: 'plex-key-1',
        plexServerId: 'default',
        title: 'Test Workspace',
        description: 'Test Description',
        contentType: 'movie',
        contentTitle: 'Test Movie',
        contentPoster: 'poster.jpg',
        contentDuration: 7200000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockCollaborators = [
        { id: 'user-2', plexUsername: 'collaborator1' },
        { id: 'user-3', plexUsername: 'collaborator2' },
      ]

      vi.mocked(prisma.workspace.create).mockResolvedValue(mockWorkspace as any)
      vi.mocked(prisma.membership.create).mockResolvedValue({} as any)
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockCollaborators as any)
      vi.mocked(prisma.membership.createMany).mockResolvedValue({} as any)
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ...mockWorkspace,
        producer: mockSession.user,
        memberships: [],
      } as any)

      const requestBody = {
        plexKey: 'plex-key-1',
        plexServerId: 'default',
        title: 'Test Workspace',
        description: 'Test Description',
        contentType: 'movie',
        contentTitle: 'Test Movie',
        contentPoster: 'poster.jpg',
        contentDuration: 7200000,
        collaborators: ['collaborator1', 'collaborator2'],
      }

      const request = new NextRequest('http://localhost:3000/api/workspaces', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          plexUsername: {
            in: ['collaborator1', 'collaborator2']
          }
        }
      })
      expect(prisma.membership.createMany).toHaveBeenCalledWith({
        data: [
          { workspaceId: 'workspace-1', userId: 'user-2', role: 'collaborator' },
          { workspaceId: 'workspace-1', userId: 'user-3', role: 'collaborator' },
        ]
      })
    })
  })

  describe('PUT', () => {
    it('should update workspace for producer', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'user-1',
      }

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as any)
      vi.mocked(prisma.workspace.update).mockResolvedValue({} as any)

      const requestBody = {
        id: 'workspace-1',
        title: 'Updated Title',
        description: 'Updated Description',
      }

      const request = new NextRequest('http://localhost:3000/api/workspaces', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.workspace.update).toHaveBeenCalledWith({
        where: { id: 'workspace-1' },
        data: {
          title: 'Updated Title',
          description: 'Updated Description',
        }
      })
    })

    it('should return 403 for non-producer', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'other-user',
      }

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as any)

      const requestBody = {
        id: 'workspace-1',
        title: 'Updated Title',
      }

      const request = new NextRequest('http://localhost:3000/api/workspaces', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only the producer can edit this workspace')
    })
  })

  describe('DELETE', () => {
    it('should delete workspace for producer', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'user-1',
      }

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as any)
      vi.mocked(prisma.workspace.delete).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/workspaces?id=workspace-1', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.workspace.delete).toHaveBeenCalledWith({
        where: { id: 'workspace-1' }
      })
    })

    it('should return 403 for non-producer', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'other-user',
      }

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as any)

      const request = new NextRequest('http://localhost:3000/api/workspaces?id=workspace-1', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only the producer can delete this workspace')
    })
  })
})
