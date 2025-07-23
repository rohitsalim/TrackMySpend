import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTransactionStore } from '@/store/transaction-store'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client')

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com'
}

const mockTransactions = [
  {
    id: '1',
    user_id: 'test-user-id',
    vendor_name: 'Test Vendor 1',
    category_id: 'cat-1',
    amount: 100.50,
    type: 'DEBIT',
    transaction_date: '2024-01-15',
    is_internal_transfer: false,
    notes: 'Test note 1'
  },
  {
    id: '2',
    user_id: 'test-user-id',
    vendor_name: 'Test Vendor 2',
    category_id: 'cat-2',
    amount: 250.00,
    type: 'CREDIT',
    transaction_date: '2024-01-10',
    is_internal_transfer: true,
    notes: 'Test note 2'
  }
]

const mockCategories = [
  {
    id: 'cat-1',
    name: 'Food',
    parent_id: null,
    is_system: true,
    user_id: null,
    color: '#ff0000',
    icon: 'food'
  },
  {
    id: 'cat-2',
    name: 'Transport',
    parent_id: null,
    is_system: false,
    user_id: 'test-user-id',
    color: '#00ff00',
    icon: 'transport'
  }
]

// Create a proper Supabase client mock
const createSupabaseMock = () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } })
    },
    from: vi.fn()
  }

  vi.mocked(createClient).mockReturnValue(mockSupabase as any)
  return mockSupabase
}

