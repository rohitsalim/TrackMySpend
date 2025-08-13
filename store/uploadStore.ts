import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

export interface UploadedFile {
  id: string
  user_id: string
  filename: string
  file_url: string
  file_type: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  uploaded_at: string
  processed_at?: string
  total_transactions?: number
  total_income?: number
  total_expenses?: number
  person_inferred?: string
}


interface ProcessingResult {
  successful: number
  failed: number
  errors: Array<{ fileId: string; error: string }>
}

interface UploadStore {
  files: UploadedFile[]
  uploadState: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  uploadProgress: Record<string, number>
  fileProcessingStatus: Record<string, 'pending' | 'processing' | 'completed' | 'failed'>
  processingResult: ProcessingResult | null
  error: string | null
  hasUploadedFiles: boolean
  
  fetchUserFiles: () => Promise<void>
  uploadFiles: (files: File[]) => Promise<void>
  deleteFile: (id: string) => Promise<void>
  deleteMultipleFiles: (ids: string[]) => Promise<{ successful: number; failed: number; errors: string[] }>
  retryFile: (id: string) => Promise<void>
  setUploadState: (state: 'idle' | 'uploading' | 'processing' | 'completed' | 'error') => void
  setError: (error: string | null) => void
  updateUploadProgress: (fileId: string, progress: number) => void
  updateFileProcessingStatus: (fileName: string, status: 'pending' | 'processing' | 'completed' | 'failed') => void
  resetUploadState: () => void
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  files: [],
  uploadState: 'idle',
  uploadProgress: {},
  fileProcessingStatus: {},
  processingResult: null,
  error: null,
  hasUploadedFiles: false,
  
