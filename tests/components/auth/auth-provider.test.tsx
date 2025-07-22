import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { useAuthStore } from '@/store/authStore'

// Mock the auth store
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

describe('AuthProvider', () => {
  const mockAuthStore = {
    initialize: vi.fn(),
    initialized: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)
  })

  it('should render children correctly', () => {
    render(
      <AuthProvider>
        <div data-testid="child-component">Test Child</div>
      </AuthProvider>
    )

    expect(screen.getByTestId('child-component')).toBeInTheDocument()
    expect(screen.getByText('Test Child')).toBeInTheDocument()
  })

  it('should call initialize when not initialized', () => {
    mockAuthStore.initialized = false
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)

    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    )

    expect(mockAuthStore.initialize).toHaveBeenCalledTimes(1)
  })

  it('should not call initialize when already initialized', () => {
    mockAuthStore.initialized = true
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)

    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    )

    expect(mockAuthStore.initialize).not.toHaveBeenCalled()
  })

  it('should call initialize only once on re-renders when initialized becomes true', () => {
    mockAuthStore.initialized = false
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)

    const { rerender } = render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    )

    expect(mockAuthStore.initialize).toHaveBeenCalledTimes(1)

    // Simulate initialized becoming true
    mockAuthStore.initialized = true
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)

    rerender(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    )

    // Should not call initialize again
    expect(mockAuthStore.initialize).toHaveBeenCalledTimes(1)
  })

  it('should handle multiple children', () => {
    render(
      <AuthProvider>
        <div data-testid="child-1">First Child</div>
        <div data-testid="child-2">Second Child</div>
        <span data-testid="child-3">Third Child</span>
      </AuthProvider>
    )

    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
    expect(screen.getByTestId('child-3')).toBeInTheDocument()
  })

  it('should handle no children', () => {
    mockAuthStore.initialized = false
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)
    
    const { container } = render(<AuthProvider>{null}</AuthProvider>)
    
    expect(container.textContent).toBe('')
    expect(mockAuthStore.initialize).toHaveBeenCalledTimes(1)
  })

  it('should handle empty children', () => {
    mockAuthStore.initialized = false
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)
    
    const { container } = render(<AuthProvider>{''}</AuthProvider>)
    
    expect(container.textContent).toBe('')
    expect(mockAuthStore.initialize).toHaveBeenCalledTimes(1)
  })

  it('should handle complex nested children', () => {
    render(
      <AuthProvider>
        <div>
          <header>Header</header>
          <main>
            <section>
              <p>Content</p>
            </section>
          </main>
          <footer>Footer</footer>
        </div>
      </AuthProvider>
    )

    expect(screen.getByText('Header')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('should maintain auth store subscription across re-renders', () => {
    mockAuthStore.initialized = false
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)

    const { rerender } = render(
      <AuthProvider>
        <div>Initial</div>
      </AuthProvider>
    )

    // First render should call initialize
    expect(mockAuthStore.initialize).toHaveBeenCalledTimes(1)

    // Re-render with different children but same initialized state
    rerender(
      <AuthProvider>
        <div>Updated</div>
      </AuthProvider>
    )

    // Should not call initialize again
    expect(mockAuthStore.initialize).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Updated')).toBeInTheDocument()
  })

  it('should handle auth store errors gracefully', () => {
    mockAuthStore.initialized = false
    mockAuthStore.initialize.mockImplementation(() => {
      throw new Error('Initialization failed')
    })
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)

    // Should not throw error when rendering
    expect(() => {
      render(
        <AuthProvider>
          <div>Test</div>
        </AuthProvider>
      )
    }).not.toThrow()

    // Children should still render
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('should work with React fragments as children', () => {
    render(
      <AuthProvider>
        <>
          <div data-testid="fragment-child-1">Fragment Child 1</div>
          <div data-testid="fragment-child-2">Fragment Child 2</div>
        </>
      </AuthProvider>
    )

    expect(screen.getByTestId('fragment-child-1')).toBeInTheDocument()
    expect(screen.getByTestId('fragment-child-2')).toBeInTheDocument()
  })

  it('should handle conditional children', () => {
    const showChild = true
    
    render(
      <AuthProvider>
        {showChild && <div data-testid="conditional-child">Conditional Child</div>}
      </AuthProvider>
    )

    expect(screen.getByTestId('conditional-child')).toBeInTheDocument()
  })

  it('should handle function children', () => {
    render(
      <AuthProvider>
        {(() => <div data-testid="function-child">Function Child</div>) as unknown as React.ReactNode}
      </AuthProvider>
    )

    // Function children should be rendered as-is (React doesn't call them automatically)
    expect(screen.queryByTestId('function-child')).not.toBeInTheDocument()
  })
})