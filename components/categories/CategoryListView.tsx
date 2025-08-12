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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Tag, 
  Edit, 
  Trash2, 
  Plus,
  Lock,
  User,
  ChevronRight
} from 'lucide-react'
import { useTransactionStore } from '@/store/transaction-store'
import { type CategoryWithChildren, getCategoryPath, flattenCategoryTree } from '@/types/categories'
import type { Database } from '@/types/database'
import { cn } from '@/lib/utils'

type Category = Database['public']['Tables']['categories']['Row']

interface CategoryListViewProps {
  categories: CategoryWithChildren[]
  onEditCategory: (category: Category) => void
  onAddSubcategory: (parentCategory: Category) => void
  searchTerm?: string
  typeFilter?: 'all' | 'system' | 'custom'
  allCategories: Category[]
}

export function CategoryListView({ 
  categories, 
  onEditCategory,
  onAddSubcategory,
  searchTerm,
  typeFilter = 'all',
  allCategories
}: CategoryListViewProps) {
  const { deleteCategory } = useTransactionStore()
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Flatten and filter categories
  const flatCategories = flattenCategoryTree(categories)
  const filteredCategories = flatCategories.filter(({ category }) => {
    // Check type filter
    if (typeFilter !== 'all') {
      const matchesType = typeFilter === 'system' ? category.is_system : !category.is_system
      if (!matchesType) return false
    }
    
    // Check search term
    if (searchTerm) {
      const path = getCategoryPath(category.id, allCategories)
      return category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             path.toLowerCase().includes(searchTerm.toLowerCase())
    }
    
    return true
  })
  
  const handleDelete = async () => {
    if (!deletingCategory) return
    
    setIsDeleting(true)
    try {
      await deleteCategory(deletingCategory.id)
      setDeletingCategory(null)
    } catch (error) {
      console.error('Failed to delete category:', error)
    } finally {
      setIsDeleting(false)
    }
  }
  
  // Highlight search term
  const highlightText = (text: string) => {
    if (!searchTerm) return text
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    const parts = text.split(regex)
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 font-semibold">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    )
  }
  
  if (filteredCategories.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {searchTerm 
            ? `No categories found matching "${searchTerm}"`
            : typeFilter !== 'all'
            ? `No ${typeFilter} categories found`
            : 'No categories found'
          }
        </p>
      </div>
    )
  }
  
  return (
    <>
      <div className="border border-border/50 rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/50">
              <TableHead className="w-[40%] text-xs font-medium text-muted-foreground">Category</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Path</TableHead>
              <TableHead className="w-[100px] text-xs font-medium text-muted-foreground">Type</TableHead>
              <TableHead className="w-[100px] text-xs font-medium text-muted-foreground">Children</TableHead>
              <TableHead className="text-right w-[120px] text-xs font-medium text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.map(({ category, level }) => {
              const path = getCategoryPath(category.id, allCategories)
              const pathParts = path.split(' > ')
              const hasChildren = categories.some(c => c.parent_id === category.id)
              
              return (
                <TableRow key={category.id} className="group">
                  <TableCell>
                    <div 
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${level * 24}px` }}
                    >
                      <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                      
                      {/* Color indicator */}
                      {category.color && (
                        <div 
                          className="w-3 h-3 rounded-full ring-2 ring-background shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      
                      {/* Name */}
                      <span className={cn(
                        "font-medium",
                        category.is_system && "text-muted-foreground"
                      )}>
                        {highlightText(category.name)}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {pathParts.map((part, index) => (
                        <span key={index} className="flex items-center gap-1">
                          {index > 0 && <ChevronRight className="h-3 w-3" />}
                          <span>{highlightText(part)}</span>
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {category.is_system ? (
                      <Badge variant="secondary" className="gap-1 h-5 px-1.5">
                        <Lock className="h-3 w-3" />
                        <span className="text-xs">System</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 h-5 px-1.5 text-primary border-primary/30">
                        <User className="h-3 w-3" />
                        <span className="text-xs">Custom</span>
                      </Badge>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {hasChildren && (
                      <Badge variant="outline" className="h-5 px-1.5">
                        <span className="text-xs">
                          {categories.filter(c => c.parent_id === category.id).length}
                        </span>
                      </Badge>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {/* Add subcategory button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-primary/10"
                        onClick={() => onAddSubcategory(category)}
                        title="Add subcategory"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="sr-only">Add subcategory</span>
                      </Button>
                      
                      {/* Edit button - only for custom categories */}
                      {!category.is_system && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-accent/20"
                            onClick={() => onEditCategory(category)}
                            title="Edit category"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit category</span>
                          </Button>
                          
                          {/* Delete button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingCategory(category)}
                            title="Delete category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete category</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingCategory?.name}&quot;? This action cannot be undone.
              {deletingCategory && categories.some(c => c.parent_id === deletingCategory.id) && (
                <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm font-medium text-destructive">
                    Warning: This category has subcategories
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Deleting this category will also remove all its subcategories and reassign affected transactions.
                  </p>
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
    </>
  )
}