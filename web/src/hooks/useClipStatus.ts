import { useState, useEffect, useCallback } from 'react'

interface ClipStatus {
  ready: boolean
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progressPercent: number
}

interface UseClipStatusReturn {
  clipStatus: ClipStatus | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useClipStatus(workspaceId: string, bookmarkId: string): UseClipStatusReturn {
  const [clipStatus, setClipStatus] = useState<ClipStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClipStatus = useCallback(async () => {
    if (!workspaceId || !bookmarkId) {
      setClipStatus(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/workspaces/${workspaceId}/clips/${bookmarkId}`)
      
      if (response.ok) {
        const data = await response.json()
        setClipStatus(data)
      } else if (response.status === 404) {
        // Clip not ready yet
        const data = await response.json()
        setClipStatus(data)
      } else {
        throw new Error(`Failed to fetch clip status: ${response.status}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clip status')
      setClipStatus(null)
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId, bookmarkId])

  useEffect(() => {
    fetchClipStatus()
    
    // Poll for updates if clip is processing
    const interval = setInterval(() => {
      if (clipStatus?.status === 'processing' || clipStatus?.status === 'pending') {
        fetchClipStatus()
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(interval)
  }, [fetchClipStatus, clipStatus?.status])

  return {
    clipStatus,
    isLoading,
    error,
    refetch: fetchClipStatus
  }
}
