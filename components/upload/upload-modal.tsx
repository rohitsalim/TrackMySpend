"use client"

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUploadStore } from '@/store/uploadStore'
import { cn } from '@/lib/utils'

interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FileWithPreview extends File {
  preview?: string
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const { uploadFiles, uploadState, uploadProgress, error, resetUploadState } = useUploadStore()
  
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
    
    if (uploadState === 'completed') {
      setTimeout(() => {
        onOpenChange(false)
        setFiles([])
        resetUploadState()
      }, 1500)
    }
  }
  
  const handleClose = () => {
    if (uploadState !== 'uploading') {
      onOpenChange(false)
      setFiles([])
      resetUploadState()
    }
  }
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
              uploadState === 'uploading' && "pointer-events-none opacity-50"
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
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
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
                  {uploadState !== 'uploading' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {uploadState === 'uploading' && uploadProgress[file.name] !== undefined && (
                    <div className="w-16 text-right">
                      <span className="text-xs text-muted-foreground">
                        {Math.round(uploadProgress[file.name])}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {/* Upload Success */}
          {uploadState === 'completed' && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-green-500/10 text-green-600">
              <Upload className="w-4 h-4" />
              <p className="text-sm">Files uploaded successfully!</p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploadState === 'uploading'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploadState === 'uploading'}
            >
              {uploadState === 'uploading' ? 'Uploading...' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}