import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransactionList } from '@/components/transactions/TransactionList'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null
}
type Category = Database['public']['Tables']['categories']['Row']

// Mock child components
vi.mock('@/components/transactions/TransactionEditModal', () => ({
  TransactionEditModal: ({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) => (
    <div data-testid="transaction-edit-modal">
      <div>Edit Transaction: {transaction.vendor_name}</div>
      <button onClick={onClose}>Close</button>
    </div>
  )
}))

vi.mock('@/components/transactions/BulkCategorizeModal', () => ({
  BulkCategorizeModal: ({ transactionIds, onClose, onSuccess }: { 
    transactionIds: string[]; 
    onClose: () => void; 
    onSuccess: () => void;
  }) => (
    <div data-testid="bulk-categorize-modal">
      <div>Bulk Categorize: {transactionIds.length} transactions</div>
      <button onClick={onClose}>Close</button>
      <button onClick={onSuccess}>Success</button>
    </div>
  )
}))

// Mock formatters
vi.mock('@/lib/utils/formatters', () => ({
  formatCurrency: (amount: number) => `₹${amount.toFixed(2)}`,
  formatDate: (date: string) => new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: '2-digit' 
  })
}))

// Mock category utilities
vi.mock('@/types/categories', () => ({
  getCategoryPath: (categoryId: string, categories: Category[]) => {
    const category = categories.find(c => c.id === categoryId)
    return category ? category.name : 'Unknown'
  }
}))

// Mock UI components that might cause issues
vi.mock('@/components/ui/pagination', () => ({
  Pagination: ({ currentPage, totalPages, onPageChange }: { 
    currentPage: number; 
    totalPages: number; 
    onPageChange: (page: number) => void;
  }) => (
    <div data-testid="pagination">
      <button 
        data-testid="prev-page" 
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </button>
      <span>Page {currentPage} of {totalPages}</span>
      <button 
        data-testid="next-page" 
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Next
      </button>
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
    name: 'Transportation',
    parent_id: null,
    icon: 'car',
    color: '#4ecdc4',
    is_system: true,
    user_id: null,
    created_at: '2024-01-01T00:00:00.000Z'
  }
]

const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    user_id: 'user-1',
    vendor_name: 'Restaurant ABC',
    category_id: 'cat-1',
    amount: 500.00,
    type: 'DEBIT',
    transaction_date: '2024-01-15',
    is_internal_transfer: false,
    notes: null,
    raw_transaction_id: 'raw-1',
    vendor_name_original: 'RESTAURANT ABC LTD',
    is_duplicate: false,
    duplicate_of_id: null,
    related_transaction_id: null,
    bank_account_id: null,
    credit_card_id: null,
    created_at: '2024-01-15T00:00:00.000Z',
    updated_at: '2024-01-15T00:00:00.000Z',
    categories: mockCategories[0]
  },
  {
    id: 'tx-2',
    user_id: 'user-1',
    vendor_name: 'Salary Payment',
    category_id: null,
    amount: 5000.00,
    type: 'CREDIT',
    transaction_date: '2024-01-20',
    is_internal_transfer: false,
    notes: null,
    raw_transaction_id: 'raw-2',
    vendor_name_original: 'SALARY PAYMENT',
    is_duplicate: false,
    duplicate_of_id: null,
    related_transaction_id: null,
    bank_account_id: null,
    credit_card_id: null,
    created_at: '2024-01-20T00:00:00.000Z',
    updated_at: '2024-01-20T00:00:00.000Z',
    categories: null
  },
  {
    id: 'tx-3',
    user_id: 'user-1',
    vendor_name: 'Uber Ride',
    category_id: 'cat-2',
    amount: 250.00,
    type: 'DEBIT',
    transaction_date: '2024-01-25',
    is_internal_transfer: false,
    notes: null,
    raw_transaction_id: 'raw-3',
    vendor_name_original: 'UBER TRIP',
    is_duplicate: false,
    duplicate_of_id: null,
    related_transaction_id: null,
    bank_account_id: null,
    credit_card_id: null,
    created_at: '2024-01-25T00:00:00.000Z',
    updated_at: '2024-01-25T00:00:00.000Z',
    categories: mockCategories[1]
  }
]

