import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row']
type Category = Database['public']['Tables']['categories']['Row']

interface TransactionFilters {
  dateRange: {
    start: Date | null
    end: Date | null
  }
  categories: string[]
  vendors: string[]
  searchTerm: string
  showInternalTransfers: boolean
}

interface TransactionStore {
  // State
  transactions: Transaction[]
  categories: Category[]
  filters: TransactionFilters
  isLoading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  pageSize: number
  
  // Actions
  fetchTransactions: (page?: number) => Promise<void>
  fetchCategories: () => Promise<void>
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>
  updateTransactionCategory: (id: string, categoryId: string, categoryData?: Category) => Promise<void>
  bulkCategorize: (ids: string[], categoryId: string) => Promise<void>
  createCategory: (name: string, color?: string, icon?: string, parentId?: string | null) => Promise<Category>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  setFilters: (filters: Partial<TransactionFilters>) => void
  setPage: (page: number) => void
  resetFilters: () => void
  
  // Selectors
  getFilteredTransactions: () => Transaction[]
  getMonthlyTotals: () => { month: string; income: number; expenses: number }[]
}

const defaultFilters: TransactionFilters = {
  dateRange: {
    start: null,
    end: null
  },
  categories: [],
  vendors: [],
  searchTerm: '',
  showInternalTransfers: false
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  // Initial state
  transactions: [],
  categories: [],
  filters: defaultFilters,
  isLoading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 50,
  
  // Fetch transactions with pagination and filters
  fetchTransactions: async (page = 1) => {
    set({ isLoading: true, error: null, currentPage: page })
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      const { filters, pageSize } = get()
      const offset = (page - 1) * pageSize
      
      // Build query
      let query = supabase
        .from('transactions')
        .select('*, categories(*)', { count: 'exact' })
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .range(offset, offset + pageSize - 1)
      
      // Apply filters
      if (filters.dateRange.start) {
        query = query.gte('transaction_date', filters.dateRange.start.toISOString().split('T')[0])
      }
      
      if (filters.dateRange.end) {
        query = query.lte('transaction_date', filters.dateRange.end.toISOString().split('T')[0])
      }
      
      if (filters.categories.length > 0) {
        query = query.in('category_id', filters.categories)
      }
      
      if (filters.searchTerm) {
        query = query.or(`vendor_name.ilike.%${filters.searchTerm}%,notes.ilike.%${filters.searchTerm}%`)
      }
      
      if (!filters.showInternalTransfers) {
        query = query.eq('is_internal_transfer', false)
      }
      
      const { data, error, count } = await query
      
      if (error) throw error
      
      set({ 
        transactions: data || [], 
        totalCount: count || 0,
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch transactions',
        isLoading: false 
      })
    }
  },
  
  // Fetch categories
  fetchCategories: async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`is_system.eq.true,user_id.eq.${user.id}`)
        .order('name')
      
      if (error) throw error
      
      set({ categories: data || [] })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch categories' 
      })
    }
  },
  
  // Update a single transaction
  updateTransaction: async (id, updates) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      // Update local state
      set(state => ({
        transactions: state.transactions.map(t => 
          t.id === id ? { ...t, ...updates } : t
        )
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update transaction' 
      })
    }
  },

  // Update transaction category with proper relationship data
  updateTransactionCategory: async (id, categoryId, categoryData) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('transactions')
        .update({ category_id: categoryId })
        .eq('id', id)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      // Update local state with both category_id and categories object
      set(state => ({
        transactions: state.transactions.map(t => 
          t.id === id ? { 
            ...t, 
            category_id: categoryId,
            categories: categoryData || state.categories.find(cat => cat.id === categoryId) || null
          } : t
        )
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update transaction category' 
      })
    }
  },
  
  // Bulk categorize transactions
  bulkCategorize: async (ids, categoryId) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      const { error } = await supabase
        .from('transactions')
        .update({ category_id: categoryId })
        .in('id', ids)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      // Update local state
      set(state => ({
        transactions: state.transactions.map(t => 
          ids.includes(t.id) ? { ...t, category_id: categoryId } : t
        )
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to categorize transactions' 
      })
    }
  },
  
  // Create a new category
  createCategory: async (name: string, color?: string, icon?: string, parentId?: string | null) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name,
          color,
          icon,
          parent_id: parentId || null,
          is_system: false,
          user_id: user.id
        })
        .select()
        .single()
      
      if (error) throw error
      
      // Update local categories
      set(state => ({
        categories: [...state.categories, data]
      }))
      
      return data
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create category' 
      })
      throw error
    }
  },
  
  // Update a category
  updateCategory: async (id: string, updates: Partial<Category>) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      // Don't allow updating system categories
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('is_system', false)
      
      if (error) throw error
      
      // Update local state
      set(state => ({
        categories: state.categories.map(cat => 
          cat.id === id ? { ...cat, ...updates } : cat
        )
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update category' 
      })
      throw error
    }
  },
  
  // Delete a category
  deleteCategory: async (id: string) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      // Check if category has transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('category_id', id)
        .limit(1)
      
      if (transactions && transactions.length > 0) {
        throw new Error('Cannot delete category with existing transactions')
      }
      
      // Don't allow deleting system categories
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('is_system', false)
      
      if (error) throw error
      
      // Update local state
      set(state => ({
        categories: state.categories.filter(cat => cat.id !== id)
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete category' 
      })
      throw error
    }
  },
  
  // Set filters
  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
      currentPage: 1 // Reset to first page when filters change
    }))
  },
  
  // Set page
  setPage: (page) => {
    set({ currentPage: page })
  },
  
  // Reset filters
  resetFilters: () => {
    set({ filters: defaultFilters, currentPage: 1 })
  },
  
  // Get filtered transactions (client-side)
  getFilteredTransactions: () => {
    const { transactions, filters } = get()
    
    return transactions.filter(tx => {
      if (!filters.showInternalTransfers && tx.is_internal_transfer) {
        return false
      }
      
      if (filters.vendors.length > 0 && !filters.vendors.includes(tx.vendor_name)) {
        return false
      }
      
      return true
    })
  },
  
  // Get monthly totals
  getMonthlyTotals: () => {
    const { transactions } = get()
    const monthlyData: Record<string, { income: number; expenses: number }> = {}
    
    transactions.forEach(tx => {
      const monthKey = tx.transaction_date.substring(0, 7) // YYYY-MM
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0 }
      }
      
      if (tx.type === 'CREDIT') {
        monthlyData[monthKey].income += tx.amount
      } else {
        monthlyData[monthKey].expenses += tx.amount
      }
    })
    
    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month))
  }
}))