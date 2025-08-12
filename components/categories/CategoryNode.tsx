'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
  ChevronRight, 
  ChevronDown, 
  FolderOpen,
  Folder, 
  Tag, 
  Edit, 
  Trash2, 
  Plus,
  Lock,
  User
} from 'lucide-react'
import { useTransactionStore } from '@/store/transaction-store'
import { type CategoryWithChildren, getCategoryPath } from '@/types/categories'
import { Badge } from '@/components/ui/badge'
import type { Database } from '@/types/database'
import { cn } from '@/lib/utils'

type Category = Database['public']['Tables']['categories']['Row']

interface CategoryNodeProps {
  category: CategoryWithChildren
  onEditCategory: (category: Category) => void
  onAddSubcategory: (parentCategory: Category) => void
  level: number
  isLast: boolean
  isExpanded: boolean
  onToggleExpand: (categoryId: string) => void
  parentPath?: string[]
  searchTerm?: string
  allCategories: Category[]
  expandedCategories?: Set<string>
}

export function CategoryNode({ 
  category, 
  onEditCategory, 
  onAddSubcategory,
  level, 
  isLast,
  isExpanded,
  onToggleExpand,
  parentPath = [],
  searchTerm,
  allCategories,
  expandedCategories
}: CategoryNodeProps) {
  const { deleteCategory } = useTransactionStore()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const hasChildren = category.children.length > 0
  const canEdit = !category.is_system
  const fullPath = [...parentPath, category.name]
  
  // Calculate indentation for current level
  const indentSize = hasChildren ? 32 : 40 // pixels per level - less for leaf nodes
  const connectorIndent = 32 // additional indentation for tree connectors
  
  
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
  
  return (
    <div className="relative">
      {/* Tree connector lines */}
      {level > 0 && (
        <>
          {/* Vertical line from parent continuing down (if not last child) */}
          {!isLast && (
            <div 
              className="absolute w-0.5 bg-gray-300 dark:bg-gray-600"
              style={{ 
                left: `${(level - 1) * indentSize + connectorIndent + 16}px`,
                top: '40px',
                bottom: '0px'
              }}
            />
          )}
          
          {/* Vertical line from parent to this node */}
          <div 
            className="absolute w-0.5 bg-gray-300 dark:bg-gray-600"
            style={{
              left: `${(level - 1) * indentSize + connectorIndent + 16}px`,
              top: '0px',
              height: '24px'
            }}
          />
          
          {/* Horizontal connector line to this node */}
          <div 
            className="absolute h-0.5 bg-gray-300 dark:bg-gray-600"
            style={{
              left: `${(level - 1) * indentSize + connectorIndent + 16}px`,
              top: '23px',
              width: '20px'
            }}
          />
          
          {/* Junction dot */}
          <div 
            className="absolute w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full"
            style={{
              left: `${(level - 1) * indentSize + connectorIndent + 15.5}px`,
              top: '22.5px'
            }}
          />
        </>
      )}
      
      {/* Category node */}
      <div 
        className={cn(
          "group flex items-center justify-between py-2 px-3 hover:bg-muted/50 transition-colors",
          "relative z-10"
        )}
        style={{
          marginLeft: `${level * indentSize + (level > 0 ? connectorIndent : 0)}px`
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Expand/Collapse Button - Reserve space only for root categories or categories with children */}
          {(hasChildren || level === 0) && (
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-background/50"
                  onClick={() => onToggleExpand(category.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          )}
          
          {/* Category Icon */}
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            )
          ) : (
            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          
          {/* Category Name & Info */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Color indicator */}
            {category.color && (
              <div 
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-background"
                style={{ backgroundColor: category.color }}
              />
            )}
            
            {/* Name */}
            <span className={cn(
              "font-medium text-sm shrink-0",
              category.is_system && "text-muted-foreground"
            )}>
              {highlightText(category.name)}
            </span>
            
            {/* Type badge - full badge like list view */}
            {category.is_system ? (
              <Badge variant="secondary" className="gap-1 h-5 px-1.5 shrink-0">
                <Lock className="h-3 w-3" />
                <span className="text-xs">System</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 h-5 px-1.5 text-primary border-primary/30 shrink-0">
                <User className="h-3 w-3" />
                <span className="text-xs">Custom</span>
              </Badge>
            )}
            
            {/* Path display */}
            {level > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                <span className="truncate">
                  {getCategoryPath(category.id, allCategories)}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Child count badge */}
          {hasChildren && (
            <Badge variant="outline" className="h-5 px-1.5 text-xs">
              {category.children.length} children
            </Badge>
          )}
          
          {/* Add subcategory button - available for all categories */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-muted"
            onClick={() => onAddSubcategory(category)}
            title="Add subcategory"
          >
            <Plus className="h-3 w-3" />
            <span className="sr-only">Add subcategory</span>
          </Button>
          
          {/* Edit button - only for custom categories */}
          {canEdit && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted"
                onClick={() => onEditCategory(category)}
                title="Edit category"
              >
                <Edit className="h-3 w-3" />
                <span className="sr-only">Edit category</span>
              </Button>
              
              {/* Delete button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-muted"
                onClick={() => setShowDeleteDialog(true)}
                title="Delete category"
              >
                <Trash2 className="h-3 w-3" />
                <span className="sr-only">Delete category</span>
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {category.children.map((child, index) => (
            <CategoryNode
              key={child.id}
              category={child}
              onEditCategory={onEditCategory}
              onAddSubcategory={onAddSubcategory}
              level={level + 1}
              isLast={index === category.children.length - 1}
              isExpanded={expandedCategories?.has(child.id) ?? true}
              onToggleExpand={onToggleExpand}
              parentPath={fullPath}
              searchTerm={searchTerm}
              allCategories={allCategories}
              expandedCategories={expandedCategories}
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
                <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm font-medium text-destructive">
                    Warning: This category has {category.children.length} subcategor{category.children.length === 1 ? 'y' : 'ies'}
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
    </div>
  )
}