"use client"

import { useState } from "react"
import { 
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  UsersIcon,
  LockClosedIcon
} from "@heroicons/react/24/outline"

interface VideoAccessControlModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (isPublicToWorkspace: boolean, accessControlWarned: boolean) => void
  videoTitle?: string
}

export default function VideoAccessControlModal({
  isOpen,
  onClose,
  onConfirm,
  videoTitle = "this video"
}: VideoAccessControlModalProps) {
  const [isPublicToWorkspace, setIsPublicToWorkspace] = useState(false)
  const [hasReadWarning, setHasReadWarning] = useState(false)

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(isPublicToWorkspace, hasReadWarning)
    onClose()
  }

  const handleCancel = () => {
    setIsPublicToWorkspace(false)
    setHasReadWarning(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Video Access Control
              </h3>
              <p className="text-sm text-gray-500">
                Control who can access {videoTitle}
              </p>
            </div>
          </div>

          {/* Warning Section */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-800 mb-2">
                  Important: Producer Access Warning
                </h4>
                <div className="text-sm text-amber-700 space-y-2">
                  <p>
                    <strong>Producers have full access to all videos in this workspace.</strong> 
                    This means they can:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Play videos through the VTR system during production</li>
                    <li>Download video clips and files</li>
                    <li>Access video metadata and processing information</li>
                    <li>Generate bookmarks and clips from your videos</li>
                  </ul>
                  <p className="font-medium">
                    Only add videos you're comfortable sharing with the production team.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Access Control Options */}
          <div className="space-y-4 mb-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <input
                    type="radio"
                    id="private"
                    name="access"
                    checked={!isPublicToWorkspace}
                    onChange={() => setIsPublicToWorkspace(false)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="private" className="block">
                    <div className="flex items-center space-x-2 mb-2">
                      <EyeSlashIcon className="h-5 w-5 text-gray-500" />
                      <span className="font-medium text-gray-900">Private Access</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Only you and the producer can access this video. Other collaborators 
                      will not see or be able to use this video.
                    </p>
                  </label>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <input
                    type="radio"
                    id="public"
                    name="access"
                    checked={isPublicToWorkspace}
                    onChange={() => setIsPublicToWorkspace(true)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="public" className="block">
                    <div className="flex items-center space-x-2 mb-2">
                      <UsersIcon className="h-5 w-5 text-gray-500" />
                      <span className="font-medium text-gray-900">Workspace Access</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      All workspace members can access this video. They can view, create 
                      bookmarks, and generate clips from it.
                    </p>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Acknowledgment Checkbox */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  id="acknowledge"
                  checked={hasReadWarning}
                  onChange={(e) => setHasReadWarning(e.target.checked)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
              </div>
              <label htmlFor="acknowledge" className="text-sm text-gray-700">
                I understand that producers have full access to all videos in this workspace 
                and can play them through VTR systems and download clips during production/post. 
                I am comfortable sharing {videoTitle} under these conditions.
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!hasReadWarning}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Video
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
