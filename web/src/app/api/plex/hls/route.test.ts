import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { prisma } from '@/lib/prisma'
import axios from 'axios'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    plexConfig: {
      findFirst: vi.fn()
    }
  }
}))

vi.mock('axios')

const mockAxios = vi.mocked(axios)

describe('/api/plex/hls', () => {
  const mockPlexConfig = {
    id: '1',
    serverUrl: 'http://localhost:32400',
    serverToken: 'test-token',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockMediaData = {
    MediaContainer: {
      Metadata: [{
        Media: [{
          Part: [{
            id: '12345'
          }]
        }]
      }]
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.plexConfig.findFirst).mockResolvedValue(mockPlexConfig)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should return HLS stream URL for valid request', async () => {
    mockAxios.get.mockResolvedValueOnce({ data: mockMediaData }) // Media info request

    const request = new NextRequest('http://localhost:3000/api/plex/hls?key=/library/metadata/123&serverId=test-server')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate')
    expect(response.headers.get('access-control-allow-origin')).toBe('*')

    const data = await response.json()
    expect(data.hlsUrl).toContain('/video/:/transcode/universal/start.m3u8')
    expect(data.hlsUrl).toContain('protocol=hls')
    expect(data.hlsUrl).toContain('audioCodec=aac')
    expect(data.hlsUrl).toContain('directPlay=0')
    expect(data.plexToken).toBe('test-token')

    // Verify only media info was fetched, not the HLS content
    expect(mockAxios.get).toHaveBeenCalledTimes(1)
  })

  it('should return 400 when key or serverId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/plex/hls')
    const response = await GET(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('key and serverId are required')
  })

  it('should return 400 when Plex is not configured', async () => {
    vi.mocked(prisma.plexConfig.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/plex/hls?key=/library/metadata/123&serverId=test-server')
    const response = await GET(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Plex not configured')
  })

  it('should return 401 when Plex token is invalid', async () => {
    mockAxios.get.mockRejectedValueOnce({
      response: { status: 401 }
    })

    const request = new NextRequest('http://localhost:3000/api/plex/hls?key=/library/metadata/123&serverId=test-server')
    const response = await GET(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Invalid Plex token')
  })

  it('should return 404 when Plex content is not found', async () => {
    mockAxios.get.mockRejectedValueOnce({
      response: { status: 404 }
    })

    const request = new NextRequest('http://localhost:3000/api/plex/hls?key=/library/metadata/123&serverId=test-server')
    const response = await GET(request)

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Plex content not found')
  })

  it('should return 500 when Plex server is unreachable', async () => {
    mockAxios.get.mockRejectedValueOnce({
      code: 'ECONNREFUSED'
    })

    const request = new NextRequest('http://localhost:3000/api/plex/hls?key=/library/metadata/123&serverId=test-server')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Failed to fetch HLS stream')
  })

  it('should handle malformed media data gracefully', async () => {
    mockAxios.get.mockResolvedValueOnce({
      data: { MediaContainer: { Metadata: [] } }
    })

    const request = new NextRequest('http://localhost:3000/api/plex/hls?key=/library/metadata/123&serverId=test-server')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Failed to fetch HLS stream')
  })

  it('should construct HLS URL with proper parameters', async () => {
    mockAxios.get.mockResolvedValueOnce({ data: mockMediaData })

    const request = new NextRequest('http://localhost:3000/api/plex/hls?key=/library/metadata/123&serverId=test-server')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    
    // Verify the HLS URL contains all required parameters
    expect(data.hlsUrl).toContain('protocol=hls')
    expect(data.hlsUrl).toContain('audioCodec=aac')
    expect(data.hlsUrl).toContain('directPlay=0')
    expect(data.hlsUrl).toContain('directStream=1')
    expect(data.hlsUrl).toContain('videoCodec=h264')
    expect(data.hlsUrl).toContain('maxAudioChannels=2')
    expect(data.hlsUrl).toContain('copyts=1')
    expect(data.hlsUrl).toContain('X_Plex_Token=test-token')
  })

})
