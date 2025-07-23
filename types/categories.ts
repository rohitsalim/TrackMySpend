import type { Database } from './database'

export type Category = Database['public']['Tables']['categories']['Row']

export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[]
}

// Helper function to build category tree from flat list
export function buildCategoryTree(categories: Category[]): CategoryWithChildren[] {
  const categoryMap = new Map<string, CategoryWithChildren>()
  const rootCategories: CategoryWithChildren[] = []
  
  // First pass: create all category nodes
  categories.forEach(category => {
    categoryMap.set(category.id, {
      ...category,
      children: []
    })
  })
  
  // Second pass: build the tree structure
  categories.forEach(category => {
    const categoryNode = categoryMap.get(category.id)!
    
    if (category.parent_id && categoryMap.has(category.parent_id)) {
      const parent = categoryMap.get(category.parent_id)!
      parent.children.push(categoryNode)
    } else {
      rootCategories.push(categoryNode)
    }
  })
  
  // Sort categories alphabetically at each level
  const sortCategories = (cats: CategoryWithChildren[]) => {
    cats.sort((a, b) => a.name.localeCompare(b.name))
    cats.forEach(cat => sortCategories(cat.children))
  }
  
  sortCategories(rootCategories)
  
  return rootCategories
}

// Helper function to get full category path
export function getCategoryPath(categoryId: string, categories: Category[]): string {
  const category = categories.find(c => c.id === categoryId)
  if (!category) return ''
  
  const path: string[] = [category.name]
  let currentCategory = category
  
  while (currentCategory.parent_id) {
    const parent = categories.find(c => c.id === currentCategory.parent_id)
    if (!parent) break
    path.unshift(parent.name)
    currentCategory = parent
  }
  
  return path.join(' > ')
}

// Helper function to flatten category tree for dropdown display
export function flattenCategoryTree(
  categories: CategoryWithChildren[], 
  level = 0
): { category: Category; level: number }[] {
  const result: { category: Category; level: number }[] = []
  
  categories.forEach(category => {
    result.push({ 
      category: {
        id: category.id,
        name: category.name,
        parent_id: category.parent_id,
        icon: category.icon,
        color: category.color,
        is_system: category.is_system,
        user_id: category.user_id,
        created_at: category.created_at
      }, 
      level 
    })
    
    if (category.children.length > 0) {
      result.push(...flattenCategoryTree(category.children, level + 1))
    }
  })
  
  return result
}