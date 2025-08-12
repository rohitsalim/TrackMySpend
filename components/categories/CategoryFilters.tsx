'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Filter, 
  X, 
  List,
  FolderTree,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']

interface CategoryFiltersProps {
  categories: Category[]
  searchTerm: string
  onSearchChange: (value: string) => void
  typeFilter: 'all' | 'system' | 'custom'
  onTypeFilterChange: (value: 'all' | 'system' | 'custom') => void
  viewMode: 'tree' | 'list'
  onViewModeChange: (value: 'tree' | 'list') => void
}

export function CategoryFilters({
  categories,
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  viewMode,
  onViewModeChange
}: CategoryFiltersProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  
  // Calculate statistics
  const stats = {
    total: categories.length,
    system: categories.filter(c => c.is_system).length,
    custom: categories.filter(c => !c.is_system).length
  }
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearchTerm)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [localSearchTerm, onSearchChange])
  
  const handleClearSearch = () => {
    setLocalSearchTerm('')
    onSearchChange('')
  }
  
  const hasActiveFilters = searchTerm || typeFilter !== 'all'
  
  return (
    <div className="space-y-4">
      {/* Statistics Bar */}
      <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Category Statistics:</span>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <span className="font-semibold">{stats.total}</span>
          <span className="text-muted-foreground">Total</span>
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <span className="font-semibold">{stats.system}</span>
          <span className="text-muted-foreground">System</span>
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-primary border-primary/30">
          <span className="font-semibold">{stats.custom}</span>
          <span className="text-muted-foreground">Custom</span>
        </Badge>
      </div>
      
      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="pl-9 pr-9"
          />
          {localSearchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={handleClearSearch}
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>
        
        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="system">System Only</SelectItem>
            <SelectItem value="custom">Custom Only</SelectItem>
          </SelectContent>
        </Select>
        
        {/* View Mode Toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <Button
            variant={viewMode === 'tree' ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              "gap-2 px-3",
              viewMode === 'tree' && "shadow-sm"
            )}
            onClick={() => onViewModeChange('tree')}
          >
            <FolderTree className="h-4 w-4" />
            <span className="hidden sm:inline">Tree</span>
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              "gap-2 px-3",
              viewMode === 'list' && "shadow-sm"
            )}
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">List</span>
          </Button>
        </div>
      </div>
      
      {/* Active Filters Indicator */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Active filters:</span>
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchTerm}
              <button
                onClick={handleClearSearch}
                className="ml-1 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {typeFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Type: {typeFilter}
              <button
                onClick={() => onTypeFilterChange('all')}
                className="ml-1 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => {
              handleClearSearch()
              onTypeFilterChange('all')
            }}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}