  fetchUserFiles: async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return
    
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching files:', error)
      return
    }
    
    set({ 
      files: data || [],
      hasUploadedFiles: (data && data.length > 0) || false
    })
  },
  
  uploadFiles: async (files: File[]) => {
    set({ uploadState: 'uploading', error: null, uploadProgress: {}, fileProcessingStatus: {}, processingResult: null })
    
    try {
      // Initialize progress and processing status for all files
      files.forEach(file => {
        set((state) => ({
          uploadProgress: { ...state.uploadProgress, [file.name]: 0 },
          fileProcessingStatus: { ...state.fileProcessingStatus, [file.name]: 'pending' }
        }))
      })
      
      set({ uploadState: 'processing' })
      
      let successfulCount = 0
      let failedCount = 0
      const errors: Array<{ fileId: string; error: string }> = []
      
      // Process files one by one to provide individual feedback
      for (const file of files) {
        try {
          // Update status to processing for current file
          get().updateFileProcessingStatus(file.name, 'processing')
          
          // Create FormData for single file
          const formData = new FormData()
          formData.append('files', file)
          
          // Upload and process single file
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          })
          
          const result = await response.json()
          
          if (response.ok && result.success) {
            // Mark file as completed
            get().updateFileProcessingStatus(file.name, 'completed')
            get().updateUploadProgress(file.name, 100)
            successfulCount++
          } else {
            // Mark file as failed
            get().updateFileProcessingStatus(file.name, 'failed')
            failedCount++
            errors.push({
              fileId: file.name,
              error: result.error?.message || 'Processing failed'
            })
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error)
          get().updateFileProcessingStatus(file.name, 'failed')
          failedCount++
          errors.push({
            fileId: file.name,
            error: error instanceof Error ? error.message : 'Processing failed'
          })
        }
      }
      
      // Store final processing results
      set({
        processingResult: {
          successful: successfulCount,
          failed: failedCount,
          errors
        }
      })
      
      // Refresh file list to show updated statuses
      await get().fetchUserFiles()
      
      set({
        uploadState: 'completed',
        hasUploadedFiles: true
      })
      
    } catch (error) {
      console.error('Upload error:', error)
      set({ 
        uploadState: 'error', 
        error: error instanceof Error ? error.message : 'Upload failed' 
      })
    }
  },
  
  deleteFile: async (id: string) => {
    const supabase = createClient()
    
    // Get file details first
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('file_url')
      .eq('id', id)
      .single()
    
    if (fetchError) {
      console.error('Error fetching file:', fetchError)
      return
    }
    
    // Delete from storage
    if (file?.file_url) {
      // Extract path from URL for storage deletion
      const urlPath = file.file_url.replace(/.*\/storage\/v1\/object\/public\/statements\//, '')
      await supabase.storage
        .from('statements')
        .remove([urlPath])
    }
    
    // Delete from database
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      console.error('Error deleting file:', deleteError)
      return
    }
    
    set((state) => {
      const newFiles = state.files.filter(f => f.id !== id)
      return {
        files: newFiles,
        hasUploadedFiles: newFiles.length > 0
      }
    })
  },
  
  deleteMultipleFiles: async (ids: string[]) => {
    if (ids.length === 0) {
      return { successful: 0, failed: 0, errors: [] }
    }

    const supabase = createClient()
    let successful = 0
    let failed = 0
    const errors: string[] = []
    const deletedFileIds: string[] = []

    try {
      // Get file details for all files to delete
      const { data: filesToDelete, error: fetchError } = await supabase
        .from('files')
        .select('id, filename, file_url')
        .in('id', ids)

      if (fetchError) {
        console.error('Error fetching files for bulk delete:', fetchError)
        return { successful: 0, failed: ids.length, errors: [fetchError.message] }
      }

      // Process each file deletion
      for (const file of filesToDelete || []) {
        try {
          // Delete from storage if file_url exists
          if (file.file_url) {
            const urlPath = file.file_url.replace(/.*\/storage\/v1\/object\/public\/statements\//, '')
            const { error: storageError } = await supabase.storage
              .from('statements')
              .remove([urlPath])
            
            if (storageError) {
              console.warn(`Warning: Could not delete file from storage for ${file.filename}:`, storageError)
              // Continue with database deletion even if storage deletion fails
            }
          }

          // Delete from database
          const { error: deleteError } = await supabase
            .from('files')
            .delete()
            .eq('id', file.id)

          if (deleteError) {
            throw new Error(`Database deletion failed: ${deleteError.message}`)
          }

          // Track successful deletion
          deletedFileIds.push(file.id)
          successful++
        } catch (error) {
          failed++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          errors.push(`${file.filename}: ${errorMessage}`)
          console.error(`Failed to delete file ${file.filename}:`, error)
        }
      }

      // Update state to remove successfully deleted files
      if (deletedFileIds.length > 0) {
        set((state) => {
          const newFiles = state.files.filter(f => !deletedFileIds.includes(f.id))
          return {
            files: newFiles,
            hasUploadedFiles: newFiles.length > 0
          }
        })
      }

      return { successful, failed, errors }
    } catch (error) {
      console.error('Bulk delete operation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Bulk delete failed'
      return { successful: 0, failed: ids.length, errors: [errorMessage] }
    }
  },
  
  retryFile: async (id: string) => {
    try {
      // Update file status to processing optimistically
      set((state) => ({
        files: state.files.map(f => 
          f.id === id ? { ...f, status: 'processing' } : f
        )
      }))
      
      // Call retry API
      const response = await fetch('/api/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId: id }),
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Retry failed')
      }
      
      // Refresh file list to get updated status
      await get().fetchUserFiles()
      
    } catch (error) {
      console.error('Retry error:', error)
      
      // Update file status back to failed on error
      set((state) => ({
        files: state.files.map(f => 
          f.id === id ? { ...f, status: 'failed' } : f
        )
      }))
      
      // Set error state
      set({ 
        error: error instanceof Error ? error.message : 'Retry failed' 
      })
    }
  },
  
  setUploadState: (state) => set({ uploadState: state }),
  setError: (error) => set({ error }),
  updateUploadProgress: (fileId, progress) => {
    set((state) => ({
      uploadProgress: { ...state.uploadProgress, [fileId]: progress }
    }))
  },
  updateFileProcessingStatus: (fileName, status) => {
    set((state) => ({
      fileProcessingStatus: { ...state.fileProcessingStatus, [fileName]: status }
    }))
  },
  resetUploadState: () => set({ 
    uploadState: 'idle', 
    error: null, 
    uploadProgress: {},
    fileProcessingStatus: {},
    processingResult: null
  })
}))