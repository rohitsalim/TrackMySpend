"use client"

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, initialized } = useAuthStore()

  useEffect(() => {
    if (!initialized) {
      try {
        initialize()
      } catch (error) {
        console.error('Auth initialization failed:', error)
      }
    }
  }, [initialize, initialized])

  return <>{children}</>
}