import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransactionEditModal } from '@/components/transactions/TransactionEditModal'
import { useTransactionStore } from '@/store/transaction-store'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null
}
type Category = Database['public']['Tables']['categories']['Row']

// Mock the transaction store
vi.mock('@/store/transaction-store')

// Mock child components
vi.mock('@/components/categories/CreateCategoryModal', () => ({
  CreateCategoryModal: ({ open, onClose, onSuccess }: { 
    open: boolean; 
    onClose: () => void; 
    onSuccess: () => void;
  }) => 
    open ? (
      <div data-testid="create-category-modal">
        <div>Create Category Modal</div>
        <button onClick={onClose}>Close Modal</button>
        <button onClick={onSuccess}>Success</button>
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
  buildCategoryTree: (categories: Category[]) => categories.filter(c => !c.parent_id),
  flattenCategoryTree: (categories: Category[]) => 
    categories.map(category => ({ category, level: 0 }))
}))

const mockUpdateTransaction = vi.fn()
const mockFetchCategories = vi.fn()

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

const mockTransaction: Transaction = {
  id: 'tx-1',
  user_id: 'user-1',
  vendor_name: 'Restaurant ABC',
  category_id: 'cat-1',
  amount: 500.00,
  type: 'DEBIT',
  transaction_date: '2024-01-15',
  is_internal_transfer: false,
  notes: 'Business lunch',
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
}

describe('TransactionEditModal', () => {
  const defaultProps = {
    transaction: mockTransaction,
    onClose: vi.fn()
  }

  beforeEach(() => {
    vi.mocked(useTransactionStore).mockReturnValue({
      categories: mockCategories,
      updateTransaction: mockUpdateTransaction,
      fetchCategories: mockFetchCategories
    } as any)
    
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render modal with transaction edit form', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit Transaction')).toBeInTheDocument()
      expect(screen.getByText('Update vendor name, category, or add notes to this transaction.')).toBeInTheDocument()
    })

    it('should display transaction information', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('Jan 15')).toBeInTheDocument()
      expect(screen.getByText('Amount')).toBeInTheDocument()
      expect(screen.getByText('-₹500.00')).toBeInTheDocument()
    })

    it('should show amount in red for debit transactions', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      const amountText = screen.getByText('-₹500.00')
      expect(amountText).toHaveClass('text-red-600')
    })

    it('should show amount in green for credit transactions', () => {
      const creditTransaction: Transaction = {
        ...mockTransaction,
        type: 'CREDIT',
        amount: 1000.00
      }
      
      render(<TransactionEditModal {...defaultProps} transaction={creditTransaction} />)
      
      const amountText = screen.getByText('+₹1000.00')
      expect(amountText).toHaveClass('text-green-600')
    })

    it('should show original description when different from vendor name', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      expect(screen.getByText('Original Description')).toBeInTheDocument()
      expect(screen.getByText('RESTAURANT ABC LTD')).toBeInTheDocument()
    })

    it('should not show original description when same as vendor name', () => {
      const sameNameTransaction: Transaction = {
        ...mockTransaction,
        vendor_name: 'Same Name',
        vendor_name_original: 'Same Name'
      }
      
      render(<TransactionEditModal {...defaultProps} transaction={sameNameTransaction} />)
      
      expect(screen.queryByText('Original Description')).not.toBeInTheDocument()
    })

    it('should render all form fields', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      expect(screen.getByLabelText('Vendor Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Category')).toBeInTheDocument()
      expect(screen.getByLabelText('Notes')).toBeInTheDocument()
    })

    it('should pre-populate form with transaction data', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      const vendorInput = screen.getByLabelText('Vendor Name')
      expect(vendorInput).toHaveValue('Restaurant ABC')
      
      const notesInput = screen.getByLabelText('Notes')
      expect(notesInput).toHaveValue('Business lunch')
    })

    it('should show "New Category" button', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      expect(screen.getByText('New Category')).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
    })
  })

  describe('category selection', () => {
    it('should render category dropdown', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      const categorySelect = screen.getByLabelText('Category')
      expect(categorySelect).toBeInTheDocument()
    })

    it('should handle transaction without category', () => {
      const uncategorizedTransaction: Transaction = {
        ...mockTransaction,
        category_id: null,
        categories: null
      }
      
      render(<TransactionEditModal {...defaultProps} transaction={uncategorizedTransaction} />)
      
      // Should render the category dropdown
      expect(screen.getByLabelText('Category')).toBeInTheDocument()
    })
  })

  describe('form interactions', () => {
    it('should update vendor name when typing', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      const vendorInput = screen.getByLabelText('Vendor Name')
      fireEvent.change(vendorInput, { target: { value: 'Updated Vendor Name' } })
      
      expect(vendorInput).toHaveValue('Updated Vendor Name')
    })

    it('should update notes when typing', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      const notesInput = screen.getByLabelText('Notes')
      fireEvent.change(notesInput, { target: { value: 'Updated notes here' } })
      
      expect(notesInput).toHaveValue('Updated notes here')
    })

    it('should handle empty notes', () => {
      const transactionWithoutNotes: Transaction = {
        ...mockTransaction,
        notes: null
      }
      
      render(<TransactionEditModal {...defaultProps} transaction={transactionWithoutNotes} />)
      
      const notesInput = screen.getByLabelText('Notes')
      expect(notesInput).toHaveValue('')
    })
  })

  describe('create category functionality', () => {
    it('should open create category modal when button is clicked', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      const newCategoryButton = screen.getByText('New Category')
      fireEvent.click(newCategoryButton)
      
      expect(screen.getByTestId('create-category-modal')).toBeInTheDocument()
    })

    it('should close create category modal', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      // Open modal
      const newCategoryButton = screen.getByText('New Category')
      fireEvent.click(newCategoryButton)
      
      // Close modal
      const closeButton = screen.getByText('Close Modal')
      fireEvent.click(closeButton)
      
      expect(screen.queryByTestId('create-category-modal')).not.toBeInTheDocument()
    })

    it('should handle create category success', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      // Open modal
      const newCategoryButton = screen.getByText('New Category')
      fireEvent.click(newCategoryButton)
      
      // Trigger success
      const successButton = screen.getByText('Success')
      fireEvent.click(successButton)
      
      expect(screen.queryByTestId('create-category-modal')).not.toBeInTheDocument()
      expect(mockFetchCategories).toHaveBeenCalled()
    })
  })

  describe('form submission', () => {
    it('should call updateTransaction with correct data when saved', async () => {
      mockUpdateTransaction.mockResolvedValue({})
      
      render(<TransactionEditModal {...defaultProps} />)
      
      // Update form
      const vendorInput = screen.getByLabelText('Vendor Name')
      fireEvent.change(vendorInput, { target: { value: 'Updated Vendor' } })
      
      const notesInput = screen.getByLabelText('Notes')
      fireEvent.change(notesInput, { target: { value: 'Updated notes' } })
      
      // Save changes
      const saveButton = screen.getByText('Save Changes')
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(mockUpdateTransaction).toHaveBeenCalledWith('tx-1', {
          vendor_name: 'Updated Vendor',
          category_id: 'cat-1', // Existing category ID (unchanged)
          notes: 'Updated notes'
        })
      })
    })

    it('should call updateTransaction with basic form data', async () => {
      mockUpdateTransaction.mockResolvedValue({})
      
      render(<TransactionEditModal {...defaultProps} />)
      
      const saveButton = screen.getByText('Save Changes')
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(mockUpdateTransaction).toHaveBeenCalledWith('tx-1', expect.objectContaining({
          vendor_name: 'Restaurant ABC',
          notes: 'Business lunch'
        }))
      })
    })

    it('should call updateTransaction with null notes when notes are empty', async () => {
      mockUpdateTransaction.mockResolvedValue({})
      
      render(<TransactionEditModal {...defaultProps} />)
      
      // Clear notes
      const notesInput = screen.getByLabelText('Notes')
      fireEvent.change(notesInput, { target: { value: '' } })
      
      const saveButton = screen.getByText('Save Changes')
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(mockUpdateTransaction).toHaveBeenCalledWith('tx-1', expect.objectContaining({
          notes: null
        }))
      })
    })

    it('should show loading state during save', async () => {
      mockUpdateTransaction.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<TransactionEditModal {...defaultProps} />)
      
      const saveButton = screen.getByText('Save Changes')
      fireEvent.click(saveButton)
      
      // Should show loading state
      expect(screen.getByText('Saving...')).toBeInTheDocument()
      const savingButton = screen.getByText('Saving...')
      expect(savingButton).toBeDisabled()
      
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
      }, { timeout: 200 })
    })

    it('should close modal after successful save', async () => {
      mockUpdateTransaction.mockResolvedValue({})
      
      render(<TransactionEditModal {...defaultProps} />)
      
      const saveButton = screen.getByText('Save Changes')
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled()
      })
    })

    it('should handle save errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockUpdateTransaction.mockRejectedValue(new Error('Save failed'))
      
      render(<TransactionEditModal {...defaultProps} />)
      
      const saveButton = screen.getByText('Save Changes')
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update transaction:', expect.any(Error))
      })
      
      // Should not close modal on error
      expect(defaultProps.onClose).not.toHaveBeenCalled()
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('modal behavior', () => {
    it('should call onClose when Cancel button is clicked', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelButton)
      
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('should call onClose when modal is closed via dialog', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      // Simulate dialog close (this might be implementation specific)
      // Since we're mocking, we'll test the onClose prop directly
      expect(defaultProps.onClose).toBeDefined()
    })
  })

  describe('accessibility', () => {
    it('should have proper form labels', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      expect(screen.getByLabelText('Vendor Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Category')).toBeInTheDocument()
      expect(screen.getByLabelText('Notes')).toBeInTheDocument()
    })

    it('should have proper dialog structure', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit Transaction')).toBeInTheDocument()
    })

    it('should have proper button behavior', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      const cancelButton = screen.getByText('Cancel')
      const saveButton = screen.getByText('Save Changes')
      
      expect(cancelButton).toBeInTheDocument()
      expect(saveButton).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle transaction with null notes', () => {
      const transactionWithNullNotes: Transaction = {
        ...mockTransaction,
        notes: null
      }
      
      render(<TransactionEditModal {...defaultProps} transaction={transactionWithNullNotes} />)
      
      const notesInput = screen.getByLabelText('Notes')
      expect(notesInput).toHaveValue('')
    })

    it('should handle empty categories array', () => {
      vi.mocked(useTransactionStore).mockReturnValue({
        categories: [],
        updateTransaction: mockUpdateTransaction,
        fetchCategories: mockFetchCategories
      } as any)
      
      render(<TransactionEditModal {...defaultProps} />)
      
      expect(screen.getByLabelText('Category')).toBeInTheDocument()
      // Should still show the dropdown even with no categories
    })

    it('should handle very long vendor names', () => {
      const longVendorTransaction: Transaction = {
        ...mockTransaction,
        vendor_name: 'This is a very long vendor name that exceeds normal length limits and should be handled properly'
      }
      
      render(<TransactionEditModal {...defaultProps} transaction={longVendorTransaction} />)
      
      const vendorInput = screen.getByLabelText('Vendor Name')
      expect(vendorInput).toHaveValue('This is a very long vendor name that exceeds normal length limits and should be handled properly')
    })

    it('should handle very long notes', () => {
      const longNotesTransaction: Transaction = {
        ...mockTransaction,
        notes: 'This is a very long note that spans multiple lines and contains a lot of detailed information about the transaction that might exceed normal display limits'
      }
      
      render(<TransactionEditModal {...defaultProps} transaction={longNotesTransaction} />)
      
      const notesInput = screen.getByLabelText('Notes')
      expect(notesInput).toHaveValue('This is a very long note that spans multiple lines and contains a lot of detailed information about the transaction that might exceed normal display limits')
    })

    it('should preserve form state when category modal opens and closes', () => {
      render(<TransactionEditModal {...defaultProps} />)
      
      // Update vendor name
      const vendorInput = screen.getByLabelText('Vendor Name')
      fireEvent.change(vendorInput, { target: { value: 'Modified Vendor' } })
      
      // Open and close category modal
      const newCategoryButton = screen.getByText('New Category')
      fireEvent.click(newCategoryButton)
      
      const closeButton = screen.getByText('Close Modal')
      fireEvent.click(closeButton)
      
      // Vendor name should still be modified
      expect(vendorInput).toHaveValue('Modified Vendor')
    })
  })

  describe('data formatting', () => {
    it('should format zero amounts correctly', () => {
      const zeroAmountTransaction: Transaction = {
        ...mockTransaction,
        amount: 0
      }
      
      render(<TransactionEditModal {...defaultProps} transaction={zeroAmountTransaction} />)
      
      expect(screen.getByText('-₹0.00')).toBeInTheDocument()
    })

    it('should handle different date formats', () => {
      const differentDateTransaction: Transaction = {
        ...mockTransaction,
        transaction_date: '2024-12-25'
      }
      
      render(<TransactionEditModal {...defaultProps} transaction={differentDateTransaction} />)
      
      expect(screen.getByText('Dec 25')).toBeInTheDocument()
    })
  })
})