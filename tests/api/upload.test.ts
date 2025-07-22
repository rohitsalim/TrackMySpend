import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock fetch for internal API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock Supabase
const mockCreateClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient
}))

describe('Upload API Route', () => {
  let mockSupabase: any
  let mockRequest: Partial<NextRequest>
  let POST: any

  beforeAll(async () => {
    // Import the route handler after mocks are set up
    const uploadRoute = await import('@/app/api/upload/route')
    POST = uploadRoute.POST
  })

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn()
      },
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        remove: vi.fn()
      },
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis()
    }

    // Mock createClient to return our mock
    mockCreateClient.mockResolvedValue(mockSupabase)

    // Mock environment variable
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const formData = new FormData()
      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      testFile.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode('test').buffer)
      formData.append('files', testFile)

      mockRequest = {
        formData: vi.fn().mockResolvedValue(formData),
        headers: new Headers()
      }

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('User not authenticated')
    })
  })

  describe('File Validation', () => {
    beforeEach(() => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com'
          }
        },
        error: null
      })
    })

    it('should return 400 when no files are provided', async () => {
      const formData = new FormData()

      mockRequest = {
        formData: vi.fn().mockResolvedValue(formData),
        headers: new Headers()
      }

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NO_FILES')
      expect(data.error.message).toBe('No files provided')
    })

    it('should return 400 for invalid file types', async () => {
      const formData = new FormData()
      formData.append('files', new File(['test'], 'test.txt', { type: 'text/plain' }))

      mockRequest = {
        formData: vi.fn().mockResolvedValue(formData),
        headers: new Headers()
      }

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVALID_FILES')
      expect(data.error.message).toBe('No valid PDF files found (max 10MB)')
    })

    it('should return 400 for files that are too large', async () => {
      const formData = new FormData()
      // Create a large file (>10MB)
      const largeFile = new File(
        [new ArrayBuffer(11 * 1024 * 1024)], 
        'large.pdf', 
        { type: 'application/pdf' }
      )
      formData.append('files', largeFile)

      mockRequest = {
        formData: vi.fn().mockResolvedValue(formData),
        headers: new Headers()
      }

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVALID_FILES')
      expect(data.error.message).toBe('No valid PDF files found (max 10MB)')
    })
  })

  describe('Successful Upload', () => {
    beforeEach(() => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com'
          }
        },
        error: null
      })

      // Mock successful storage upload
      mockSupabase.storage.upload.mockResolvedValue({
        data: { path: 'user-123/123456_test.pdf' },
        error: null
      })

      // Mock public URL generation
      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'http://localhost:3000/storage/v1/object/public/statements/user-123/123456_test.pdf' }
      })

      // Mock database insert
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'file-123',
          user_id: 'user-123',
          filename: 'test.pdf',
          file_url: 'http://localhost:3000/storage/v1/object/public/statements/user-123/123456_test.pdf',
          file_type: 'pdf',
          status: 'pending'
        },
        error: null
      })

      // Mock processing API success
      mockFetch.mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify({
          success: true,
          data: {
            statement: { id: 'statement-123' },
            transactions: []
          }
        }))
      })
    })

    it('should successfully upload and process a valid PDF file', async () => {
      const formData = new FormData()
      
      // Create a proper mock File object with required methods
      const testFileContent = 'test pdf content'
      const testFile = new File([testFileContent], 'test.pdf', { type: 'application/pdf' })
      // Mock the arrayBuffer method since Node.js File doesn't have it
      testFile.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode(testFileContent).buffer)
      
      formData.append('files', testFile)

      mockRequest = {
        formData: vi.fn().mockResolvedValue(formData),
        headers: new Headers({ 'cookie': 'session=test' })
      }

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      // Debug failing test
      if (response.status !== 200) {
        console.log('Error response:', JSON.stringify(data, null, 2))
      }

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.uploaded).toHaveLength(1)
      expect(data.data.uploaded[0].filename).toBe('test.pdf')
      expect(data.data.processing.successful).toBe(1)
      expect(data.data.processing.failed).toBe(0)

      // Verify storage upload was called
      expect(mockSupabase.storage.upload).toHaveBeenCalledWith(
        expect.stringContaining('user-123/'),
        expect.any(Uint8Array),
        { contentType: 'application/pdf', upsert: false }
      )

      // Verify database insert was called
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        filename: 'test.pdf',
        file_url: expect.stringContaining('statements/user-123/'),
        file_type: 'pdf',
        status: 'pending'
      })

      // Verify processing API was called
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/process',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Cookie': 'session=test'
          }),
          body: JSON.stringify({ fileId: 'file-123' })
        })
      )
    })

    it('should handle multiple files', async () => {
      const formData = new FormData()
      
      const testFile1 = new File(['test pdf 1'], 'test1.pdf', { type: 'application/pdf' })
      testFile1.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode('test pdf 1').buffer)
      
      const testFile2 = new File(['test pdf 2'], 'test2.pdf', { type: 'application/pdf' })
      testFile2.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode('test pdf 2').buffer)
      
      formData.append('files', testFile1)
      formData.append('files', testFile2)

      mockRequest = {
        formData: vi.fn().mockResolvedValue(formData),
        headers: new Headers()
      }

      // Mock multiple database inserts
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: 'file-1', filename: 'test1.pdf' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { id: 'file-2', filename: 'test2.pdf' },
          error: null
        })

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.uploaded).toHaveLength(2)
      expect(data.data.total).toBe(2)

      // Verify both uploads were processed
      expect(mockSupabase.storage.upload).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com'
          }
        },
        error: null
      })
    })

    it('should handle storage upload errors', async () => {
      mockSupabase.storage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage upload failed' }
      })

      const formData = new FormData()
      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      testFile.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode('test').buffer)
      formData.append('files', testFile)

      mockRequest = {
        formData: vi.fn().mockResolvedValue(formData),
        headers: new Headers()
      }

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UPLOAD_FAILED')
      expect(data.error.message).toBe('All file uploads failed')
    })

    it('should handle database errors and cleanup storage', async () => {
      // Mock successful storage upload
      mockSupabase.storage.upload.mockResolvedValue({
        data: { path: 'user-123/test.pdf' },
        error: null
      })

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'http://test.com/file.pdf' }
      })

      // Mock database error
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database insert failed' }
      })

      // Mock storage cleanup
      mockSupabase.storage.remove.mockResolvedValue({ error: null })

      const formData = new FormData()
      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      testFile.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode('test').buffer)
      formData.append('files', testFile)

      mockRequest = {
        formData: vi.fn().mockResolvedValue(formData),
        headers: new Headers()
      }

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UPLOAD_FAILED')

      // Verify cleanup was attempted
      expect(mockSupabase.storage.remove).toHaveBeenCalledWith(['user-123/test.pdf'])
    })

    it('should handle processing failures and cleanup', async () => {
      // Mock successful upload and database insert
      mockSupabase.storage.upload.mockResolvedValue({
        data: { path: 'user-123/test.pdf' },
        error: null
      })

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'http://localhost:3000/storage/v1/object/public/statements/user-123/test.pdf' }
      })

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'file-123',
          user_id: 'user-123',
          filename: 'test.pdf',
          file_url: 'http://localhost:3000/storage/v1/object/public/statements/user-123/test.pdf',
          status: 'pending'
        },
        error: null
      })

      // Mock processing failure
      mockFetch.mockResolvedValue({
        ok: false,
        text: vi.fn().mockResolvedValue(JSON.stringify({
          success: false,
          error: { message: 'Processing failed' }
        }))
      })

      // Mock cleanup operations
      mockSupabase.storage.remove.mockResolvedValue({ error: null })
      mockSupabase.delete.mockResolvedValue({ error: null })

      const formData = new FormData()
      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      testFile.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode('test').buffer)
      formData.append('files', testFile)

      mockRequest = {
        formData: vi.fn().mockResolvedValue(formData),
        headers: new Headers()
      }

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(200) // Still returns 200 with partial success
      expect(data.success).toBe(true)
      expect(data.data.processing.failed).toBe(1)
      expect(data.data.processing.errors).toHaveLength(1)
      expect(data.data.processing.errors[0].error).toBe('Processing failed')

      // Verify status was updated to failed
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'failed' })

      // Verify cleanup was attempted
      expect(mockSupabase.storage.remove).toHaveBeenCalled()
      expect(mockSupabase.delete).toHaveBeenCalled()
    })

    it('should handle general server errors', async () => {
      // Mock a general error (e.g., network error)
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Network error'))

      const formData = new FormData()
      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      testFile.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode('test').buffer)
      formData.append('files', testFile)

      mockRequest = {
        formData: vi.fn().mockResolvedValue(formData),
        headers: new Headers()
      }

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('SERVER_ERROR')
      expect(data.error.message).toBe('Network error')
    })
  })
})