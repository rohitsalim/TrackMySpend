import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CategoryManagement } from '@/components/categories/CategoryManagement'
import { useTransactionStore } from '@/store/transaction-store'
import type { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']

// Mock the transaction store
vi.mock('@/store/transaction-store')

// Mock child components
vi.mock('@/components/categories/CreateCategoryModal', () => ({
  CreateCategoryModal: ({ open, onClose }: { open: boolean; onClose: () => void }) => 
    open ? (
      <div data-testid="create-category-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
}))

vi.mock('@/components/categories/EditCategoryModal', () => ({
  EditCategoryModal: ({ category, onClose }: { category: { name: string } | null; onClose: () => void }) => 
    category ? (
      <div data-testid="edit-category-modal">
        <div>Editing: {category.name}</div>
        <button onClick={onClose}>Close Edit Modal</button>
      </div>
    ) : null
}))

vi.mock('@/components/categories/CategoryTree', () => ({
  CategoryTree: ({ categories, onEditCategory }: { categories: Array<{ id: string; name: string }>; onEditCategory: (cat: { id: string; name: string }) => void }) => (
    <div data-testid="category-tree">
      {categories.map((category) => (
        <div key={category.id} data-testid={`category-${category.id}`}>
          <span>{category.name}</span>
          <button onClick={() => onEditCategory(category)}>Edit {category.name}</button>
        </div>
      ))}
    </div>
  )
}))

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
  }
]

