import crypto from 'crypto'
import { Transaction } from '@/types/pdf-processing'

export function generateTransactionFingerprint(
  date: string,
  amount: string,
  description: string,
  userId: string
): string {
  // Normalize the vendor description for consistent fingerprinting
  const normalizedVendor = normalizeVendorName(description)
  
  // Normalize amount to 2 decimal places for consistent fingerprinting
  const normalizedAmount = Number(amount).toFixed(2)
  
  // Create fingerprint from normalized components
  const fingerprintData = `${date}-${normalizedAmount}-${normalizedVendor}-${userId}`
  
  return crypto
    .createHash('sha256')
    .update(fingerprintData)
    .digest('hex')
}

export function normalizeVendorName(description: string): string {
  return description
    .toLowerCase()
    .trim()
    // Remove common prefixes/suffixes
    .replace(/^(dr|cr|debit|credit)\s+/i, '')
    .replace(/\s+(dr|cr|debit|credit)$/i, '')
    // Remove special characters and extra spaces
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function generateFingerprintsForTransactions(
  transactions: Transaction[],
  userId: string
): Array<Transaction & { fingerprint: string }> {
  return transactions.map(transaction => ({
    ...transaction,
    fingerprint: generateTransactionFingerprint(
      transaction.date,
      transaction.amount,
      transaction.description,
      userId
    )
  }))
}

export function detectDuplicateTransactions(
  transactions: Array<Transaction & { fingerprint: string }>
): {
  unique: Array<Transaction & { fingerprint: string; is_duplicate: boolean }>
  duplicates: Array<Transaction & { fingerprint: string; is_duplicate: boolean; duplicate_of: string }>
} {
  const seen = new Map<string, Transaction & { fingerprint: string }>()
  const unique: Array<Transaction & { fingerprint: string; is_duplicate: boolean }> = []
  const duplicates: Array<Transaction & { fingerprint: string; is_duplicate: boolean; duplicate_of: string }> = []

  for (const transaction of transactions) {
    const existing = seen.get(transaction.fingerprint)
    
    if (existing) {
      // This is a duplicate
      duplicates.push({
        ...transaction,
        is_duplicate: true,
        duplicate_of: existing.fingerprint
      })
    } else {
      // This is unique
      seen.set(transaction.fingerprint, transaction)
      unique.push({
        ...transaction,
        is_duplicate: false
      })
    }
  }

  return { unique, duplicates }
}

export function detectInternalTransfers(
  transactions: Array<Transaction & { fingerprint: string }>
): Array<Transaction & { fingerprint: string; is_internal_transfer: boolean; related_transaction_id?: string }> {
  const result = transactions.map(tx => ({ 
    ...tx, 
    is_internal_transfer: false,
    related_transaction_id: undefined as string | undefined
  }))
  
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const tx1 = result[i]
      const tx2 = result[j]
      
      // Check if they could be internal transfers
      if (
        Math.abs(Number(tx1.amount) - Number(tx2.amount)) < 0.01 && // Same amount (with small tolerance)
        tx1.type !== tx2.type && // Opposite types (DEBIT vs CREDIT)
        isWithinDays(tx1.date, tx2.date, 3) && // Within 3 days
        couldBeInternalTransfer(tx1.description, tx2.description)
      ) {
        result[i] = { ...tx1, is_internal_transfer: true, related_transaction_id: tx2.fingerprint }
        result[j] = { ...tx2, is_internal_transfer: true, related_transaction_id: tx1.fingerprint }
      }
    }
  }
  
  return result
}

function isWithinDays(date1: string, date2: string, days: number): boolean {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= days
}

function couldBeInternalTransfer(desc1: string, desc2: string): boolean {
  const keywords = [
    'transfer', 'payment', 'credit card', 'cc payment', 'autopay',
    'billpay', 'bill payment', 'account transfer', 'internal transfer'
  ]
  
  const desc1Lower = desc1.toLowerCase()
  const desc2Lower = desc2.toLowerCase()
  
  return keywords.some(keyword => 
    desc1Lower.includes(keyword) || desc2Lower.includes(keyword)
  )
}