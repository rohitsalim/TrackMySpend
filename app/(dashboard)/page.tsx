"use client"

import { useEffect, useState } from 'react'
import { EmptyState } from '@/components/upload/empty-state'
import { UploadModal } from '@/components/upload/upload-modal'
import { useUploadStore } from '@/store/uploadStore'

export default function Home() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const { hasUploadedFiles, fetchUserFiles } = useUploadStore()
  
  useEffect(() => {
    fetchUserFiles()
  }, [fetchUserFiles])
  
  return (
    <div className="container mx-auto py-8">
      {!hasUploadedFiles ? (
        <EmptyState onUploadClick={() => setUploadModalOpen(true)} />
      ) : (
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">Welcome to TrackMySpend</h1>
            <p className="text-xl text-muted-foreground">
              Your Financial Statement Analysis Platform
            </p>
          </div>

          <div className="text-center">
            <p className="text-muted-foreground">
              Your transactions will appear here once processing is complete.
            </p>
          </div>
        </div>
      )}
      
      <UploadModal 
        open={uploadModalOpen} 
        onOpenChange={setUploadModalOpen}
      />
    </div>
  );
}
