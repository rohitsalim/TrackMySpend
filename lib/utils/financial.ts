/**
 * Financial arithmetic utilities to prevent floating point errors
 * Following .cursorrules requirement for safe monetary calculations
 */

export function addAmounts(amount1: string, amount2: string): string {
  const a1 = Number(amount1)
  const a2 = Number(amount2)
  return (a1 + a2).toFixed(2)
}

export function subtractAmounts(amount1: string, amount2: string): string {
  const a1 = Number(amount1)
  const a2 = Number(amount2)
  return (a1 - a2).toFixed(2)
}

export function multiplyAmount(amount: string, factor: number): string {
  return (Number(amount) * factor).toFixed(2)
}

export function compareAmounts(amount1: string, amount2: string): number {
  const a1 = Number(amount1)
  const a2 = Number(amount2)
  return a1 - a2
}

export function isValidAmount(amount: string): boolean {
  const num = Number(amount)
  return !isNaN(num) && num >= 0 && Number.isFinite(num)
}

export function formatCurrency(amount: string, currency = 'INR', locale = 'en-IN'): string {
  const num = Number(amount)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

export function parseAmountFromString(amountString: string): string {
  if (!amountString || amountString.trim().length === 0) {
    throw new Error(`Invalid amount: ${amountString}`)
  }
  
  // Remove currency symbols and commas
  const cleaned = amountString.replace(/[₹$£€,\s]/g, '')
  const num = Number(cleaned)
  
  if (isNaN(num)) {
    throw new Error(`Invalid amount: ${amountString}`)
  }
  
  return num.toFixed(2)
}