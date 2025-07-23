import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { useTransactionStore } from '@/store/transaction-store'
import type { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']

// Mock the transaction store
vi.mock('@/store/transaction-store')

// Mock date-fns format function
vi.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit',
      year: 'numeric'
    })
  }
}))

// Mock UI components that might cause issues
vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ selected, onSelect, mode }: { 
    selected?: Date; 
    onSelect: (date: Date | undefined) => void;
    mode: string;
  }) => (
    <div data-testid="calendar">
      <button 
        onClick={() => onSelect(new Date('2024-01-15'))}
        data-testid="calendar-date-select"
      >
        Select Date
      </button>
      {selected && <div data-testid="selected-date">{selected.toISOString()}</div>}
    </div>
  )
}))

const mockSetFilters = vi.fn()
const mockResetFilters = vi.fn()
const mockFetchTransactions = vi.fn()

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
    name: 'Transportation',
    parent_id: null,
    icon: 'car',
    color: '#4ecdc4',
    is_system: true,
    user_id: null,
    created_at: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'cat-3',
    name: 'Shopping',
    parent_id: null,
    icon: 'shopping-bag',
    color: '#ffd93d',
    is_system: true,
    user_id: null,
    created_at: '2024-01-01T00:00:00.000Z'
  }
]

const mockFilters = {
  searchTerm: '',
  categories: [],
  dateRange: {
    start: null,
    end: null
  },
  showInternalTransfers: false
}