describe('CategoryManagement', () => {
  const mockUseTransactionStore = {
    categories: mockCategories
  }

  beforeEach(() => {
    vi.mocked(useTransactionStore).mockReturnValue(mockUseTransactionStore as ReturnType<typeof useTransactionStore>)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the component with header and categories count', () => {
      render(<CategoryManagement />)
      
      expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument()
      expect(screen.getByText('4 total categories')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /new category/i })).toBeInTheDocument()
    })

    it('should render the category tree when categories exist', () => {
      render(<CategoryManagement />)
      
      expect(screen.getByTestId('category-tree')).toBeInTheDocument()
    })

    it('should show empty state when no categories exist', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        ...mockUseTransactionStore,
        categories: []
      } as ReturnType<typeof useTransactionStore>)

      render(<CategoryManagement />)
      
      expect(screen.getByText('0 total categories')).toBeInTheDocument()
      expect(screen.getByText('No categories found.')).toBeInTheDocument()
    })

    it('should render new category button with correct icon and text', () => {
      render(<CategoryManagement />)
      
      const newCategoryButton = screen.getByRole('button', { name: /new category/i })
      expect(newCategoryButton).toBeInTheDocument()
      expect(newCategoryButton).toHaveTextContent('New Category')
    })
  })

  describe('modal interactions', () => {
    it('should open create category modal when new category button is clicked', async () => {
      render(<CategoryManagement />)
      
      const newCategoryButton = screen.getByRole('button', { name: /new category/i })
      fireEvent.click(newCategoryButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('create-category-modal')).toBeInTheDocument()
      })
    })

    it('should close create category modal when close button is clicked', async () => {
      render(<CategoryManagement />)
      
      // Open modal
      const newCategoryButton = screen.getByRole('button', { name: /new category/i })
      fireEvent.click(newCategoryButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('create-category-modal')).toBeInTheDocument()
      })
      
      // Close modal
      const closeButton = screen.getByText('Close Modal')
      fireEvent.click(closeButton)
      
      await waitFor(() => {
        expect(screen.queryByTestId('create-category-modal')).not.toBeInTheDocument()
      })
    })

    it('should open edit category modal when edit is triggered from category tree', async () => {
      render(<CategoryManagement />)
      
      const editButton = screen.getByText('Edit Food & Dining')
      fireEvent.click(editButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('edit-category-modal')).toBeInTheDocument()
        expect(screen.getByText('Editing: Food & Dining')).toBeInTheDocument()
      })
    })

    it('should close edit category modal when close button is clicked', async () => {
      render(<CategoryManagement />)
      
      // Open edit modal
      const editButton = screen.getByText('Edit Food & Dining')
      fireEvent.click(editButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('edit-category-modal')).toBeInTheDocument()
      })
      
      // Close modal
      const closeEditButton = screen.getByText('Close Edit Modal')
      fireEvent.click(closeEditButton)
      
      await waitFor(() => {
        expect(screen.queryByTestId('edit-category-modal')).not.toBeInTheDocument()
      })
    })
  })

  describe('category tree integration', () => {
    it('should pass categories to CategoryTree component', () => {
      render(<CategoryManagement />)
      
      // Verify that categories are rendered in the tree
      expect(screen.getByTestId('category-cat-1')).toBeInTheDocument()
      expect(screen.getByText('Food & Dining')).toBeInTheDocument()
      expect(screen.getByTestId('category-cat-3')).toBeInTheDocument()
      expect(screen.getByText('Transportation')).toBeInTheDocument()
    })

    it('should handle edit category function correctly', async () => {
      render(<CategoryManagement />)
      
      // Click edit on a specific category
      const editTransportButton = screen.getByText('Edit Transportation')
      fireEvent.click(editTransportButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('edit-category-modal')).toBeInTheDocument()
        expect(screen.getByText('Editing: Transportation')).toBeInTheDocument()
      })
    })
  })

  describe('state management', () => {
    it('should manage create modal state correctly', async () => {
      render(<CategoryManagement />)
      
      // Initially modal should not be visible
      expect(screen.queryByTestId('create-category-modal')).not.toBeInTheDocument()
      
      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /new category/i }))
      
      await waitFor(() => {
        expect(screen.getByTestId('create-category-modal')).toBeInTheDocument()
      })
      
      // Close modal
      fireEvent.click(screen.getByText('Close Modal'))
      
      await waitFor(() => {
        expect(screen.queryByTestId('create-category-modal')).not.toBeInTheDocument()
      })
    })

    it('should manage edit modal state correctly', async () => {
      render(<CategoryManagement />)
      
      // Initially edit modal should not be visible
      expect(screen.queryByTestId('edit-category-modal')).not.toBeInTheDocument()
      
      // Open edit modal for a category
      fireEvent.click(screen.getByText('Edit Custom Category'))
      
      await waitFor(() => {
        expect(screen.getByTestId('edit-category-modal')).toBeInTheDocument()
        expect(screen.getByText('Editing: Custom Category')).toBeInTheDocument()
      })
      
      // Close edit modal
      fireEvent.click(screen.getByText('Close Edit Modal'))
      
      await waitFor(() => {
        expect(screen.queryByTestId('edit-category-modal')).not.toBeInTheDocument()
      })
    })

    it('should handle multiple categories in edit state', async () => {
      render(<CategoryManagement />)
      
      // Open edit for first category
      fireEvent.click(screen.getByText('Edit Food & Dining'))
      
      await waitFor(() => {
        expect(screen.getByText('Editing: Food & Dining')).toBeInTheDocument()
      })
      
      // Close and open edit for different category
      fireEvent.click(screen.getByText('Close Edit Modal'))
      
      await waitFor(() => {
        expect(screen.queryByTestId('edit-category-modal')).not.toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Edit Transportation'))
      
      await waitFor(() => {
        expect(screen.getByText('Editing: Transportation')).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(<CategoryManagement />)
      
      const heading = screen.getByRole('heading', { name: 'Categories' })
      expect(heading).toBeInTheDocument()
      expect(heading.tagName).toBe('H2')
    })

    it('should have accessible button labels', () => {
      render(<CategoryManagement />)
      
      const newCategoryButton = screen.getByRole('button', { name: /new category/i })
      expect(newCategoryButton).toBeInTheDocument()
      expect(newCategoryButton).toHaveAccessibleName()
    })
  })

  describe('dynamic categories count', () => {
    it('should update categories count when categories change', () => {
      const { rerender } = render(<CategoryManagement />)
      
      expect(screen.getByText('4 total categories')).toBeInTheDocument()
      
      // Update mock to return different number of categories
      vi.mocked(useTransactionStore).mockReturnValue({
        ...mockUseTransactionStore,
        categories: mockCategories.slice(0, 2) // Only 2 categories
      } as ReturnType<typeof useTransactionStore>)
      
      rerender(<CategoryManagement />)
      
      expect(screen.getByText('2 total categories')).toBeInTheDocument()
    })

    it('should handle singular/plural correctly', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        ...mockUseTransactionStore,
        categories: [mockCategories[0]] // Only 1 category
      } as ReturnType<typeof useTransactionStore>)

      render(<CategoryManagement />)
      
      expect(screen.getByText('1 total categories')).toBeInTheDocument()
    })
  })
})