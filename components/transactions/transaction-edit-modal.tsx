'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTransactionStore } from '@/store/transaction-store'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null
}

interface TransactionEditModalProps {
  transaction: Transaction
  onClose: () => void
}

export function TransactionEditModal({ transaction, onClose }: TransactionEditModalProps) {
  const { categories, updateTransaction } = useTransactionStore()
  
  const [vendorName, setVendorName] = useState(transaction.vendor_name)
  const [categoryId, setCategoryId] = useState(transaction.category_id || '')
  const [notes, setNotes] = useState(transaction.notes || '')
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSave = async () => {
    setIsLoading(true)
    
    try {
      await updateTransaction(transaction.id, {
        vendor_name: vendorName,
        category_id: categoryId || null,
        notes: notes || null,
      })
      onClose()
    } catch (error) {
      console.error('Failed to update transaction:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update vendor name, category, or add notes to this transaction.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Transaction Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Date</Label>
              <p className="font-medium">{formatDate(transaction.transaction_date)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Amount</Label>
              <p className={`font-medium ${
                transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.type === 'CREDIT' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </p>
            </div>
          </div>
          
          {/* Original Description */}
          {transaction.vendor_name_original !== transaction.vendor_name && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Original Description</Label>
              <p className="text-sm bg-muted p-2 rounded">{transaction.vendor_name_original}</p>
            </div>
          )}
          
          {/* Vendor Name */}
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor Name</Label>
            <Input
              id="vendor"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Enter vendor name"
            />
          </div>
          
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}