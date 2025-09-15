import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import axios from 'axios'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    plexConfig: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    isAxiosError: vi.fn(),
  },
}))

const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    plexUsername: 'testuser',
  },
}

const mockPlexConfig = {
  id: 'config-1',
  clientId: 'client-id',
  serverUrl: 'http://localhost:32400',
  serverToken: 'server-token',
  isActive: true,
}

describe('/api/plex/library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.plexConfig.findFirst).mockResolvedValue(mockPlexConfig as any)
  })

  describe('GET', () => {
    it('should return libraries when no libraryKey is provided', async () => {
      const mockLibrariesResponse = {
        status: 200,
        data: {
          MediaContainer: {
            Directory: [
              {
                key: '1',
                title: 'Movies',
                type: 'movie',
                agent: 'com.plexapp.agents.imdb',
                scanner: 'Plex Movie Scanner',
                language: 'en',
                updatedAt: 1234567890,
                createdAt: 1234567890,
                scannedAt: 1234567890,
                content: '1',
                directory: '/movies',
                contentChangedAt: 1234567890,
                hidden: 0,
                Location: [{ path: '/movies' }],
              },
              {
                key: '2',
                title: 'TV Shows',
                type: 'show',
                agent: 'com.plexapp.agents.thetvdb',
                scanner: 'Plex Series Scanner',
                language: 'en',
                updatedAt: 1234567890,
                createdAt: 1234567890,
                scannedAt: 1234567890,
                content: '2',
                directory: '/tv',
                contentChangedAt: 1234567890,
                hidden: 0,
                Location: [{ path: '/tv' }],
              },
            ],
          },
        },
      }

      vi.mocked(axios.get).mockResolvedValue(mockLibrariesResponse as any)

      const request = new NextRequest('http://localhost:3000/api/plex/library')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.libraries).toHaveLength(2)
      expect(data.libraries[0]).toEqual({
        key: '1',
        title: 'Movies',
        type: 'movie',
        agent: 'com.plexapp.agents.imdb',
        scanner: 'Plex Movie Scanner',
        language: 'en',
        updatedAt: 1234567890,
        createdAt: 1234567890,
        scannedAt: 1234567890,
        content: '1',
        directory: '/movies',
        contentChangedAt: 1234567890,
        hidden: 0,
        Location: [{ path: '/movies' }],
      })

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:32400/library/sections',
        {
          headers: {
            'X-Plex-Token': 'server-token',
            'Accept': 'application/json',
          },
        }
      )
    })

    it('should return content items when libraryKey is provided', async () => {
      const mockContentResponse = {
        status: 200,
        data: {
          MediaContainer: {
            Metadata: [
              {
                key: 'movie-1',
                title: 'Test Movie',
                summary: 'A test movie',
                year: 2023,
                duration: 7200000,
                thumb: 'thumb.jpg',
                art: 'art.jpg',
                type: 'movie',
              },
              {
                key: 'episode-1',
                title: 'Test Episode',
                summary: 'A test episode',
                year: 2023,
                duration: 1800000,
                thumb: 'thumb.jpg',
                art: 'art.jpg',
                type: 'episode',
                grandparentTitle: 'Test Show',
                parentIndex: 1,
                index: 1,
              },
            ],
            totalSize: 2,
          },
        },
      }

      vi.mocked(axios.get).mockResolvedValue(mockContentResponse as any)

      const request = new NextRequest('http://localhost:3000/api/plex/library?libraryKey=1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.items).toHaveLength(2)
      expect(data.items[0]).toEqual({
        key: 'movie-1',
        title: 'Test Movie',
        summary: 'A test movie',
        year: 2023,
        duration: 7200000,
        thumb: 'thumb.jpg',
        art: 'art.jpg',
        type: 'movie',
      })
      expect(data.items[1]).toEqual({
        key: 'episode-1',
        title: 'Test Episode',
        summary: 'A test episode',
        year: 2023,
        duration: 1800000,
        thumb: 'thumb.jpg',
        art: 'art.jpg',
        type: 'episode',
        showTitle: 'Test Show',
        seasonNumber: 1,
        episodeNumber: 1,
      })

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:32400/library/sections/1/all',
        {
          headers: {
            'X-Plex-Token': 'server-token',
            'Accept': 'application/json',
          },
        }
      )
    })

    it('should filter by type when provided', async () => {
      const mockContentResponse = {
        status: 200,
        data: {
          MediaContainer: {
            Metadata: [
              {
                key: 'movie-1',
                title: 'Test Movie',
                summary: 'A test movie',
                year: 2023,
                duration: 7200000,
                thumb: 'thumb.jpg',
                art: 'art.jpg',
                type: 'movie',
              },
            ],
            totalSize: 1,
          },
        },
      }

      vi.mocked(axios.get).mockResolvedValue(mockContentResponse as any)

      const request = new NextRequest('http://localhost:3000/api/plex/library?libraryKey=1&type=movie')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:32400/library/sections/1/all',
        {
          headers: {
            'X-Plex-Token': 'server-token',
            'Accept': 'application/json',
          },
          params: { type: 1 },
        }
      )
    })

    it('should search by title when provided', async () => {
      const mockContentResponse = {
        status: 200,
        data: {
          MediaContainer: {
            Metadata: [],
            totalSize: 0,
          },
        },
      }

      vi.mocked(axios.get).mockResolvedValue(mockContentResponse as any)

      const request = new NextRequest('http://localhost:3000/api/plex/library?libraryKey=1&search=test')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:32400/library/sections/1/all',
        {
          headers: {
            'X-Plex-Token': 'server-token',
            'Accept': 'application/json',
          },
          params: { title: 'test' },
        }
      )
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/plex/library')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 when Plex is not configured', async () => {
      vi.mocked(prisma.plexConfig.findFirst).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/plex/library')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Plex not configured')
    })

    it('should handle Plex server errors', async () => {
      const mockError = {
        response: { status: 401 },
        code: 'ECONNREFUSED',
      }

      vi.mocked(axios.get).mockRejectedValue(mockError)
      vi.mocked(axios.isAxiosError).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/plex/library')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid Plex server token')
    })

    it('should handle connection errors', async () => {
      const mockError = {
        code: 'ECONNREFUSED',
      }

      vi.mocked(axios.get).mockRejectedValue(mockError)
      vi.mocked(axios.isAxiosError).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/plex/library')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('Cannot connect to Plex server')
    })

    it('should handle general errors', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('General error'))

      const request = new NextRequest('http://localhost:3000/api/plex/library')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch library data')
    })
  })
})
