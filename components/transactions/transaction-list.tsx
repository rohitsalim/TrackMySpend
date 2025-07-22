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
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { TransactionEditModal } from './transaction-edit-modal'
import { Pencil, ArrowUpDown } from 'lucide-react'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null
}

interface TransactionListProps {
  transactions: Transaction[]
  isLoading: boolean
  totalCount: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function TransactionList({
  transactions,
  isLoading,
  totalCount,
  currentPage,
  pageSize,
  onPageChange
}: TransactionListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [sortField, setSortField] = useState<keyof Transaction>('transaction_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const totalPages = Math.ceil(totalCount / pageSize)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(transactions.map(t => t.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id])
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id))
    }
  }

  const handleSort = (field: keyof Transaction) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

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
    <>
      <div className="bg-card rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === transactions.length && transactions.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>
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
              <TableHead>
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
              <TableHead>Category</TableHead>
              <TableHead className="text-right">
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
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
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
                <TableRow
                  key={transaction.id}
                  className={transaction.is_internal_transfer ? 'opacity-50' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(transaction.id)}
                      onCheckedChange={(checked) => handleSelectOne(transaction.id, checked as boolean)}
                      disabled={transaction.is_internal_transfer}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatDate(transaction.transaction_date)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{transaction.vendor_name}</p>
                      {transaction.vendor_name !== transaction.vendor_name_original && (
                        <p className="text-xs text-muted-foreground">
                          {transaction.vendor_name_original}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {transaction.categories ? (
                      <Badge variant="secondary" className="font-normal">
                        {transaction.categories.name}
                      </Badge>
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
                    {transaction.is_internal_transfer && (
                      <Badge variant="secondary" className="text-xs">
                        Internal
                      </Badge>
                    )}
                    {transaction.is_duplicate && (
                      <Badge variant="secondary" className="text-xs">
                        Duplicate
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingTransaction(transaction)}
                      disabled={transaction.is_internal_transfer}
                    >
                      <Pencil className="h-4 w-4" />
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
    </>
  )
}