describe('TransactionList', () => {
  const defaultProps = {
    transactions: mockTransactions,
    categories: mockCategories,
    isLoading: false,
    totalCount: 3,
    currentPage: 1,
    pageSize: 10,
    onPageChange: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render transaction table with all columns', () => {
      render(<TransactionList {...defaultProps} />)
      
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('Vendor')).toBeInTheDocument()
      expect(screen.getByText('Category')).toBeInTheDocument()
      expect(screen.getByText('Amount')).toBeInTheDocument()
      expect(screen.getByText('Bank')).toBeInTheDocument()
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })

    it('should render all transactions', () => {
      render(<TransactionList {...defaultProps} />)
      
      expect(screen.getByText('Restaurant ABC')).toBeInTheDocument()
      expect(screen.getByText('Salary Payment')).toBeInTheDocument()
      expect(screen.getByText('Uber Ride')).toBeInTheDocument()
    })

    it('should show formatted dates', () => {
      render(<TransactionList {...defaultProps} />)
      
      expect(screen.getByText('Jan 15')).toBeInTheDocument()
      expect(screen.getByText('Jan 20')).toBeInTheDocument()
      expect(screen.getByText('Jan 25')).toBeInTheDocument()
    })

    it('should show formatted amounts with correct colors', () => {
      render(<TransactionList {...defaultProps} />)
      
      // Credit transaction should be green and positive
      const creditAmount = screen.getByText('+₹5000.00')
      expect(creditAmount).toBeInTheDocument()
      expect(creditAmount).toHaveClass('text-green-600')
      
      // Debit transactions should be red and negative
      const debitAmounts = screen.getAllByText(/^-₹/)
      expect(debitAmounts).toHaveLength(2)
      debitAmounts.forEach(amount => {
        expect(amount).toHaveClass('text-red-600')
      })
    })

    it('should show category badges', () => {
      render(<TransactionList {...defaultProps} />)
      
      expect(screen.getByText('Food & Dining')).toBeInTheDocument()
      expect(screen.getByText('Transportation')).toBeInTheDocument()
      expect(screen.getByText('Uncategorized')).toBeInTheDocument()
    })

    it('should show original vendor names when different', () => {
      render(<TransactionList {...defaultProps} />)
      
      expect(screen.getByText('RESTAURANT ABC LTD')).toBeInTheDocument()
      expect(screen.getByText('UBER TRIP')).toBeInTheDocument()
    })

    it('should render edit buttons for all transactions', () => {
      render(<TransactionList {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      expect(editButtons).toHaveLength(3)
    })

    it('should render select all checkbox', () => {
      render(<TransactionList {...defaultProps} />)
      
      expect(screen.getByLabelText('Select all transactions')).toBeInTheDocument()
    })

    it('should render individual transaction checkboxes', () => {
      render(<TransactionList {...defaultProps} />)
      
      expect(screen.getByLabelText('Select transaction from Restaurant ABC')).toBeInTheDocument()
      expect(screen.getByLabelText('Select transaction from Salary Payment')).toBeInTheDocument()
      expect(screen.getByLabelText('Select transaction from Uber Ride')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should show empty state when no transactions', () => {
      render(<TransactionList {...defaultProps} transactions={[]} totalCount={0} />)
      
      expect(screen.getByText('No transactions found')).toBeInTheDocument()
      expect(screen.getByText('Upload a bank statement to get started')).toBeInTheDocument()
    })

    it('should not show table when no transactions', () => {
      render(<TransactionList {...defaultProps} transactions={[]} totalCount={0} />)
      
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('should show loading spinner when loading', () => {
      render(<TransactionList {...defaultProps} isLoading={true} />)
      
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should not show transaction data when loading', () => {
      render(<TransactionList {...defaultProps} isLoading={true} />)
      
      expect(screen.queryByText('Restaurant ABC')).not.toBeInTheDocument()
    })
  })

  describe('sorting', () => {
    it('should handle date sorting', () => {
      render(<TransactionList {...defaultProps} />)
      
      const dateButton = screen.getByText('Date').closest('button')
      expect(dateButton).toBeInTheDocument()
      
      fireEvent.click(dateButton!)
      
      // Should trigger re-render with sorted order
      // By default, transactions are sorted by date desc, so first click should make it asc
      const rows = screen.getAllByRole('row')
      // Skip header row - should show oldest first (Jan 15)
      expect(rows[1]).toHaveTextContent('Jan 15')
    })

    it('should handle vendor sorting', () => {
      render(<TransactionList {...defaultProps} />)
      
      const vendorButton = screen.getByText('Vendor').closest('button')
      fireEvent.click(vendorButton!)
      
      // Should sort alphabetically by vendor name
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Restaurant ABC') // First alphabetically
    })

    it('should handle amount sorting', () => {
      render(<TransactionList {...defaultProps} />)
      
      const amountButton = screen.getByText('Amount').closest('button')
      fireEvent.click(amountButton!)
      
      // Should sort by amount (ascending first)
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('₹250.00') // Smallest amount first
    })

    it('should toggle sort order on repeated clicks', () => {
      render(<TransactionList {...defaultProps} />)
      
      const dateButton = screen.getByText('Date').closest('button')
      
      // First click - should set to asc (oldest first)
      fireEvent.click(dateButton!)
      let rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Jan 15') // Oldest first
      
      // Second click - should toggle to desc (newest first) 
      fireEvent.click(dateButton!)
      rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Jan 25') // Newest first
    })
  })

  describe('selection', () => {
    it('should select individual transactions', () => {
      render(<TransactionList {...defaultProps} />)
      
      const checkbox = screen.getByLabelText('Select transaction from Restaurant ABC')
      fireEvent.click(checkbox)
      
      expect(checkbox).toBeChecked()
      expect(screen.getByText('1 transaction selected')).toBeInTheDocument()
    })

    it('should select all transactions', () => {
      render(<TransactionList {...defaultProps} />)
      
      const selectAllCheckbox = screen.getByLabelText('Select all transactions')
      fireEvent.click(selectAllCheckbox)
      
      expect(selectAllCheckbox).toBeChecked()
      expect(screen.getByText('3 transactions selected')).toBeInTheDocument()
      
      // All individual checkboxes should be checked
      const individualCheckboxes = screen.getAllByLabelText(/Select transaction from/)
      individualCheckboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked()
      })
    })

    it('should deselect all transactions', () => {
      render(<TransactionList {...defaultProps} />)
      
      const selectAllCheckbox = screen.getByLabelText('Select all transactions')
      
      // Select all first
      fireEvent.click(selectAllCheckbox)
      expect(screen.getByText('3 transactions selected')).toBeInTheDocument()
      
      // Then deselect all
      fireEvent.click(selectAllCheckbox)
      expect(screen.queryByText(/transactions selected/)).not.toBeInTheDocument()
    })

    it('should show bulk actions when transactions are selected', () => {
      render(<TransactionList {...defaultProps} />)
      
      const checkbox = screen.getByLabelText('Select transaction from Restaurant ABC')
      fireEvent.click(checkbox)
      
      expect(screen.getByText('Clear selection')).toBeInTheDocument()
      expect(screen.getByText('Bulk categorize')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('should clear selection', () => {
      render(<TransactionList {...defaultProps} />)
      
      // Select a transaction
      const checkbox = screen.getByLabelText('Select transaction from Restaurant ABC')
      fireEvent.click(checkbox)
      
      // Clear selection
      const clearButton = screen.getByText('Clear selection')
      fireEvent.click(clearButton)
      
      expect(screen.queryByText(/transactions selected/)).not.toBeInTheDocument()
      expect(checkbox).not.toBeChecked()
    })
  })

  describe('bulk operations', () => {
    it('should open bulk categorize modal', () => {
      render(<TransactionList {...defaultProps} />)
      
      // Select transactions
      const checkbox1 = screen.getByLabelText('Select transaction from Restaurant ABC')
      const checkbox2 = screen.getByLabelText('Select transaction from Uber Ride')
      fireEvent.click(checkbox1)
      fireEvent.click(checkbox2)
      
      // Open bulk categorize
      const bulkButton = screen.getByText('Bulk categorize')
      fireEvent.click(bulkButton)
      
      expect(screen.getByTestId('bulk-categorize-modal')).toBeInTheDocument()
      expect(screen.getByText('Bulk Categorize: 2 transactions')).toBeInTheDocument()
    })

    it('should close bulk categorize modal', () => {
      render(<TransactionList {...defaultProps} />)
      
      // Select and open bulk categorize
      const checkbox = screen.getByLabelText('Select transaction from Restaurant ABC')
      fireEvent.click(checkbox)
      fireEvent.click(screen.getByText('Bulk categorize'))
      
      // Close modal
      const closeButton = screen.getByText('Close')
      fireEvent.click(closeButton)
      
      expect(screen.queryByTestId('bulk-categorize-modal')).not.toBeInTheDocument()
    })

    it('should handle bulk categorize success', () => {
      render(<TransactionList {...defaultProps} />)
      
      // Select and open bulk categorize
      const checkbox = screen.getByLabelText('Select transaction from Restaurant ABC')
      fireEvent.click(checkbox)
      fireEvent.click(screen.getByText('Bulk categorize'))
      
      // Trigger success
      const successButton = screen.getByText('Success')
      fireEvent.click(successButton)
      
      // Should close modal and clear selection
      expect(screen.queryByTestId('bulk-categorize-modal')).not.toBeInTheDocument()
      expect(screen.queryByText(/transactions selected/)).not.toBeInTheDocument()
    })

    it('should disable delete button', () => {
      render(<TransactionList {...defaultProps} />)
      
      const checkbox = screen.getByLabelText('Select transaction from Restaurant ABC')
      fireEvent.click(checkbox)
      
      const deleteButton = screen.getByText('Delete')
      expect(deleteButton).toBeDisabled()
    })
  })

  describe('transaction editing', () => {
    it('should open edit modal when edit button is clicked', () => {
      render(<TransactionList {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      fireEvent.click(editButtons[0])
      
      expect(screen.getByTestId('transaction-edit-modal')).toBeInTheDocument()
      expect(screen.getByText(/Edit Transaction:/)).toBeInTheDocument()
      expect(screen.getByText(/Restaurant ABC/)).toBeInTheDocument()
    })

    it('should close edit modal', () => {
      render(<TransactionList {...defaultProps} />)
      
      // Open edit modal
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      fireEvent.click(editButtons[0])
      
      // Close modal
      const closeButton = screen.getByText('Close')
      fireEvent.click(closeButton)
      
      expect(screen.queryByTestId('transaction-edit-modal')).not.toBeInTheDocument()
    })
  })

  describe('pagination', () => {
    it('should show pagination when multiple pages', () => {
      render(<TransactionList {...defaultProps} totalCount={25} pageSize={10} />)
      
      expect(screen.getByTestId('pagination')).toBeInTheDocument()
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    })

    it('should not show pagination when single page', () => {
      render(<TransactionList {...defaultProps} totalCount={3} pageSize={10} />)
      
      expect(screen.queryByTestId('pagination')).not.toBeInTheDocument()
    })

    it('should handle page change', () => {
      const mockOnPageChange = vi.fn()
      render(
        <TransactionList 
          {...defaultProps} 
          totalCount={25} 
          pageSize={10} 
          currentPage={1}
          onPageChange={mockOnPageChange}
        />
      )
      
      const nextButton = screen.getByTestId('next-page')
      fireEvent.click(nextButton)
      
      expect(mockOnPageChange).toHaveBeenCalledWith(2)
    })
  })

  describe('tooltips', () => {
    it('should render tooltip triggers for vendor names', () => {
      render(<TransactionList {...defaultProps} />)
      
      // Should render vendor names that can trigger tooltips
      expect(screen.getByText('Restaurant ABC')).toBeInTheDocument()
      expect(screen.getByText('RESTAURANT ABC LTD')).toBeInTheDocument()
    })

    it('should render tooltip triggers for category badges', () => {
      render(<TransactionList {...defaultProps} />)
      
      // Should render category badges that can show tooltips
      expect(screen.getByText('Food & Dining')).toBeInTheDocument()
      expect(screen.getByText('Transportation')).toBeInTheDocument()
    })
  })

  describe('text truncation', () => {
    it('should truncate long vendor names', () => {
      const longVendorTransaction: Transaction = {
        ...mockTransactions[0],
        vendor_name: 'This is a very long vendor name that should be truncated for display purposes',
        vendor_name_original: 'VERY LONG ORIGINAL NAME'
      }
      
      render(
        <TransactionList 
          {...defaultProps} 
          transactions={[longVendorTransaction]}
          totalCount={1}
        />
      )
      
      // Should show truncated version with ellipsis
      expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle transactions with zero amounts in sorting', () => {
      const transactionsWithZero: Transaction[] = [
        { ...mockTransactions[0], amount: 100 },
        { ...mockTransactions[1], amount: 0 },
        { ...mockTransactions[2], amount: 200 }
      ]
      
      render(<TransactionList {...defaultProps} transactions={transactionsWithZero} />)
      
      const amountButton = screen.getByText('Amount').closest('button')
      fireEvent.click(amountButton!)
      
      // Should not crash and should handle zero values
      expect(screen.getByRole('table')).toBeInTheDocument()
      // Should render all transactions including the zero amount one
      expect(screen.getAllByRole('row')).toHaveLength(4) // 1 header + 3 data rows
    })

    it('should handle transactions without categories', () => {
      const uncategorizedTransaction: Transaction = {
        ...mockTransactions[0],
        category_id: null,
        categories: null
      }
      
      render(
        <TransactionList 
          {...defaultProps} 
          transactions={[uncategorizedTransaction]}
          totalCount={1}
        />
      )
      
      expect(screen.getByText('Uncategorized')).toBeInTheDocument()
    })

    it('should handle empty categories array', () => {
      render(<TransactionList {...defaultProps} categories={[]} />)
      
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('Restaurant ABC')).toBeInTheDocument()
    })

    it('should handle vendor names equal to original names', () => {
      const sameVendorTransaction: Transaction = {
        ...mockTransactions[0],
        vendor_name: 'Test Vendor',
        vendor_name_original: 'Test Vendor'
      }
      
      render(
        <TransactionList 
          {...defaultProps} 
          transactions={[sameVendorTransaction]}
          totalCount={1}
        />
      )
      
      expect(screen.getByText('Test Vendor')).toBeInTheDocument()
      // Should not show duplicate vendor name
      expect(screen.getAllByText('Test Vendor')).toHaveLength(1)
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TransactionList {...defaultProps} />)
      
      expect(screen.getByLabelText('Select all transactions')).toBeInTheDocument()
      expect(screen.getByLabelText('Select transaction from Restaurant ABC')).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(3)
    })

    it('should have proper table structure', () => {
      render(<TransactionList {...defaultProps} />)
      
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader')).toHaveLength(7)
      expect(screen.getAllByRole('row')).toHaveLength(4) // 1 header + 3 data rows
    })

    it('should have screen reader text for edit buttons', () => {
      render(<TransactionList {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      editButtons.forEach(button => {
        expect(button.querySelector('.sr-only')).toHaveTextContent('Edit transaction')
      })
    })
  })
})