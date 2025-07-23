import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TransactionStats } from '@/components/transactions/TransactionStats'
import { useTransactionStore } from '@/store/transaction-store'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row']

// Mock the transaction store
vi.mock('@/store/transaction-store')

// Mock the formatters
vi.mock('@/lib/utils/formatters', () => ({
  formatCurrency: (amount: number) => `₹${amount.toFixed(2)}`
}))

// Mock console.log to avoid noise in tests
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('TransactionStats', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear()
  })

  describe('rendering with no transactions', () => {
    beforeEach(() => {
      vi.mocked(useTransactionStore).mockReturnValue({
        transactions: []
      } as any)
    })

    it('should render all stat cards with zero values', () => {
      render(<TransactionStats />)
      
      expect(screen.getByText('Monthly Income')).toBeInTheDocument()
      expect(screen.getByText('Monthly Expenses')).toBeInTheDocument()
      expect(screen.getByText('Net Balance')).toBeInTheDocument()
      expect(screen.getByText('Total Transactions')).toBeInTheDocument()
      
      // Should show zero values
      expect(screen.getByText('₹0.00')).toBeInTheDocument() // Income
      expect(screen.getAllByText('₹0.00')).toHaveLength(3) // Income, Expenses, Balance
      expect(screen.getByText('0')).toBeInTheDocument() // Transaction count
    })

    it('should show "Current Month" as subtitle when no transactions exist', () => {
      render(<TransactionStats />)
      
      // Should show Current Month as fallback
      expect(screen.getAllByText('Current Month')).toHaveLength(3) // Income, Balance, Transactions
    })
  })

  describe('rendering with transactions', () => {
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        user_id: 'user-1',
        vendor_name: 'Restaurant A',
        category_id: 'cat-1',
        amount: 500.00,
        type: 'DEBIT',
        transaction_date: '2024-01-15',
        is_internal_transfer: false,
        notes: null,
        raw_transaction_id: 'raw-1',
        vendor_name_original: 'Restaurant A',
        is_duplicate: false,
        duplicate_of_id: null,
        related_transaction_id: null,
        bank_account_id: null,
        credit_card_id: null,
        created_at: '2024-01-15T00:00:00.000Z',
        updated_at: '2024-01-15T00:00:00.000Z'
      },
      {
        id: '2',
        user_id: 'user-1',
        vendor_name: 'Salary',
        category_id: 'cat-2',
        amount: 5000.00,
        type: 'CREDIT',
        transaction_date: '2024-01-20',
        is_internal_transfer: false,
        notes: null,
        raw_transaction_id: 'raw-2',
        vendor_name_original: 'Salary',
        is_duplicate: false,
        duplicate_of_id: null,
        related_transaction_id: null,
        bank_account_id: null,
        credit_card_id: null,
        created_at: '2024-01-20T00:00:00.000Z',
        updated_at: '2024-01-20T00:00:00.000Z'
      },
      {
        id: '3',
        user_id: 'user-1',
        vendor_name: 'Shopping',
        category_id: 'cat-3',
        amount: 1200.00,
        type: 'DEBIT',
        transaction_date: '2024-01-25',
        is_internal_transfer: false,
        notes: null,
        raw_transaction_id: 'raw-3',
        vendor_name_original: 'Shopping',
        is_duplicate: false,
        duplicate_of_id: null,
        related_transaction_id: null,
        bank_account_id: null,
        credit_card_id: null,
        created_at: '2024-01-25T00:00:00.000Z',
        updated_at: '2024-01-25T00:00:00.000Z'
      },
      // Internal transfer (should be excluded)
      {
        id: '4',
        user_id: 'user-1',
        vendor_name: 'Bank Transfer',
        category_id: 'cat-4',
        amount: 1000.00,
        type: 'DEBIT',
        transaction_date: '2024-01-30',
        is_internal_transfer: true,
        notes: null,
        raw_transaction_id: 'raw-4',
        vendor_name_original: 'Bank Transfer',
        is_duplicate: false,
        duplicate_of_id: null,
        related_transaction_id: null,
        bank_account_id: null,
        credit_card_id: null,
        created_at: '2024-01-30T00:00:00.000Z',
        updated_at: '2024-01-30T00:00:00.000Z'
      }
    ]

    beforeEach(() => {
      vi.mocked(useTransactionStore).mockReturnValue({
        transactions: mockTransactions
      } as any)
    })

    it('should calculate and display correct monthly income', () => {
      render(<TransactionStats />)
      
      // Should show total credit amount (₹5000.00)
      expect(screen.getByText('₹5000.00')).toBeInTheDocument()
    })

    it('should calculate and display correct monthly expenses', () => {
      render(<TransactionStats />)
      
      // Should show total debit amount excluding internal transfers (₹500 + ₹1200 = ₹1700.00)
      expect(screen.getByText('₹1700.00')).toBeInTheDocument()
    })

    it('should calculate and display correct net balance', () => {
      render(<TransactionStats />)
      
      // Should show income - expenses (₹5000 - ₹1700 = ₹3300.00)
      expect(screen.getByText('₹3300.00')).toBeInTheDocument()
    })

    it('should display correct transaction count excluding internal transfers', () => {
      render(<TransactionStats />)
      
      // Should show 3 transactions (excluding internal transfer)
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should display correct month name', () => {
      render(<TransactionStats />)
      
      // Should show "January 2024" for transactions in 2024-01
      expect(screen.getAllByText('January 2024')).toHaveLength(3) // Income, Balance, Transactions
    })

    it('should exclude internal transfers from calculations', () => {
      render(<TransactionStats />)
      
      // Transaction count should be 3 (not 4)
      expect(screen.getByText('3')).toBeInTheDocument()
      
      // Expenses should be ₹1700.00 (not ₹2700.00 if internal transfer included)
      expect(screen.getByText('₹1700.00')).toBeInTheDocument()
    })
  })

  describe('month-over-month comparison', () => {
    const twoMonthTransactions: Transaction[] = [
      // December 2023 transactions
      {
        id: '1',
        user_id: 'user-1',
        vendor_name: 'December Expense',
        category_id: 'cat-1',
        amount: 1000.00,
        type: 'DEBIT',
        transaction_date: '2023-12-15',
        is_internal_transfer: false,
        notes: null,
        raw_transaction_id: 'raw-1',
        vendor_name_original: 'December Expense',
        is_duplicate: false,
        duplicate_of_id: null,
        related_transaction_id: null,
        bank_account_id: null,
        credit_card_id: null,
        created_at: '2023-12-15T00:00:00.000Z',
        updated_at: '2023-12-15T00:00:00.000Z'
      },
      // January 2024 transactions
      {
        id: '2',
        user_id: 'user-1',
        vendor_name: 'January Expense',
        category_id: 'cat-2',
        amount: 1500.00,
        type: 'DEBIT',
        transaction_date: '2024-01-15',
        is_internal_transfer: false,
        notes: null,
        raw_transaction_id: 'raw-2',
        vendor_name_original: 'January Expense',
        is_duplicate: false,
        duplicate_of_id: null,
        related_transaction_id: null,
        bank_account_id: null,
        credit_card_id: null,
        created_at: '2024-01-15T00:00:00.000Z',
        updated_at: '2024-01-15T00:00:00.000Z'
      }
    ]

    beforeEach(() => {
      vi.mocked(useTransactionStore).mockReturnValue({
        transactions: twoMonthTransactions
      } as any)
    })

    it('should show expense change percentage', () => {
      render(<TransactionStats />)
      
      // January expense (₹1500) vs December expense (₹1000) = 50% increase
      expect(screen.getByText('+50.0%')).toBeInTheDocument()
      expect(screen.getByText('vs last month')).toBeInTheDocument()
    })

    it('should color expense change appropriately', () => {
      render(<TransactionStats />)
      
      // Increase should be red (positive change is bad for expenses)
      const changeElement = screen.getByText('+50.0%')
      expect(changeElement).toHaveClass('text-red-600')
    })
  })

  describe('expense decrease comparison', () => {
    const decreaseTransactions: Transaction[] = [
      // December 2023 - higher expense
      {
        id: '1',
        user_id: 'user-1',
        vendor_name: 'December Expense',
        category_id: 'cat-1',
        amount: 2000.00,
        type: 'DEBIT',
        transaction_date: '2023-12-15',
        is_internal_transfer: false,
        notes: null,
        raw_transaction_id: 'raw-1',
        vendor_name_original: 'December Expense',
        is_duplicate: false,
        duplicate_of_id: null,
        related_transaction_id: null,
        bank_account_id: null,
        credit_card_id: null,
        created_at: '2023-12-15T00:00:00.000Z',
        updated_at: '2023-12-15T00:00:00.000Z'
      },
      // January 2024 - lower expense
      {
        id: '2',
        user_id: 'user-1',
        vendor_name: 'January Expense',
        category_id: 'cat-2',
        amount: 1000.00,
        type: 'DEBIT',
        transaction_date: '2024-01-15',
        is_internal_transfer: false,
        notes: null,
        raw_transaction_id: 'raw-2',
        vendor_name_original: 'January Expense',
        is_duplicate: false,
        duplicate_of_id: null,
        related_transaction_id: null,
        bank_account_id: null,
        credit_card_id: null,
        created_at: '2024-01-15T00:00:00.000Z',
        updated_at: '2024-01-15T00:00:00.000Z'
      }
    ]

    beforeEach(() => {
      vi.mocked(useTransactionStore).mockReturnValue({
        transactions: decreaseTransactions
      } as any)
    })

    it('should show negative expense change percentage', () => {
      render(<TransactionStats />)
      
      // January expense (₹1000) vs December expense (₹2000) = -50% decrease
      expect(screen.getByText('-50.0%')).toBeInTheDocument()
    })

    it('should color expense decrease as green', () => {
      render(<TransactionStats />)
      
      // Decrease should be green (negative change is good for expenses)
      const changeElement = screen.getByText('-50.0%')
      expect(changeElement).toHaveClass('text-green-600')
    })
  })

  describe('balance display colors', () => {
    it('should show positive balance in blue', () => {
      const positiveBalanceTransactions: Transaction[] = [
        {
          id: '1',
          user_id: 'user-1',
          vendor_name: 'Income',
          category_id: 'cat-1',
          amount: 5000.00,
          type: 'CREDIT',
          transaction_date: '2024-01-15',
          is_internal_transfer: false,
          notes: null,
          raw_transaction_id: 'raw-1',
          vendor_name_original: 'Income',
          is_duplicate: false,
          duplicate_of_id: null,
          related_transaction_id: null,
          bank_account_id: null,
          credit_card_id: null,
          created_at: '2024-01-15T00:00:00.000Z',
          updated_at: '2024-01-15T00:00:00.000Z'
        }
      ]

      vi.mocked(useTransactionStore).mockReturnValue({
        transactions: positiveBalanceTransactions
      } as any)

      render(<TransactionStats />)
      
      // Net balance card should have blue styling for positive balance
      const balanceCard = screen.getByText('Net Balance').closest('.bg-blue-50')
      expect(balanceCard).toBeInTheDocument()
    })

    it('should show negative balance in orange', () => {
      const negativeBalanceTransactions: Transaction[] = [
        {
          id: '1',
          user_id: 'user-1',
          vendor_name: 'Large Expense',
          category_id: 'cat-1',
          amount: 5000.00,
          type: 'DEBIT',
          transaction_date: '2024-01-15',
          is_internal_transfer: false,
          notes: null,
          raw_transaction_id: 'raw-1',
          vendor_name_original: 'Large Expense',
          is_duplicate: false,
          duplicate_of_id: null,
          related_transaction_id: null,
          bank_account_id: null,
          credit_card_id: null,
          created_at: '2024-01-15T00:00:00.000Z',
          updated_at: '2024-01-15T00:00:00.000Z'
        }
      ]

      vi.mocked(useTransactionStore).mockReturnValue({
        transactions: negativeBalanceTransactions
      } as any)

      render(<TransactionStats />)
      
      // Net balance should be negative (₹-5000.00)
      expect(screen.getByText('₹-5000.00')).toBeInTheDocument()
    })
  })

  describe('multiple months handling', () => {
    const multipleMonthTransactions: Transaction[] = [
      // January 2024
      {
        id: '1',
        user_id: 'user-1',
        vendor_name: 'January Transaction',
        category_id: 'cat-1',
        amount: 1000.00,
        type: 'DEBIT',
        transaction_date: '2024-01-15',
        is_internal_transfer: false,
        notes: null,
        raw_transaction_id: 'raw-1',
        vendor_name_original: 'January Transaction',
        is_duplicate: false,
        duplicate_of_id: null,
        related_transaction_id: null,
        bank_account_id: null,
        credit_card_id: null,
        created_at: '2024-01-15T00:00:00.000Z',
        updated_at: '2024-01-15T00:00:00.000Z'
      },
      // March 2024 (most recent)
      {
        id: '2',
        user_id: 'user-1',
        vendor_name: 'March Transaction',
        category_id: 'cat-2',
        amount: 2000.00,
        type: 'DEBIT',
        transaction_date: '2024-03-15',
        is_internal_transfer: false,
        notes: null,
        raw_transaction_id: 'raw-2',
        vendor_name_original: 'March Transaction',
        is_duplicate: false,
        duplicate_of_id: null,
        related_transaction_id: null,
        bank_account_id: null,
        credit_card_id: null,
        created_at: '2024-03-15T00:00:00.000Z',
        updated_at: '2024-03-15T00:00:00.000Z'
      },
      // February 2024
      {
        id: '3',
        user_id: 'user-1',
        vendor_name: 'February Transaction',
        category_id: 'cat-3',
        amount: 1500.00,
        type: 'DEBIT',
        transaction_date: '2024-02-15',
        is_internal_transfer: false,
        notes: null,
        raw_transaction_id: 'raw-3',
        vendor_name_original: 'February Transaction',
        is_duplicate: false,
        duplicate_of_id: null,
        related_transaction_id: null,
        bank_account_id: null,
        credit_card_id: null,
        created_at: '2024-02-15T00:00:00.000Z',
        updated_at: '2024-02-15T00:00:00.000Z'
      }
    ]

    beforeEach(() => {
      vi.mocked(useTransactionStore).mockReturnValue({
        transactions: multipleMonthTransactions
      } as any)
    })

    it('should use the most recent month for calculations', () => {
      render(<TransactionStats />)
      
      // Should show March 2024 as the current month
      expect(screen.getAllByText('March 2024')).toHaveLength(3)
      
      // Should show March transaction amount (₹2000.00)
      expect(screen.getByText('₹2000.00')).toBeInTheDocument()
      
      // Should show 1 transaction for March
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('should compare with the previous month', () => {
      render(<TransactionStats />)
      
      // March (₹2000) vs February (₹1500) = 33.3% increase
      expect(screen.getByText('+33.3%')).toBeInTheDocument()
    })
  })

  describe('responsive grid layout', () => {
    it('should render cards in responsive grid', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        transactions: []
      } as any)

      render(<TransactionStats />)
      
      const gridContainer = screen.getByText('Monthly Income').closest('.grid')
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4')
    })
  })

  describe('icon and styling', () => {
    beforeEach(() => {
      vi.mocked(useTransactionStore).mockReturnValue({
        transactions: []
      } as any)
    })

    it('should render correct icons for each stat', () => {
      render(<TransactionStats />)
      
      // Check that all stat cards are rendered
      expect(screen.getByText('Monthly Income')).toBeInTheDocument()
      expect(screen.getByText('Monthly Expenses')).toBeInTheDocument()
      expect(screen.getByText('Net Balance')).toBeInTheDocument()
      expect(screen.getByText('Total Transactions')).toBeInTheDocument()
    })

    it('should apply correct background colors', () => {
      render(<TransactionStats />)
      
      // Check that cards have appropriate styling structure
      const incomeCard = screen.getByText('Monthly Income').closest('.bg-green-50')
      const expenseCard = screen.getByText('Monthly Expenses').closest('.bg-red-50')
      const transactionCard = screen.getByText('Total Transactions').closest('.bg-purple-50')
      
      expect(incomeCard).toBeInTheDocument()
      expect(expenseCard).toBeInTheDocument()
      expect(transactionCard).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle transactions with zero amounts', () => {
      const zeroAmountTransactions: Transaction[] = [
        {
          id: '1',
          user_id: 'user-1',
          vendor_name: 'Zero Transaction',
          category_id: 'cat-1',
          amount: 0.00,
          type: 'DEBIT',
          transaction_date: '2024-01-15',
          is_internal_transfer: false,
          notes: null,
          raw_transaction_id: 'raw-1',
          vendor_name_original: 'Zero Transaction',
          is_duplicate: false,
          duplicate_of_id: null,
          related_transaction_id: null,
          bank_account_id: null,
          credit_card_id: null,
          created_at: '2024-01-15T00:00:00.000Z',
          updated_at: '2024-01-15T00:00:00.000Z'
        }
      ]

      vi.mocked(useTransactionStore).mockReturnValue({
        transactions: zeroAmountTransactions
      } as any)

      render(<TransactionStats />)
      
      // Should still show 1 transaction
      expect(screen.getByText('1')).toBeInTheDocument()
      // Should show ₹0.00 for amounts
      expect(screen.getAllByText('₹0.00')).toHaveLength(3)
    })

    it('should handle malformed dates gracefully', () => {
      const malformedDateTransactions: Transaction[] = [
        {
          id: '1',
          user_id: 'user-1',
          vendor_name: 'Test Transaction',
          category_id: 'cat-1',
          amount: 100.00,
          type: 'DEBIT',
          transaction_date: 'invalid-date',
          is_internal_transfer: false,
          notes: null,
          raw_transaction_id: 'raw-1',
          vendor_name_original: 'Test Transaction',
          is_duplicate: false,
          duplicate_of_id: null,
          related_transaction_id: null,
          bank_account_id: null,
          credit_card_id: null,
          created_at: '2024-01-15T00:00:00.000Z',
          updated_at: '2024-01-15T00:00:00.000Z'
        }
      ]

      vi.mocked(useTransactionStore).mockReturnValue({
        transactions: malformedDateTransactions
      } as any)

      expect(() => {
        render(<TransactionStats />)
      }).not.toThrow()
    })
  })
})