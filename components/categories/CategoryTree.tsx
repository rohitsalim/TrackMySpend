'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Edit, Trash2, ChevronRight, ChevronDown, Folder, Tag } from 'lucide-react'
import { useTransactionStore } from '@/store/transaction-store'
import { type CategoryWithChildren } from '@/types/categories'
import type { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']

interface CategoryTreeProps {
  categories: CategoryWithChildren[]
  onEditCategory: (category: Category) => void
  level?: number
}

interface CategoryNodeProps {
  category: CategoryWithChildren
  onEditCategory: (category: Category) => void
  level: number
}

function CategoryNode({ category, onEditCategory, level }: CategoryNodeProps) {
  const { deleteCategory } = useTransactionStore()
  const [isExpanded, setIsExpanded] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const hasChildren = category.children.length > 0
  const canEdit = !category.is_system
  const indentClass = level > 0 ? `ml-${level * 6}` : ''
  
  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteCategory(category.id)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Failed to delete category:', error)
    } finally {
      setIsDeleting(false)
    }
  }
  
  return (
    <div>
      <div className={`flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 ${indentClass}`}>
        <div className="flex items-center space-x-3">
          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )
            ) : (
              <div className="h-3 w-3" />
            )}
          </Button>
          
          {/* Category Icon */}
          {hasChildren ? (
            <Folder className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Tag className="h-4 w-4 text-muted-foreground" />
          )}
          
          {/* Category Name & Color */}
          <div className="flex items-center space-x-2">
            {category.color && (
              <div 
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: category.color }}
              />
            )}
            <span className={`font-medium ${category.is_system ? 'text-muted-foreground' : ''}`}>
              {category.name}
            </span>
            {category.is_system && (
              <Badge variant="secondary" className="text-xs">
                System
              </Badge>
            )}
          </div>
        </div>
        
        {/* Actions */}
        {canEdit && (
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onEditCategory(category)}
            >
              <Edit className="h-3 w-3" />
              <span className="sr-only">Edit category</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-3 w-3" />
              <span className="sr-only">Delete category</span>
            </Button>
          </div>
        )}
      </div>
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="space-y-1">
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              onEditCategory={onEditCategory}
              level={level + 1}
            />
          ))}
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{category.name}&quot;? This action cannot be undone.
              {hasChildren && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <strong>Warning:</strong> This category has subcategories. Deleting it will also remove all subcategories.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function CategoryTree({ categories, onEditCategory, level = 0 }: CategoryTreeProps) {
  return (
    <div className="space-y-1">
      {categories.map((category) => (
        <div key={category.id} className="group">
          <CategoryNode
            category={category}
            onEditCategory={onEditCategory}
            level={level}
          />
        </div>
      ))}
    </div>
  )
}