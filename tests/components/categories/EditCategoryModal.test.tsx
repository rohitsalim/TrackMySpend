import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditCategoryModal } from '@/components/categories/EditCategoryModal'
import { useTransactionStore } from '@/store/transaction-store'
import type { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']

// Mock the transaction store
vi.mock('@/store/transaction-store')

const mockUpdateCategory = vi.fn()

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
  },
  {
    id: 'cat-4',
    name: 'Custom Category',
    parent_id: null,
    icon: 'star',
    color: '#ffd93d',
    is_system: false,
    user_id: 'user-123',
    created_at: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'cat-5',
    name: 'Custom Subcategory',
    parent_id: 'cat-4',
    icon: 'star-half',
    color: '#ffe066',
    is_system: false,
    user_id: 'user-123',
    created_at: '2024-01-01T00:00:00.000Z'
  }
]

describe('EditCategoryModal', () => {
  const mockCategory: Category = {
    id: 'cat-edit',
    name: 'Test Category',
    parent_id: null,
    icon: 'test',
    color: '#3B82F6',
    is_system: false,
    user_id: 'user-123',
    created_at: '2024-01-01T00:00:00.000Z'
  }

  const defaultProps = {
    category: mockCategory,
    onClose: vi.fn(),
    onSuccess: vi.fn()
  }

  beforeEach(() => {
    vi.mocked(useTransactionStore).mockReturnValue({
      categories: mockCategories,
      updateCategory: mockUpdateCategory
    } as any)
    
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render modal with edit form', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit Category')).toBeInTheDocument()
      expect(screen.getByText('Update the category details.')).toBeInTheDocument()
    })

    it('should render all form fields', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      expect(screen.getByLabelText('Category Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Parent Category')).toBeInTheDocument()
      expect(screen.getByText('Color')).toBeInTheDocument()
    })

    it('should pre-populate form with category data', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      expect(nameInput).toHaveValue('Test Category')
      
      // Check that the category's color is selected
      const colorButton = screen.getByLabelText('Select Blue color')
      expect(colorButton).toHaveClass('border-primary')
    })

    it('should pre-populate parent category', () => {
      const categoryWithParent: Category = {
        ...mockCategory,
        parent_id: 'cat-1'
      }
      
      render(<EditCategoryModal {...defaultProps} category={categoryWithParent} />)
      
      // Should show selected parent in dropdown
      expect(screen.getByDisplayValue('Food & Dining')).toBeInTheDocument()
    })

    it('should default to "None" when category has no parent', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      // Should show "None (Top Level)" as selected
      expect(screen.getByDisplayValue('None (Top Level)')).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Update Category' })).toBeInTheDocument()
    })

    it('should handle category without color', () => {
      const categoryWithoutColor: Category = {
        ...mockCategory,
        color: null
      }
      
      render(<EditCategoryModal {...defaultProps} category={categoryWithoutColor} />)
      
      // Should default to first color (Blue)
      const blueColorButton = screen.getByLabelText('Select Blue color')
      expect(blueColorButton).toHaveClass('border-primary')
    })
  })

  describe('parent category filtering', () => {
    it('should exclude self from parent options', async () => {
      const testCategory: Category = {
        ...mockCategory,
        id: 'cat-1',
        name: 'Food & Dining'
      }
      
      render(<EditCategoryModal {...defaultProps} category={testCategory} />)
      
      const parentSelect = screen.getByLabelText('Parent Category')
      fireEvent.click(parentSelect)
      
      await waitFor(() => {
        // Should not see "Food & Dining" in the options since it's the category being edited
        const options = screen.getAllByRole('option')
        const optionTexts = options.map(option => option.textContent)
        expect(optionTexts).not.toContain('Food & Dining')
      })
    })

    it('should exclude descendants from parent options', async () => {
      const parentCategory: Category = {
        ...mockCategory,
        id: 'cat-4',
        name: 'Custom Category'
      }
      
      render(<EditCategoryModal {...defaultProps} category={parentCategory} />)
      
      const parentSelect = screen.getByLabelText('Parent Category')
      fireEvent.click(parentSelect)
      
      await waitFor(() => {
        // Should not see "Custom Subcategory" since it's a child of the category being edited
        const options = screen.getAllByRole('option')
        const optionTexts = options.map(option => option.textContent)
        expect(optionTexts).not.toContain('Custom Subcategory')
      })
    })

    it('should show available parent categories with proper indentation', async () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      const parentSelect = screen.getByLabelText('Parent Category')
      fireEvent.click(parentSelect)
      
      await waitFor(() => {
        expect(screen.getByText('None (Top Level)')).toBeInTheDocument()
        expect(screen.getByText('Food & Dining')).toBeInTheDocument()
        expect(screen.getByText('Transportation')).toBeInTheDocument()
        // Should show indented child categories
        expect(screen.getByText(/^\s{2}Restaurants$/)).toBeInTheDocument()
      })
    })
  })

  describe('form interactions', () => {
    it('should update name field when typing', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: 'Updated Category Name' } })
      
      expect(nameInput).toHaveValue('Updated Category Name')
    })

    it('should update color when color button is clicked', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      const greenColorButton = screen.getByLabelText('Select Green color')
      fireEvent.click(greenColorButton)
      
      expect(greenColorButton).toHaveClass('border-primary')
      
      // Previous color should no longer be selected
      const blueColorButton = screen.getByLabelText('Select Blue color')
      expect(blueColorButton).not.toHaveClass('border-primary')
    })

    it('should update parent category when selected', async () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      const parentSelect = screen.getByLabelText('Parent Category')
      fireEvent.click(parentSelect)
      
      const transportationOption = await screen.findByText('Transportation')
      fireEvent.click(transportationOption)
      
      expect(screen.getByDisplayValue('Transportation')).toBeInTheDocument()
    })

    it('should autofocus on name field', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      expect(nameInput).toHaveFocus()
    })
  })

  describe('form validation', () => {
    it('should show error when submitting with empty name', async () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: '' } })
      
      const submitButton = screen.getByRole('button', { name: 'Update Category' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Category name is required')).toBeInTheDocument()
      })
      
      expect(mockUpdateCategory).not.toHaveBeenCalled()
    })

    it('should disable submit button when name is empty', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: '' } })
      
      const submitButton = screen.getByRole('button', { name: 'Update Category' })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when name is provided', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: 'Valid Name' } })
      
      const submitButton = screen.getByRole('button', { name: 'Update Category' })
      expect(submitButton).not.toBeDisabled()
    })

    it('should trim whitespace on form submission', async () => {
      mockUpdateCategory.mockResolvedValue({})
      
      render(<EditCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: '  Updated Name  ' } })
      
      const submitButton = screen.getByRole('button', { name: 'Update Category' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockUpdateCategory).toHaveBeenCalledWith(
          'cat-edit',
          {
            name: 'Updated Name', // Trimmed
            color: '#3B82F6',
            parent_id: null
          }
        )
      })
    })
  })

  describe('form submission', () => {
    it('should call updateCategory with correct parameters when submitted', async () => {
      mockUpdateCategory.mockResolvedValue({})
      
      render(<EditCategoryModal {...defaultProps} />)
      
      // Update form
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: 'Updated Category' } })
      
      // Select green color
      const greenColorButton = screen.getByLabelText('Select Green color')
      fireEvent.click(greenColorButton)
      
      // Select parent category
      const parentSelect = screen.getByLabelText('Parent Category')
      fireEvent.click(parentSelect)
      const transportationOption = await screen.findByText('Transportation')
      fireEvent.click(transportationOption)
      
      // Submit
      const submitButton = screen.getByRole('button', { name: 'Update Category' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockUpdateCategory).toHaveBeenCalledWith(
          'cat-edit',
          {
            name: 'Updated Category',
            color: '#10B981', // Green color
            parent_id: 'cat-3' // Transportation ID
          }
        )
      })
    })

    it('should call updateCategory with null parent when "None" is selected', async () => {
      mockUpdateCategory.mockResolvedValue({})
      
      const categoryWithParent: Category = {
        ...mockCategory,
        parent_id: 'cat-1'
      }
      
      render(<EditCategoryModal {...defaultProps} category={categoryWithParent} />)
      
      // Change to no parent
      const parentSelect = screen.getByLabelText('Parent Category')
      fireEvent.click(parentSelect)
      const noneOption = await screen.findByText('None (Top Level)')
      fireEvent.click(noneOption)
      
      const submitButton = screen.getByRole('button', { name: 'Update Category' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockUpdateCategory).toHaveBeenCalledWith(
          'cat-edit',
          expect.objectContaining({
            parent_id: null
          })
        )
      })
    })

    it('should show loading state during submission', async () => {
      mockUpdateCategory.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<EditCategoryModal {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: 'Update Category' })
      fireEvent.click(submitButton)
      
      // Should show loading state
      expect(screen.getByRole('button', { name: 'Updating...' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Updating...' })).toBeDisabled()
      
      await waitFor(() => {
        expect(screen.queryByText('Updating...')).not.toBeInTheDocument()
      }, { timeout: 200 })
    })

    it('should call onSuccess and onClose after successful submission', async () => {
      mockUpdateCategory.mockResolvedValue({})
      
      render(<EditCategoryModal {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: 'Update Category' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled()
        expect(defaultProps.onClose).toHaveBeenCalled()
      })
    })

    it('should display error message on submission failure', async () => {
      const errorMessage = 'Category name already exists'
      mockUpdateCategory.mockRejectedValue(new Error(errorMessage))
      
      render(<EditCategoryModal {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: 'Update Category' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
      
      // Should not close modal on error
      expect(defaultProps.onClose).not.toHaveBeenCalled()
    })

    it('should handle generic error messages', async () => {
      mockUpdateCategory.mockRejectedValue('String error')
      
      render(<EditCategoryModal {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: 'Update Category' })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to update category')).toBeInTheDocument()
      })
    })
  })

  describe('modal behavior', () => {
    it('should call onClose when Cancel button is clicked', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelButton)
      
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('should clear error when modal is closed', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      // Trigger error
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: '' } })
      
      const submitButton = screen.getByRole('button', { name: 'Update Category' })
      fireEvent.click(submitButton)
      
      // Should show error
      expect(screen.getByText('Category name is required')).toBeInTheDocument()
      
      // Close modal
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelButton)
      
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have proper form labels', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      expect(screen.getByLabelText('Category Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Parent Category')).toBeInTheDocument()
    })

    it('should have proper color button labels', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      expect(screen.getByLabelText('Select Blue color')).toBeInTheDocument()
      expect(screen.getByLabelText('Select Green color')).toBeInTheDocument()
      expect(screen.getByLabelText('Select Yellow color')).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      const submitButton = screen.getByRole('button', { name: 'Update Category' })
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      
      expect(nameInput).toHaveAttribute('id')
      expect(submitButton).toHaveAttribute('type', 'submit')
      expect(cancelButton).toHaveAttribute('type', 'button')
    })

    it('should have proper dialog structure', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit Category')).toBeInTheDocument()
      expect(screen.getByText('Update the category details.')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle modal without onSuccess callback', async () => {
      mockUpdateCategory.mockResolvedValue({})
      
      render(<EditCategoryModal {...defaultProps} onSuccess={undefined} />)
      
      const submitButton = screen.getByRole('button', { name: 'Update Category' })
      
      expect(() => {
        fireEvent.click(submitButton)
      }).not.toThrow()
    })

    it('should handle categories with deep nesting in parent selection', async () => {
      const deeplyNestedCategories: Category[] = [
        ...mockCategories,
        {
          id: 'deep-1',
          name: 'Level 1',
          parent_id: 'cat-1',
          icon: 'folder',
          color: '#000000',
          is_system: false,
          user_id: 'user-123',
          created_at: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'deep-2',
          name: 'Level 2',
          parent_id: 'deep-1',
          icon: 'folder',
          color: '#111111',
          is_system: false,
          user_id: 'user-123',
          created_at: '2024-01-01T00:00:00.000Z'
        }
      ]
      
      vi.mocked(useTransactionStore).mockReturnValue({
        categories: deeplyNestedCategories,
        updateCategory: mockUpdateCategory
      } as any)
      
      render(<EditCategoryModal {...defaultProps} />)
      
      const parentSelect = screen.getByLabelText('Parent Category')
      fireEvent.click(parentSelect)
      
      await waitFor(() => {
        // Should show all levels with proper indentation
        expect(screen.getByText(/^\s{2}Level 1$/)).toBeInTheDocument()
        expect(screen.getByText(/^\s{4}Level 2$/)).toBeInTheDocument()
      })
    })

    it('should prevent circular parent relationships', async () => {
      const parentCategory: Category = {
        ...mockCategory,
        id: 'cat-1',
        name: 'Food & Dining'
      }
      
      render(<EditCategoryModal {...defaultProps} category={parentCategory} />)
      
      const parentSelect = screen.getByLabelText('Parent Category')
      fireEvent.click(parentSelect)
      
      await waitFor(() => {
        // Should not show "Restaurants" as it's a child of Food & Dining
        const options = screen.getAllByRole('option')
        const optionTexts = options.map(option => option.textContent)
        expect(optionTexts).not.toContain('  Restaurants')
      })
    })
  })

  describe('form state preservation', () => {
    it('should preserve changes when switching between fields', () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: 'Changed Name' } })
      
      const greenColorButton = screen.getByLabelText('Select Green color')
      fireEvent.click(greenColorButton)
      
      // Name should still be changed
      expect(nameInput).toHaveValue('Changed Name')
      // Color should be updated
      expect(greenColorButton).toHaveClass('border-primary')
    })

    it('should maintain form state during parent selection', async () => {
      render(<EditCategoryModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Category Name')
      fireEvent.change(nameInput, { target: { value: 'Modified Name' } })
      
      const parentSelect = screen.getByLabelText('Parent Category')
      fireEvent.click(parentSelect)
      
      const transportationOption = await screen.findByText('Transportation')
      fireEvent.click(transportationOption)
      
      // Name should still be preserved
      expect(nameInput).toHaveValue('Modified Name')
    })
  })
})