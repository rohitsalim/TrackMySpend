import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row']

export interface PaymentMethodBreakdown {
  upi: {
    count: number
    amount: number
  }
  card: {
    count: number
    amount: number
  }
  bankTransfer: {
    count: number
    amount: number
  }
  other: {
    count: number
    amount: number
  }
}

export interface TransactionSummary {
  totalIncome: number
  totalExpenses: number
  totalTransactions: number
  paymentMethods: PaymentMethodBreakdown
}

/**
 * Detect payment method from vendor name and original vendor name
 */
export function detectPaymentMethod(vendorName: string, originalVendorName: string): 'upi' | 'card' | 'bankTransfer' | 'other' {
  const vendorLower = vendorName.toLowerCase()
  const originalLower = originalVendorName.toLowerCase()
  const combined = `${vendorLower} ${originalLower}`
  
  // UPI patterns - most comprehensive check first
  if (
    vendorLower.startsWith('upi-') ||
    originalLower.startsWith('upi-') ||
    combined.includes('upi:') ||
    combined.includes('upi*') ||
    combined.includes('@ybl') ||
    combined.includes('@paytm') ||
    combined.includes('@phonepe') ||
    combined.includes('@okaxis') ||
    combined.includes('@ibl') ||
    combined.includes('@axl') ||
    combined.includes('@icici') ||
    combined.includes('@hdfcbank') ||
    combined.includes('paytm') ||
    combined.includes('phonepe') ||
    combined.includes('googlepay') ||
    combined.includes('gpay') ||
    combined.includes('yespay') ||
    // UPI handle patterns
    originalLower.includes('@') && (
      originalLower.includes('ybl') ||
      originalLower.includes('paytm') ||
      originalLower.includes('phonepe') ||
      originalLower.includes('okaxis') ||
      originalLower.includes('ibl') ||
      originalLower.includes('axl') ||
      originalLower.includes('icici') ||
      originalLower.includes('hdfc')
    )
  ) {
    return 'upi'
  }
  
  // Bank transfer patterns
  if (
    combined.includes('neft') ||
    combined.includes('imps') ||
    combined.includes('rtgs') ||
    combined.includes('ach') ||
    combined.includes('ecs') ||
    combined.includes('nach') ||
    combined.includes('bank transfer') ||
    combined.includes('wire transfer')
  ) {
    return 'bankTransfer'
  }
  
  // Card patterns - both credit and debit cards, online shopping, payment gateways, ATM
  if (
    combined.includes('razor') ||
    combined.includes('payu') ||
    combined.includes('billdesk') ||
    combined.includes('ccavenue') ||
    combined.includes('cashfree') ||
    combined.includes('instamojo') ||
    combined.includes('amazon') ||
    combined.includes('flipkart') ||
    combined.includes('swiggy') ||
    combined.includes('zomato') ||
    combined.includes('myntra') ||
    combined.includes('ajio') ||
    combined.includes('bigbasket') ||
    combined.includes('grofers') ||
    combined.includes('blinkit') ||
    combined.includes('zepto') ||
    combined.includes('netflix') ||
    combined.includes('spotify') ||
    combined.includes('uber') ||
    combined.includes('ola') ||
    combined.includes('atm') ||
    combined.includes('pos') ||
    // Card specific patterns (but not payments TO credit cards)
    (combined.includes('credit card') && !combined.includes('payment')) ||
    (combined.includes('debit card') && !combined.includes('payment')) ||
    // Online shopping patterns
    vendorLower.includes('online') ||
    vendorLower.includes('ecommerce') ||
    vendorLower.includes('withdrawal') ||
    vendorLower.includes('cash') ||
    // Payment gateway reference patterns
    originalVendorName.match(/^[A-Z]{4,}\*/) ||
    originalVendorName.match(/^POS/) ||
    // Long alphanumeric strings typical of card transactions
    (originalVendorName.match(/^[A-Z0-9*#]{8,}/) && !combined.includes('upi'))
  ) {
    return 'card'
  }
  
  return 'other'
}

/**
 * Analyze transactions and provide payment method breakdown
 */
export function analyzeTransactionPatterns(transactions: Transaction[]): TransactionSummary {
  const summary: TransactionSummary = {
    totalIncome: 0,
    totalExpenses: 0,
    totalTransactions: transactions.length,
    paymentMethods: {
      upi: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 },
      bankTransfer: { count: 0, amount: 0 },
      other: { count: 0, amount: 0 }
    }
  }
  
  transactions.forEach(transaction => {
    // Skip internal transfers for expense/income calculation
    if (!transaction.is_internal_transfer) {
      if (transaction.type === 'CREDIT') {
        summary.totalIncome += transaction.amount
      } else if (transaction.type === 'DEBIT') {
        summary.totalExpenses += transaction.amount
      }
    }
    
    // Detect payment method for all transactions
    const paymentMethod = detectPaymentMethod(transaction.vendor_name, transaction.vendor_name_original)
    summary.paymentMethods[paymentMethod].count++
    summary.paymentMethods[paymentMethod].amount += transaction.amount
  })
  
  return summary
}

/**
 * Get the most common payment methods by transaction count
 */
export function getTopPaymentMethods(breakdown: PaymentMethodBreakdown): Array<{method: string, count: number, amount: number}> {
  const methods = [
    { method: 'UPI', count: breakdown.upi.count, amount: breakdown.upi.amount },
    { method: 'Card', count: breakdown.card.count, amount: breakdown.card.amount },
    { method: 'Bank Transfer', count: breakdown.bankTransfer.count, amount: breakdown.bankTransfer.amount },
    { method: 'Other', count: breakdown.other.count, amount: breakdown.other.amount }
  ]
  
  return methods.sort((a, b) => b.count - a.count)
}

/**
 * Format payment method for display
 */
export function formatPaymentMethod(method: string): string {
  switch (method.toLowerCase()) {
    case 'upi':
      return 'UPI'
    case 'card':
      return 'Card'
    case 'banktransfer':
      return 'Bank Transfer'
    default:
      return 'Other'
  }
}