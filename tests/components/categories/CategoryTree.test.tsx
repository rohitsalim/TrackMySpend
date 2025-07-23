import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CategoryTree } from '@/components/categories/CategoryTree'
import { useTransactionStore } from '@/store/transaction-store'
import type { CategoryWithChildren } from '@/types/categories'

// Mock the transaction store
vi.mock('@/store/transaction-store')

const mockDeleteCategory = vi.fn()

const mockCategories: CategoryWithChildren[] = [
  {
    id: 'cat-1',
    name: 'Food & Dining',
    parent_id: null,
    icon: 'utensils',
    color: '#ff6b6b',
    is_system: true,
    user_id: null,
    created_at: '2024-01-01T00:00:00.000Z',
    children: [
      {
        id: 'cat-2',
        name: 'Restaurants',
        parent_id: 'cat-1',
        icon: 'restaurant',
        color: '#ff8e8e',
        is_system: true,
        user_id: null,
        created_at: '2024-01-01T00:00:00.000Z',
        children: []
      },
      {
        id: 'cat-3',
        name: 'Fast Food',
        parent_id: 'cat-1',
        icon: 'burger',
        color: '#ffb3b3',
        is_system: true,
        user_id: null,
        created_at: '2024-01-01T00:00:00.000Z',
        children: []
      }
    ]
  },
  {
    id: 'cat-4',
    name: 'Transportation',
    parent_id: null,
    icon: 'car',
    color: '#4ecdc4',
    is_system: true,
    user_id: null,
    created_at: '2024-01-01T00:00:00.000Z',
    children: [
      {
        id: 'cat-5',
        name: 'Gas',
        parent_id: 'cat-4',
        icon: 'gas-pump',
        color: '#66d9e8',
        is_system: true,
        user_id: null,
        created_at: '2024-01-01T00:00:00.000Z',
        children: []
      }
    ]
  },
  {
    id: 'cat-6',
    name: 'Custom Category',
    parent_id: null,
    icon: 'star',
    color: '#ffd93d',
    is_system: false,
    user_id: 'user-123',
    created_at: '2024-01-01T00:00:00.000Z',
    children: [
      {
        id: 'cat-7',
        name: 'Custom Subcategory',
        parent_id: 'cat-6',
        icon: 'star-half',
        color: '#ffe066',
        is_system: false,
        user_id: 'user-123',
        created_at: '2024-01-01T00:00:00.000Z',
        children: []
      }
    ]
  }
]

