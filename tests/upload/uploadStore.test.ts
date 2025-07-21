import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUploadStore } from '@/store/uploadStore'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}))

// Mock fetch
global.fetch = vi.fn()

describe('uploadStore', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    })),
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase)
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockReset()
    
    // Reset store state
    useUploadStore.setState({
      files: [],
      uploadState: 'idle',
      uploadProgress: {},
      error: null,
      hasUploadedFiles: false
    })
  })

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const { result } = renderHook(() => useUploadStore())
      
      expect(result.current.files).toEqual([])
      expect(result.current.uploadState).toBe('idle')
      expect(result.current.uploadProgress).toEqual({})
      expect(result.current.error).toBeNull()
      expect(result.current.hasUploadedFiles).toBe(false)
    })
  })

  describe('fetchUserFiles', () => {
    it('should fetch user files successfully', async () => {
      const mockFiles = [
        { id: '1', filename: 'statement1.pdf', status: 'completed' },
        { id: '2', filename: 'statement2.pdf', status: 'pending' }
      ]
      
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: { id: 'user123' } }, 
        error: null 
      })
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockFiles, error: null }))
          }))
        }))
      })
      
      const { result } = renderHook(() => useUploadStore())
      
      await act(async () => {
        await result.current.fetchUserFiles()
      })
      
      expect(result.current.files).toEqual(mockFiles)
      expect(result.current.hasUploadedFiles).toBe(true)
    })

    it('should handle no user gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: null }, 
        error: null 
      })
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      })
      
      const { result } = renderHook(() => useUploadStore())
      
      await act(async () => {
        await result.current.fetchUserFiles()
      })
      
      expect(result.current.files).toEqual([])
      expect(result.current.hasUploadedFiles).toBe(false)
    })
  })

  describe('uploadFiles', () => {
    it('should upload files successfully', async () => {
      const mockFiles = [
        new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'test2.pdf', { type: 'application/pdf' })
      ]
      
      // Mock successful upload response
      ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { 
            uploaded: [
              { id: '1', filename: 'test1.pdf' },
              { id: '2', filename: 'test2.pdf' }
            ]
          }
        })
      })
      
      // Mock successful fetchUserFiles call
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: { id: 'user123' } }, 
        error: null 
      })
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockFiles, error: null }))
          }))
        }))
      })
      
      const { result } = renderHook(() => useUploadStore())
      
      await act(async () => {
        await result.current.uploadFiles(mockFiles)
      })
      
      expect(result.current.uploadState).toBe('completed')
      expect(result.current.hasUploadedFiles).toBe(true)
      expect(result.current.error).toBeNull()
      
      // Check that fetch was called with correct data
      expect(global.fetch).toHaveBeenCalledWith('/api/upload', {
        method: 'POST',
        body: expect.any(FormData)
      })
    })

    it('should handle upload errors', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      
      ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: async () => ({ 
          success: false, 
          error: { message: 'Upload failed' }
        })
      })
      
      const { result } = renderHook(() => useUploadStore())
      
      await act(async () => {
        await result.current.uploadFiles([mockFile])
      })
      
      expect(result.current.uploadState).toBe('error')
      expect(result.current.error).toBe('Upload failed')
    })
  })

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const fileId = 'file123'
      const initialFiles = [
        { id: fileId, filename: 'test.pdf', file_url: 'https://example.com/storage/v1/object/public/statements/path/to/file.pdf' },
        { id: 'file456', filename: 'other.pdf', file_url: 'https://example.com/storage/v1/object/public/statements/path/to/other.pdf' }
      ]
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'files') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: { file_url: 'https://example.com/storage/v1/object/public/statements/path/to/file.pdf' }, 
                  error: null 
                }))
              }))
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          }
        }
        // Return basic mock for other tables
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }
      })
      
      const { result } = renderHook(() => useUploadStore())
      
      // Set initial files
      act(() => {
        result.current.files = initialFiles as any
      })
      
      await act(async () => {
        await result.current.deleteFile(fileId)
      })
      
      expect(result.current.files).toHaveLength(1)
      expect(result.current.files[0].id).toBe('file456')
    })
  })

  describe('state setters', () => {
    it('should update upload state', () => {
      const { result } = renderHook(() => useUploadStore())
      
      act(() => {
        result.current.setUploadState('uploading')
      })
      
      expect(result.current.uploadState).toBe('uploading')
    })

    it('should set error', () => {
      const { result } = renderHook(() => useUploadStore())
      
      act(() => {
        result.current.setError('Test error')
      })
      
      expect(result.current.error).toBe('Test error')
    })

    it('should reset upload state', () => {
      const { result } = renderHook(() => useUploadStore())
      
      // Set some state first
      act(() => {
        result.current.setUploadState('error')
        result.current.setError('Some error')
        result.current.updateUploadProgress('test.pdf', 50)
      })
      
      // Reset
      act(() => {
        result.current.resetUploadState()
      })
      
      expect(result.current.uploadState).toBe('idle')
      expect(result.current.error).toBeNull()
      expect(result.current.uploadProgress).toEqual({})
    })
  })
})