describe('TransactionStore', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = createSupabaseMock()
    
    // Reset store state
    useTransactionStore.setState({
      transactions: [],
      categories: [],
      filters: {
        dateRange: { start: null, end: null },
        categories: [],
        vendors: [],
        searchTerm: '',
        showInternalTransfers: false
      },
      isLoading: false,
      error: null,
      totalCount: 0,
      currentPage: 1,
      pageSize: 50
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchTransactions', () => {
    it('should fetch transactions successfully', async () => {
      // Mock the query chain
      const mockQueryResult = Promise.resolve({
        data: mockTransactions,
        error: null,
        count: 2
      })

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnValue(mockQueryResult)
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const { result } = renderHook(() => useTransactionStore())

      await act(async () => {
        await result.current.fetchTransactions()
      })

      expect(result.current.transactions).toEqual(mockTransactions)
      expect(result.current.totalCount).toBe(2)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should handle fetch error', async () => {
      const errorMessage = 'Database connection failed'
      
      const mockQueryResult = Promise.resolve({
        data: null,
        error: new Error(errorMessage),
        count: 0
      })

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnValue(mockQueryResult)
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const { result } = renderHook(() => useTransactionStore())

      await act(async () => {
        await result.current.fetchTransactions()
      })

      expect(result.current.error).toBe(errorMessage)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.transactions).toEqual([])
    })
  })

  describe('fetchCategories', () => {
    it('should fetch categories successfully', async () => {
      const mockQueryResult = Promise.resolve({
        data: mockCategories,
        error: null
      })

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(mockQueryResult)
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const { result } = renderHook(() => useTransactionStore())

      await act(async () => {
        await result.current.fetchCategories()
      })

      expect(result.current.categories).toEqual(mockCategories)
    })
  })

  describe('updateTransaction', () => {
    it('should update transaction successfully', async () => {
      const mockQueryResult = Promise.resolve({ error: null })

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue(mockQueryResult)
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const { result } = renderHook(() => useTransactionStore())
      
      // Set initial transactions
      act(() => {
        useTransactionStore.setState({ transactions: mockTransactions })
      })

      const updates = { vendor_name: 'Updated Vendor' }

      await act(async () => {
        await result.current.updateTransaction('1', updates)
      })

      expect(result.current.transactions[0].vendor_name).toBe('Updated Vendor')
    })
  })

  describe('bulkCategorize', () => {
    it('should bulk categorize transactions successfully', async () => {
      const mockQueryResult = Promise.resolve({ error: null })

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue(mockQueryResult)
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const { result } = renderHook(() => useTransactionStore())
      
      // Set initial transactions
      act(() => {
        useTransactionStore.setState({ transactions: mockTransactions })
      })

      const transactionIds = ['1', '2']
      const categoryId = 'new-category'

      await act(async () => {
        await result.current.bulkCategorize(transactionIds, categoryId)
      })

      expect(result.current.transactions[0].category_id).toBe(categoryId)
      expect(result.current.transactions[1].category_id).toBe(categoryId)
    })
  })

  describe('category management', () => {
    it('should create category successfully', async () => {
      const newCategory = {
        id: 'new-cat',
        name: 'New Category',
        color: '#blue',
        icon: 'new-icon',
        parent_id: null,
        is_system: false,
        user_id: 'test-user-id'
      }

      const mockQueryResult = Promise.resolve({
        data: newCategory,
        error: null
      })

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue(mockQueryResult)
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const { result } = renderHook(() => useTransactionStore())

      let createdCategory
      await act(async () => {
        createdCategory = await result.current.createCategory('New Category', '#blue', 'new-icon')
      })

      expect(createdCategory).toEqual(newCategory)
      expect(result.current.categories).toContain(newCategory)
    })

    it('should delete category successfully', async () => {
      // Mock transactions check (no transactions found)
      const mockTransactionQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue(Promise.resolve({
          data: [], // No transactions
          error: null
        }))
      }

      // Mock delete query
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue(Promise.resolve({ error: null }))
      }

      mockSupabase.from
        .mockReturnValueOnce(mockTransactionQuery)
        .mockReturnValueOnce(mockDeleteQuery)

      const { result } = renderHook(() => useTransactionStore())
      
      // Set initial categories
      act(() => {
        useTransactionStore.setState({ categories: mockCategories })
      })

      await act(async () => {
        await result.current.deleteCategory('cat-2')
      })

      expect(result.current.categories).toHaveLength(1)
      expect(result.current.categories[0].id).toBe('cat-1')
    })

    it('should prevent deleting category with transactions', async () => {
      // Mock transactions check (transactions found)
      const mockTransactionQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue(Promise.resolve({
          data: [{ id: 'tx-1' }], // Has transactions
          error: null
        }))
      }

      mockSupabase.from.mockReturnValue(mockTransactionQuery)

      const { result } = renderHook(() => useTransactionStore())

      await act(async () => {
        await result.current.deleteCategory('cat-2')
      })

      expect(result.current.error).toBe('Cannot delete category with existing transactions')
    })
  })

  describe('filters and pagination', () => {
    it('should set filters correctly', () => {
      const { result } = renderHook(() => useTransactionStore())

      act(() => {
        result.current.setFilters({
          searchTerm: 'test',
          categories: ['cat-1']
        })
      })

      expect(result.current.filters.searchTerm).toBe('test')
      expect(result.current.filters.categories).toEqual(['cat-1'])
      expect(result.current.currentPage).toBe(1) // Should reset to page 1
    })

    it('should reset filters correctly', () => {
      const { result } = renderHook(() => useTransactionStore())

      // Set some filters first
      act(() => {
        result.current.setFilters({
          searchTerm: 'test',
          categories: ['cat-1'],
          showInternalTransfers: true
        })
        result.current.setPage(3)
      })

      // Reset filters
      act(() => {
        result.current.resetFilters()
      })

      expect(result.current.filters.searchTerm).toBe('')
      expect(result.current.filters.categories).toEqual([])
      expect(result.current.filters.showInternalTransfers).toBe(false)
      expect(result.current.currentPage).toBe(1)
    })

    it('should set page correctly', () => {
      const { result } = renderHook(() => useTransactionStore())

      act(() => {
        result.current.setPage(5)
      })

      expect(result.current.currentPage).toBe(5)
    })
  })

  describe('selectors', () => {
    beforeEach(() => {
      useTransactionStore.setState({ transactions: mockTransactions })
    })

    it('should filter transactions correctly', () => {
      const { result } = renderHook(() => useTransactionStore())

      // Filter out internal transfers
      act(() => {
        result.current.setFilters({ showInternalTransfers: false })
      })

      const filtered = result.current.getFilteredTransactions()
      expect(filtered).toHaveLength(1)
      expect(filtered[0].is_internal_transfer).toBe(false)
    })

    it('should calculate monthly totals correctly', () => {
      const { result } = renderHook(() => useTransactionStore())

      const monthlyTotals = result.current.getMonthlyTotals()
      
      expect(monthlyTotals).toHaveLength(1) // Both transactions are in 2024-01
      expect(monthlyTotals[0].month).toBe('2024-01')
      expect(monthlyTotals[0].income).toBe(250.00)
      expect(monthlyTotals[0].expenses).toBe(100.50)
    })
  })

  describe('authentication handling', () => {
    it('should handle unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const { result } = renderHook(() => useTransactionStore())

      await act(async () => {
        await result.current.fetchTransactions()
      })

      expect(result.current.error).toBe('User not authenticated')
    })
  })
})