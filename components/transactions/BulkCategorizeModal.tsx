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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { useTransactionStore } from '@/store/transaction-store'
import { CreateCategoryModal } from '@/components/categories/CreateCategoryModal'
import { flattenCategoryTree, buildCategoryTree } from '@/types/categories'

interface BulkCategorizeModalProps {
  transactionIds: string[]
  onClose: () => void
  onSuccess?: () => void
}

export function BulkCategorizeModal({ 
  transactionIds, 
  onClose, 
  onSuccess 
}: BulkCategorizeModalProps) {
  const { categories, bulkCategorize, fetchCategories } = useTransactionStore()
  const [categoryId, setCategoryId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  
  // Get hierarchical categories for dropdown
  const categoryTree = buildCategoryTree(categories)
  const flatCategories = flattenCategoryTree(categoryTree)
  
  const handleCategorize = async () => {
    if (!categoryId) return
    
    setIsLoading(true)
    try {
      await bulkCategorize(transactionIds, categoryId)
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Failed to bulk categorize:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Bulk Categorize Transactions</DialogTitle>
            <DialogDescription>
              Select a category to apply to {transactionIds.length} selected transaction{transactionIds.length > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="category">Category</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateCategory(true)}
                className="h-auto p-1 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                New Category
              </Button>
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {flatCategories.map(({ category, level }) => (
                  <SelectItem key={category.id} value={category.id}>
                    {'  '.repeat(level)}{category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCategorize} 
            disabled={!categoryId || isLoading}
          >
            {isLoading ? 'Categorizing...' : 'Apply Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    {/* Create Category Modal */}
    <CreateCategoryModal
      open={showCreateCategory}
      onClose={() => setShowCreateCategory(false)}
      onSuccess={() => {
        setShowCreateCategory(false)
        fetchCategories() // Refresh categories after creation
      }}
    />
    </>
  )
}