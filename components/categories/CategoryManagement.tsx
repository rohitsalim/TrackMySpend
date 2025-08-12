'use client'

import { useState } from 'react'
import { useTransactionStore } from '@/store/transaction-store'
import { EditCategoryModal } from './EditCategoryModal'
import { CategoryTree } from './CategoryTree'
import { CategoryFilters } from './CategoryFilters'
import { buildCategoryTree } from '@/types/categories'
import type { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']

interface CategoryManagementProps {
  onAddSubcategory: (parentCategory: Category) => void
}

export function CategoryManagement({ onAddSubcategory }: CategoryManagementProps) {
  const { categories } = useTransactionStore()
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  
  // Filter and view state
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'system' | 'custom'>('all')
  
  const categoryTree = buildCategoryTree(categories)
  
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
  }
  
  const handleCloseEditModal = () => {
    setEditingCategory(null)
  }
  
  
  return (
    <div className="space-y-6">
      {/* Filters and Statistics */}
      <CategoryFilters
        categories={categories}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
      />
      
      {/* Categories Display */}
      <div className="border-l border-border/30 pl-1">
        {categoryTree.length > 0 ? (
          <CategoryTree 
            categories={categoryTree}
            onEditCategory={handleEditCategory}
            onAddSubcategory={onAddSubcategory}
            searchTerm={searchTerm}
            typeFilter={typeFilter}
            allCategories={categories}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No categories found.</p>
            <p className="text-muted-foreground">Use the &quot;New Category&quot; button above to create your first category.</p>
          </div>
        )}
      </div>
      
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