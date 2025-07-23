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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTransactionStore } from '@/store/transaction-store'
import { flattenCategoryTree, buildCategoryTree } from '@/types/categories'
import type { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']

interface EditCategoryModalProps {
  category: Category
  onClose: () => void
  onSuccess?: () => void
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

export function EditCategoryModal({ category, onClose, onSuccess }: EditCategoryModalProps) {
  const { categories, updateCategory } = useTransactionStore()
  
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color || CATEGORY_COLORS[0].value)
  const [parentId, setParentId] = useState(category.parent_id || 'none')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Get available parent categories (excluding self and descendants)
  const getAvailableParents = () => {
    const categoryTree = buildCategoryTree(categories)
    const flatCategories = flattenCategoryTree(categoryTree)
    
    // Function to check if a category is a descendant of the current category
    const isDescendant = (checkId: string, rootId: string): boolean => {
      const queue = [rootId]
      const visited = new Set<string>()
      
      while (queue.length > 0) {
        const currentId = queue.shift()!
        if (visited.has(currentId)) continue
        visited.add(currentId)
        
        if (currentId === checkId) return true
        
        const children = categories.filter(c => c.parent_id === currentId)
        queue.push(...children.map(c => c.id))
      }
      
      return false
    }
    
    return flatCategories.filter(({ category: cat }) => 
      cat.id !== category.id && // Not self
      !isDescendant(cat.id, category.id) // Not a descendant
    )
  }
  
  const availableParents = getAvailableParents()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Category name is required')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      await updateCategory(category.id, {
        name: name.trim(),
        color,
        parent_id: parentId === 'none' ? null : parentId,
      })
      onSuccess?.()
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update category')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleClose = () => {
    onClose()
    setError(null)
  }
  
  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category details.
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
            
            <div className="space-y-2">
              <Label htmlFor="parent">Parent Category</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger id="parent">
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {availableParents.map(({ category: cat, level }) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {'  '.repeat(level)}{cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
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
              {isLoading ? 'Updating...' : 'Update Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}