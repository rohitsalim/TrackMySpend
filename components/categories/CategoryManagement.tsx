'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useTransactionStore } from '@/store/transaction-store'
import { CreateCategoryModal } from './CreateCategoryModal'
import { EditCategoryModal } from './EditCategoryModal'
import { CategoryTree } from './CategoryTree'
import { CategoryListView } from './CategoryListView'
import { CategoryFilters } from './CategoryFilters'
import { buildCategoryTree } from '@/types/categories'
import type { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']

export function CategoryManagement() {
  const { categories } = useTransactionStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [parentCategoryForNew, setParentCategoryForNew] = useState<Category | null>(null)
  
  // Filter and view state
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'system' | 'custom'>('all')
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree')
  
  const categoryTree = buildCategoryTree(categories)
  
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
  }
  
  const handleCloseEditModal = () => {
    setEditingCategory(null)
  }
  
  const handleAddSubcategory = (parentCategory: Category) => {
    setParentCategoryForNew(parentCategory)
    setShowCreateModal(true)
  }
  
  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setParentCategoryForNew(null)
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Categories</h2>
          <p className="text-sm text-muted-foreground">
            Organize your expenses with custom categories and subcategories
          </p>
        </div>
        <Button 
          onClick={() => {
            setParentCategoryForNew(null)
            setShowCreateModal(true)
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Category
        </Button>
      </div>
      
      {/* Filters and Statistics */}
      <CategoryFilters
        categories={categories}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      {/* Categories Display */}
      <div className="border-l border-border/30 pl-1">
        {categoryTree.length > 0 ? (
          viewMode === 'tree' ? (
            <CategoryTree 
              categories={categoryTree}
              onEditCategory={handleEditCategory}
              onAddSubcategory={handleAddSubcategory}
              searchTerm={searchTerm}
              typeFilter={typeFilter}
              allCategories={categories}
            />
          ) : (
            <CategoryListView
              categories={categoryTree}
              onEditCategory={handleEditCategory}
              onAddSubcategory={handleAddSubcategory}
              searchTerm={searchTerm}
              typeFilter={typeFilter}
              allCategories={categories}
            />
          )
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No categories found.</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setParentCategoryForNew(null)
                setShowCreateModal(true)
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create your first category
            </Button>
          </div>
        )}
      </div>
      
      {/* Create Category Modal */}
      <CreateCategoryModal
        open={showCreateModal}
        onClose={handleCloseCreateModal}
        onSuccess={handleCloseCreateModal}
        parentCategory={parentCategoryForNew}
      />
      
      {/* Edit Category Modal */}
      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          onClose={handleCloseEditModal}
          onSuccess={handleCloseEditModal}
        />
      )}
    </div>
  )
}