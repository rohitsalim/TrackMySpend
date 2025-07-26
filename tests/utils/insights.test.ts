import { describe, it, expect } from 'vitest'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null
}

// Mock utility functions for transaction insights
const calculateMonthlySpending = (transactions: Transaction[]): Record<string, number> => {
  const monthlySpending: Record<string, number> = {}
  
  transactions.forEach(transaction => {
    if (transaction.amount < 0) { // Only debit transactions
      const month = transaction.transaction_date.substring(0, 7) // YYYY-MM format
      monthlySpending[month] = (monthlySpending[month] || 0) + Math.abs(transaction.amount)
    }
  })
  
  return monthlySpending
}

const calculateCategorySpending = (transactions: Transaction[]): Record<string, number> => {
  const categorySpending: Record<string, number> = {}
  
  transactions.forEach(transaction => {
    if (transaction.amount < 0) { // Only debit transactions
      const categoryName = transaction.categories?.name || 'Uncategorized'
      categorySpending[categoryName] = (categorySpending[categoryName] || 0) + Math.abs(transaction.amount)
    }
  })
  
  return categorySpending
}

const calculateVendorSpending = (transactions: Transaction[]): Record<string, number> => {
  const vendorSpending: Record<string, number> = {}
  
  transactions.forEach(transaction => {
    if (transaction.amount < 0) { // Only debit transactions
      const vendorName = transaction.vendor_name || 'Unknown'
      vendorSpending[vendorName] = (vendorSpending[vendorName] || 0) + Math.abs(transaction.amount)
    }
  })
  
  return vendorSpending
}

