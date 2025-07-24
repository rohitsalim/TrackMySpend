'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionStore } from '@/store/transaction-store'
import { formatCurrency } from '@/lib/utils/formatters'
import { TrendingUp, TrendingDown, Wallet, CreditCard, Smartphone, Building2, Activity } from 'lucide-react'
import { analyzeTransactionPatterns, getTopPaymentMethods } from '@/lib/utils/transaction-patterns'

export function TransactionStats() {
  const { getFilteredTransactions } = useTransactionStore()
  
  // Use filtered transactions (which will be all transactions if no filters applied)
  const filteredTransactions = getFilteredTransactions()
  
  // Analyze transaction patterns
  const analysis = analyzeTransactionPatterns(filteredTransactions)
  const topPaymentMethods = getTopPaymentMethods(analysis.paymentMethods)
  
  // Find the most popular payment method
  const topMethod = topPaymentMethods[0]
  
  // Calculate total date range for display
  const allDates = filteredTransactions.map(tx => tx.transaction_date).sort()
  const dateRange = allDates.length > 0 
    ? allDates.length === 1 
      ? new Date(allDates[0]).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : `${new Date(allDates[0]).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${new Date(allDates[allDates.length - 1]).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    : 'No Data'

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'upi': return Smartphone
      case 'card': return CreditCard
      case 'bank transfer': return Building2
      default: return Wallet
    }
  }
  
  const stats = [
    {
      title: 'Total Incomings',
      value: formatCurrency(analysis.totalIncome),
      icon: TrendingUp,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      subtitle: dateRange,
      detail: `${filteredTransactions.filter(tx => tx.type === 'CREDIT' && !tx.is_internal_transfer).length} transactions`
    },
    {
      title: 'Total Outgoings',
      value: formatCurrency(analysis.totalExpenses),
      icon: TrendingDown,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      subtitle: dateRange,
      detail: `${filteredTransactions.filter(tx => tx.type === 'DEBIT' && !tx.is_internal_transfer).length} transactions`
    },
    {
      title: 'Most Used Method',
      value: topMethod ? topMethod.method : 'No Data',
      icon: topMethod ? getPaymentMethodIcon(topMethod.method) : Activity,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      subtitle: topMethod ? `${topMethod.count} transactions` : '',
      detail: topMethod ? formatCurrency(topMethod.amount) : ''
    },
    {
      title: 'Transaction Volume',
      value: analysis.totalTransactions.toString(),
      icon: Activity,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subtitle: dateRange,
      detail: `UPI: ${analysis.paymentMethods.upi.count} | Card: ${analysis.paymentMethods.card.count} | Bank: ${analysis.paymentMethods.bankTransfer.count} | Other: ${analysis.paymentMethods.other.count}`
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
            {stat.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {stat.subtitle}
              </p>
            )}
            {stat.detail && (
              <p className="text-xs text-muted-foreground mt-1">
                {stat.detail}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}