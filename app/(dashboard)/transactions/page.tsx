'use client'

import { useEffect, useState } from 'react'
import { useTransactionStore } from '@/store/transaction-store'
import { TransactionList } from '@/components/transactions/TransactionList'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { TransactionStats } from '@/components/transactions/TransactionStats'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download } from 'lucide-react'

export default function TransactionsPage() {
  const {
    transactions,
    isLoading,
    error,
    totalCount,
    currentPage,
    pageSize,
    fetchTransactions,
    fetchCategories,
    setPage
  } = useTransactionStore()

  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      await fetchCategories()
      await fetchTransactions(1)
      setIsInitialLoad(false)
    }
    loadData()
  }, [fetchCategories, fetchTransactions])

  const handleRefresh = async () => {
    await fetchTransactions(currentPage)
  }

  const handlePageChange = async (page: number) => {
    setPage(page)
    await fetchTransactions(page)
  }

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export transactions')
  }

  if (isInitialLoad && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            Manage and categorize your financial transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <TransactionStats />

      {/* Filters */}
      <TransactionFilters />

      {/* Error state */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Transaction List */}
      <TransactionList
        transactions={transactions}
        isLoading={isLoading}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />
    </div>
  )
}