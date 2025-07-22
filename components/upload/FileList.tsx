"use client"

import React from 'react'
import Link from 'next/link'
import { FileText, Trash2, Clock, CheckCircle, XCircle, AlertCircle, Eye, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useUploadStore, UploadedFile } from '@/store/uploadStore'
import { formatDistanceToNow } from '@/lib/utils'

export function FileList() {
  const { files, deleteFile, retryFile, fetchUserFiles } = useUploadStore()
  
  React.useEffect(() => {
    fetchUserFiles()
  }, [fetchUserFiles])
  
  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'processing':
        return <AlertCircle className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }
  
  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return 'Waiting to process'
      case 'processing':
        return 'Processing transactions...'
      case 'completed':
        return 'Ready to view'
      case 'failed':
        return 'Processing failed'
    }
  }
  
  const handleDelete = async (file: UploadedFile) => {
    if (confirm(`Are you sure you want to delete ${file.filename}?`)) {
      await deleteFile(file.id)
    }
  }
  
  const handleRetry = async (file: UploadedFile) => {
    await retryFile(file.id)
  }
  
  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No files uploaded yet.
          </p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Uploaded Files</CardTitle>
        <CardDescription>
          Manage your uploaded bank statements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.filename}</p>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Uploaded {formatDistanceToNow(new Date(file.uploaded_at))} ago</span>
                    {file.total_transactions && (
                      <span>{file.total_transactions} transactions</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  {getStatusIcon(file.status)}
                  <span className="text-sm">{getStatusText(file.status)}</span>
                </div>
                
                {file.status === 'completed' && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                  >
                    <Link href="/transactions">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                )}
                
                {file.status === 'failed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetry(file)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Retry
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(file)}
                  disabled={file.status === 'processing'}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}