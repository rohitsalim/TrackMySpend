import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransactionList } from '@/components/transactions/TransactionList'
import { useTransactionStore } from '@/store/transaction-store'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null
}
type Category = Database['public']['Tables']['categories']['Row']

// Mock the transaction store
vi.mock('@/store/transaction-store')

// Mock child components
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

vi.mock('@/components/transactions/BulkVendorResolveModal', () => ({
  BulkVendorResolveModal: ({ transactions, open, onClose }: { 
    transactions: any[]; 
    open: boolean;
    onClose: () => void; 
  }) => 
    open ? (
      <div data-testid="bulk-vendor-resolve-modal">
        <div>Bulk Vendor Resolve: {transactions.length} transactions</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
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
  },
  buildCategoryTree: (categories: Category[]) => categories.filter(c => !c.parent_id),
  flattenCategoryTree: (categories: Category[]) => 
    categories.map(category => ({ category, level: 0 }))
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

const mockUpdateTransaction = vi.fn()

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
    vi.mocked(useTransactionStore).mockReturnValue({
      updateTransaction: mockUpdateTransaction
    } as any)
    
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
    it('should disable delete button', () => {
      render(<TransactionList {...defaultProps} />)
      
      const checkbox = screen.getByLabelText('Select transaction from Restaurant ABC')
      fireEvent.click(checkbox)
      
      const deleteButton = screen.getByText('Delete')
      expect(deleteButton).toBeDisabled()
    })
    
  })

  describe.skip('in-place editing', () => {
    it('should enter edit mode when edit button is clicked', () => {
      render(<TransactionList {...defaultProps} />)
      
      // First confirm normal state exists
      expect(screen.getByText('Restaurant ABC')).toBeInTheDocument()
      
      const editButtons = screen.getAllByRole('button', { name: /edit transaction/i })
      expect(editButtons).toHaveLength(3)
      
      // Click the first edit button
      fireEvent.click(editButtons[0])
      
      // Should show save and cancel buttons
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel editing/i })).toBeInTheDocument()
      
      // Should show input field for vendor name
      const inputs = screen.getAllByRole('textbox')
      const vendorInput = inputs.find(input => (input as HTMLInputElement).value === 'Restaurant ABC')
      expect(vendorInput).toBeInTheDocument()
      expect(vendorInput?.tagName).toBe('INPUT')
    })

    it('should show vendor input and category dropdown in edit mode', () => {
      render(<TransactionList {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit transaction/i })
      fireEvent.click(editButtons[0])
      
      // Check vendor input
      const vendorInput = screen.getByDisplayValue('Restaurant ABC')
      expect(vendorInput).toBeInTheDocument()
      expect(vendorInput.tagName).toBe('INPUT')
      
      // Check category dropdown
      expect(screen.getByText('Food & Dining')).toBeInTheDocument()
    })

    it('should show original vendor name below input when different', () => {
      render(<TransactionList {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit transaction/i })
      fireEvent.click(editButtons[0])
      
      // Original vendor name should still be visible
      expect(screen.getByText('RESTAURANT ABC LTD')).toBeInTheDocument()
    })

    it('should update vendor name when typing', () => {
      render(<TransactionList {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit transaction/i })
      fireEvent.click(editButtons[0])
      
      const vendorInput = screen.getByDisplayValue('Restaurant ABC')
      fireEvent.change(vendorInput, { target: { value: 'Updated Restaurant Name' } })
      
      expect(vendorInput).toHaveValue('Updated Restaurant Name')
    })

    it('should save changes when save button is clicked', async () => {
      mockUpdateTransaction.mockResolvedValue({})
      
      render(<TransactionList {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit transaction/i })
      fireEvent.click(editButtons[0])
      
      // Change vendor name
      const vendorInput = screen.getByDisplayValue('Restaurant ABC')
      fireEvent.change(vendorInput, { target: { value: 'Updated Restaurant' } })
      
      // Save changes
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(mockUpdateTransaction).toHaveBeenCalledWith('tx-1', {
          vendor_name: 'Updated Restaurant',
          category_id: 'cat-1'
        })
      })
      
      // Should exit edit mode
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Updated Restaurant')).not.toBeInTheDocument()
      })
    })

    it('should save changes when Enter key is pressed', async () => {
      mockUpdateTransaction.mockResolvedValue({})
      
      render(<TransactionList {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit transaction/i })
      fireEvent.click(editButtons[0])
      
      const vendorInput = screen.getByDisplayValue('Restaurant ABC')
      fireEvent.change(vendorInput, { target: { value: 'Updated Restaurant' } })
      
      // Press Enter
      fireEvent.keyDown(vendorInput, { key: 'Enter' })
      
      await waitFor(() => {
        expect(mockUpdateTransaction).toHaveBeenCalledWith('tx-1', {
          vendor_name: 'Updated Restaurant',
          category_id: 'cat-1'
        })
      })
    })

    it('should cancel editing when cancel button is clicked', () => {
      render(<TransactionList {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit transaction/i })
      fireEvent.click(editButtons[0])
      
      // Make changes
      const vendorInput = screen.getByDisplayValue('Restaurant ABC')
      fireEvent.change(vendorInput, { target: { value: 'Changed Name' } })
      
      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel editing/i })
      fireEvent.click(cancelButton)
      
      // Should exit edit mode without saving
      expect(screen.queryByDisplayValue('Changed Name')).not.toBeInTheDocument()
      expect(screen.getByText('Restaurant ABC')).toBeInTheDocument()
      expect(mockUpdateTransaction).not.toHaveBeenCalled()
    })

    it('should cancel editing when Escape key is pressed', () => {
      render(<TransactionList {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit transaction/i })
      fireEvent.click(editButtons[0])
      
      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' })
      
      // Should exit edit mode
      expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
      expect(screen.getByText('Restaurant ABC')).toBeInTheDocument()
    })

    it('should handle category change in edit mode', async () => {
      mockUpdateTransaction.mockResolvedValue({})
      
      render(<TransactionList {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit transaction/i })
      fireEvent.click(editButtons[0])
      
      // Open category dropdown and select a different category
      const categorySelect = screen.getByRole('combobox')
      fireEvent.click(categorySelect)
      
      // Select Transportation category
      const transportationOption = screen.getByText('Transportation')
      fireEvent.click(transportationOption)
      
      // Save
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(mockUpdateTransaction).toHaveBeenCalledWith('tx-1', {
          vendor_name: 'Restaurant ABC',
          category_id: 'cat-2'
        })
      })
    })

    it('should handle uncategorized selection', async () => {
      mockUpdateTransaction.mockResolvedValue({})
      
      render(<TransactionList {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit transaction/i })
      fireEvent.click(editButtons[0])
      
      // Open category dropdown and select uncategorized
      const categorySelect = screen.getByRole('combobox')
      fireEvent.click(categorySelect)
      
      const uncategorizedOption = screen.getByText('Uncategorized')
      fireEvent.click(uncategorizedOption)
      
      // Save
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(mockUpdateTransaction).toHaveBeenCalledWith('tx-1', {
          vendor_name: 'Restaurant ABC',
          category_id: null
        })
      })
    })

    it('should only allow editing one transaction at a time', () => {
      render(<TransactionList {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit transaction/i })
      
      // Start editing first transaction
      fireEvent.click(editButtons[0])
      expect(screen.getByDisplayValue('Restaurant ABC')).toBeInTheDocument()
      
      // Try to edit second transaction
      fireEvent.click(editButtons[1])
      
      // First transaction should exit edit mode
      expect(screen.queryByDisplayValue('Restaurant ABC')).not.toBeInTheDocument()
      // Second transaction should enter edit mode
      expect(screen.getByDisplayValue('Salary Payment')).toBeInTheDocument()
    })

    it('should disable edit buttons during save', async () => {
      mockUpdateTransaction.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<TransactionList {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit transaction/i })
      fireEvent.click(editButtons[0])
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)
      
      // Buttons should be disabled during save
      expect(saveButton).toBeDisabled()
      expect(screen.getByRole('button', { name: /cancel editing/i })).toBeDisabled()
      
      await waitFor(() => {
        expect(mockUpdateTransaction).toHaveBeenCalled()
      }, { timeout: 200 })
    })

    it('should handle save errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockUpdateTransaction.mockRejectedValue(new Error('Save failed'))
      
      render(<TransactionList {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit transaction/i })
      fireEvent.click(editButtons[0])
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update transaction:', expect.any(Error))
      })
      
      // Should still be in edit mode after error
      expect(screen.getByDisplayValue('Restaurant ABC')).toBeInTheDocument()
      
      consoleErrorSpy.mockRestore()
    })

    it('should call vendor mapping API when vendor name is changed', async () => {
      mockUpdateTransaction.mockResolvedValue({})
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true })
      })
      
      render(<TransactionList {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: /edit transaction/i })
      fireEvent.click(editButtons[0])
      
      // Change vendor name
      const vendorInput = screen.getByDisplayValue('Restaurant ABC')
      fireEvent.change(vendorInput, { target: { value: 'New Restaurant Name' } })
      
      // Save
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/vendors/mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            original_text: 'RESTAURANT ABC LTD',
            mapped_name: 'New Restaurant Name',
            confidence: 0.95,
            source: 'user'
          })
        })
      })
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
      expect(screen.getAllByRole('columnheader')).toHaveLength(9)
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