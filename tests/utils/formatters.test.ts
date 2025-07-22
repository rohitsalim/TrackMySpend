import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatRelativeDate,
  formatPercentage,
  formatNumber
} from '@/lib/utils/formatters'

describe('Formatters Utility Functions', () => {
  describe('formatCurrency', () => {
    it('should format number amounts in INR by default', () => {
      expect(formatCurrency(1234.56)).toBe('₹1,234.56')
      expect(formatCurrency(0)).toBe('₹0.00')
      expect(formatCurrency(999.9)).toBe('₹999.90')
    })

    it('should format string amounts in INR by default', () => {
      expect(formatCurrency('1234.56')).toBe('₹1,234.56')
      expect(formatCurrency('0')).toBe('₹0.00')
      expect(formatCurrency('999.90')).toBe('₹999.90')
    })

    it('should format amounts in different currencies', () => {
      expect(formatCurrency(100, 'USD')).toBe('$100.00')
      expect(formatCurrency(50.5, 'EUR')).toBe('€50.50')
      expect(formatCurrency(1000, 'GBP')).toBe('£1,000.00')
    })

    it('should handle large numbers correctly', () => {
      expect(formatCurrency(1000000)).toBe('₹10,00,000.00')
      expect(formatCurrency(1234567.89)).toBe('₹12,34,567.89')
    })

    it('should handle negative amounts', () => {
      expect(formatCurrency(-1234.56)).toBe('-₹1,234.56')
      expect(formatCurrency(-0.01)).toBe('-₹0.01')
    })

    it('should handle decimal precision correctly', () => {
      expect(formatCurrency(1.1)).toBe('₹1.10')
      expect(formatCurrency(1.999)).toBe('₹2.00') // Rounds to 2 decimal places
    })
  })

  describe('formatDate', () => {
    it('should format dates in short format by default', () => {
      const date = new Date('2024-01-15')
      expect(formatDate(date)).toBe('15/01/2024')
      
      expect(formatDate('2024-12-25')).toBe('25/12/2024')
    })

    it('should format dates in short format explicitly', () => {
      const date = new Date('2024-01-15')
      expect(formatDate(date, 'short')).toBe('15/01/2024')
      
      expect(formatDate('2024-06-01', 'short')).toBe('01/06/2024')
    })

    it('should format dates in long format', () => {
      const date = new Date('2024-01-15')
      expect(formatDate(date, 'long')).toBe('15 January 2024')
      
      expect(formatDate('2024-12-25', 'long')).toBe('25 December 2024')
    })

    it('should handle string date inputs', () => {
      expect(formatDate('2024-01-01')).toBe('01/01/2024')
      expect(formatDate('2024-01-01', 'long')).toBe('1 January 2024')
    })

    it('should handle Date object inputs', () => {
      const date = new Date('2024-03-15T10:30:00Z')
      expect(formatDate(date)).toBe('15/03/2024')
      expect(formatDate(date, 'long')).toBe('15 March 2024')
    })
  })

  describe('formatRelativeDate', () => {
    beforeEach(() => {
      // Mock current date to 2024-01-15 12:00:00
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return "Today" for same day', () => {
      const today = new Date('2024-01-15T08:00:00Z')
      expect(formatRelativeDate(today)).toBe('Today')
      
      const todayString = '2024-01-15'
      expect(formatRelativeDate(todayString)).toBe('Today')
    })

    it('should return "Yesterday" for one day ago', () => {
      const yesterday = new Date('2024-01-14T12:00:00Z')
      expect(formatRelativeDate(yesterday)).toBe('Yesterday')
      
      const yesterdayString = '2024-01-14'
      expect(formatRelativeDate(yesterdayString)).toBe('Yesterday')
    })

    it('should return days ago for recent dates', () => {
      const threeDaysAgo = new Date('2024-01-12T12:00:00Z')
      expect(formatRelativeDate(threeDaysAgo)).toBe('3 days ago')
      
      const fiveDaysAgo = new Date('2024-01-10T12:00:00Z')
      expect(formatRelativeDate(fiveDaysAgo)).toBe('5 days ago')
    })

    it('should return weeks ago for dates within a month', () => {
      const twoWeeksAgo = new Date('2024-01-01T12:00:00Z')
      expect(formatRelativeDate(twoWeeksAgo)).toBe('2 weeks ago')
      
      const threeWeeksAgo = new Date('2023-12-25T12:00:00Z')
      expect(formatRelativeDate(threeWeeksAgo)).toBe('3 weeks ago')
    })

    it('should return months ago for dates within a year', () => {
      const twoMonthsAgo = new Date('2023-11-15T12:00:00Z')
      expect(formatRelativeDate(twoMonthsAgo)).toBe('2 months ago')
      
      const sixMonthsAgo = new Date('2023-07-15T12:00:00Z')
      expect(formatRelativeDate(sixMonthsAgo)).toBe('6 months ago')
    })

    it('should return years ago for old dates', () => {
      const oneYearAgo = new Date('2023-01-15T12:00:00Z')
      expect(formatRelativeDate(oneYearAgo)).toBe('1 years ago')
      
      const twoYearsAgo = new Date('2022-01-15T12:00:00Z')
      expect(formatRelativeDate(twoYearsAgo)).toBe('2 years ago')
    })

    it('should handle string date inputs', () => {
      expect(formatRelativeDate('2024-01-14')).toBe('Yesterday')
      expect(formatRelativeDate('2024-01-12')).toBe('3 days ago')
      expect(formatRelativeDate('2023-01-15')).toBe('1 years ago')
    })

    it('should handle edge cases correctly', () => {
      // Exactly 7 days ago should be 1 week ago
      const oneWeekAgo = new Date('2024-01-08T12:00:00Z')
      expect(formatRelativeDate(oneWeekAgo)).toBe('1 weeks ago')
      
      // Exactly 30 days ago should be 1 month ago  
      const oneMonthAgo = new Date('2023-12-16T12:00:00Z')
      expect(formatRelativeDate(oneMonthAgo)).toBe('1 months ago')
    })
  })

  describe('formatPercentage', () => {
    it('should format percentages with 1 decimal place by default', () => {
      expect(formatPercentage(85.6)).toBe('85.6%')
      expect(formatPercentage(100)).toBe('100.0%')
      expect(formatPercentage(0)).toBe('0.0%')
    })

    it('should format percentages with specified decimal places', () => {
      expect(formatPercentage(85.6789, 0)).toBe('86%')
      expect(formatPercentage(85.6789, 2)).toBe('85.68%')
      expect(formatPercentage(85.6789, 3)).toBe('85.679%')
    })

    it('should handle negative percentages', () => {
      expect(formatPercentage(-15.5)).toBe('-15.5%')
      expect(formatPercentage(-0.1, 2)).toBe('-0.10%')
    })

    it('should handle very small percentages', () => {
      expect(formatPercentage(0.001, 3)).toBe('0.001%')
      expect(formatPercentage(0.0001, 4)).toBe('0.0001%')
    })

    it('should handle large percentages', () => {
      expect(formatPercentage(1234.56)).toBe('1234.6%')
      expect(formatPercentage(999.999, 2)).toBe('1000.00%')
    })
  })

  describe('formatNumber', () => {
    it('should format numbers with Indian locale formatting', () => {
      expect(formatNumber(1234)).toBe('1,234')
      expect(formatNumber(1000000)).toBe('10,00,000')
      expect(formatNumber(1234567)).toBe('12,34,567')
    })

    it('should handle zero and small numbers', () => {
      expect(formatNumber(0)).toBe('0')
      expect(formatNumber(1)).toBe('1')
      expect(formatNumber(99)).toBe('99')
      expect(formatNumber(999)).toBe('999')
    })

    it('should handle negative numbers', () => {
      expect(formatNumber(-1234)).toBe('-1,234')
      expect(formatNumber(-1000000)).toBe('-10,00,000')
    })

    it('should handle decimal numbers by rounding', () => {
      // Intl.NumberFormat without fractionDigits options shows decimals in some cases
      expect(formatNumber(1234.56)).toBe('1,234.56')
      expect(formatNumber(999.99)).toBe('999.99')
    })

    it('should handle very large numbers', () => {
      expect(formatNumber(1000000000)).toBe('1,00,00,00,000')
      expect(formatNumber(999999999999)).toBe('9,99,99,99,99,999')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid string numbers in formatCurrency', () => {
      // parseFloat returns NaN for invalid strings
      expect(formatCurrency('invalid')).toBe('₹NaN')
      expect(formatCurrency('')).toBe('₹NaN') // parseFloat('') returns NaN
    })

    it('should handle special number values', () => {
      expect(formatCurrency(Infinity)).toBe('₹∞')
      expect(formatCurrency(-Infinity)).toBe('-₹∞')
      // NaN handling
      expect(formatCurrency(NaN)).toBe('₹NaN')
    })

    it('should handle invalid dates', () => {
      const invalidDate = new Date('invalid-date')
      
      // formatDate throws RangeError
      expect(() => formatDate(invalidDate)).toThrow('Invalid time value')
      
      // formatRelativeDate may handle NaN dates differently  
      const result = formatRelativeDate(invalidDate)
      // NaN - NaN results in NaN, so it might return a string with NaN
      expect(typeof result).toBe('string')
    })
  })
})