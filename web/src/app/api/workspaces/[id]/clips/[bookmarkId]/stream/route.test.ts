import { NextRequest } from "next/server"
import { GET } from "./route"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { promises as fs } from "fs"
import path from "path"
import { vi } from "vitest"

// Mock dependencies
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bookmark: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("@/lib/data-dirs", () => ({
  getProcessedFilesDir: () => "/test/processed-files",
}))

vi.mock("fs", () => ({
  promises: {
    stat: vi.fn(),
    readFile: vi.fn(),
  },
}))

const mockGetServerSession = getServerSession as any
const mockPrismaBookmarkFindUnique = prisma.bookmark.findUnique as any
const mockFsStat = fs.stat as any
const mockFsReadFile = fs.readFile as any

describe("/api/workspaces/[id]/clips/[bookmarkId]/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 when user is not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/workspaces/test-workspace/clips/test-bookmark/stream")
    const response = await GET(request, {
      params: { id: "test-workspace", bookmarkId: "test-bookmark" }
    })

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe("Unauthorized")
  })

  it("should return 404 when bookmark is not found", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "user-1" } })
    mockPrismaBookmarkFindUnique.mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/workspaces/test-workspace/clips/test-bookmark/stream")
    const response = await GET(request, {
      params: { id: "test-workspace", bookmarkId: "test-bookmark" }
    })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe("Not found")
  })

  it("should return 403 when user doesn't have access to workspace", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "user-1" } })
    mockPrismaBookmarkFindUnique.mockResolvedValue({
      id: "test-bookmark",
      workspaceId: "test-workspace",
      workspace: {
        producerId: "different-user",
        memberships: []
      }
    })

    const request = new NextRequest("http://localhost/api/workspaces/test-workspace/clips/test-bookmark/stream")
    const response = await GET(request, {
      params: { id: "test-workspace", bookmarkId: "test-bookmark" }
    })

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe("Forbidden")
  })

  it("should return 404 when clip file doesn't exist", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "user-1" } })
    mockPrismaBookmarkFindUnique.mockResolvedValue({
      id: "test-bookmark",
      workspaceId: "test-workspace",
      workspace: {
        producerId: "user-1",
        memberships: []
      }
    })
    mockFsStat.mockRejectedValue(new Error("File not found"))

    const request = new NextRequest("http://localhost/api/workspaces/test-workspace/clips/test-bookmark/stream")
    const response = await GET(request, {
      params: { id: "test-workspace", bookmarkId: "test-bookmark" }
    })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe("Clip file not found")
  })

  it("should successfully serve clip file when user has access", async () => {
    const mockFileBuffer = Buffer.from("mock video data")
    const mockStats = { size: 1024 }

    mockGetServerSession.mockResolvedValue({ user: { id: "user-1" } })
    mockPrismaBookmarkFindUnique.mockResolvedValue({
      id: "test-bookmark",
      workspaceId: "test-workspace",
      workspace: {
        producerId: "user-1",
        memberships: []
      }
    })
    mockFsStat.mockResolvedValue(mockStats as any)
    mockFsReadFile.mockResolvedValue(mockFileBuffer)

    const request = new NextRequest("http://localhost/api/workspaces/test-workspace/clips/test-bookmark/stream")
    const response = await GET(request, {
      params: { id: "test-workspace", bookmarkId: "test-bookmark" }
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("video/mp4")
    expect(response.headers.get("Content-Length")).toBe("1024")
    expect(response.headers.get("Accept-Ranges")).toBe("bytes")
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600")

    const responseBody = await response.arrayBuffer()
    expect(Buffer.from(responseBody)).toEqual(mockFileBuffer)
  })

  it("should allow access for workspace members", async () => {
    const mockFileBuffer = Buffer.from("mock video data")
    const mockStats = { size: 1024 }

    mockGetServerSession.mockResolvedValue({ user: { id: "user-1" } })
    mockPrismaBookmarkFindUnique.mockResolvedValue({
      id: "test-bookmark",
      workspaceId: "test-workspace",
      workspace: {
        producerId: "different-user",
        memberships: [{ userId: "user-1" }]
      }
    })
    mockFsStat.mockResolvedValue(mockStats as any)
    mockFsReadFile.mockResolvedValue(mockFileBuffer)

    const request = new NextRequest("http://localhost/api/workspaces/test-workspace/clips/test-bookmark/stream")
    const response = await GET(request, {
      params: { id: "test-workspace", bookmarkId: "test-bookmark" }
    })

    expect(response.status).toBe(200)
  })

  it("should handle file system errors gracefully", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "user-1" } })
    mockPrismaBookmarkFindUnique.mockResolvedValue({
      id: "test-bookmark",
      workspaceId: "test-workspace",
      workspace: {
        producerId: "user-1",
        memberships: []
      }
    })
    mockFsStat.mockRejectedValue(new Error("Permission denied"))

    const request = new NextRequest("http://localhost/api/workspaces/test-workspace/clips/test-bookmark/stream")
    const response = await GET(request, {
      params: { id: "test-workspace", bookmarkId: "test-bookmark" }
    })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe("Clip file not found")
  })
})
