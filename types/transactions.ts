/**
 * Transaction-specific type definitions
 * Following .cursorrules requirement for transaction-specific types
 */

import type { Database } from './database'

// Database table types
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export type RawTransaction = Database['public']['Tables']['raw_transactions']['Row']
export type RawTransactionInsert = Database['public']['Tables']['raw_transactions']['Insert']

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']

// Vendor types - using string for vendor name since vendors table may not exist yet
export interface Vendor {
  id: string
  name: string
  normalized_name: string
  category_id?: string
  user_id: string
  created_at: string
}

export interface VendorInsert {
  id?: string
  name: string
  normalized_name: string
  category_id?: string
  user_id: string
  created_at?: string
}

// Business logic types
export interface TransactionWithDetails extends Transaction {
  category?: Category
  vendor?: Vendor
  raw_transaction?: RawTransaction
}

export interface ProcessedTransaction {
  id: string
  date: string
  description: string
  vendor_name: string
  amount: string
  type: 'DEBIT' | 'CREDIT'
  category?: string
  is_internal_transfer: boolean
  is_duplicate: boolean
  original_currency?: string
  original_amount?: string
}

export interface TransactionFilters {
  dateRange?: {
    start: Date
    end: Date
  }
  categories?: string[]
  vendors?: string[]
  types?: ('DEBIT' | 'CREDIT')[]
  amountRange?: {
    min: number
    max: number
  }
  searchTerm?: string
  showInternalTransfers: boolean
  showDuplicates: boolean
}

export interface TransactionStats {
  totalTransactions: number
  totalIncome: number
  totalExpenses: number
  netAmount: number
  averageTransaction: number
  topCategories: Array<{
    category: string
    amount: number
    count: number
    percentage: number
  }>
  topVendors: Array<{
    vendor: string
    amount: number
    count: number
  }>
  monthlyTrends: Array<{
    month: string
    income: number
    expenses: number
    net: number
    transactionCount: number
  }>
}

export interface TransactionGroup {
  date: string
  transactions: TransactionWithDetails[]
  totalAmount: number
  creditAmount: number
  debitAmount: number
}

export interface TransactionSummary {
  period: 'day' | 'week' | 'month' | 'year'
  startDate: string
  endDate: string
  stats: TransactionStats
  groups: TransactionGroup[]
}

// Form types for transaction editing
export interface TransactionEditForm {
  description: string
  vendor_name: string
  category_id?: string
  amount: string
  transaction_date: string
  notes?: string
}

// Export/Import types
export interface TransactionExportOptions {
  format: 'csv' | 'json' | 'xlsx'
  dateRange?: {
    start: Date
    end: Date
  }
  categories?: string[]
  includeInternalTransfers: boolean
  includeDuplicates: boolean
}

export interface TransactionImportResult {
  imported: number
  skipped: number
  errors: Array<{
    row: number
    field: string
    message: string
  }>
}