'use client'

import { useState, useEffect } from 'react'
import { CategoryNode } from './CategoryNode'
import { type CategoryWithChildren } from '@/types/categories'
import type { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']

interface CategoryTreeProps {
  categories: CategoryWithChildren[]
  onEditCategory: (category: Category) => void
  onAddSubcategory: (parentCategory: Category) => void
  searchTerm?: string
  typeFilter?: 'all' | 'system' | 'custom'
  allCategories: Category[]
}

export function CategoryTree({ 
  categories, 
  onEditCategory,
  onAddSubcategory,
  searchTerm,
  typeFilter = 'all',
  allCategories
}: CategoryTreeProps) {
  // Track expanded state for each category
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  
  // Initialize with all categories expanded on first load
  useEffect(() => {
    const allIds = new Set<string>()
    const collectIds = (cats: CategoryWithChildren[]) => {
      cats.forEach(cat => {
        if (cat.children.length > 0) {
          allIds.add(cat.id)
          collectIds(cat.children)
        }
      })
    }
    collectIds(categories)
    setExpandedCategories(allIds)
  }, []) // Only run on mount
  
  // Expand all categories when searching
  useEffect(() => {
    if (searchTerm) {
      const allIds = new Set<string>()
      const collectIds = (cats: CategoryWithChildren[]) => {
        cats.forEach(cat => {
          if (cat.children.length > 0) {
            allIds.add(cat.id)
            collectIds(cat.children)
          }
        })
      }
      collectIds(categories)
      setExpandedCategories(allIds)
    }
  }, [searchTerm, categories])
  
  const handleToggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }
  
  // Filter categories based on search and type
  const filterCategories = (cats: CategoryWithChildren[]): CategoryWithChildren[] => {
    return cats.reduce<CategoryWithChildren[]>((acc, cat) => {
      // Check type filter
      if (typeFilter !== 'all') {
        const matchesType = typeFilter === 'system' ? cat.is_system : !cat.is_system
        if (!matchesType && (!cat.children || cat.children.length === 0)) {
          return acc
        }
      }
      
      // Check search term
      const matchesSearch = !searchTerm || 
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      // Recursively filter children
      const filteredChildren = filterCategories(cat.children)
      
      // Include category if it matches or has matching children
      if (matchesSearch || filteredChildren.length > 0) {
        acc.push({
          ...cat,
          children: filteredChildren
        })
      }
      
      return acc
    }, [])
  }
  
  const filteredCategories = filterCategories(categories)
  
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
    <div className="space-y-0.5 py-2">
      {filteredCategories.map((category, index) => (
        <CategoryNode
          key={category.id}
          category={category}
          onEditCategory={onEditCategory}
          onAddSubcategory={onAddSubcategory}
          level={0}
          isLast={index === filteredCategories.length - 1}
          isExpanded={expandedCategories.has(category.id)}
          onToggleExpand={handleToggleExpand}
          searchTerm={searchTerm}
          allCategories={allCategories}
          expandedCategories={expandedCategories}
        />
      ))}
    </div>
  )
}