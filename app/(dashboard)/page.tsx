'use client'

import { useEffect, useState } from 'react'
import { useTransactionStore } from '@/store/transaction-store'
import { TransactionStats } from '@/components/transactions/TransactionStats'
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart'
import { CategoryBreakdownChart } from '@/components/dashboard/CategoryBreakdownChart'
import { MonthlyComparisonChart } from '@/components/dashboard/MonthlyComparisonChart'
import { InsightsCard } from '@/components/dashboard/InsightsCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, Download, FileText, FileSpreadsheet } from 'lucide-react'
import { 
  getMonthlyData, 
  getCategoryBreakdown, 
  getMonthlyComparison,
  getLatestDataMonth,
  getFinancialSummary
} from '@/lib/utils/dashboard-data'
import { exportToCSV, exportToPDF } from '@/lib/utils/export'

export default function DashboardPage() {
  const { 
    transactions,
    ensureTransactionsLoaded,
    refreshAllTransactions,
    fetchCategories, 
    categories,
    isLoading 
  } = useTransactionStore()
  
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      await fetchCategories()
      await ensureTransactionsLoaded() // Load all transactions for dashboard
      setIsInitialLoad(false)
    }
    loadData()
  }, [fetchCategories, ensureTransactionsLoaded])

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshAllTransactions()
    setRefreshing(false)
  }

  const handleExportCSV = () => {
    const summary = getFinancialSummary(transactions)
    const dateRange = transactions.length > 0
      ? `${new Date(transactions[transactions.length - 1].transaction_date).toLocaleDateString()} - ${new Date(transactions[0].transaction_date).toLocaleDateString()}`
      : 'No Data'
    
    exportToCSV({
      transactions: transactions,
      summary: {
        ...summary,
        dateRange
      }
    })
  }

  const handleExportPDF = () => {
    const summary = getFinancialSummary(transactions)
    const dateRange = transactions.length > 0
      ? `${new Date(transactions[transactions.length - 1].transaction_date).toLocaleDateString()} - ${new Date(transactions[0].transaction_date).toLocaleDateString()}`
      : 'No Data'
    
    exportToPDF({
      transactions: transactions,
      summary: {
        ...summary,
        dateRange
      }
    })
  }

  // Prepare chart data
  const monthlyData = getMonthlyData(transactions)
  const categoryBreakdown = getCategoryBreakdown(transactions, categories)
  const monthlyComparison = getMonthlyComparison(transactions, categories)
  
  // Get month names for comparison chart
  const latestMonth = getLatestDataMonth(transactions)
  const previousMonthDate = new Date()
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1)
  const previousMonth = previousMonthDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  })

  if (isInitialLoad && isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Financial Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track your income, expenses, and financial insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <div className="flex items-center gap-1">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="hidden sm:flex"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={handleExportPDF}
              variant="outline"
              size="sm"
              className="hidden sm:flex"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="icon"
              className="sm:hidden"
              title="Export"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <TransactionStats />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Income vs Expense - Full Width */}
        <IncomeExpenseChart data={monthlyData} />
        
        {/* Category Breakdown and Monthly Comparison - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryBreakdownChart data={categoryBreakdown} />
          <MonthlyComparisonChart 
            data={monthlyComparison} 
            currentMonth={latestMonth}
            previousMonth={previousMonth}
          />
        </div>
        
        {/* AI Insights - Full Width */}
        <InsightsCard transactions={transactions} categories={categories} />
      </div>
    </div>
  )
}