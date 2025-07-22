'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionStore } from '@/store/transaction-store'
import { formatCurrency } from '@/lib/utils/formatters'
import { TrendingUp, TrendingDown, Wallet, Calendar } from 'lucide-react'

export function TransactionStats() {
  const { transactions } = useTransactionStore()
  
  // Calculate current month stats
  const currentMonth = new Date().toISOString().substring(0, 7)
  const currentMonthTransactions = transactions.filter(
    tx => tx.transaction_date.substring(0, 7) === currentMonth
  )
  
  const currentMonthIncome = currentMonthTransactions
    .filter(tx => tx.type === 'CREDIT')
    .reduce((sum, tx) => sum + tx.amount, 0)
    
  const currentMonthExpenses = currentMonthTransactions
    .filter(tx => tx.type === 'DEBIT')
    .reduce((sum, tx) => sum + tx.amount, 0)
    
  const currentMonthBalance = currentMonthIncome - currentMonthExpenses
  
  // Calculate last month stats for comparison
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1))
    .toISOString().substring(0, 7)
  const lastMonthTransactions = transactions.filter(
    tx => tx.transaction_date.substring(0, 7) === lastMonth
  )
  
  const lastMonthExpenses = lastMonthTransactions
    .filter(tx => tx.type === 'DEBIT')
    .reduce((sum, tx) => sum + tx.amount, 0)
    
  const expenseChange = lastMonthExpenses > 0
    ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
    : 0
  
  const stats = [
    {
      title: 'Monthly Income',
      value: formatCurrency(currentMonthIncome),
      icon: TrendingUp,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50'
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
      bgColor: currentMonthBalance >= 0 ? 'bg-blue-50' : 'bg-orange-50'
    },
    {
      title: 'Total Transactions',
      value: currentMonthTransactions.length.toString(),
      icon: Calendar,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subtitle: 'This month'
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