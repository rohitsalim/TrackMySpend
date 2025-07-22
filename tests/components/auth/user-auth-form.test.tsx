import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserAuthForm } from '@/components/auth/UserAuthForm'
import { useAuthStore } from '@/store/authStore'

// Mock the auth store
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

// Mock the UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input onChange={onChange} value={value} {...props} />
  ),
}))

describe('UserAuthForm', () => {
  const mockAuthStore = {
    signInWithGoogle: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    loading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)
  })

  describe('Login Form', () => {
    it('should render login form correctly', () => {
      render(<UserAuthForm type="login" />)

      expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in with email/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    })

    it('should handle email input changes', () => {
      render(<UserAuthForm type="login" />)

      const emailInput = screen.getByPlaceholderText('name@example.com')
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should handle password input changes', () => {
      render(<UserAuthForm type="login" />)

      const passwordInput = screen.getByPlaceholderText('Password')
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      expect(passwordInput).toHaveValue('password123')
    })

    it('should call signInWithEmail on form submission', async () => {
      render(<UserAuthForm type="login" />)

      const emailInput = screen.getByPlaceholderText('name@example.com')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockAuthStore.signInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })

    it('should show error for empty fields', async () => {
      render(<UserAuthForm type="login" />)

      const submitButton = screen.getByRole('button', { name: /sign in with email/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Please fill in all fields')).toBeInTheDocument()
      })
    })

    it('should show error for empty email', async () => {
      render(<UserAuthForm type="login" />)

      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Please fill in all fields')).toBeInTheDocument()
      })
    })

    it('should show error for empty password', async () => {
      render(<UserAuthForm type="login" />)

      const emailInput = screen.getByPlaceholderText('name@example.com')
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Please fill in all fields')).toBeInTheDocument()
      })
    })

    it('should handle auth errors', async () => {
      const errorMessage = 'Invalid credentials'
      mockAuthStore.signInWithEmail.mockRejectedValue(new Error(errorMessage))

      render(<UserAuthForm type="login" />)

      const emailInput = screen.getByPlaceholderText('name@example.com')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('should handle non-Error exceptions', async () => {
      mockAuthStore.signInWithEmail.mockRejectedValue('String error')

      render(<UserAuthForm type="login" />)

      const emailInput = screen.getByPlaceholderText('name@example.com')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('An error occurred')).toBeInTheDocument()
      })
    })

    it('should clear error on new submission', async () => {
      mockAuthStore.signInWithEmail.mockRejectedValueOnce(new Error('First error'))
      mockAuthStore.signInWithEmail.mockResolvedValueOnce(undefined)

      render(<UserAuthForm type="login" />)

      const emailInput = screen.getByPlaceholderText('name@example.com')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      // First submission with error
      fireEvent.click(submitButton)
      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      // Second submission should clear error
      fireEvent.click(submitButton)
      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
      })
    })
  })

  describe('Signup Form', () => {
    it('should render signup form correctly', () => {
      render(<UserAuthForm type="signup" />)

      expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign up with email/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    })

    it('should call signUpWithEmail on form submission', async () => {
      render(<UserAuthForm type="signup" />)

      const emailInput = screen.getByPlaceholderText('name@example.com')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: /sign up with email/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockAuthStore.signUpWithEmail).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })

    it('should have correct autocomplete attributes', () => {
      render(<UserAuthForm type="signup" />)

      const passwordInput = screen.getByPlaceholderText('Password')
      expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')
    })
  })

  describe('Google Sign In', () => {
    it('should call signInWithGoogle on Google button click', async () => {
      render(<UserAuthForm type="login" />)

      const googleButton = screen.getByRole('button', { name: /google/i })
      fireEvent.click(googleButton)

      await waitFor(() => {
        expect(mockAuthStore.signInWithGoogle).toHaveBeenCalled()
      })
    })

    it('should handle Google sign in errors', async () => {
      const errorMessage = 'Google sign in failed'
      mockAuthStore.signInWithGoogle.mockRejectedValue(new Error(errorMessage))

      render(<UserAuthForm type="login" />)

      const googleButton = screen.getByRole('button', { name: /google/i })
      fireEvent.click(googleButton)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('should clear error on Google sign in', async () => {
      // Start with an error from email form
      render(<UserAuthForm type="login" />)

      const emailInput = screen.getByPlaceholderText('name@example.com')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      mockAuthStore.signInWithEmail.mockRejectedValueOnce(new Error('Email error'))
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Email error')).toBeInTheDocument()
      })

      // Now try Google sign in - should clear error
      mockAuthStore.signInWithGoogle.mockResolvedValueOnce(undefined)
      const googleButton = screen.getByRole('button', { name: /google/i })
      fireEvent.click(googleButton)

      await waitFor(() => {
        expect(screen.queryByText('Email error')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should disable form inputs when loading', () => {
      mockAuthStore.loading = true
      vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)

      render(<UserAuthForm type="login" />)

      const emailInput = screen.getByPlaceholderText('name@example.com')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })
      const googleButton = screen.getByRole('button', { name: /google/i })

      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
      expect(googleButton).toBeDisabled()
    })

    it('should show loading spinner in submit button when loading', () => {
      mockAuthStore.loading = true
      vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)

      render(<UserAuthForm type="login" />)

      const submitButton = screen.getByRole('button', { name: /sign in with email/i })
      const spinner = submitButton.querySelector('.animate-spin')

      expect(spinner).toBeInTheDocument()
    })

    it('should show loading spinner in Google button when loading', () => {
      mockAuthStore.loading = true
      vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)

      render(<UserAuthForm type="login" />)

      const googleButton = screen.getByRole('button', { name: /google/i })
      const spinner = googleButton.querySelector('.animate-spin')

      expect(spinner).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should prevent form submission when disabled', async () => {
      mockAuthStore.loading = true
      vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)

      render(<UserAuthForm type="login" />)

      const emailInput = screen.getByPlaceholderText('name@example.com')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      // Should not call auth methods when disabled
      expect(mockAuthStore.signInWithEmail).not.toHaveBeenCalled()
    })

    it('should have correct input types', () => {
      render(<UserAuthForm type="login" />)

      const emailInput = screen.getByPlaceholderText('name@example.com')
      const passwordInput = screen.getByPlaceholderText('Password')

      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('should have correct autocomplete attributes for login', () => {
      render(<UserAuthForm type="login" />)

      const emailInput = screen.getByPlaceholderText('name@example.com')
      const passwordInput = screen.getByPlaceholderText('Password')

      expect(emailInput).toHaveAttribute('autocomplete', 'email')
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    })
  })

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(<UserAuthForm className="custom-class" />)
      const formWrapper = container.firstChild

      expect(formWrapper).toHaveClass('custom-class')
    })

    it('should pass through additional props', () => {
      const { container } = render(<UserAuthForm data-testid="auth-form" />)
      const formWrapper = container.firstChild

      expect(formWrapper).toHaveAttribute('data-testid', 'auth-form')
    })
  })
})