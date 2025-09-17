import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { prisma } from '@/lib/prisma'
import axios from 'axios'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    plexConfig: {
      findFirst: vi.fn(),
    },
    plexServer: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('axios')
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

const mockSession = {
  user: {
    id: 'user-1',
    plexUserId: 'plex-user-1',
  },
}

describe('/api/plex/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.plexConfig.findFirst).mockResolvedValue({
      id: 'config-1',
      isActive: true,
      clientId: 'test-client-id',
      serverUrl: 'http://localhost:32400',
      serverToken: 'test-token',
    } as any)
    
    vi.mocked(prisma.plexServer.findMany).mockResolvedValue([
      {
        id: 'server-1',
        userId: 'user-1',
        token: 'user-token',
        status: 'active',
      },
    ] as any)
  })

  describe('GET', () => {
    it('should return unauthorized if no session', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/plex/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return error if Plex not configured', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.plexConfig.findFirst).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/plex/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Plex not configured')
    })

    it('should return error if no active Plex servers', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.plexServer.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/plex/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No active Plex servers found for user')
    })

    it('should successfully fetch and return Plex users', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockPlexResponse = {
        data: [
          {
            uuid: 'plex-user-1',
            username: 'current-user',
            email: 'current@example.com',
            title: 'Current User',
            thumb: 'avatar1.jpg',
            hasPassword: true,
            restricted: false,
            home: true,
            guest: false,
            admin: true,
            protected: false,
          },
          {
            uuid: 'plex-user-2',
            username: 'friend1',
            email: 'friend1@example.com',
            title: 'Friend One',
            thumb: 'avatar2.jpg',
            hasPassword: true,
            restricted: false,
            home: false,
            guest: false,
            admin: false,
            protected: false,
          },
          {
            uuid: 'plex-user-3',
            username: 'friend2',
            email: 'friend2@example.com',
            title: 'Friend Two',
            thumb: 'avatar3.jpg',
            hasPassword: false,
            restricted: true,
            home: false,
            guest: true,
            admin: false,
            protected: true,
          },
        ],
      }

      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: mockPlexResponse,
      })

      const request = new NextRequest('http://localhost:3000/api/plex/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.users).toHaveLength(2) // Should exclude current user
      expect(data.users[0]).toEqual({
        id: 'plex-user-2',
        username: 'friend1',
        email: 'friend1@example.com',
        title: 'Friend One',
        thumb: 'avatar2.jpg',
        hasPassword: true,
        restricted: false,
        home: false,
        guest: false,
        admin: false,
        protected: false,
      })
      expect(data.users[1]).toEqual({
        id: 'plex-user-3',
        username: 'friend2',
        email: 'friend2@example.com',
        title: 'Friend Two',
        thumb: 'avatar3.jpg',
        hasPassword: false,
        restricted: true,
        home: false,
        guest: true,
        admin: false,
        protected: true,
      })

      expect(axios.get).toHaveBeenCalledWith(
        'https://plex.tv/api/v2/home/users',
        {
          headers: {
            'X-Plex-Token': 'user-token',
            'X-Plex-Client-Identifier': 'test-client-id',
            'Accept': 'application/json',
          },
        }
      )
    })

    it('should handle Plex API errors', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      vi.mocked(axios.get).mockRejectedValue({
        response: { status: 401 },
        code: 'UNAUTHORIZED',
      })

      const request = new NextRequest('http://localhost:3000/api/plex/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid Plex token')
    })

    it('should handle network errors', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      vi.mocked(axios.get).mockRejectedValue(new Error('Network error'))

      const request = new NextRequest('http://localhost:3000/api/plex/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch Plex users')
    })

    it('should handle empty Plex response', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: { data: [] },
      })

      const request = new NextRequest('http://localhost:3000/api/plex/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.users).toHaveLength(0)
    })

    it('should handle malformed Plex response', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: {}, // Missing data property
      })

      const request = new NextRequest('http://localhost:3000/api/plex/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.users).toHaveLength(0)
    })
  })
})
