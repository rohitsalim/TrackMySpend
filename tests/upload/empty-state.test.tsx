import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from '@/components/upload/empty-state'

// Mock the DotLottiePlayer component
vi.mock('@dotlottie/react-player', () => ({
  DotLottiePlayer: vi.fn(({ src, loop, autoplay }) => (
    <div data-testid="lottie-player" data-src={src} data-loop={loop} data-autoplay={autoplay} />
  ))
}))

describe('EmptyState', () => {
  it('should render empty state content', () => {
    render(<EmptyState onUploadClick={vi.fn()} />)
    
    expect(screen.getByText('No statements uploaded yet')).toBeInTheDocument()
    expect(screen.getByText(/Upload your bank or credit card statements/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload statements/i })).toBeInTheDocument()
  })

  it('should render dotLottie animation', () => {
    render(<EmptyState onUploadClick={vi.fn()} />)
    
    const lottiePlayer = screen.getByTestId('lottie-player')
    expect(lottiePlayer).toBeInTheDocument()
    expect(lottiePlayer).toHaveAttribute('data-src', '/animations/empty.lottie')
    expect(lottiePlayer).toHaveAttribute('data-loop', 'true')
    expect(lottiePlayer).toHaveAttribute('data-autoplay', 'true')
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