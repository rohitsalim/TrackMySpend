'use client'

import { useState } from 'react'
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
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { ArrowUpDown, Edit, Sparkles } from 'lucide-react'
import { TransactionEditModal } from './TransactionEditModal'
import { BulkCategorizeModal } from './BulkCategorizeModal'
import { BulkVendorResolveModal } from './BulkVendorResolveModal'
import { getCategoryPath } from '@/types/categories'
import type { Database } from '@/types/database'

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
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [showBulkCategorize, setShowBulkCategorize] = useState(false)
  const [showBulkVendorResolve, setShowBulkVendorResolve] = useState(false)

  const totalPages = Math.ceil(totalCount / pageSize)

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
                variant="default"
                size="sm"
                onClick={() => setShowBulkVendorResolve(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Resolve Vendors
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowBulkCategorize(true)}
              >
                Bulk categorize
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
              <TableHead className="w-[120px]">
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
              <TableHead className="w-[300px]">
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
              <TableHead className="w-[140px]">Category</TableHead>
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
              <TableHead className="w-[120px]">Bank</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
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
                  <TableCell className="max-w-[300px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <p className="font-medium">
                            {truncateText(transaction.vendor_name, 45)}
                          </p>
                          {transaction.vendor_name !== transaction.vendor_name_original && (
                            <p className="text-xs text-muted-foreground">
                              {truncateText(transaction.vendor_name_original, 45)}
                            </p>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-sm">
                        <div>
                          <p className="font-medium">{transaction.vendor_name}</p>
                          {transaction.vendor_name !== transaction.vendor_name_original && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Original: {transaction.vendor_name_original}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {transaction.categories ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="font-normal cursor-help">
                            {transaction.categories.name}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {getCategoryPath(transaction.categories.id, categories)}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Badge variant="outline" className="font-normal">
                        Uncategorized
                      </Badge>
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
                      HDFC Bank
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTransaction(transaction)}
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit transaction</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

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
      
      {/* Edit Modal */}
      {editingTransaction && (
        <TransactionEditModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
      
      {/* Bulk Categorize Modal */}
      {showBulkCategorize && (
        <BulkCategorizeModal
          transactionIds={Array.from(selectedTransactions)}
          onClose={() => setShowBulkCategorize(false)}
          onSuccess={() => {
            setSelectedTransactions(new Set())
            setShowBulkCategorize(false)
          }}
        />
      )}
      
      {/* Bulk Vendor Resolve Modal */}
      {showBulkVendorResolve && (
        <BulkVendorResolveModal
          transactions={transactions.filter(tx => selectedTransactions.has(tx.id))}
          open={showBulkVendorResolve}
          onClose={() => {
            setSelectedTransactions(new Set())
            setShowBulkVendorResolve(false)
          }}
        />
      )}
    </TooltipProvider>
  )
}