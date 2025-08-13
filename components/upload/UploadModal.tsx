"use client"

import React, { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, AlertCircle, Check, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUploadStore } from '@/store/uploadStore'
import { useTransactionStore } from '@/store/transaction-store'
import { cn } from '@/lib/utils'

interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FileWithPreview extends File {
  preview?: string
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const router = useRouter()
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const { uploadFiles, uploadState, uploadProgress, fileProcessingStatus, processingResult, error, resetUploadState } = useUploadStore()
  const { refreshAllTransactions } = useTransactionStore()
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Limit to 20 files
    const newFiles = acceptedFiles.slice(0, 20 - files.length)
    setFiles(prev => [...prev, ...newFiles])
  }, [files.length])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 20,
    maxSize: 10 * 1024 * 1024, // 10MB
  })
  
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }
  
  const handleUpload = async () => {
    if (files.length === 0) return
    
    await uploadFiles(files)
  }

  // Handle upload completion and refresh transactions
  React.useEffect(() => {
    const handleUploadCompletion = async () => {
      if (uploadState === 'completed') {
        // Refresh transaction data to include newly uploaded transactions
        await refreshAllTransactions()
        
        setTimeout(() => {
          onOpenChange(false)
          setFiles([])
          resetUploadState()
        }, 3000) // Extended to 3 seconds to show processing results
      }
    }

    handleUploadCompletion()
  }, [uploadState, refreshAllTransactions, onOpenChange, resetUploadState])
  
  const handleClose = () => {
    if (uploadState !== 'uploading' && uploadState !== 'processing') {
      onOpenChange(false)
      setFiles([])
      resetUploadState()
    }
  }

  const handleViewTransactions = () => {
    onOpenChange(false)
    setFiles([])
    resetUploadState()
    router.push('/transactions')
  }
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileStatusIcon = (fileName: string) => {
    const status = fileProcessingStatus[fileName]
    
    if (uploadState !== 'processing' && uploadState !== 'completed') {
      return null
    }
    
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-600" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case 'failed':
        return <X className="h-4 w-4 text-red-600" />
      case 'pending':
        return uploadState === 'processing' ? (
          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
        ) : null
      default:
        return null
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Bank Statements</DialogTitle>
          <DialogDescription>
            Upload your bank or credit card statements in PDF format. We&apos;ll process them to extract and categorize your transactions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              (uploadState === 'uploading' || uploadState === 'processing') && "pointer-events-none opacity-50"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-sm text-foreground">Drop the files here...</p>
            ) : (
              <>
                <p className="text-sm text-foreground mb-1">
                  Drag & drop PDF files here, or click to select
                </p>
                <p className="text-xs text-muted-foreground">
                  Maximum 20 files, up to 10MB each
                </p>
              </>
            )}
          </div>
          
          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              <p className="text-sm font-medium">Selected files ({files.length}/20)</p>
              {files.map((file, index) => {
                const statusIcon = getFileStatusIcon(file.name)
                const processingStatus = fileProcessingStatus[file.name]
                
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg bg-muted/50",
                      processingStatus === 'completed' && "bg-green-50 border border-green-200",
                      processingStatus === 'failed' && "bg-red-50 border border-red-200",
                      processingStatus === 'processing' && "bg-blue-50 border border-blue-200"
                    )}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Status Icon and Progress */}
                    <div className="flex items-center space-x-2">
                      {statusIcon && (
                        <div className="flex-shrink-0">
                          {statusIcon}
                        </div>
                      )}
                      
                      {/* Remove button (only when not processing) */}
                      {(uploadState !== 'uploading' && uploadState !== 'processing') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Progress text */}
                      {(uploadState === 'uploading' || uploadState === 'processing') && uploadProgress[file.name] !== undefined && !statusIcon && (
                        <div className="w-16 text-right">
                          <span className="text-xs text-muted-foreground">
                            {uploadState === 'processing' ? 'Processing...' : `${Math.round(uploadProgress[file.name])}%`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {/* Processing Status */}
          {uploadState === 'processing' && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-blue-500/10 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <p className="text-sm">Processing files and extracting transactions...</p>
            </div>
          )}

          {/* Processing Success */}
          {uploadState === 'completed' && processingResult && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-green-500/10 text-green-600">
                <Upload className="w-4 h-4" />
                <p className="text-sm">Files processed successfully!</p>
              </div>
              {processingResult.successful > 0 && (
                <div className="text-sm text-muted-foreground px-3">
                  ✅ {processingResult.successful} file{processingResult.successful !== 1 ? 's' : ''} processed successfully
                </div>
              )}
              {processingResult.failed > 0 && (
                <div className="text-sm text-destructive px-3">
                  ❌ {processingResult.failed} file{processingResult.failed !== 1 ? 's' : ''} failed to process
                </div>
              )}
            </div>
          )}

          {/* Upload Success (fallback for when no processing result) */}
          {uploadState === 'completed' && !processingResult && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-green-500/10 text-green-600">
              <Upload className="w-4 w-4" />
              <p className="text-sm">Files uploaded successfully!</p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploadState === 'uploading' || uploadState === 'processing'}
            >
              {uploadState === 'completed' ? 'Close' : 'Cancel'}
            </Button>
            
            {uploadState === 'completed' && processingResult && processingResult.successful > 0 && (
              <Button
                onClick={handleViewTransactions}
                className="bg-green-600 hover:bg-green-700"
              >
                View Transactions
              </Button>
            )}
            
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploadState === 'uploading' || uploadState === 'processing' || uploadState === 'completed'}
            >
              {uploadState === 'uploading' 
                ? 'Uploading...' 
                : uploadState === 'processing'
                ? 'Processing...'
                : uploadState === 'completed'
                ? 'Complete'
                : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}