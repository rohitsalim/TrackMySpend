import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { EmptyState } from '@/components/upload/EmptyState'

// Mock the DotLottieReact component
vi.mock('@lottiefiles/dotlottie-react', () => ({
  DotLottieReact: vi.fn(({ src, loop, autoplay, dotLottieRefCallback }) => {
    // Simulate calling dotLottieRefCallback with a mock dotLottie instance
    React.useEffect(() => {
      if (dotLottieRefCallback) {
        const mockDotLottie = {
          addEventListener: vi.fn((event, callback) => {
            // Simulate load error for testing fallback
            if (event === 'loadError' && src === '/animations/empty.lottie') {
              setTimeout(callback, 0)
            }
          })
        }
        dotLottieRefCallback(mockDotLottie)
      }
    }, [dotLottieRefCallback, src])
    
    return (
      <div data-testid="lottie-player" data-src={src} data-loop={loop} data-autoplay={autoplay} />
    )
  })
}))

describe('EmptyState', () => {

  it('should render empty state content', () => {
    render(<EmptyState onUploadClick={vi.fn()} />)
    
    expect(screen.getByText('No statements uploaded yet')).toBeInTheDocument()
    expect(screen.getByText(/Upload your bank or credit card statements/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload statements/i })).toBeInTheDocument()
  })

  it('should initially render lottie player before error', () => {
    render(<EmptyState onUploadClick={vi.fn()} />)
    
    // Should initially render lottie player
    const lottiePlayer = screen.getByTestId('lottie-player')
    expect(lottiePlayer).toBeInTheDocument()
  })

  it('should render dotlottie animation with correct props', () => {
    render(<EmptyState onUploadClick={vi.fn()} />)
    
    const lottiePlayer = screen.getByTestId('lottie-player')
    expect(lottiePlayer).toBeInTheDocument()
    expect(lottiePlayer).toHaveAttribute('data-src', '/animations/empty.lottie')
    expect(lottiePlayer).toHaveAttribute('data-loop', 'true')
    expect(lottiePlayer).toHaveAttribute('data-autoplay', 'true')
  })

  it('should render component without crashing when animation fails', () => {
    // This test verifies the component renders and doesn't crash even if animation fails
    render(<EmptyState onUploadClick={vi.fn()} />)
    
    // Component should render successfully with lottie player initially
    expect(screen.getByTestId('lottie-player')).toBeInTheDocument()
    
    // Core functionality should work regardless of animation state
    expect(screen.getByText('No statements uploaded yet')).toBeInTheDocument()
    expect(screen.getByText(/Upload your bank or credit card statements/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload statements/i })).toBeInTheDocument()
  })

  it('should call onUploadClick when button is clicked', async () => {
    const user = userEvent.setup()
    const onUploadClick = vi.fn()
    
    render(<EmptyState onUploadClick={onUploadClick} />)
    
    const uploadButton = screen.getByRole('button', { name: /upload statements/i })
    await user.click(uploadButton)
    
    expect(onUploadClick).toHaveBeenCalledTimes(1)
  })

  it('should have proper styling classes', () => {
    render(<EmptyState onUploadClick={vi.fn()} />)
    
    const container = screen.getByText('No statements uploaded yet').parentElement
    expect(container).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center')
  })
})