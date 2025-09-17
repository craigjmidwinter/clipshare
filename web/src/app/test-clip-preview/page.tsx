'use client'

import React, { useState } from 'react'

export default function ClipPreviewTest() {
  const [workspaceId, setWorkspaceId] = useState('cmfle198x00016d9841k9l9lb')
  const [bookmarkId, setBookmarkId] = useState('cmflf25wm00026dmebe8zx7ok')
  const [testResult, setTestResult] = useState('')
  const [streamToken, setStreamToken] = useState<string | null>(null)

  const testClipUrl = async () => {
    // First get a token
    try {
      const tokenResponse = await fetch(`/api/workspaces/${workspaceId}/clips/${bookmarkId}/token`)
      if (!tokenResponse.ok) {
        setTestResult(`Token request failed: ${tokenResponse.status}`)
        return
      }
      const tokenData = await tokenResponse.json()
      setStreamToken(tokenData.token)
      
      const url = `/api/workspaces/${workspaceId}/clips/${bookmarkId}/stream?token=${tokenData.token}`
      console.log('Testing URL:', url)
      
      const response = await fetch(url)
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (response.ok) {
        const blob = await response.blob()
        console.log('Blob size:', blob.size)
        setTestResult(`Success! Blob size: ${blob.size} bytes`)
      } else {
        const text = await response.text()
        console.log('Error response:', text)
        setTestResult(`Error ${response.status}: ${text}`)
      }
    } catch (error) {
      console.error('Fetch error:', error)
      setTestResult(`Fetch error: ${error.message}`)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Clip Preview Test</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Workspace ID:</label>
          <input
            type="text"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Bookmark ID:</label>
          <input
            type="text"
            value={bookmarkId}
            onChange={(e) => setBookmarkId(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <button
          onClick={testClipUrl}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Clip URL
        </button>
        
        {testResult && (
          <div className="p-4 bg-gray-100 rounded">
            <pre>{testResult}</pre>
          </div>
        )}
        
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2">Video Test</h2>
          {streamToken ? (
            <video
              controls
              className="w-full max-w-md"
              src={`/api/workspaces/${workspaceId}/clips/${bookmarkId}/stream?token=${streamToken}`}
              onError={(e) => {
                console.error('Video error:', e)
                setTestResult(`Video error: ${e.type}`)
              }}
              onLoadStart={() => console.log('Video load start')}
              onLoadedMetadata={() => console.log('Video metadata loaded')}
              onCanPlay={() => console.log('Video can play')}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="w-full max-w-md h-32 bg-gray-200 flex items-center justify-center">
              Click "Test Clip URL" to get token first
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