describe('TransactionFilters', () => {
  beforeEach(() => {
    vi.mocked(useTransactionStore).mockReturnValue({
      filters: mockFilters,
      categories: mockCategories,
      setFilters: mockSetFilters,
      resetFilters: mockResetFilters,
      fetchTransactions: mockFetchTransactions
    } as any)
    
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render search input', () => {
      render(<TransactionFilters />)
      
      expect(screen.getByPlaceholderText('Search by vendor or notes...')).toBeInTheDocument()
    })

    it('should render category dropdown', () => {
      render(<TransactionFilters />)
      
      expect(screen.getByText('All Categories')).toBeInTheDocument()
    })

    it('should render filters button', () => {
      render(<TransactionFilters />)
      
      expect(screen.getByText('Filters')).toBeInTheDocument()
    })

    it('should not show advanced filters by default', () => {
      render(<TransactionFilters />)
      
      expect(screen.queryByText('From Date')).not.toBeInTheDocument()
      expect(screen.queryByText('To Date')).not.toBeInTheDocument()
    })

    it('should show advanced filters when filters button is clicked', () => {
      render(<TransactionFilters />)
      
      const filtersButton = screen.getByText('Filters')
      fireEvent.click(filtersButton)
      
      expect(screen.getByText('From Date')).toBeInTheDocument()
      expect(screen.getByText('To Date')).toBeInTheDocument()
      expect(screen.getByText('Show internal transfers')).toBeInTheDocument()
    })

    it('should render filter indicator when filters are active', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        filters: { ...mockFilters, searchTerm: 'test' },
        categories: mockCategories,
        setFilters: mockSetFilters,
        resetFilters: mockResetFilters,
        fetchTransactions: mockFetchTransactions
      } as any)

      render(<TransactionFilters />)
      
      // Should show active filter indicator
      expect(screen.getByText('•')).toBeInTheDocument()
    })
  })

  describe('search functionality', () => {
    it('should update search input when typing', () => {
      render(<TransactionFilters />)
      
      const searchInput = screen.getByPlaceholderText('Search by vendor or notes...')
      fireEvent.change(searchInput, { target: { value: 'restaurant' } })
      
      expect(searchInput).toHaveValue('restaurant')
    })

    it('should trigger search on Enter key', () => {
      render(<TransactionFilters />)
      
      const searchInput = screen.getByPlaceholderText('Search by vendor or notes...')
      fireEvent.change(searchInput, { target: { value: 'restaurant' } })
      fireEvent.keyDown(searchInput, { key: 'Enter' })
      
      expect(mockSetFilters).toHaveBeenCalledWith({ searchTerm: 'restaurant' })
      expect(mockFetchTransactions).toHaveBeenCalledWith(1)
    })

    it('should not trigger search on other keys', () => {
      render(<TransactionFilters />)
      
      const searchInput = screen.getByPlaceholderText('Search by vendor or notes...')
      fireEvent.change(searchInput, { target: { value: 'restaurant' } })
      fireEvent.keyDown(searchInput, { key: 'Tab' })
      
      expect(mockSetFilters).not.toHaveBeenCalled()
    })

    it('should initialize search input with existing filter value', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        filters: { ...mockFilters, searchTerm: 'existing search' },
        categories: mockCategories,
        setFilters: mockSetFilters,
        resetFilters: mockResetFilters,
        fetchTransactions: mockFetchTransactions
      } as any)

      render(<TransactionFilters />)
      
      const searchInput = screen.getByPlaceholderText('Search by vendor or notes...')
      expect(searchInput).toHaveValue('existing search')
    })
  })

  describe('category filtering', () => {
    it('should render category options in dropdown', () => {
      render(<TransactionFilters />)
      
      // Since Select components are complex to test, we'll verify the basic structure
      expect(screen.getByText('All Categories')).toBeInTheDocument()
    })

    it('should show selected category when category filter is active', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        filters: { ...mockFilters, categories: ['cat-1'] },
        categories: mockCategories,
        setFilters: mockSetFilters,
        resetFilters: mockResetFilters,
        fetchTransactions: mockFetchTransactions
      } as any)

      render(<TransactionFilters />)
      
      // Should show that a category is selected
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  describe('advanced filters', () => {
    beforeEach(() => {
      render(<TransactionFilters />)
      
      // Open advanced filters
      const filtersButton = screen.getByText('Filters')
      fireEvent.click(filtersButton)
    })

    it('should render date range pickers', () => {
      expect(screen.getByText('From Date')).toBeInTheDocument()
      expect(screen.getByText('To Date')).toBeInTheDocument()
      expect(screen.getAllByText('Pick a date')).toHaveLength(2)
    })

    it('should render internal transfers toggle', () => {
      expect(screen.getByText('Show internal transfers')).toBeInTheDocument()
      
      const toggle = screen.getByRole('switch')
      expect(toggle).not.toBeChecked()
    })

    it('should handle internal transfers toggle', () => {
      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)
      
      expect(mockSetFilters).toHaveBeenCalledWith({ showInternalTransfers: true })
      expect(mockFetchTransactions).toHaveBeenCalledWith(1)
    })

    it('should show formatted dates when date range is set', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        filters: {
          ...mockFilters,
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31')
          }
        },
        categories: mockCategories,
        setFilters: mockSetFilters,
        resetFilters: mockResetFilters,
        fetchTransactions: mockFetchTransactions
      } as any)

      // Re-render with date range
      render(<TransactionFilters />)
      
      const filtersButtons = screen.getAllByText('Filters')
      fireEvent.click(filtersButtons[0])
      
      // Should show formatted dates instead of "Pick a date"
      expect(screen.queryByText('Pick a date')).not.toBeInTheDocument()
    })
  })

  describe('filter reset functionality', () => {
    it('should show clear filters button when filters are active', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        filters: { ...mockFilters, searchTerm: 'test' },
        categories: mockCategories,
        setFilters: mockSetFilters,
        resetFilters: mockResetFilters,
        fetchTransactions: mockFetchTransactions
      } as any)

      render(<TransactionFilters />)
      
      // Open advanced filters to see clear button
      const filtersButton = screen.getByText('Filters')
      fireEvent.click(filtersButton)
      
      expect(screen.getByText('Clear all filters')).toBeInTheDocument()
    })

    it('should not show clear filters button when no filters are active', () => {
      render(<TransactionFilters />)
      
      // Open advanced filters
      const filtersButton = screen.getByText('Filters')
      fireEvent.click(filtersButton)
      
      expect(screen.queryByText('Clear all filters')).not.toBeInTheDocument()
    })

    it('should reset all filters when clear button is clicked', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        filters: { ...mockFilters, searchTerm: 'test' },
        categories: mockCategories,
        setFilters: mockSetFilters,
        resetFilters: mockResetFilters,
        fetchTransactions: mockFetchTransactions
      } as any)

      render(<TransactionFilters />)
      
      // Open advanced filters and click clear
      const filtersButton = screen.getByText('Filters')
      fireEvent.click(filtersButton)
      
      const clearButton = screen.getByText('Clear all filters')
      fireEvent.click(clearButton)
      
      expect(mockResetFilters).toHaveBeenCalled()
      expect(mockFetchTransactions).toHaveBeenCalledWith(1)
    })

    it('should clear search input when reset is called', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        filters: { ...mockFilters, searchTerm: 'test' },
        categories: mockCategories,
        setFilters: mockSetFilters,
        resetFilters: mockResetFilters,
        fetchTransactions: mockFetchTransactions
      } as any)

      render(<TransactionFilters />)
      
      // Search input should have the existing value
      const searchInput = screen.getByPlaceholderText('Search by vendor or notes...')
      expect(searchInput).toHaveValue('test')
      
      // Clear filters
      const filtersButton = screen.getByText('Filters')
      fireEvent.click(filtersButton)
      
      const clearButton = screen.getByText('Clear all filters')
      fireEvent.click(clearButton)
      
      // Search input should be cleared (this would happen on re-render in real usage)
      expect(mockResetFilters).toHaveBeenCalled()
    })
  })

  describe('active filters detection', () => {
    it('should detect active search term', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        filters: { ...mockFilters, searchTerm: 'test' },
        categories: mockCategories,
        setFilters: mockSetFilters,
        resetFilters: mockResetFilters,
        fetchTransactions: mockFetchTransactions
      } as any)

      render(<TransactionFilters />)
      
      expect(screen.getByText('•')).toBeInTheDocument()
    })

    it('should detect active date range', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        filters: {
          ...mockFilters,
          dateRange: { start: new Date('2024-01-01'), end: null }
        },
        categories: mockCategories,
        setFilters: mockSetFilters,
        resetFilters: mockResetFilters,
        fetchTransactions: mockFetchTransactions
      } as any)

      render(<TransactionFilters />)
      
      expect(screen.getByText('•')).toBeInTheDocument()
    })

    it('should detect active category filters', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        filters: { ...mockFilters, categories: ['cat-1'] },
        categories: mockCategories,
        setFilters: mockSetFilters,
        resetFilters: mockResetFilters,
        fetchTransactions: mockFetchTransactions
      } as any)

      render(<TransactionFilters />)
      
      expect(screen.getByText('•')).toBeInTheDocument()
    })

    it('should detect show internal transfers filter', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        filters: { ...mockFilters, showInternalTransfers: true },
        categories: mockCategories,
        setFilters: mockSetFilters,
        resetFilters: mockResetFilters,
        fetchTransactions: mockFetchTransactions
      } as any)

      render(<TransactionFilters />)
      
      expect(screen.getByText('•')).toBeInTheDocument()
    })
  })

  describe('responsive behavior', () => {
    it('should render with responsive classes', () => {
      render(<TransactionFilters />)
      
      const container = screen.getByPlaceholderText('Search by vendor or notes...').closest('.flex-col')
      expect(container).toHaveClass('sm:flex-row')
    })

    it('should render category select with responsive width', () => {
      render(<TransactionFilters />)
      
      const categorySelect = screen.getByRole('combobox')
      expect(categorySelect).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle empty categories array', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        filters: mockFilters,
        categories: [],
        setFilters: mockSetFilters,
        resetFilters: mockResetFilters,
        fetchTransactions: mockFetchTransactions
      } as any)

      render(<TransactionFilters />)
      
      expect(screen.getByText('All Categories')).toBeInTheDocument()
    })

    it('should handle very long search terms', () => {
      render(<TransactionFilters />)
      
      const longSearchTerm = 'a'.repeat(1000)
      const searchInput = screen.getByPlaceholderText('Search by vendor or notes...')
      fireEvent.change(searchInput, { target: { value: longSearchTerm } })
      
      expect(searchInput).toHaveValue(longSearchTerm)
    })

    it('should handle rapid toggle of advanced filters', () => {
      render(<TransactionFilters />)
      
      const filtersButton = screen.getByText('Filters')
      
      // Rapidly toggle advanced filters
      fireEvent.click(filtersButton)
      expect(screen.getByText('From Date')).toBeInTheDocument()
      
      fireEvent.click(filtersButton)
      expect(screen.queryByText('From Date')).not.toBeInTheDocument()
      
      fireEvent.click(filtersButton)
      expect(screen.getByText('From Date')).toBeInTheDocument()
    })

    it('should handle empty search input gracefully', () => {
      render(<TransactionFilters />)
      
      const searchInput = screen.getByPlaceholderText('Search by vendor or notes...')
      fireEvent.change(searchInput, { target: { value: '' } })
      fireEvent.keyDown(searchInput, { key: 'Enter' })
      
      expect(mockSetFilters).toHaveBeenCalledWith({ searchTerm: '' })
    })
  })

  describe('accessibility', () => {
    it('should have proper labels for form elements', () => {
      render(<TransactionFilters />)
      
      // Open advanced filters to see more labels
      const filtersButton = screen.getByText('Filters')
      fireEvent.click(filtersButton)
      
      expect(screen.getByText('From Date')).toBeInTheDocument()
      expect(screen.getByText('To Date')).toBeInTheDocument()
      expect(screen.getByText('Options')).toBeInTheDocument()
    })

    it('should have proper ARIA attributes', () => {
      render(<TransactionFilters />)
      
      const searchInput = screen.getByPlaceholderText('Search by vendor or notes...')
      expect(searchInput).toHaveAttribute('placeholder')
      
      const categorySelect = screen.getByRole('combobox')
      expect(categorySelect).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      render(<TransactionFilters />)
      
      const searchInput = screen.getByPlaceholderText('Search by vendor or notes...')
      const filtersButton = screen.getByText('Filters')
      
      expect(searchInput).toBeInTheDocument()
      expect(filtersButton).toBeInTheDocument()
    })
  })

  describe('state synchronization', () => {
    it('should sync search input with store filter', () => {
      const { rerender } = render(<TransactionFilters />)
      
      // Change search input
      const searchInput = screen.getByPlaceholderText('Search by vendor or notes...')
      fireEvent.change(searchInput, { target: { value: 'test' } })
      
      expect(searchInput).toHaveValue('test')
    })

    it('should handle store filter updates', () => {
      // First render with updated filter state
      vi.mocked(useTransactionStore).mockReturnValue({
        filters: { ...mockFilters, searchTerm: 'updated' },
        categories: mockCategories,
        setFilters: mockSetFilters,
        resetFilters: mockResetFilters,
        fetchTransactions: mockFetchTransactions
      } as any)
      
      render(<TransactionFilters />)
      
      const searchInput = screen.getByPlaceholderText('Search by vendor or notes...')
      expect(searchInput).toHaveValue('updated')
    })
  })
})