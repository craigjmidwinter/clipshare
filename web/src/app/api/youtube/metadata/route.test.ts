import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

// Mock youtube-dl-exec
vi.mock('youtube-dl-exec', () => ({
  default: vi.fn()
}))

describe('/api/youtube/metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 if URL parameter is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/youtube/metadata')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('URL parameter is required')
  })

  it('should return 400 for invalid YouTube URL', async () => {
    const request = new NextRequest('http://localhost:3000/api/youtube/metadata?url=https://example.com')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid YouTube URL')
  })

  it('should return video metadata for valid YouTube URL', async () => {
    const youtubedl = await import('youtube-dl-exec')
    const mockMetadata = {
      title: 'Test YouTube Video',
      description: 'This is a test video description',
      duration: 120, // 2 minutes
      thumbnail: 'https://example.com/thumbnail.jpg',
      uploader: 'Test Channel',
      upload_date: '20240101',
      view_count: 1000
    }

    vi.mocked(youtubedl.default).mockResolvedValue(mockMetadata)

    const request = new NextRequest('http://localhost:3000/api/youtube/metadata?url=https://www.youtube.com/watch?v=test')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.metadata).toEqual({
      title: 'Test YouTube Video',
      description: 'This is a test video description',
      duration: 120000, // Converted to milliseconds
      thumbnailUrl: 'https://example.com/thumbnail.jpg',
      uploader: 'Test Channel',
      uploadDate: '20240101',
      viewCount: 1000
    })
  })

  it('should handle missing metadata fields gracefully', async () => {
    const youtubedl = await import('youtube-dl-exec')
    const mockMetadata = {
      title: 'Test Video'
      // Missing other fields
    }

    vi.mocked(youtubedl.default).mockResolvedValue(mockMetadata)

    const request = new NextRequest('http://localhost:3000/api/youtube/metadata?url=https://www.youtube.com/watch?v=test')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.metadata).toEqual({
      title: 'Test Video',
      description: '',
      duration: null,
      thumbnailUrl: '',
      uploader: '',
      uploadDate: '',
      viewCount: 0
    })
  })

  it('should return 500 if youtube-dl-exec fails', async () => {
    const youtubedl = await import('youtube-dl-exec')
    vi.mocked(youtubedl.default).mockRejectedValue(new Error('Network error'))

    const request = new NextRequest('http://localhost:3000/api/youtube/metadata?url=https://www.youtube.com/watch?v=test')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch video metadata')
  })

  it('should handle youtu.be URLs', async () => {
    const youtubedl = await import('youtube-dl-exec')
    const mockMetadata = {
      title: 'Short URL Video',
      description: 'Video from youtu.be URL'
    }

    vi.mocked(youtubedl.default).mockResolvedValue(mockMetadata)

    const request = new NextRequest('http://localhost:3000/api/youtube/metadata?url=https://youtu.be/test')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.metadata.title).toBe('Short URL Video')
  })
})

