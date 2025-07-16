import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Mock Supabase SSR
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

// Mock Next.js
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    NextResponse: {
      next: vi.fn(),
      redirect: vi.fn(),
    },
  }
})

describe('Auth Middleware', () => {
  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn(),
    },
  }

  const mockNextResponseObject = {
    cookies: {
      set: vi.fn(),
      getAll: vi.fn(() => []),
      setAll: vi.fn(),
    },
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Mock environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    
    // Mock createServerClient
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient)
    
    // Mock NextResponse
    vi.mocked(NextResponse.next).mockReturnValue(mockNextResponseObject as any)
    vi.mocked(NextResponse.redirect).mockReturnValue(mockNextResponseObject as any)
  })

  it('should skip middleware when environment variables are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const request = new NextRequest('http://localhost:3000/dashboard')
    const result = await updateSession(request)

    expect(result).toBe(mockNextResponseObject)
    expect(mockSupabaseClient.auth.getUser).not.toHaveBeenCalled()
  })

  it('should allow authenticated user to access protected routes', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/dashboard')
    const result = await updateSession(request)

    expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled()
    expect(NextResponse.redirect).not.toHaveBeenCalled()
    expect(result).toBe(mockNextResponseObject)
  })

  it('should redirect unauthenticated user to login from protected route', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/dashboard')
    const result = await updateSession(request)

    expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled()
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/login',
      })
    )
  })

  it('should allow unauthenticated user to access login page', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/login')
    const result = await updateSession(request)

    expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled()
    expect(NextResponse.redirect).not.toHaveBeenCalled()
    expect(result).toBe(mockNextResponseObject)
  })

  it('should allow unauthenticated user to access signup page', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/signup')
    const result = await updateSession(request)

    expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled()
    expect(NextResponse.redirect).not.toHaveBeenCalled()
    expect(result).toBe(mockNextResponseObject)
  })

  it('should allow unauthenticated user to access auth callback', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/auth/callback')
    const result = await updateSession(request)

    expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled()
    expect(NextResponse.redirect).not.toHaveBeenCalled()
    expect(result).toBe(mockNextResponseObject)
  })

  it('should handle cookie management correctly', async () => {
    const mockCookies = [
      { name: 'sb-access-token', value: 'token123' },
      { name: 'sb-refresh-token', value: 'refresh123' },
    ]

    const request = new NextRequest('http://localhost:3000/dashboard')
    request.cookies.getAll = vi.fn(() => mockCookies)

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    const { createServerClient } = await import('@supabase/ssr')
    
    // Mock the cookies configuration
    let cookiesConfig: any
    const mockCreateServerClient = vi.mocked(createServerClient)
    mockCreateServerClient.mockImplementation((url, key, config) => {
      cookiesConfig = config
      return mockSupabaseClient
    })

    await updateSession(request)

    expect(cookiesConfig.cookies.getAll()).toEqual(mockCookies)
  })

  it('should handle Supabase auth error gracefully', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth error' },
    })

    const request = new NextRequest('http://localhost:3000/dashboard')
    const result = await updateSession(request)

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/login',
      })
    )
  })

  it('should properly handle cookie setting in response', async () => {
    const mockCookiesToSet = [
      { name: 'sb-access-token', value: 'new-token', options: { httpOnly: true } },
    ]

    const request = new NextRequest('http://localhost:3000/dashboard')
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    let cookiesConfig: any
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockImplementation((url, key, config) => {
      cookiesConfig = config
      return mockSupabaseClient
    })

    await updateSession(request)

    // Test setAll functionality
    cookiesConfig.cookies.setAll(mockCookiesToSet)

    expect(mockNextResponseObject.cookies.set).toHaveBeenCalledWith(
      'sb-access-token',
      'new-token',
      { httpOnly: true }
    )
  })
})