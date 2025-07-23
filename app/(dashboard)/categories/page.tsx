'use client'

import { useEffect } from 'react'
import { CategoryManagement } from '@/components/categories/CategoryManagement'
import { useTransactionStore } from '@/store/transaction-store'

export default function CategoriesPage() {
  const { fetchCategories } = useTransactionStore()
  
  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])
  
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Manage Categories</h1>
        <p className="text-muted-foreground">
          Organize your expenses by creating and managing custom categories.
        </p>
      </div>
      
      <CategoryManagement />
    </div>
  )
}