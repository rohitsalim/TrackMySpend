'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionStore } from '@/store/transaction-store'
import { formatCurrency } from '@/lib/utils/formatters'
import { TrendingUp, TrendingDown, Wallet, Calendar } from 'lucide-react'

export function TransactionStats() {
  const { transactions } = useTransactionStore()
  
  // Calculate current month stats - use the most recent month from transactions
  const allMonths = [...new Set(transactions.map(tx => tx.transaction_date.substring(0, 7)))].sort()
  const currentMonth = allMonths.length > 0 ? allMonths[allMonths.length - 1] : new Date().toISOString().substring(0, 7)
  
  const currentMonthTransactions = transactions.filter(
    tx => tx.transaction_date.substring(0, 7) === currentMonth && !tx.is_internal_transfer
  )
  
  // Debug logging
  console.log('TransactionStats Debug:', {
    totalTransactions: transactions.length,
    allMonths: allMonths.slice(0, 5),
    currentMonth,
    currentMonthTransactions: currentMonthTransactions.length,
    sampleTransaction: transactions[0]
  })
  
  const currentMonthIncome = currentMonthTransactions
    .filter(tx => tx.type === 'CREDIT')
    .reduce((sum, tx) => sum + tx.amount, 0)
    
  const currentMonthExpenses = currentMonthTransactions
    .filter(tx => tx.type === 'DEBIT')
    .reduce((sum, tx) => sum + tx.amount, 0)
    
  const currentMonthBalance = currentMonthIncome - currentMonthExpenses
  
  // Calculate last month stats for comparison
  const currentMonthIndex = allMonths.indexOf(currentMonth)
  const lastMonth = currentMonthIndex > 0 ? allMonths[currentMonthIndex - 1] : ''
  const lastMonthTransactions = transactions.filter(
    tx => tx.transaction_date.substring(0, 7) === lastMonth && !tx.is_internal_transfer
  )
  
  const lastMonthExpenses = lastMonthTransactions
    .filter(tx => tx.type === 'DEBIT')
    .reduce((sum, tx) => sum + tx.amount, 0)
    
  const expenseChange = lastMonthExpenses > 0
    ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
    : 0
  
  // Format month name for display
  const monthName = currentMonth ? new Date(currentMonth + '-01').toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  }) : 'Current Month'

  const stats = [
    {
      title: 'Monthly Income',
      value: formatCurrency(currentMonthIncome),
      icon: TrendingUp,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      subtitle: monthName
    },
    {
      title: 'Monthly Expenses',
      value: formatCurrency(currentMonthExpenses),
      icon: TrendingDown,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      change: expenseChange,
      changeLabel: 'vs last month'
    },
    {
      title: 'Net Balance',
      value: formatCurrency(currentMonthBalance),
      icon: Wallet,
      iconColor: currentMonthBalance >= 0 ? 'text-blue-600' : 'text-orange-600',
      bgColor: currentMonthBalance >= 0 ? 'bg-blue-50' : 'bg-orange-50',
      subtitle: monthName
    },
    {
      title: 'Total Transactions',
      value: currentMonthTransactions.length.toString(),
      icon: Calendar,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subtitle: monthName
    }
  ]
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.change !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">
                <span className={stat.change >= 0 ? 'text-red-600' : 'text-green-600'}>
                  {stat.change >= 0 ? '+' : ''}{stat.change.toFixed(1)}%
                </span>
                {' '}{stat.changeLabel}
              </p>
            )}
            {stat.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {stat.subtitle}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}