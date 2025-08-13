import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row']
type Category = Database['public']['Tables']['categories']['Row']

export interface MonthlyData {
  month: string
  monthName: string
  income: number
  expenses: number
  netBalance: number
}

export interface CategoryBreakdown {
  categoryId: string
  categoryName: string
  amount: number
  percentage: number
  color: string
}

export interface MonthlyComparison {
  category: string
  currentMonth: number
  previousMonth: number
  change: number
  changePercentage: number
}

// Get monthly income/expense data for the area chart
export function getMonthlyData(transactions: Transaction[]): MonthlyData[] {
  const monthlyMap = new Map<string, { income: number; expenses: number }>()
  
  transactions.forEach(tx => {
    if (tx.is_internal_transfer) return // Skip internal transfers
    
    const monthKey = tx.transaction_date.substring(0, 7) // YYYY-MM
    const existing = monthlyMap.get(monthKey) || { income: 0, expenses: 0 }
    
    if (tx.type === 'CREDIT') {
      existing.income += tx.amount
    } else {
      existing.expenses += tx.amount
    }
    
    monthlyMap.set(monthKey, existing)
  })
  
  // Convert to array and sort by month
  const monthlyData: MonthlyData[] = Array.from(monthlyMap.entries())
    .map(([month, data]) => {
      const date = new Date(month + '-01')
      const monthName = date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      })
      
      return {
        month,
        monthName,
        income: data.income,
        expenses: data.expenses,
        netBalance: data.income - data.expenses
      }
    })
    .sort((a, b) => a.month.localeCompare(b.month))
  
  // Return last 12 months of data
  return monthlyData.slice(-12)
}

// Get category breakdown for pie chart
export function getCategoryBreakdown(
  transactions: Transaction[], 
  categories: Category[]
): CategoryBreakdown[] {
  const categoryMap = new Map<string, number>()
  
  // Sum expenses by category (only DEBIT transactions)
  transactions.forEach(tx => {
    if (tx.type === 'DEBIT' && !tx.is_internal_transfer && tx.category_id) {
      const existing = categoryMap.get(tx.category_id) || 0
      categoryMap.set(tx.category_id, existing + tx.amount)
    }
  })
  
  // Calculate total for percentages
  const total = Array.from(categoryMap.values()).reduce((sum, amount) => sum + amount, 0)
  
  // Create breakdown with category details
  const breakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([categoryId, amount]) => {
      const category = categories.find(c => c.id === categoryId)
      return {
        categoryId,
        categoryName: category?.name || 'Uncategorized',
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: category?.color || '#6B7280' // Default gray
      }
    })
    .sort((a, b) => b.amount - a.amount)
  
  // Get top 9 categories and group the rest as "Others"
  if (breakdown.length > 10) {
    const top9 = breakdown.slice(0, 9)
    const othersAmount = breakdown.slice(9).reduce((sum, cat) => sum + cat.amount, 0)
    
    top9.push({
      categoryId: 'others',
      categoryName: 'Others',
      amount: othersAmount,
      percentage: total > 0 ? (othersAmount / total) * 100 : 0,
      color: '#9CA3AF'
    })
    
    return top9
  }
  
  return breakdown
}

// Get month-over-month comparison by category
export function getMonthlyComparison(
  transactions: Transaction[],
  categories: Category[]
): MonthlyComparison[] {
  // Get current month and previous month
  const now = new Date()
  const currentMonth = now.toISOString().substring(0, 7)
  const previousDate = new Date(now.getFullYear(), now.getMonth() - 1)
  const previousMonth = previousDate.toISOString().substring(0, 7)
  
  // If we don't have data for current month, use the latest month with data
  const monthsWithData = [...new Set(transactions.map(tx => tx.transaction_date.substring(0, 7)))]
    .sort((a, b) => b.localeCompare(a))
  
  const targetMonth = monthsWithData.includes(currentMonth) ? currentMonth : monthsWithData[0]
  const compareMonth = monthsWithData[monthsWithData.indexOf(targetMonth) + 1] || targetMonth
  
  // Group transactions by category and month
  const currentMonthMap = new Map<string, number>()
  const previousMonthMap = new Map<string, number>()
  
  transactions.forEach(tx => {
    if (tx.type === 'DEBIT' && !tx.is_internal_transfer && tx.category_id) {
      const monthKey = tx.transaction_date.substring(0, 7)
      
      if (monthKey === targetMonth) {
        const existing = currentMonthMap.get(tx.category_id) || 0
        currentMonthMap.set(tx.category_id, existing + tx.amount)
      } else if (monthKey === compareMonth) {
        const existing = previousMonthMap.get(tx.category_id) || 0
        previousMonthMap.set(tx.category_id, existing + tx.amount)
      }
    }
  })
  
  // Get all categories that have data in either month
  const allCategoryIds = new Set([...currentMonthMap.keys(), ...previousMonthMap.keys()])
  
  // Create comparison data
  const comparison: MonthlyComparison[] = Array.from(allCategoryIds)
    .map(categoryId => {
      const category = categories.find(c => c.id === categoryId)
      const currentAmount = currentMonthMap.get(categoryId) || 0
      const previousAmount = previousMonthMap.get(categoryId) || 0
      const change = currentAmount - previousAmount
      const changePercentage = previousAmount > 0 
        ? ((currentAmount - previousAmount) / previousAmount) * 100 
        : currentAmount > 0 ? 100 : 0
      
      return {
        category: category?.name || 'Uncategorized',
        currentMonth: currentAmount,
        previousMonth: previousAmount,
        change,
        changePercentage
      }
    })
    .filter(item => item.currentMonth > 0 || item.previousMonth > 0) // Only show categories with data
    .sort((a, b) => b.currentMonth - a.currentMonth) // Sort by current month amount
    .slice(0, 10) // Top 10 categories
  
  return comparison
}

// Get latest month with data for display
export function getLatestDataMonth(transactions: Transaction[]): string {
  if (transactions.length === 0) return 'No Data'
  
  const months = transactions.map(tx => tx.transaction_date.substring(0, 7))
  const latestMonth = months.sort((a, b) => b.localeCompare(a))[0]
  
  const date = new Date(latestMonth + '-01')
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Calculate financial summary
export function getFinancialSummary(transactions: Transaction[]) {
  let totalIncome = 0
  let totalExpenses = 0
  let internalTransfers = 0
  
  transactions.forEach(tx => {
    if (tx.is_internal_transfer) {
      internalTransfers += tx.amount
    } else if (tx.type === 'CREDIT') {
      totalIncome += tx.amount
    } else {
      totalExpenses += tx.amount
    }
  })
  
  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    internalTransfers,
    transactionCount: transactions.length
  }
}

// Filtered versions of the data functions for dashboard
export function getFilteredMonthlyData(transactions: Transaction[]): MonthlyData[] {
  return getMonthlyData(transactions)
}

export function getFilteredCategoryBreakdown(
  transactions: Transaction[], 
  categories: Category[]
): CategoryBreakdown[] {
  return getCategoryBreakdown(transactions, categories)
}

export function getFilteredMonthlyComparison(
  transactions: Transaction[],
  categories: Category[]
): MonthlyComparison[] {
  return getMonthlyComparison(transactions, categories)
}

export function getFilteredFinancialSummary(transactions: Transaction[]) {
  return getFinancialSummary(transactions)
}