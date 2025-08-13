import type { Database } from '@/types/database'
import { startOfMonth, endOfMonth, startOfDay, endOfDay, subDays, subMonths, isSameMonth, differenceInDays, format } from 'date-fns'
import type { UploadedFile } from '@/store/uploadStore'

type Transaction = Database['public']['Tables']['transactions']['Row']

export interface StatementPeriod {
  startDate: Date
  endDate: Date
  statementType: 'monthly' | 'quarterly' | 'custom'
  confidence: number // 0-1, how confident we are this is the actual period
  fileId?: string
  fileName?: string
}

export interface DatePreset {
  id: string
  label: string
  getValue: () => { start: Date | null; end: Date | null }
  isDataBased: boolean // true if based on actual data, false if calendar-based
  priority: number // higher = more relevant
}

export interface DataDateRange {
  earliest: Date
  latest: Date
  totalTransactions: number
  spanInDays: number
}

/**
 * Analyze uploaded files to detect statement periods
 */
export function analyzeStatementPeriods(files: UploadedFile[], transactions: Transaction[]): StatementPeriod[] {
  const periods: StatementPeriod[] = []
  
  for (const file of files) {
    if (file.status !== 'completed') continue
    
    // Get transactions for this file's time period
    const fileTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transaction_date)
      const uploadDate = new Date(file.uploaded_at)
      // Assume transactions belong to file if they're within reasonable range of upload
      return Math.abs(txDate.getTime() - uploadDate.getTime()) < 90 * 24 * 60 * 60 * 1000 // 90 days
    })
    
    if (fileTransactions.length === 0) continue
    
    const transactionDates = fileTransactions.map(tx => new Date(tx.transaction_date)).sort((a, b) => a.getTime() - b.getTime())
    const startDate = transactionDates[0]
    const endDate = transactionDates[transactionDates.length - 1]
    const spanDays = differenceInDays(endDate, startDate)
    
    let statementType: StatementPeriod['statementType'] = 'custom'
    let confidence = 0.5
    
    // Detect monthly statements (25-35 days span, starts near month beginning)
    if (spanDays >= 25 && spanDays <= 35) {
      const monthStart = startOfMonth(startDate)
      const daysFromMonthStart = differenceInDays(startDate, monthStart)
      
      if (daysFromMonthStart <= 3) { // Starts within first 3 days of month
        statementType = 'monthly'
        confidence = 0.9
      }
    }
    
    // Detect quarterly statements (80-100 days span)
    if (spanDays >= 80 && spanDays <= 100) {
      statementType = 'quarterly'
      confidence = 0.8
    }
    
    // Higher confidence for files with more transactions
    if (fileTransactions.length > 50) {
      confidence = Math.min(confidence + 0.1, 1.0)
    }
    
    periods.push({
      startDate,
      endDate,
      statementType,
      confidence,
      fileId: file.id,
      fileName: file.filename
    })
  }
  
  return periods.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Get the most recent high-confidence statement period
 */
export function getLatestStatementPeriod(files: UploadedFile[], transactions: Transaction[]): StatementPeriod | null {
  const periods = analyzeStatementPeriods(files, transactions)
  
  // Find the most recent period with confidence > 0.7
  const recentPeriods = periods
    .filter(p => p.confidence > 0.7)
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())
  
  return recentPeriods[0] || null
}

/**
 * Get overall date range of all user data
 */
export function getDataDateRange(transactions: Transaction[]): DataDateRange | null {
  if (transactions.length === 0) return null
  
  const transactionDates = transactions
    .filter(tx => !tx.is_internal_transfer) // Exclude internal transfers for cleaner range
    .map(tx => new Date(tx.transaction_date))
    .sort((a, b) => a.getTime() - b.getTime())
  
  if (transactionDates.length === 0) return null
  
  const earliest = transactionDates[0]
  const latest = transactionDates[transactionDates.length - 1]
  
  return {
    earliest,
    latest,
    totalTransactions: transactionDates.length,
    spanInDays: differenceInDays(latest, earliest)
  }
}

/**
 * Generate smart presets based on actual user data
 */
