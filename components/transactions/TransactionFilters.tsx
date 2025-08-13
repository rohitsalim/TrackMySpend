'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateRangeFilter } from '@/components/shared/DateRangeFilter'
import { useTransactionStore } from '@/store/transaction-store'
import { Search, Filter, X } from 'lucide-react'

export function TransactionFilters() {
  const {
    filters,
    categories,
    setFilters,
    resetFilters,
    setDateRange,
    fetchTransactions
  } = useTransactionStore()
  
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [searchInput, setSearchInput] = useState(filters.searchTerm)
  
  const handleSearch = () => {
    setFilters({ searchTerm: searchInput }, 'transactions')
    fetchTransactions(1)
  }
  
  const handleDateRangeChange = (dateRange: { start: Date | null; end: Date | null }) => {
    setDateRange(dateRange, 'transactions')
    fetchTransactions(1)
  }
  
  const handleCategoryChange = (categoryId: string) => {
    const newCategories = categoryId === 'all' 
      ? []
      : [categoryId]
    setFilters({ categories: newCategories }, 'transactions')
    fetchTransactions(1)
  }
  
  const handleReset = () => {
    setSearchInput('')
    resetFilters('transactions')
    fetchTransactions(1)
  }
  
  const hasActiveFilters = 
    filters.searchTerm ||
    filters.dateRange.start ||
    filters.dateRange.end ||
    filters.categories.length > 0 ||
    filters.showInternalTransfers
  
  return (
    <div className="space-y-4">
      {/* Search and Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by vendor or notes..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select
          value={filters.categories[0] || 'all'}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
              •
            </span>
          )}
        </Button>
      </div>
      
      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t">
          {/* Date Range Filter */}
          <DateRangeFilter
            value={filters.dateRange}
            onChange={handleDateRangeChange}
            context="transactions"
            showLabel={false}
          />
          
          {/* Show Internal Transfers */}
          <div className="space-y-2">
            <Label>Options</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={filters.showInternalTransfers}
                onCheckedChange={(checked) => {
                  setFilters({ showInternalTransfers: checked }, 'transactions')
                  fetchTransactions(1)
                }}
              />
              <Label className="font-normal cursor-pointer">
                Show internal transfers
              </Label>
            </div>
          </div>
          
          {/* Reset Filters */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
              >
                <X className="h-4 w-4 mr-2" />
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}