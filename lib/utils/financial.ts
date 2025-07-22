/**
 * Financial arithmetic utilities using Decimal.js to prevent floating point errors
 * Following .cursorrules requirement for safe monetary calculations
 */

import { Decimal } from 'decimal.js'

// Configure Decimal.js for financial precision
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9e15,
  toExpPos: 9e15,
  maxE: 9e15,
  minE: -9e15
})

export function addAmounts(amount1: string, amount2: string): string {
  const a1 = new Decimal(amount1)
  const a2 = new Decimal(amount2)
  return a1.add(a2).toFixed(2)
}

export function subtractAmounts(amount1: string, amount2: string): string {
  const a1 = new Decimal(amount1)
  const a2 = new Decimal(amount2)
  return a1.sub(a2).toFixed(2)
}

export function multiplyAmount(amount: string, factor: number): string {
  const decimal = new Decimal(amount)
  return decimal.mul(factor).toFixed(2)
}

export function compareAmounts(amount1: string, amount2: string): number {
  const a1 = new Decimal(amount1)
  const a2 = new Decimal(amount2)
  return a1.cmp(a2)
}

export function isValidAmount(amount: string): boolean {
  try {
    const decimal = new Decimal(amount)
    return decimal.gte(0) && decimal.isFinite()
  } catch {
    return false
  }
}

export function formatCurrency(amount: string, currency = 'INR', locale = 'en-IN'): string {
  const decimal = new Decimal(amount)
  const num = decimal.toNumber()
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
  
  try {
    const decimal = new Decimal(cleaned)
    return decimal.toFixed(2)
  } catch {
    throw new Error(`Invalid amount: ${amountString}`)
  }
}