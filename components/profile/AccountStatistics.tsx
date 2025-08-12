"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  DollarSign,
  Activity
} from 'lucide-react'
import { useTransactionStore } from '@/store/transaction-store'
import { useUploadStore } from '@/store/uploadStore'
import { formatCurrency } from '@/lib/utils/formatters'
import { formatDistanceToNow } from '@/lib/utils'
import { useMemo } from 'react'

const truncateText = (text: string, maxLength: number = 20): string => {
  if (!text) return text
  return text.length <= maxLength ? text : `${text.substring(0, maxLength)}...`
}

const cleanVendorName = (vendorName: string): string => {
  if (!vendorName) return vendorName
  
  // Remove common prefixes like RSP*, UPI*, etc.
  let cleaned = vendorName.replace(/^(RSP\*|UPI\*|NEFT\*|IMPS\*|TXN\*)/i, '')
  
  // Clean up common patterns
  cleaned = cleaned
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .trim()
  
  // Capitalize first letter of each word for better readability
  cleaned = cleaned.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    
  return cleaned
}

export function AccountStatistics() {
  const { transactions } = useTransactionStore()
  const { files } = useUploadStore()
  
  const stats = useMemo(() => {
    if (!transactions.length) {
      return {
        totalTransactions: 0,
        totalIncome: 0,
        totalExpenses: 0,
        cashFlowBalance: 0,
        filesProcessed: files.length,
        successfulFiles: files.filter(f => f.status === 'completed').length,
        dateRange: null,
        avgTransactionValue: 0,
        largestExpense: 0,
        mostFrequentVendor: null
      }
    }

    const income = transactions
      .filter(t => t.type === 'CREDIT' && !t.is_internal_transfer)
      .reduce((sum, t) => sum + t.amount, 0)
    
    const expenses = transactions
      .filter(t => t.type === 'DEBIT' && !t.is_internal_transfer)
      .reduce((sum, t) => sum + t.amount, 0)

    const sortedDates = transactions
      .map(t => new Date(t.transaction_date))
      .sort((a, b) => a.getTime() - b.getTime())

    const avgTransactionValue = transactions.length > 0 
      ? Math.abs(transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length)
      : 0

    // Find largest expense
    const expenseTransactions = transactions.filter(t => t.type === 'DEBIT' && !t.is_internal_transfer)
    const largestExpense = expenseTransactions.length > 0 
      ? Math.max(...expenseTransactions.map(t => t.amount))
      : 0

    // Find most frequent vendor
    const vendorCounts = new Map()
    transactions
      .filter(t => t.type === 'DEBIT' && !t.is_internal_transfer && t.vendor_name)
      .forEach(t => {
        const count = vendorCounts.get(t.vendor_name) || 0
        vendorCounts.set(t.vendor_name, count + 1)
      })
    const mostFrequentVendor = vendorCounts.size > 0 
      ? Array.from(vendorCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : null

    return {
      totalTransactions: transactions.length,
      totalIncome: income,
      totalExpenses: expenses,
      cashFlowBalance: income - expenses,
      largestExpense,
      mostFrequentVendor,
      filesProcessed: files.length,
      successfulFiles: files.filter(f => f.status === 'completed').length,
      dateRange: sortedDates.length > 0 ? {
        start: sortedDates[0],
        end: sortedDates[sortedDates.length - 1]
      } : null,
      avgTransactionValue
    }
  }, [transactions, files])

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle, 
    trend, 
    color = "default" 
  }: {
    icon: React.ComponentType<{ className?: string }>
    title: string
    value: string | number
    subtitle?: string
    trend?: "up" | "down" | "neutral"
    color?: "default" | "success" | "destructive" | "secondary"
  }) => (
    <div className="flex items-center space-x-3 p-4 rounded-lg border bg-card">
      <div className={`p-3 rounded-full ${
        color === "success" ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400" :
        color === "destructive" ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400" :
        color === "secondary" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
        "bg-muted text-muted-foreground"
      }`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <Badge variant={
              trend === "up" ? "default" : 
              trend === "down" ? "destructive" : 
              "secondary"
            } className="text-xs">
              {trend === "up" && <TrendingUp className="h-3 w-3 mr-1" />}
              {trend === "down" && <TrendingDown className="h-3 w-3 mr-1" />}
              {subtitle}
            </Badge>
          )}
        </div>
        {subtitle && !trend && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )

  const SimpleCard = ({ 
    title, 
    value, 
    subtitle 
  }: {
    title: string
    value: string | number
    subtitle?: string
  }) => (
    <div className="p-4 rounded-lg border bg-card h-[120px] flex flex-col justify-center">
      <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
      <p className="text-2xl font-bold mb-1 truncate" title={value?.toString()}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-muted-foreground truncate">
          {subtitle}
        </p>
      )}
    </div>
  )

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Financial Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={TrendingUp}
            title="Total Income"
            value={formatCurrency(stats.totalIncome)}
            color="success"
          />
          <StatCard
            icon={TrendingDown}
            title="Total Expenses"
            value={formatCurrency(stats.totalExpenses)}
            color="destructive"
          />
        </div>

        {/* Net Worth and Transactions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={DollarSign}
            title="Cash Flow Balance"
            value={formatCurrency(stats.cashFlowBalance)}
            color={stats.cashFlowBalance >= 0 ? "success" : "destructive"}
            trend={stats.cashFlowBalance >= 0 ? "up" : "down"}
            subtitle={stats.cashFlowBalance >= 0 ? "Positive" : "Negative"}
          />
          <StatCard
            icon={Activity}
            title="Total Transactions"
            value={stats.totalTransactions.toLocaleString()}
            subtitle={`Avg: ${formatCurrency(stats.avgTransactionValue)}`}
            color="secondary"
          />
        </div>

        {/* File Processing Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={FileText}
            title="Files Processed"
            value={`${stats.successfulFiles}/${stats.filesProcessed}`}
            subtitle={`${Math.round((stats.successfulFiles / Math.max(stats.filesProcessed, 1)) * 100)}% Success`}
            color="secondary"
          />
          <StatCard
            icon={Calendar}
            title="Data Range"
            value={stats.dateRange ? 
              formatDistanceToNow(stats.dateRange.start).replace(' ago', '') : 
              'No data'
            }
            subtitle={stats.dateRange ? 
              `Until ${formatDistanceToNow(stats.dateRange.end).replace(' ago', '')} ago` : 
              undefined
            }
            color="default"
          />
        </div>

        {/* Account Insights */}
        {stats.totalTransactions > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SimpleCard
              title="Largest Expense"
              value={formatCurrency(stats.largestExpense)}
              subtitle="Single transaction"
            />
            <SimpleCard
              title="Most Frequent Vendor"
              value={stats.mostFrequentVendor ? 
                truncateText(cleanVendorName(stats.mostFrequentVendor), 25) : 
                "No vendor data"
              }
              subtitle="Based on statements only"
            />
            <SimpleCard
              title="Daily Avg Spending"
              value={stats.dateRange ? 
                formatCurrency(stats.totalExpenses / Math.max(
                  Math.ceil((stats.dateRange.end.getTime() - stats.dateRange.start.getTime()) / (1000 * 60 * 60 * 24)), 1
                )) : formatCurrency(0)}
              subtitle="From uploaded data"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}