export function generateSmartPresets(
  files: UploadedFile[], 
  transactions: Transaction[]
): DatePreset[] {
  const presets: DatePreset[] = []
  const dataRange = getDataDateRange(transactions)
  const latestStatement = getLatestStatementPeriod(files, transactions)
  
  // Always include "All Time" preset, but make it data-aware
  if (dataRange) {
    presets.push({
      id: 'all-data',
      label: `All My Data (${format(dataRange.earliest, 'MMM yyyy')} - ${format(dataRange.latest, 'MMM yyyy')})`,
      getValue: () => ({ 
        start: startOfDay(dataRange.earliest), 
        end: endOfDay(dataRange.latest) 
      }),
      isDataBased: true,
      priority: 10
    })
  } else {
    presets.push({
      id: 'all',
      label: 'All Time',
      getValue: () => ({ start: null, end: null }),
      isDataBased: false,
      priority: 5
    })
  }
  
  // Latest statement period (highest priority if recent)
  if (latestStatement) {
    const isRecent = differenceInDays(new Date(), latestStatement.endDate) <= 45
    const statementLabel = latestStatement.statementType === 'monthly' ? 'Statement' : 'Period'
    
    presets.push({
      id: 'latest-statement',
      label: `Latest ${statementLabel} (${format(latestStatement.startDate, 'MMM yyyy')})`,
      getValue: () => ({
        start: startOfDay(latestStatement.startDate),
        end: endOfDay(latestStatement.endDate)
      }),
      isDataBased: true,
      priority: isRecent ? 20 : 15
    })
  }
  
  // Data-based "Last X months" - only include if we have data
  if (dataRange) {
    const now = new Date()
    
    // Last 30 days of actual data
    const thirtyDaysAgo = subDays(now, 30)
    const hasRecentData = dataRange.latest.getTime() > thirtyDaysAgo.getTime()
    
    if (hasRecentData) {
      presets.push({
        id: '30d-data',
        label: 'Last 30 Days',
        getValue: () => ({
          start: startOfDay(subDays(now, 30)),
          end: endOfDay(now)
        }),
        isDataBased: true,
        priority: 18
      })
    }
    
    // Last 3 months if we have data spanning that long
    if (dataRange.spanInDays >= 60) {
      const threeMonthsAgo = subMonths(now, 3)
      presets.push({
        id: '3m-data',
        label: 'Last 3 Months',
        getValue: () => ({
          start: startOfDay(threeMonthsAgo),
          end: endOfDay(now)
        }),
        isDataBased: true,
        priority: 16
      })
    }
    
    // Last 6 months if we have data spanning that long
    if (dataRange.spanInDays >= 120) {
      const sixMonthsAgo = subMonths(now, 6)
      presets.push({
        id: '6m-data',
        label: 'Last 6 Months',
        getValue: () => ({
          start: startOfDay(sixMonthsAgo),
          end: endOfDay(now)
        }),
        isDataBased: true,
        priority: 14
      })
    }
    
    // Current month if we have data for it
    const currentMonthStart = startOfMonth(now)
    const hasCurrentMonthData = transactions.some(tx => {
      const txDate = new Date(tx.transaction_date)
      return isSameMonth(txDate, now) && !tx.is_internal_transfer
    })
    
    if (hasCurrentMonthData) {
      presets.push({
        id: 'current-month',
        label: `This Month (${format(now, 'MMM yyyy')})`,
        getValue: () => ({
          start: startOfDay(currentMonthStart),
          end: endOfDay(endOfMonth(now))
        }),
        isDataBased: true,
        priority: 17
      })
    }
  }
  
  // Fallback calendar-based presets if no data
  if (!dataRange) {
    presets.push(
      {
        id: '30d',
        label: 'Last 30 Days',
        getValue: () => ({
          start: startOfDay(subDays(new Date(), 30)),
          end: endOfDay(new Date())
        }),
        isDataBased: false,
        priority: 12
      },
      {
        id: '3m',
        label: 'Last 3 Months',
        getValue: () => ({
          start: startOfDay(subMonths(new Date(), 3)),
          end: endOfDay(new Date())
        }),
        isDataBased: false,
        priority: 11
      },
      {
        id: '6m',
        label: 'Last 6 Months',
        getValue: () => ({
          start: startOfDay(subMonths(new Date(), 6)),
          end: endOfDay(new Date())
        }),
        isDataBased: false,
        priority: 10
      }
    )
  }
  
  // Sort by priority (highest first)
  return presets.sort((a, b) => b.priority - a.priority)
}

/**
 * Get smart default date range based on user's data
 */
export function getSmartDefaultDateRange(
  files: UploadedFile[], 
  transactions: Transaction[]
): { start: Date | null; end: Date | null } {
  const dataRange = getDataDateRange(transactions)
  const latestStatement = getLatestStatementPeriod(files, transactions)
  
  // Priority 1: Latest statement period if it's recent and high confidence
  if (latestStatement && latestStatement.confidence > 0.8) {
    const isRecent = differenceInDays(new Date(), latestStatement.endDate) <= 45
    if (isRecent) {
      return {
        start: startOfDay(latestStatement.startDate),
        end: endOfDay(latestStatement.endDate)
      }
    }
  }
  
  // Priority 2: Last 30 days if we have recent data
  if (dataRange) {
    const now = new Date()
    const thirtyDaysAgo = subDays(now, 30)
    const hasRecentData = dataRange.latest.getTime() > thirtyDaysAgo.getTime()
    
    if (hasRecentData) {
      return {
        start: startOfDay(thirtyDaysAgo),
        end: endOfDay(now)
      }
    }
  }
  
  // Priority 3: All data if span is reasonable (< 6 months)
  if (dataRange && dataRange.spanInDays <= 180) {
    return {
      start: startOfDay(dataRange.earliest),
      end: endOfDay(dataRange.latest)
    }
  }
  
  // Priority 4: Last 3 months if we have data
  if (dataRange) {
    return {
      start: startOfDay(subMonths(new Date(), 3)),
      end: endOfDay(new Date())
    }
  }
  
  // Fallback: Last 30 days (calendar-based)
  return {
    start: startOfDay(subDays(new Date(), 30)),
    end: endOfDay(new Date())
  }
}

/**
 * Check if a date range was auto-selected vs manually chosen
 */
export function isAutoSelectedRange(
  dateRange: { start: Date | null; end: Date | null },
  files: UploadedFile[],
  transactions: Transaction[]
): boolean {
  const smartDefault = getSmartDefaultDateRange(files, transactions)
  
  // Compare timestamps to see if they match the smart default
  return (
    dateRange.start?.getTime() === smartDefault.start?.getTime() &&
    dateRange.end?.getTime() === smartDefault.end?.getTime()
  )
}