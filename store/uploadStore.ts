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


interface UploadStore {
  files: UploadedFile[]
  uploadState: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  uploadProgress: Record<string, number>
  error: string | null
  hasUploadedFiles: boolean
  
  fetchUserFiles: () => Promise<void>
  uploadFiles: (files: File[]) => Promise<void>
  deleteFile: (id: string) => Promise<void>
  setUploadState: (state: 'idle' | 'uploading' | 'processing' | 'completed' | 'error') => void
  setError: (error: string | null) => void
  updateUploadProgress: (fileId: string, progress: number) => void
  resetUploadState: () => void
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  files: [],
  uploadState: 'idle',
  uploadProgress: {},
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
    set({ uploadState: 'uploading', error: null, uploadProgress: {} })
    
    try {
      // Initialize progress for all files
      files.forEach(file => {
        set((state) => ({
          uploadProgress: { ...state.uploadProgress, [file.name]: 0 }
        }))
      })
      
      // Create FormData
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })
      
      // Upload via API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Upload failed')
      }
      
      // Update progress to 100% for all files
      files.forEach(file => {
        set((state) => ({
          uploadProgress: { ...state.uploadProgress, [file.name]: 100 }
        }))
      })
      
      // Refresh file list
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
  
  setUploadState: (state) => set({ uploadState: state }),
  setError: (error) => set({ error }),
  updateUploadProgress: (fileId, progress) => {
    set((state) => ({
      uploadProgress: { ...state.uploadProgress, [fileId]: progress }
    }))
  },
  resetUploadState: () => set({ 
    uploadState: 'idle', 
    error: null, 
    uploadProgress: {} 
  })
}))