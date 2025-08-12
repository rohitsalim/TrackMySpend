'use client'

import { useEffect, useState } from 'react'
import { CategoryManagement } from '@/components/categories/CategoryManagement'
import { CreateCategoryModal } from '@/components/categories/CreateCategoryModal'
import { useTransactionStore } from '@/store/transaction-store'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']

export default function CategoriesPage() {
  const { fetchCategories } = useTransactionStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [parentCategoryForNew, setParentCategoryForNew] = useState<Category | null>(null)
  
  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setParentCategoryForNew(null)
  }

  const handleAddSubcategory = (parentCategory: Category) => {
    setParentCategoryForNew(parentCategory)
    setShowCreateModal(true)
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">
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
      
      <CategoryManagement onAddSubcategory={handleAddSubcategory} />

      {/* Create Category Modal */}
      <CreateCategoryModal
        open={showCreateModal}
        onClose={handleCloseCreateModal}
        onSuccess={handleCloseCreateModal}
        parentCategory={parentCategoryForNew}
      />
    </div>
  )
}