describe('CategoryTree', () => {
  const mockOnEditCategory = vi.fn()

  beforeEach(() => {
    vi.mocked(useTransactionStore).mockReturnValue({
      deleteCategory: mockDeleteCategory
    } as any)
    mockOnEditCategory.mockClear()
    mockDeleteCategory.mockClear()
  })

  describe('rendering', () => {
    it('should render all root categories', () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      expect(screen.getByText('Food & Dining')).toBeInTheDocument()
      expect(screen.getByText('Transportation')).toBeInTheDocument()
      expect(screen.getByText('Custom Category')).toBeInTheDocument()
    })

    it('should render children categories when expanded', () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      // Children should be visible by default (expanded)
      expect(screen.getByText('Restaurants')).toBeInTheDocument()
      expect(screen.getByText('Fast Food')).toBeInTheDocument()
      expect(screen.getByText('Gas')).toBeInTheDocument()
      expect(screen.getByText('Custom Subcategory')).toBeInTheDocument()
    })

    it('should show system badge for system categories', () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      const systemBadges = screen.getAllByText('System')
      expect(systemBadges.length).toBeGreaterThan(0)
    })

    it('should not show system badge for user categories', () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      // Custom Category should not have System badge near it
      const customCategoryElement = screen.getByText('Custom Category')
      expect(customCategoryElement.parentElement?.textContent).not.toContain('System')
    })

    it('should display category colors correctly', () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      // Check that color indicators are present (they have style backgroundColor)
      const colorIndicators = document.querySelectorAll('[style*="background-color"]')
      expect(colorIndicators.length).toBeGreaterThan(0)
    })

    it('should show folder icon for categories with children', () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      // Food & Dining has children, should show folder icon
      const foodCategory = screen.getByText('Food & Dining')
      const parentDiv = foodCategory.closest('div')
      expect(parentDiv?.querySelector('svg')).toBeInTheDocument()
    })

    it('should show tag icon for categories without children', () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      // Restaurants has no children, should show tag icon
      const restaurantsCategory = screen.getByText('Restaurants')
      const parentDiv = restaurantsCategory.closest('div')
      expect(parentDiv?.querySelector('svg')).toBeInTheDocument()
    })

    it('should handle empty categories array', () => {
      render(<CategoryTree categories={[]} onEditCategory={mockOnEditCategory} />)
      
      // Should not crash and not render any categories
      expect(screen.queryByText('Food & Dining')).not.toBeInTheDocument()
    })
  })

  describe('expand/collapse functionality', () => {
    it('should toggle children visibility when expand/collapse button is clicked', async () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      // Children should be visible initially
      expect(screen.getByText('Restaurants')).toBeInTheDocument()
      
      // Find and click the collapse button for Food & Dining
      const foodCategory = screen.getByText('Food & Dining')
      const collapseButton = foodCategory
        .closest('div')
        ?.querySelector('button[class*="h-6 w-6"]') as HTMLElement
      
      fireEvent.click(collapseButton)
      
      // Children should be hidden
      await waitFor(() => {
        expect(screen.queryByText('Restaurants')).not.toBeInTheDocument()
      })
      
      // Click again to expand
      fireEvent.click(collapseButton)
      
      // Children should be visible again
      await waitFor(() => {
        expect(screen.getByText('Restaurants')).toBeInTheDocument()
      })
    })

    it('should show correct chevron icons for expand/collapse state', async () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      const foodCategory = screen.getByText('Food & Dining')
      const toggleButton = foodCategory
        .closest('div')
        ?.querySelector('button[class*="h-6 w-6"]') as HTMLElement
      
      // Should show down chevron when expanded (initial state)
      expect(toggleButton.querySelector('svg')).toBeInTheDocument()
      
      // Click to collapse
      fireEvent.click(toggleButton)
      
      // Should show right chevron when collapsed
      await waitFor(() => {
        expect(toggleButton.querySelector('svg')).toBeInTheDocument()
      })
    })

    it('should disable expand/collapse button for categories without children', () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      const restaurantsCategory = screen.getByText('Restaurants')
      const toggleButton = restaurantsCategory
        .closest('div')
        ?.querySelector('button[class*="h-6 w-6"]') as HTMLElement
      
      expect(toggleButton).toBeDisabled()
    })
  })

  describe('edit functionality', () => {
    it('should show edit button only for user categories', () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      // System categories should not have visible edit buttons
      const foodCategory = screen.getByText('Food & Dining')
      const foodParent = foodCategory.closest('.group')
      expect(foodParent?.querySelector('button[aria-label*="Edit"]')).toBeNull()
      
      // User categories should have edit buttons (though may be hidden by opacity)
      const customCategory = screen.getByText('Custom Category')
      const customParent = customCategory.closest('.group')
      expect(customParent?.querySelector('button')).toBeInTheDocument()
    })

    it('should call onEditCategory when edit button is clicked', async () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      const customCategory = screen.getByText('Custom Category')
      const editButton = customCategory
        .closest('div')
        ?.querySelector('button[class*="h-8 w-8"]:has(svg)') as HTMLElement
      
      fireEvent.click(editButton)
      
      expect(mockOnEditCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cat-6',
          name: 'Custom Category',
          is_system: false
        })
      )
    })

    it('should have proper accessibility labels for edit buttons', () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit category/i })
      expect(editButtons.length).toBeGreaterThan(0)
    })
  })

  describe('delete functionality', () => {
    it('should show delete button only for user categories', () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      // Check that delete buttons exist for user categories
      const deleteButtons = screen.getAllByRole('button', { name: /delete category/i })
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('should open delete confirmation dialog when delete button is clicked', async () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      const customCategory = screen.getByText('Custom Category')
      const deleteButton = customCategory
        .closest('div')
        ?.querySelector('button:has(svg.lucide-trash-2)') as HTMLElement
      
      fireEvent.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Delete Category')).toBeInTheDocument()
        expect(screen.getByText(/Are you sure you want to delete "Custom Category"/)).toBeInTheDocument()
      })
    })

    it('should show warning for categories with children', async () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      const customCategory = screen.getByText('Custom Category')
      const deleteButton = customCategory
        .closest('div')
        ?.querySelector('button:has(svg.lucide-trash-2)') as HTMLElement
      
      fireEvent.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Warning.*has subcategories/)).toBeInTheDocument()
      })
    })

    it('should call deleteCategory when delete is confirmed', async () => {
      mockDeleteCategory.mockResolvedValue(undefined)
      
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      const customCategory = screen.getByText('Custom Category')
      const deleteButton = customCategory
        .closest('div')
        ?.querySelector('button:has(svg.lucide-trash-2)') as HTMLElement
      
      fireEvent.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const confirmDeleteButton = screen.getByRole('button', { name: /delete/i })
      fireEvent.click(confirmDeleteButton)
      
      expect(mockDeleteCategory).toHaveBeenCalledWith('cat-6')
    })

    it('should close dialog after successful deletion', async () => {
      mockDeleteCategory.mockResolvedValue(undefined)
      
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      const customCategory = screen.getByText('Custom Category')
      const deleteButton = customCategory
        .closest('div')
        ?.querySelector('button:has(svg.lucide-trash-2)') as HTMLElement
      
      fireEvent.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const confirmDeleteButton = screen.getByRole('button', { name: /delete/i })
      fireEvent.click(confirmDeleteButton)
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('should handle delete errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockDeleteCategory.mockRejectedValue(new Error('Delete failed'))
      
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      const customCategory = screen.getByText('Custom Category')
      const deleteButton = customCategory
        .closest('div')
        ?.querySelector('button:has(svg.lucide-trash-2)') as HTMLElement
      
      fireEvent.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const confirmDeleteButton = screen.getByRole('button', { name: /delete/i })
      fireEvent.click(confirmDeleteButton)
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to delete category:', expect.any(Error))
      })
      
      consoleErrorSpy.mockRestore()
    })

    it('should show loading state during deletion', async () => {
      // Mock a slow delete operation
      mockDeleteCategory.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      const customCategory = screen.getByText('Custom Category')
      const deleteButton = customCategory
        .closest('div')
        ?.querySelector('button:has(svg.lucide-trash-2)') as HTMLElement
      
      fireEvent.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const confirmDeleteButton = screen.getByRole('button', { name: /delete/i })
      fireEvent.click(confirmDeleteButton)
      
      // Should show deleting state
      expect(screen.getByText('Deleting...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled()
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Deleting...')).not.toBeInTheDocument()
      }, { timeout: 200 })
    })

    it('should cancel delete when cancel button is clicked', async () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      const customCategory = screen.getByText('Custom Category')
      const deleteButton = customCategory
        .closest('div')
        ?.querySelector('button:has(svg.lucide-trash-2)') as HTMLElement
      
      fireEvent.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      
      expect(mockDeleteCategory).not.toHaveBeenCalled()
    })
  })

  describe('hierarchy and indentation', () => {
    it('should apply correct indentation for nested categories', () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      const restaurants = screen.getByText('Restaurants')
      const restaurantsContainer = restaurants.closest('div')
      
      // Should have indentation class for level 1
      expect(restaurantsContainer?.className).toContain('ml-')
    })

    it('should handle deep nesting correctly', () => {
      const deeplyNested: CategoryWithChildren[] = [
        {
          id: 'level-0',
          name: 'Level 0',
          parent_id: null,
          icon: 'folder',
          color: '#000000',
          is_system: false,
          user_id: 'user-123',
          created_at: '2024-01-01T00:00:00.000Z',
          children: [
            {
              id: 'level-1',
              name: 'Level 1',
              parent_id: 'level-0',
              icon: 'folder',
              color: '#111111',
              is_system: false,
              user_id: 'user-123',
              created_at: '2024-01-01T00:00:00.000Z',
              children: [
                {
                  id: 'level-2',
                  name: 'Level 2',
                  parent_id: 'level-1',
                  icon: 'tag',
                  color: '#222222',
                  is_system: false,
                  user_id: 'user-123',
                  created_at: '2024-01-01T00:00:00.000Z',
                  children: []
                }
              ]
            }
          ]
        }
      ]
      
      render(<CategoryTree categories={deeplyNested} onEditCategory={mockOnEditCategory} />)
      
      expect(screen.getByText('Level 0')).toBeInTheDocument()
      expect(screen.getByText('Level 1')).toBeInTheDocument()
      expect(screen.getByText('Level 2')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels for action buttons', () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      const editButtons = screen.getAllByLabelText(/edit category/i)
      const deleteButtons = screen.getAllByLabelText(/delete category/i)
      
      expect(editButtons.length).toBeGreaterThan(0)
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('should support keyboard navigation', () => {
      render(<CategoryTree categories={mockCategories} onEditCategory={mockOnEditCategory} />)
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('tabIndex')
      })
    })
  })

  describe('edge cases', () => {
    it('should handle categories without colors', () => {
      const categoriesWithoutColors: CategoryWithChildren[] = [
        {
          id: 'no-color',
          name: 'No Color Category',
          parent_id: null,
          icon: 'tag',
          color: null,
          is_system: false,
          user_id: 'user-123',
          created_at: '2024-01-01T00:00:00.000Z',
          children: []
        }
      ]
      
      render(<CategoryTree categories={categoriesWithoutColors} onEditCategory={mockOnEditCategory} />)
      
      expect(screen.getByText('No Color Category')).toBeInTheDocument()
    })

    it('should handle categories with empty names', () => {
      const categoriesWithEmptyNames: CategoryWithChildren[] = [
        {
          id: 'empty-name',
          name: '',
          parent_id: null,
          icon: 'tag',
          color: '#ff0000',
          is_system: false,
          user_id: 'user-123',
          created_at: '2024-01-01T00:00:00.000Z',
          children: []
        }
      ]
      
      expect(() => {
        render(<CategoryTree categories={categoriesWithEmptyNames} onEditCategory={mockOnEditCategory} />)
      }).not.toThrow()
    })
  })
})