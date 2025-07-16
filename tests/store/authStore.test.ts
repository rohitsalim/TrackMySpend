import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

// Mock getCallbackURL
vi.mock('@/lib/utils/getURL', () => ({
  getCallbackURL: vi.fn(() => 'http://localhost:3000/auth/callback'),
}))

// Mock persisted storage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('AuthStore', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    role: 'authenticated',
  }

  const mockSession: Session = {
    access_token: 'access-token-123',
    refresh_token: 'refresh-token-123',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user: mockUser,
  }

  const mockSupabase = {
    auth: {
      signInWithOAuth: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>)
    
    // Clear zustand store
    useAuthStore.setState({
      user: null,
      session: null,
      loading: false,
      initialized: false,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.session).toBeNull()
      expect(state.loading).toBe(false)
      expect(state.initialized).toBe(false)
    })
  })

  describe('State Setters', () => {
    it('should set user correctly', () => {
      useAuthStore.getState().setUser(mockUser)
      expect(useAuthStore.getState().user).toEqual(mockUser)
    })

    it('should set session correctly', () => {
      useAuthStore.getState().setSession(mockSession)
      expect(useAuthStore.getState().session).toEqual(mockSession)
    })

    it('should set loading correctly', () => {
      useAuthStore.getState().setLoading(true)
      expect(useAuthStore.getState().loading).toBe(true)
    })

    it('should set initialized correctly', () => {
      useAuthStore.getState().setInitialized(true)
      expect(useAuthStore.getState().initialized).toBe(true)
    })
  })

  describe('Google Sign In', () => {
    it('should sign in with Google successfully', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null })

      await useAuthStore.getState().signInWithGoogle()

      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
        },
      })
    })

    it('should handle Google sign in error', async () => {
      const error = new Error('Google sign in failed')
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error })

      await expect(useAuthStore.getState().signInWithGoogle()).rejects.toThrow(error)
    })

    it('should set loading state during Google sign in', async () => {
      mockSupabase.auth.signInWithOAuth.mockImplementation(() => {
        expect(useAuthStore.getState().loading).toBe(true)
        return Promise.resolve({ error: null })
      })

      await useAuthStore.getState().signInWithGoogle()
      expect(useAuthStore.getState().loading).toBe(false)
    })
  })

  describe('Email Sign In', () => {
    it('should sign in with email successfully', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      await useAuthStore.getState().signInWithEmail('test@example.com', 'password')

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      })

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.session).toEqual(mockSession)
    })

    it('should handle email sign in error', async () => {
      const error = new Error('Invalid credentials')
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error,
      })

      await expect(
        useAuthStore.getState().signInWithEmail('test@example.com', 'wrong-password')
      ).rejects.toThrow(error)
    })

    it('should set loading state during email sign in', async () => {
      mockSupabase.auth.signInWithPassword.mockImplementation(() => {
        expect(useAuthStore.getState().loading).toBe(true)
        return Promise.resolve({
          data: { user: mockUser, session: mockSession },
          error: null,
        })
      })

      await useAuthStore.getState().signInWithEmail('test@example.com', 'password')
      expect(useAuthStore.getState().loading).toBe(false)
    })
  })

  describe('Email Sign Up', () => {
    it('should sign up with email successfully', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      await useAuthStore.getState().signUpWithEmail('test@example.com', 'password')

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      })

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.session).toEqual(mockSession)
    })

    it('should handle email sign up error', async () => {
      const error = new Error('Email already registered')
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error,
      })

      await expect(
        useAuthStore.getState().signUpWithEmail('test@example.com', 'password')
      ).rejects.toThrow(error)
    })

    it('should set loading state during email sign up', async () => {
      mockSupabase.auth.signUp.mockImplementation(() => {
        expect(useAuthStore.getState().loading).toBe(true)
        return Promise.resolve({
          data: { user: mockUser, session: mockSession },
          error: null,
        })
      })

      await useAuthStore.getState().signUpWithEmail('test@example.com', 'password')
      expect(useAuthStore.getState().loading).toBe(false)
    })
  })

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      // Set initial state
      useAuthStore.getState().setUser(mockUser)
      useAuthStore.getState().setSession(mockSession)

      mockSupabase.auth.signOut.mockResolvedValue({ error: null })

      await useAuthStore.getState().signOut()

      expect(mockSupabase.auth.signOut).toHaveBeenCalled()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.session).toBeNull()
    })

    it('should handle sign out error', async () => {
      const error = new Error('Sign out failed')
      mockSupabase.auth.signOut.mockResolvedValue({ error })

      await expect(useAuthStore.getState().signOut()).rejects.toThrow(error)
    })

    it('should set loading state during sign out', async () => {
      mockSupabase.auth.signOut.mockImplementation(() => {
        expect(useAuthStore.getState().loading).toBe(true)
        return Promise.resolve({ error: null })
      })

      await useAuthStore.getState().signOut()
      expect(useAuthStore.getState().loading).toBe(false)
    })
  })

  describe('Initialize', () => {
    it('should initialize with existing session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabase.auth.onAuthStateChange.mockImplementation(() => {
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      await useAuthStore.getState().initialize()

      expect(mockSupabase.auth.getSession).toHaveBeenCalled()
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled()

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.session).toEqual(mockSession)
      expect(state.initialized).toBe(true)
    })

    it('should initialize without session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      mockSupabase.auth.onAuthStateChange.mockImplementation(() => {
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      await useAuthStore.getState().initialize()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.session).toBeNull()
      expect(state.initialized).toBe(true)
    })

    it('should handle initialization error', async () => {
      const error = new Error('Session error')
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error,
      })

      mockSupabase.auth.onAuthStateChange.mockImplementation(() => {
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      await useAuthStore.getState().initialize()

      // Should still set initialized to true even with error
      const state = useAuthStore.getState()
      expect(state.initialized).toBe(true)
      expect(state.loading).toBe(false)
    })

    it('should handle auth state changes', async () => {
      let authStateCallback: ((event: string, session: Session | null) => void) | undefined

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback: (event: string, session: Session | null) => void) => {
        authStateCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      await useAuthStore.getState().initialize()

      // Simulate auth state change with new session
      authStateCallback?.('SIGNED_IN', mockSession)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.session).toEqual(mockSession)

      // Simulate sign out
      authStateCallback?.('SIGNED_OUT', null)

      const stateAfterSignOut = useAuthStore.getState()
      expect(stateAfterSignOut.user).toBeNull()
      expect(stateAfterSignOut.session).toBeNull()
    })
  })
})