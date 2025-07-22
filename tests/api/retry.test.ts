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

describe('Retry API Route', () => {
  let mockSupabase: any
  let mockRequest: Partial<NextRequest>
  let POST: any

  beforeAll(async () => {
    // Import the route handler after mocks are set up
    const retryRoute = await import('@/app/api/retry/route')
    POST = retryRoute.POST
  })

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Mock Supabase client with proper chaining
    const createChainableMock = () => {
      const chain = {
        auth: {
          getUser: vi.fn()
        },
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
        update: vi.fn().mockReturnThis()
      }
      // Ensure chaining methods return the chain object
      chain.from.mockReturnValue(chain)
      chain.select.mockReturnValue(chain)
      chain.eq.mockReturnValue(chain)
      chain.update.mockReturnValue(chain)
      return chain
    }

    mockSupabase = createChainableMock()

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

      mockRequest = {
        json: vi.fn().mockResolvedValue({ fileId: 'test-file-id' })
      }

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('User not authenticated')
    })
  })

  describe('Request Validation', () => {
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

    it('should return 400 for invalid request data', async () => {
      mockRequest = {
        json: vi.fn().mockResolvedValue({ invalidField: 'test' })
      }

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Invalid request data')
      expect(data.error.details).toBeDefined()
    })

    it('should return 400 for missing fileId', async () => {
      mockRequest = {
        json: vi.fn().mockResolvedValue({})
      }

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('File Processing', () => {
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

    it('should return 404 for non-existent file', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'File not found' }
      })

      mockRequest = {
        json: vi.fn().mockResolvedValue({ fileId: '12345678-1234-1234-1234-123456789012' })
      }

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('FILE_NOT_FOUND')
    })

    it('should return 404 for file not owned by user', async () => {
      // API uses .eq('user_id', user.id) so files not owned return no data
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      })

      mockRequest = {
        json: vi.fn().mockResolvedValue({ fileId: '12345678-1234-1234-1234-123456789abc' })
      }

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('FILE_NOT_FOUND')
    })

    it('should handle server errors gracefully', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database connection failed'))

      mockRequest = {
        json: vi.fn().mockResolvedValue({ fileId: '12345678-1234-1234-1234-123456789def' })
      }

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('SERVER_ERROR')
      expect(data.error.message).toBe('Database connection failed')
    })
  })

  describe('Successful Retry', () => {
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

      // Mock file found and owned by user
      mockSupabase.single.mockResolvedValue({
        data: {
          id: '12345678-1234-1234-1234-123456789abc',
          user_id: 'user-123',
          status: 'failed',
          filename: 'test.pdf'
        },
        error: null
      })

      // Mock status update - update needs to chain with eq
      mockSupabase.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })

      // Mock process API call success
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: {
            statement: { id: 'statement-123' },
            transactions: []
          }
        }),
        text: vi.fn().mockResolvedValue(JSON.stringify({
          success: true,
          data: {
            statement: { id: 'statement-123' },
            transactions: []
          }
        }))
      })
    })

    it('should successfully retry processing a failed file', async () => {
      mockRequest = {
        json: vi.fn().mockResolvedValue({ fileId: '12345678-1234-1234-1234-123456789abc' }),
        headers: new Headers({ 'cookie': 'session=test' })
      }

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()

      // Verify status was updated to processing
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'processing' })
      
      // Verify process API was called
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/process',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Cookie': 'session=test'
          }),
          body: JSON.stringify({ fileId: '12345678-1234-1234-1234-123456789abc' })
        })
      )
    })
  })
})