import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import { getCallbackURL } from '@/lib/utils/getURL'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
}

interface AuthActions {
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      loading: false,
      initialized: false,

      // Actions
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),
      setInitialized: (initialized) => set({ initialized }),

      signInWithGoogle: async () => {
        try {
          set({ loading: true })
          const supabase = createClient()
          
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: getCallbackURL(),
            },
          })
          
          if (error) {
            console.error('Google sign in error:', error)
            throw error
          }
        } catch (error) {
          console.error('Sign in with Google failed:', error)
          throw error
        } finally {
          set({ loading: false })
        }
      },

      signInWithEmail: async (email: string, password: string) => {
        try {
          set({ loading: true })
          const supabase = createClient()
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          
          if (error) {
            console.error('Email sign in error:', error)
            throw error
          }
          
          if (data.user && data.session) {
            set({ user: data.user, session: data.session })
          }
        } catch (error) {
          console.error('Sign in with email failed:', error)
          throw error
        } finally {
          set({ loading: false })
        }
      },

      signUpWithEmail: async (email: string, password: string) => {
        try {
          set({ loading: true })
          const supabase = createClient()
          
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            // Let Supabase handle email confirmation redirects automatically
          })
          
          if (error) {
            console.error('Email sign up error:', error)
            throw error
          }
          
          if (data.user && data.session) {
            set({ user: data.user, session: data.session })
          }
        } catch (error) {
          console.error('Sign up with email failed:', error)
          throw error
        } finally {
          set({ loading: false })
        }
      },

      signOut: async () => {
        try {
          set({ loading: true })
          const supabase = createClient()
          
          const { error } = await supabase.auth.signOut()
          
          if (error) {
            console.error('Sign out error:', error)
            throw error
          }
          
          set({ user: null, session: null })
        } catch (error) {
          console.error('Sign out failed:', error)
          throw error
        } finally {
          set({ loading: false })
        }
      },

      initialize: async () => {
        try {
          set({ loading: true })
          const supabase = createClient()
          
          // Get initial session
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('Error getting session:', error)
            return
          }
          
          if (session) {
            set({ 
              user: session.user, 
              session: session,
            })
          }
          
          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session)
            
            if (session) {
              set({ 
                user: session.user, 
                session: session,
              })
            } else {
              set({ 
                user: null, 
                session: null,
              })
            }
          })
          
          set({ initialized: true })
        } catch (error) {
          console.error('Auth initialization failed:', error)
        } finally {
          set({ loading: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
)