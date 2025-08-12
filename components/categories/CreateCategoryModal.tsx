'use client'

import React, { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTransactionStore } from '@/store/transaction-store'
import { flattenCategoryTree, buildCategoryTree, getCategoryPath } from '@/types/categories'
import { ChevronRight } from 'lucide-react'
import type { Database } from '@/types/database'

interface CreateCategoryModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  parentCategory?: Database['public']['Tables']['categories']['Row'] | null
}

// Predefined color options for categories
const CATEGORY_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' },
]

export function CreateCategoryModal({ open, onClose, onSuccess, parentCategory }: CreateCategoryModalProps) {
  const { categories, createCategory } = useTransactionStore()
  
  const [name, setName] = useState('')
  const [color, setColor] = useState(CATEGORY_COLORS[0].value)
  const [parentId, setParentId] = useState<string>(parentCategory?.id || 'none')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Get available parent categories in hierarchical order
  const categoryTree = buildCategoryTree(categories)
  const flatCategories = flattenCategoryTree(categoryTree)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Category name is required')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      await createCategory(
        name.trim(), 
        color, 
        undefined, // icon - not implemented yet
        parentId === 'none' ? null : parentId
      )
      onSuccess?.()
      onClose()
      
      // Reset form
      setName('')
      setColor(CATEGORY_COLORS[0].value)
      setParentId('none')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create category')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleClose = () => {
    onClose()
    // Reset form when closing
    setName('')
    setColor(CATEGORY_COLORS[0].value)
    setParentId(parentCategory?.id || 'none')
    setError(null)
  }
  
  // Update parentId when parentCategory changes
  React.useEffect(() => {
    setParentId(parentCategory?.id || 'none')
  }, [parentCategory])
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {parentCategory ? 'Create Subcategory' : 'Create New Category'}
            </DialogTitle>
            <DialogDescription>
              {parentCategory ? (
                <div className="space-y-2">
                  <p>Add a subcategory under:</p>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    {getCategoryPath(parentCategory.id, categories).split(' > ').map((part, index, arr) => (
                      <span key={index} className="flex items-center gap-1">
                        {index > 0 && <ChevronRight className="h-3 w-3" />}
                        <span className={index === arr.length - 1 ? 'text-primary' : ''}>{part}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                'Add a custom category to organize your transactions.'
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Groceries, Entertainment"
                autoFocus
              />
            </div>
            
            {!parentCategory && (
              <div className="space-y-2">
                <Label htmlFor="parent">Parent Category</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger id="parent">
                    <SelectValue placeholder="Select parent category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top Level)</SelectItem>
                    {flatCategories.map(({ category, level }) => (
                      <SelectItem key={category.id} value={category.id}>
                        {'  '.repeat(level)}{category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORY_COLORS.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    className={`
                      h-10 rounded-md border-2 transition-all
                      ${color === colorOption.value 
                        ? 'border-primary shadow-md scale-110' 
                        : 'border-transparent'
                      }
                    `}
                    style={{ backgroundColor: colorOption.value }}
                    onClick={() => setColor(colorOption.value)}
                    aria-label={`Select ${colorOption.name} color`}
                  />
                ))}
              </div>
            </div>
            
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}