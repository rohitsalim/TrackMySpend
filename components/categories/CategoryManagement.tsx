'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { useTransactionStore } from '@/store/transaction-store'
import { CreateCategoryModal } from './CreateCategoryModal'
import { EditCategoryModal } from './EditCategoryModal'
import { CategoryTree } from './CategoryTree'
import { buildCategoryTree } from '@/types/categories'
import type { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']

export function CategoryManagement() {
  const { categories } = useTransactionStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  
  const categoryTree = buildCategoryTree(categories)
  
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
  }
  
  const handleCloseEditModal = () => {
    setEditingCategory(null)
  }
  
  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground">
            {categories.length} total categories
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Category
        </Button>
      </div>
      
      {/* Categories List */}
      <Card className="p-6">
        {categoryTree.length > 0 ? (
          <CategoryTree 
            categories={categoryTree}
            onEditCategory={handleEditCategory}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No categories found.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first category
            </Button>
          </div>
        )}
      </Card>
      
      {/* Create Category Modal */}
      <CreateCategoryModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => setShowCreateModal(false)}
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