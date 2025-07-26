'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Pagination } from '@/components/ui/pagination'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { ArrowUpDown, Edit, Check, X, Sparkles, Loader2 } from 'lucide-react'
import { getCategoryPath, flattenCategoryTree, buildCategoryTree } from '@/types/categories'
import { getCategoryBadgeClasses } from '@/lib/utils/category-colors'
import { useTransactionStore } from '@/store/transaction-store'
import { TextShimmer } from '@/components/ui/text-shimmer'
import type { Database } from '@/types/database'
import type { VendorResolutionRequest, VendorAPIResponse, VendorResolutionResponse } from '@/types/vendor-resolution'

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null
}

interface TransactionListProps {
  transactions: Transaction[]
  categories: Database['public']['Tables']['categories']['Row'][]
  isLoading: boolean
  totalCount: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
}

// Utility function to truncate text
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function TransactionList({
  transactions,
  categories,
  isLoading,
  totalCount,
  currentPage,
  pageSize,
  onPageChange
}: TransactionListProps) {
  const [sortField, setSortField] = useState<keyof Transaction>('transaction_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  
  // Individual vendor resolution state
  const [resolvingVendors, setResolvingVendors] = useState<Set<string>>(new Set())
  const [resolvedVendors, setResolvedVendors] = useState<Map<string, { name: string, timestamp: number }>>(new Map())
  
  // Individual category resolution state
  const [resolvingCategories, setResolvingCategories] = useState<Set<string>>(new Set())
  const [resolvedCategories, setResolvedCategories] = useState<Map<string, { category: { id: string, name: string }, timestamp: number }>>(new Map())
  
  // In-place editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    vendorName: string
    categoryId: string | null
  }>({ vendorName: '', categoryId: null })
  const [isSaving, setIsSaving] = useState(false)
  
  const vendorInputRef = useRef<HTMLInputElement>(null)
  const { updateTransaction, updateTransactionCategory } = useTransactionStore()

  const totalPages = Math.ceil(totalCount / pageSize)
  
  // Get hierarchical categories for dropdown
  const categoryTree = buildCategoryTree(categories)
  const flatCategories = flattenCategoryTree(categoryTree)

  const handleSort = (field: keyof Transaction) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(transactions.map(t => t.id))
      setSelectedTransactions(allIds)
    } else {
      setSelectedTransactions(new Set())
    }
  }

  const handleSelectTransaction = (transactionId: string, checked: boolean) => {
    const newSelected = new Set(selectedTransactions)
    if (checked) {
      newSelected.add(transactionId)
    } else {
      newSelected.delete(transactionId)
    }
    setSelectedTransactions(newSelected)
  }

  const isAllSelected = transactions.length > 0 && selectedTransactions.size === transactions.length
  const hasSelectedTransactions = selectedTransactions.size > 0
  
  // Start editing a transaction
  const startEditing = (transaction: Transaction) => {
    setEditingId(transaction.id)
    setEditForm({
      vendorName: transaction.vendor_name,
      categoryId: transaction.category_id
    })
    // Focus vendor input after state update
    setTimeout(() => vendorInputRef.current?.focus(), 0)
  }
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null)
    setEditForm({ vendorName: '', categoryId: null })
  }
  
  // Save edited transaction
  const saveEditing = async (transaction: Transaction) => {
    setIsSaving(true)
    
    try {
      // Update vendor name if changed
      if (editForm.vendorName !== transaction.vendor_name) {
        await updateTransaction(transaction.id, {
          vendor_name: editForm.vendorName,
        })
      }
      
      // Update category if changed
      if (editForm.categoryId !== transaction.category_id) {
        const newCategoryId = editForm.categoryId === 'none' ? null : editForm.categoryId
        if (newCategoryId) {
          await updateTransactionCategory(
            transaction.id,
            newCategoryId,
            categories.find(cat => cat.id === newCategoryId)
          )
        } else {
          // Remove category
          await updateTransaction(transaction.id, {
            category_id: null,
          })
        }
      }
      
      // Learn from user correction if vendor name changed
      if (editForm.vendorName !== transaction.vendor_name && 
          transaction.vendor_name_original && 
          editForm.vendorName.trim().length > 0) {
        
        try {
          await fetch('/api/vendors/mappings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              original_text: transaction.vendor_name_original,
              mapped_name: editForm.vendorName,
              confidence: 0.95,
              source: 'user'
            })
          })
        } catch (learningError) {
          console.warn('Failed to save vendor mapping for learning:', learningError)
        }
      }
      
      cancelEditing()
    } catch (error) {
      console.error('Failed to update transaction:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Individual vendor resolution function
  const resolveIndividualVendor = async (transaction: Transaction) => {
    if (resolvingVendors.has(transaction.id) || !transaction.vendor_name_original || resolvingVendors.size >= 2) {
      return
    }

    // Add to resolving set
    setResolvingVendors(prev => new Set(prev).add(transaction.id))

    try {
      const request: VendorResolutionRequest = {
        original_text: transaction.vendor_name_original,
        transaction_id: transaction.id,
        context: {
          amount: transaction.amount.toString(),
          date: transaction.transaction_date,
          bank_name: 'HDFC Bank'
        }
      }

      const response = await fetch('/api/vendors/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const result: VendorAPIResponse<VendorResolutionResponse['data']> = await response.json()

      if (result.success && result.data) {
        // Update transaction in database
        await updateTransaction(transaction.id, {
          vendor_name: result.data.resolved_name
        })

        // Add to resolved cache for UI feedback
        setResolvedVendors(prev => {
          const newMap = new Map(prev)
          newMap.set(transaction.id, { 
            name: result.data!.resolved_name, 
            timestamp: Date.now() 
          })
          return newMap
        })

        // Clear resolved cache after 3 seconds
        setTimeout(() => {
          setResolvedVendors(prev => {
            const newMap = new Map(prev)
            newMap.delete(transaction.id)
            return newMap
          })
        }, 3000)
      } else {
        console.error('Vendor resolution failed:', 'error' in result ? result.error?.message : 'Unknown error')
        // Could add toast notification here for user feedback
      }
    } catch (error) {
      console.error('Failed to resolve vendor:', error)
      // Could add toast notification here for user feedback
    } finally {
      // Remove from resolving set
      setResolvingVendors(prev => {
        const newSet = new Set(prev)
        newSet.delete(transaction.id)
        return newSet
      })
    }
  }

  // Individual category resolution function
  const resolveIndividualCategory = async (transaction: Transaction) => {
    if (resolvingCategories.has(transaction.id) || resolvingCategories.size >= 2) {
      return
    }

    setResolvingCategories(prev => new Set(prev).add(transaction.id))

    try {
      const response = await fetch('/api/categories/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: transaction.id,
          vendorName: transaction.vendor_name,
          amount: Number(transaction.amount),
          transactionType: transaction.type,
          description: transaction.vendor_name_original,
          transactionDate: transaction.transaction_date
        }),
      })

      const result = await response.json()

      if (result.success && result.data) {
        const categoryData = {
          id: result.data.categoryId,
          name: result.data.categoryName
        }

        // Update the transaction category using the specialized method
        await updateTransactionCategory(
          transaction.id, 
          result.data.categoryId,
          categories.find(cat => cat.id === result.data.categoryId)
        )

        // Track the resolved category for visual feedback
        setResolvedCategories(prev => new Map(prev).set(transaction.id, {
          category: categoryData,
          timestamp: Date.now()
        }))

        // Clear resolved cache after 3 seconds
        setTimeout(() => {
          setResolvedCategories(prev => {
            const newMap = new Map(prev)
            newMap.delete(transaction.id)
            return newMap
          })
        }, 3000)
      } else {
        console.error('Category resolution failed:', result.error?.message || 'Unknown error')
      }
    } catch (error) {
      console.error('Error resolving category:', error)
    } finally {
      setResolvingCategories(prev => {
        const newSet = new Set(prev)
        newSet.delete(transaction.id)
        return newSet
      })
    }
  }

  // Helper function to determine if category should show resolve button
  const shouldShowCategoryResolveButton = (transaction: Transaction): boolean => {
    // Don't show if editing, already resolving, or already has category
    if (editingId === transaction.id || 
        resolvingCategories.has(transaction.id) || 
        transaction.category_id) {
      return false
    }

    // Don't show if we already have 2 requests in progress
    if (resolvingCategories.size >= 2) {
      return false
    }

    // Show for transactions without category
    return true
  }

  // Helper function to determine if vendor should show resolve button
  const shouldShowResolveButton = (transaction: Transaction): boolean => {
    // Don't show if editing, already resolving, or no original text
    if (editingId === transaction.id || 
        resolvingVendors.has(transaction.id) || 
        !transaction.vendor_name_original) {
      return false
    }

    // Don't show if we already have 2 requests in progress
    if (resolvingVendors.size >= 2) {
      return false
    }

    // Show button for cryptic vendor names (similar logic to bulk resolve)
    const hasTransactionCodes = /[*#0-9]{3,}|RAZOR|PAYU|UPI|NEFT|IMPS|BILLDESK|CCAVENUE|HDFC|ICICI|AXIS|SBI/.test(transaction.vendor_name_original)
    const isLongCryptic = transaction.vendor_name_original.length > 20 && /[A-Z0-9]{8,}/.test(transaction.vendor_name_original)
    const isUnclearVendor = transaction.vendor_name === transaction.vendor_name_original && 
                           (hasTransactionCodes || isLongCryptic)

    return isUnclearVendor
  }
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) {
        if (e.key === 'Escape') {
          e.preventDefault()
          cancelEditing()
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editingId])

  const sortedTransactions = [...transactions].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1
    
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    return sortOrder === 'asc' ? comparison : -comparison
  })

  if (!isLoading && transactions.length === 0) {
    return (
      <div className="bg-card rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No transactions found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Upload a bank statement to get started
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="bg-card rounded-lg overflow-hidden">
        {/* Bulk Actions Bar */}
        {hasSelectedTransactions && (
          <div className="bg-muted/50 border-b px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-medium">
              {selectedTransactions.size} transaction{selectedTransactions.size > 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTransactions(new Set())}
              >
                Clear selection
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled
              >
                Delete
              </Button>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45px]">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all transactions"
                />
              </TableHead>
              <TableHead className="w-[110px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2"
                  onClick={() => handleSort('transaction_date')}
                >
                  Date
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[30px]"></TableHead>
              <TableHead className="min-w-[280px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2"
                  onClick={() => handleSort('vendor_name')}
                >
                  Vendor
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[30px]"></TableHead>
              <TableHead className="w-[120px]">Category</TableHead>
              <TableHead className="text-right w-[120px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2"
                  onClick={() => handleSort('amount')}
                >
                  Amount
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[90px]">Bank</TableHead>
              <TableHead className="w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </TableCell>
              </TableRow>
            ) : (
              sortedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedTransactions.has(transaction.id)}
                      onCheckedChange={(checked) => handleSelectTransaction(transaction.id, checked as boolean)}
                      aria-label={`Select transaction from ${transaction.vendor_name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatDate(transaction.transaction_date)}
                  </TableCell>
                  {/* Vendor Resolve Button Column */}
                  <TableCell className="w-[30px] p-1 pr-0">
                    {shouldShowResolveButton(transaction) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-60 hover:opacity-100 text-purple-600"
                            onClick={() => resolveIndividualVendor(transaction)}
                            disabled={resolvingVendors.has(transaction.id) || resolvingVendors.size >= 2}
                          >
                            {resolvingVendors.has(transaction.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Unmask Vendor</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  {/* Vendor Column */}
                  <TableCell className="min-w-[280px] pl-1">
                    {editingId === transaction.id ? (
                      <div className="space-y-1">
                        <Input
                          ref={vendorInputRef}
                          value={editForm.vendorName}
                          onChange={(e) => setEditForm({ ...editForm, vendorName: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              saveEditing(transaction)
                            }
                          }}
                          className="h-8 text-sm"
                          disabled={isSaving}
                        />
                        {transaction.vendor_name !== transaction.vendor_name_original && (
                          <p className="text-xs text-muted-foreground px-1">
                            {truncateText(transaction.vendor_name_original, 55)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        {resolvingVendors.has(transaction.id) ? (
                          <div className="space-y-1">
                            <TextShimmer 
                              as="p" 
                              className="font-medium text-sm"
                              duration={1.5}
                              baseColor="#9333ea"
                              shimmerColor="#ddd6fe"
                            >
                              Identifying...
                            </TextShimmer>
                            {transaction.vendor_name !== transaction.vendor_name_original && (
                              <p className="text-xs text-muted-foreground">
                                {truncateText(transaction.vendor_name_original, 55)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                <p className={`font-medium ${resolvedVendors.has(transaction.id) ? 'text-purple-600' : ''}`}>
                                  {truncateText(
                                    resolvedVendors.has(transaction.id) 
                                      ? resolvedVendors.get(transaction.id)!.name 
                                      : transaction.vendor_name, 
                                    55
                                  )}
                                </p>
                                {transaction.vendor_name !== transaction.vendor_name_original && (
                                  <p className="text-xs text-muted-foreground">
                                    {truncateText(transaction.vendor_name_original, 55)}
                                  </p>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-sm">
                              <div>
                                <p className={`font-medium ${resolvedVendors.has(transaction.id) ? 'text-purple-600' : ''}`}>
                                  {resolvedVendors.has(transaction.id) 
                                    ? resolvedVendors.get(transaction.id)!.name 
                                    : transaction.vendor_name}
                                </p>
                                {transaction.vendor_name !== transaction.vendor_name_original && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Original: {transaction.vendor_name_original}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    )}
                  </TableCell>
                  {/* Category Resolve Button Column */}
                  <TableCell className="w-[30px] p-1 pr-0">
                    {shouldShowCategoryResolveButton(transaction) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-60 hover:opacity-100 text-emerald-600"
                            onClick={() => resolveIndividualCategory(transaction)}
                            disabled={resolvingCategories.has(transaction.id) || resolvingCategories.size >= 2}
                          >
                            {resolvingCategories.has(transaction.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Auto-categorize</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  {/* Category Column */}
                  <TableCell className="pl-1">
                    {editingId === transaction.id ? (
                      <Select 
                        value={editForm.categoryId || 'none'} 
                        onValueChange={(value) => setEditForm({ ...editForm, categoryId: value })}
                        disabled={isSaving}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Uncategorized</SelectItem>
                          {flatCategories.map(({ category, level }) => (
                            <SelectItem key={category.id} value={category.id}>
                              {'  '.repeat(level)}{category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      resolvingCategories.has(transaction.id) ? (
                        <TextShimmer 
                          as="p" 
                          className="font-medium text-sm"
                          duration={1.5}
                          baseColor="#059669"
                          shimmerColor="#d1fae5"
                        >
                          Categorizing...
                        </TextShimmer>
                      ) : transaction.categories ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {(() => {
                              const category = resolvedCategories.has(transaction.id) 
                                ? { 
                                    name: resolvedCategories.get(transaction.id)!.category.name,
                                    color: transaction.categories.color 
                                  }
                                : transaction.categories
                              const badgeClasses = getCategoryBadgeClasses(category)
                              
                              return (
                                <Badge 
                                  className="font-normal cursor-help border"
                                  style={badgeClasses.style}
                                >
                                  {category.name}
                                </Badge>
                              )
                            })()}
                          </TooltipTrigger>
                          <TooltipContent>
                            {getCategoryPath(transaction.categories.id, categories)}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Badge variant="outline" className="font-normal">
                          Uncategorized
                        </Badge>
                      )
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-medium ${
                      transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'CREDIT' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      HDFC
                    </span>
                  </TableCell>
                  <TableCell>
                    {editingId === transaction.id ? (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => saveEditing(transaction)}
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          disabled={isSaving}
                        >
                          <Check className="h-4 w-4" />
                          <span className="sr-only">Save changes</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={cancelEditing}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Cancel editing</span>
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(transaction)}
                        className="h-8 w-8"
                        disabled={resolvingVendors.has(transaction.id)}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit transaction</span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t px-4 py-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </div>
      
    </TooltipProvider>
  )
}