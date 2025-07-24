import { beforeEach, afterEach, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Mock Next.js router
import { vi } from 'vitest'

vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}))

// Mock DOM methods that might be needed for portal components
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
})) as unknown as typeof IntersectionObserver

// Mock ResizeObserver  
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
})) as unknown as typeof ResizeObserver

// Mock shadcn/ui Select components to avoid portal issues in tests
vi.mock('@/components/ui/select', async () => {
  const React = await import('react')
  return {
    Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (value: string) => void }) => 
      React.createElement('div', { 
        'data-testid': 'select-mock',
        onClick: () => onValueChange && onValueChange('test')
      }, children),
    SelectContent: ({ children }: { children: React.ReactNode }) => 
      React.createElement('div', { 'data-testid': 'select-content' }, children),
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => 
      React.createElement('div', { 
        'data-testid': 'select-item', 
        'data-value': value 
      }, children),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => 
      React.createElement('div', { 'data-testid': 'select-trigger' }, children),
    SelectValue: ({ placeholder }: { placeholder: string }) => 
      React.createElement('div', { 'data-testid': 'select-value' }, placeholder),
  }
})

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Suppress console errors for tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

// Cleanup after each test
afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})