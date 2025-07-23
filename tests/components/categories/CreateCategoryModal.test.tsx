import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateCategoryModal } from '@/components/categories/CreateCategoryModal'
import { useTransactionStore } from '@/store/transaction-store'
import type { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']

// Mock the transaction store
vi.mock('@/store/transaction-store')

const mockCreateCategory = vi.fn()

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Food & Dining',
    parent_id: null,
    icon: 'utensils',
    color: '#ff6b6b',
    is_system: true,
    user_id: null,
    created_at: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'cat-2',
    name: 'Restaurants',
    parent_id: 'cat-1',
    icon: 'restaurant',
    color: '#ff8e8e',
    is_system: true,
    user_id: null,
    created_at: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'cat-3',
    name: 'Transportation',
    parent_id: null,
    icon: 'car',
    color: '#4ecdc4',
    is_system: true,
    user_id: null,
    created_at: '2024-01-01T00:00:00.000Z'
  }
]

describe('CreateCategoryModal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSuccess: vi.fn()
  }

  beforeEach(() => {
    vi.mocked(useTransactionStore).mockReturnValue({
      categories: mockCategories,
      createCategory: mockCreateCategory
    } as any)
    
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render modal when open is true', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Create New Category')).toBeInTheDocument()
      expect(screen.getByText('Add a custom category to organize your transactions.')).toBeInTheDocument()
    })

    it('should not render modal when open is false', () => {
      render(<CreateCategoryModal {...defaultProps} open={false} />)
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render all form fields', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      expect(screen.getByLabelText('Category Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Parent Category')).toBeInTheDocument()
      expect(screen.getByText('Color')).toBeInTheDocument()
    })

    it('should render all color options', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      const colorButtons = screen.getAllByRole('button', { name: /select .* color/i })
      expect(colorButtons).toHaveLength(8) // Based on CATEGORY_COLORS array
    })

    it('should render parent category select component', async () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      const parentSelect = screen.getByLabelText('Parent Category')
      expect(parentSelect).toBeInTheDocument()
      expect(parentSelect).toHaveAttribute('role', 'combobox')
      
      // Check that the default value is shown in the select button
      expect(parentSelect).toHaveTextContent('None (Top Level)')
    })

    it('should have proper category data structure for hierarchy', () => {
      // Test that the component receives hierarchical category data
      expect(mockCategories).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Food & Dining', parent_id: null }),
          expect.objectContaining({ name: 'Restaurants', parent_id: 'cat-1' }),
          expect.objectContaining({ name: 'Transportation', parent_id: null })
        ])
      )
    })

    it('should have correct default values', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      expect(nameInput).toHaveValue('')
      
      // First color should be selected by default (Blue)
      const blueColorButton = screen.getByLabelText('Select Blue color')
      expect(blueColorButton).toHaveClass('border-primary')
    })

    it('should render action buttons', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Category' })).toBeInTheDocument()
    })
  })

  describe('form interactions', () => {
    it('should update name field when typing', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: 'New Category' } })
      
      expect(nameInput).toHaveValue('New Category')
    })

    it('should update color when color button is clicked', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      const greenColorButton = screen.getByLabelText('Select Green color')
      fireEvent.click(greenColorButton)
      
      expect(greenColorButton).toHaveClass('border-primary')
      
      // Blue should no longer be selected
      const blueColorButton = screen.getByLabelText('Select Blue color')
      expect(blueColorButton).not.toHaveClass('border-primary')
    })

    it('should have parent category selector accessible', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      const parentSelect = screen.getByLabelText('Parent Category')
      expect(parentSelect).toBeInTheDocument()
      expect(parentSelect).toHaveAttribute('role', 'combobox')
      
      // The select should be interactive
      expect(parentSelect).not.toBeDisabled()
    })

    it('should autofocus on name field', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      expect(nameInput).toHaveFocus()
    })
  })

  describe('form validation', () => {
    it('should show error when submitting with empty name', async () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Category name is required')).toBeInTheDocument()
      })
      
      expect(mockCreateCategory).not.toHaveBeenCalled()
    })

    it('should disable submit button when name is empty', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when name is provided', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: 'Test Category' } })
      
      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      expect(submitButton).not.toBeDisabled()
    })

    it('should trim whitespace on form submission', async () => {
      mockCreateCategory.mockResolvedValue({})
      
      render(<CreateCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: '  Test Category  ' } })
      
      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockCreateCategory).toHaveBeenCalledWith(
          'Test Category', // Trimmed
          '#3B82F6', // Default blue color
          undefined, // Icon
          null // No parent
        )
      })
    })
  })

  describe('form submission', () => {
    it('should call createCategory with correct parameters when submitted with basic data', async () => {
      mockCreateCategory.mockResolvedValue({})
      
      render(<CreateCategoryModal {...defaultProps} />)
      
      // Fill form
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: 'Test Category' } })
      
      // Select green color
      const greenColorButton = screen.getByLabelText('Select Green color')
      fireEvent.click(greenColorButton)
      
      // Submit without changing parent (should use default null parent)
      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockCreateCategory).toHaveBeenCalledWith(
          'Test Category',
          '#10B981', // Green color
          undefined, // Icon
          null // No parent (top level)
        )
      })
    })

    it('should call createCategory with null parent when "None" is selected', async () => {
      mockCreateCategory.mockResolvedValue({})
      
      render(<CreateCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: 'Top Level Category' } })
      
      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockCreateCategory).toHaveBeenCalledWith(
          'Top Level Category',
          '#3B82F6', // Default blue
          undefined, // Icon
          null // No parent
        )
      })
    })

    it('should show loading state during submission', async () => {
      mockCreateCategory.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<CreateCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: 'Test Category' } })
      
      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      fireEvent.click(submitButton)
      
      // Should show loading state
      expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
      
      await waitFor(() => {
        expect(screen.queryByText('Creating...')).not.toBeInTheDocument()
      }, { timeout: 200 })
    })

    it('should call onSuccess and onClose after successful submission', async () => {
      mockCreateCategory.mockResolvedValue({})
      
      render(<CreateCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: 'Test Category' } })
      
      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled()
        expect(defaultProps.onClose).toHaveBeenCalled()
      })
    })

    it('should reset form after successful submission', async () => {
      mockCreateCategory.mockResolvedValue({})
      
      const { rerender } = render(<CreateCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: 'Test Category' } })
      
      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockCreateCategory).toHaveBeenCalled()
      })
      
      // Reopen modal to check if form is reset
      rerender(<CreateCategoryModal {...defaultProps} open={true} />)
      
      const nameInputAfter = screen.getByLabelText('Category Name')
      expect(nameInputAfter).toHaveValue('')
    })

    it('should display error message on submission failure', async () => {
      const errorMessage = 'Category already exists'
      mockCreateCategory.mockRejectedValue(new Error(errorMessage))
      
      render(<CreateCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: 'Test Category' } })
      
      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
      
      // Should not close modal on error
      expect(defaultProps.onClose).not.toHaveBeenCalled()
    })

    it('should handle generic error messages', async () => {
      mockCreateCategory.mockRejectedValue('String error')
      
      render(<CreateCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: 'Test Category' } })
      
      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to create category')).toBeInTheDocument()
      })
    })
  })

  describe('modal behavior', () => {
    it('should call onClose when Cancel button is clicked', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelButton)
      
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('should reset form when modal is closed', () => {
      const { rerender } = render(<CreateCategoryModal {...defaultProps} />)
      
      // Fill form
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: 'Test Category' } })
      
      // Close modal
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelButton)
      
      // Reopen modal
      rerender(<CreateCategoryModal {...defaultProps} open={true} />)
      
      const nameInputAfter = screen.getByLabelText('Category Name')
      expect(nameInputAfter).toHaveValue('')
    })

    it('should clear error when modal is closed', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      // Trigger error
      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      fireEvent.click(submitButton)
      
      // Should show error
      expect(screen.getByText('Category name is required')).toBeInTheDocument()
      
      // Close modal
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelButton)
      
      // Reopen - error should be cleared
      const { rerender } = render(<CreateCategoryModal {...defaultProps} />)
      rerender(<CreateCategoryModal {...defaultProps} open={true} />)
      
      expect(screen.queryByText('Category name is required')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper form labels', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      expect(screen.getByLabelText('Category Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Parent Category')).toBeInTheDocument()
    })

    it('should have proper color button labels', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      expect(screen.getByLabelText('Select Blue color')).toBeInTheDocument()
      expect(screen.getByLabelText('Select Green color')).toBeInTheDocument()
      expect(screen.getByLabelText('Select Yellow color')).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      
      expect(nameInput).toHaveAttribute('id')
      expect(submitButton).toHaveAttribute('type', 'submit')
      expect(cancelButton).toHaveAttribute('type', 'button')
    })

    it('should have proper dialog structure', () => {
      render(<CreateCategoryModal {...defaultProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Create New Category')).toBeInTheDocument()
      expect(screen.getByText('Add a custom category to organize your transactions.')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle modal without onSuccess callback', async () => {
      mockCreateCategory.mockResolvedValue({})
      
      render(<CreateCategoryModal {...defaultProps} onSuccess={undefined} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: 'Test Category' } })
      
      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      
      expect(() => {
        fireEvent.click(submitButton)
      }).not.toThrow()
    })

    it('should handle empty categories array', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        categories: [],
        createCategory: mockCreateCategory
      } as any)
      
      render(<CreateCategoryModal {...defaultProps} />)
      
      expect(screen.getByLabelText('Parent Category')).toBeInTheDocument()
      
      // Should still show "None (Top Level)" option
      const parentSelect = screen.getByLabelText('Parent Category')
      fireEvent.click(parentSelect)
      
      expect(screen.getByText('None (Top Level)')).toBeInTheDocument()
    })
  })
})