const getTopVendors = (transactions: Transaction[], limit: number = 5): Array<{vendor: string, amount: number}> => {
  const vendorSpending = calculateVendorSpending(transactions)
  
  return Object.entries(vendorSpending)
    .map(([vendor, amount]) => ({ vendor, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

const getSpendingTrend = (transactions: Transaction[], months: number = 6): Array<{month: string, amount: number}> => {
  const monthlySpending = calculateMonthlySpending(transactions)
  const currentDate = new Date()
  const trends = []
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
    const monthKey = date.toISOString().substring(0, 7)
    trends.push({
      month: monthKey,
      amount: monthlySpending[monthKey] || 0
    })
  }
  
  return trends
}

const calculateAverageTransactionAmount = (transactions: Transaction[]): number => {
  const debitTransactions = transactions.filter(t => t.amount < 0)
  if (debitTransactions.length === 0) return 0
  
  const total = debitTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  return total / debitTransactions.length
}

const identifyLargeTransactions = (transactions: Transaction[], threshold: number = 10000): Transaction[] => {
  return transactions.filter(t => Math.abs(t.amount) > threshold)
}

const calculateIncome = (transactions: Transaction[]): number => {
  return transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)
}

const calculateNetCashFlow = (transactions: Transaction[]): number => {
  return transactions.reduce((sum, t) => sum + t.amount, 0)
}

describe('Transaction Insights and Analytics', () => {
  const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
    id: 'txn-1',
    user_id: 'user-123',
    file_id: 'file-123',
    vendor_name: 'Test Vendor',
    vendor_name_original: 'TEST VENDOR 123',
    amount: -100.00,
    transaction_date: '2024-01-15',
    description: 'Test transaction',
    category_id: 'cat-1',
    is_internal_transfer: false,
    notes: null,
    fingerprint: 'test-fingerprint',
    raw_text: 'TEST VENDOR 123 -100.00',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    categories: {
      id: 'cat-1',
      name: 'Food & Dining',
      parent_id: null,
      is_system: true,
      user_id: null,
      color: '#ff0000',
      icon: 'food',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    ...overrides
  })

  describe('calculateMonthlySpending', () => {
    it('should calculate monthly spending correctly', () => {
      const transactions = [
        createMockTransaction({
          amount: -500.00,
          transaction_date: '2024-01-15'
        }),
        createMockTransaction({
          amount: -300.00,
          transaction_date: '2024-01-20'
        }),
        createMockTransaction({
          amount: -200.00,
          transaction_date: '2024-02-05'
        }),
        createMockTransaction({
          amount: 1000.00, // Credit - should be ignored
          transaction_date: '2024-01-25'
        })
      ]

      const result = calculateMonthlySpending(transactions)

      expect(result['2024-01']).toBe(800.00)
      expect(result['2024-02']).toBe(200.00)
      expect(Object.keys(result)).toHaveLength(2)
    })

    it('should handle empty transactions', () => {
      const result = calculateMonthlySpending([])
      expect(result).toEqual({})
    })

    it('should handle only credit transactions', () => {
      const transactions = [
        createMockTransaction({
          amount: 1000.00,
          transaction_date: '2024-01-15'
        })
      ]

      const result = calculateMonthlySpending(transactions)
      expect(result).toEqual({})
    })
  })

  describe('calculateCategorySpending', () => {
    it('should calculate category spending correctly', () => {
      const transactions = [
        createMockTransaction({
          amount: -500.00,
          categories: { 
            id: 'cat-1', 
            name: 'Food & Dining',
            parent_id: null,
            is_system: true,
            user_id: null,
            color: '#ff0000',
            icon: 'food',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        }),
        createMockTransaction({
          amount: -300.00,
          categories: { 
            id: 'cat-2', 
            name: 'Transportation',
            parent_id: null,
            is_system: true,
            user_id: null,
            color: '#00ff00',
            icon: 'car',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        }),
        createMockTransaction({
          amount: -200.00,
          categories: { 
            id: 'cat-1', 
            name: 'Food & Dining',
            parent_id: null,
            is_system: true,
            user_id: null,
            color: '#ff0000',
            icon: 'food',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        })
      ]

      const result = calculateCategorySpending(transactions)

      expect(result['Food & Dining']).toBe(700.00)
      expect(result['Transportation']).toBe(300.00)
    })

    it('should handle uncategorized transactions', () => {
      const transactions = [
        createMockTransaction({
          amount: -500.00,
          categories: null
        })
      ]

      const result = calculateCategorySpending(transactions)
      expect(result['Uncategorized']).toBe(500.00)
    })
  })

  describe('getTopVendors', () => {
    it('should return top vendors by spending amount', () => {
      const transactions = [
        createMockTransaction({
          vendor_name: 'Restaurant A',
          amount: -1000.00
        }),
        createMockTransaction({
          vendor_name: 'Gas Station B',
          amount: -800.00
        }),
        createMockTransaction({
          vendor_name: 'Coffee Shop C',
          amount: -300.00
        }),
        createMockTransaction({
          vendor_name: 'Restaurant A',
          amount: -500.00
        })
      ]

      const result = getTopVendors(transactions, 3)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ vendor: 'Restaurant A', amount: 1500.00 })
      expect(result[1]).toEqual({ vendor: 'Gas Station B', amount: 800.00 })
      expect(result[2]).toEqual({ vendor: 'Coffee Shop C', amount: 300.00 })
    })

    it('should respect the limit parameter', () => {
      const transactions = Array.from({ length: 10 }, (_, i) => 
        createMockTransaction({
          vendor_name: `Vendor ${i}`,
          amount: -(i + 1) * 100
        })
      )

      const result = getTopVendors(transactions, 3)
      expect(result).toHaveLength(3)
    })

    it('should handle empty transactions', () => {
      const result = getTopVendors([])
      expect(result).toEqual([])
    })
  })

  describe('getSpendingTrend', () => {
    it('should return spending trend for specified months', () => {
      const transactions = [
        createMockTransaction({
          amount: -500.00,
          transaction_date: '2024-01-15'
        }),
        createMockTransaction({
          amount: -300.00,
          transaction_date: '2024-02-15'
        })
      ]

      const result = getSpendingTrend(transactions, 3)

      expect(result).toHaveLength(3)
      expect(result[0].month).toMatch(/^\d{4}-\d{2}$/)
      expect(result[0].amount).toBeTypeOf('number')
    })

    it('should include months with zero spending', () => {
      const transactions = [
        createMockTransaction({
          amount: -500.00,
          transaction_date: '2024-01-15'
        })
      ]

      const result = getSpendingTrend(transactions, 3)

      expect(result).toHaveLength(3)
      expect(result.some(r => r.amount === 0)).toBe(true)
    })
  })

  describe('calculateAverageTransactionAmount', () => {
    it('should calculate average correctly', () => {
      const transactions = [
        createMockTransaction({ amount: -100.00 }),
        createMockTransaction({ amount: -200.00 }),
        createMockTransaction({ amount: -300.00 }),
        createMockTransaction({ amount: 500.00 }) // Credit - should be ignored
      ]

      const result = calculateAverageTransactionAmount(transactions)
      expect(result).toBe(200.00)
    })

    it('should return 0 for empty transactions', () => {
      const result = calculateAverageTransactionAmount([])
      expect(result).toBe(0)
    })

    it('should return 0 for only credit transactions', () => {
      const transactions = [
        createMockTransaction({ amount: 1000.00 })
      ]

      const result = calculateAverageTransactionAmount(transactions)
      expect(result).toBe(0)
    })
  })

  describe('identifyLargeTransactions', () => {
    it('should identify transactions above threshold', () => {
      const transactions = [
        createMockTransaction({ amount: -15000.00 }),
        createMockTransaction({ amount: -500.00 }),
        createMockTransaction({ amount: 20000.00 }),
        createMockTransaction({ amount: -8000.00 })
      ]

      const result = identifyLargeTransactions(transactions, 10000)

      expect(result).toHaveLength(2)
      expect(result[0].amount).toBe(-15000.00)
      expect(result[1].amount).toBe(20000.00)
    })

    it('should use default threshold of 10000', () => {
      const transactions = [
        createMockTransaction({ amount: -15000.00 }),
        createMockTransaction({ amount: -5000.00 })
      ]

      const result = identifyLargeTransactions(transactions)
      expect(result).toHaveLength(1)
    })
  })

  describe('calculateIncome', () => {
    it('should sum all credit transactions', () => {
      const transactions = [
        createMockTransaction({ amount: 5000.00 }),
        createMockTransaction({ amount: 3000.00 }),
        createMockTransaction({ amount: -1000.00 }) // Debit - should be ignored
      ]

      const result = calculateIncome(transactions)
      expect(result).toBe(8000.00)
    })

    it('should return 0 for no credit transactions', () => {
      const transactions = [
        createMockTransaction({ amount: -1000.00 })
      ]

      const result = calculateIncome(transactions)
      expect(result).toBe(0)
    })
  })

  describe('calculateNetCashFlow', () => {
    it('should calculate net cash flow correctly', () => {
      const transactions = [
        createMockTransaction({ amount: 5000.00 }),
        createMockTransaction({ amount: -1000.00 }),
        createMockTransaction({ amount: -2000.00 }),
        createMockTransaction({ amount: 3000.00 })
      ]

      const result = calculateNetCashFlow(transactions)
      expect(result).toBe(5000.00)
    })

    it('should handle negative net cash flow', () => {
      const transactions = [
        createMockTransaction({ amount: 1000.00 }),
        createMockTransaction({ amount: -2000.00 })
      ]

      const result = calculateNetCashFlow(transactions)
      expect(result).toBe(-1000.00)
    })

    it('should return 0 for empty transactions', () => {
      const result = calculateNetCashFlow([])
      expect(result).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle very large numbers', () => {
      const transactions = [
        createMockTransaction({ amount: -999999999.99 })
      ]

      const monthlySpending = calculateMonthlySpending(transactions)
      expect(monthlySpending['2024-01']).toBe(999999999.99)
    })

    it('should handle zero amount transactions', () => {
      const transactions = [
        createMockTransaction({ amount: 0.00 })
      ]

      const monthlySpending = calculateMonthlySpending(transactions)
      expect(monthlySpending).toEqual({})
    })

    it('should handle missing vendor names', () => {
      const transactions = [
        createMockTransaction({
          vendor_name: null as any,
          amount: -500.00
        })
      ]

      const vendorSpending = calculateVendorSpending(transactions)
      expect(vendorSpending['Unknown']).toBe(500.00)
    })

    it('should handle invalid dates gracefully', () => {
      const transactions = [
        createMockTransaction({
          transaction_date: '2024-13-45', // Invalid date
          amount: -500.00
        })
      ]

      // Should not throw error
      expect(() => calculateMonthlySpending(transactions)).not.toThrow()
    })
  })
})