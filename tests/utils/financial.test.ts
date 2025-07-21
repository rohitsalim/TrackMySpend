import { describe, it, expect } from 'vitest'
import {
  addAmounts,
  subtractAmounts,
  multiplyAmount,
  compareAmounts,
  isValidAmount,
  formatCurrency,
  parseAmountFromString
} from '@/lib/utils/financial'

describe('Financial Utils', () => {
  describe('addAmounts', () => {
    it('should add two amounts correctly', () => {
      expect(addAmounts('100.50', '25.25')).toBe('125.75')
    })

    it('should handle zero values', () => {
      expect(addAmounts('0.00', '100.50')).toBe('100.50')
      expect(addAmounts('100.50', '0.00')).toBe('100.50')
    })

    it('should handle floating point precision issues', () => {
      expect(addAmounts('0.1', '0.2')).toBe('0.30')
      expect(addAmounts('1000.99', '0.01')).toBe('1001.00')
    })
  })

  describe('subtractAmounts', () => {
    it('should subtract amounts correctly', () => {
      expect(subtractAmounts('100.50', '25.25')).toBe('75.25')
    })

    it('should handle negative results', () => {
      expect(subtractAmounts('25.25', '100.50')).toBe('-75.25')
    })

    it('should handle zero values', () => {
      expect(subtractAmounts('100.50', '0.00')).toBe('100.50')
      expect(subtractAmounts('100.50', '100.50')).toBe('0.00')
    })
  })

  describe('multiplyAmount', () => {
    it('should multiply amount by factor', () => {
      expect(multiplyAmount('100.50', 2)).toBe('201.00')
      expect(multiplyAmount('100.50', 0.5)).toBe('50.25')
    })

    it('should handle decimal precision', () => {
      expect(multiplyAmount('10.33', 3)).toBe('30.99')
    })
  })

  describe('compareAmounts', () => {
    it('should compare amounts correctly', () => {
      expect(compareAmounts('100.50', '100.50')).toBe(0)
      expect(compareAmounts('100.50', '50.25')).toBeGreaterThan(0)
      expect(compareAmounts('50.25', '100.50')).toBeLessThan(0)
    })
  })

  describe('isValidAmount', () => {
    it('should validate positive amounts', () => {
      expect(isValidAmount('100.50')).toBe(true)
      expect(isValidAmount('0.00')).toBe(true)
    })

    it('should reject invalid amounts', () => {
      expect(isValidAmount('-100.50')).toBe(false)
      expect(isValidAmount('abc')).toBe(false)
      expect(isValidAmount('NaN')).toBe(false)
      expect(isValidAmount('Infinity')).toBe(false)
    })
  })

  describe('formatCurrency', () => {
    it('should format INR currency correctly', () => {
      const formatted = formatCurrency('1234.56')
      expect(formatted).toContain('1,234.56')
    })

    it('should handle different currencies', () => {
      const usd = formatCurrency('1234.56', 'USD', 'en-US')
      expect(usd).toContain('1,234.56')
    })
  })

  describe('parseAmountFromString', () => {
    it('should parse amounts with currency symbols', () => {
      expect(parseAmountFromString('₹1,234.56')).toBe('1234.56')
      expect(parseAmountFromString('$1,234.56')).toBe('1234.56')
      expect(parseAmountFromString('1,234.56')).toBe('1234.56')
    })

    it('should handle amounts without symbols', () => {
      expect(parseAmountFromString('1234.56')).toBe('1234.56')
      expect(parseAmountFromString('1234')).toBe('1234.00')
    })

    it('should throw on invalid amounts', () => {
      expect(() => parseAmountFromString('invalid')).toThrow('Invalid amount')
      expect(() => parseAmountFromString('')).toThrow('Invalid amount')
    })
  })
})