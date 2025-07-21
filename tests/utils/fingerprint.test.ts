import { describe, it, expect } from 'vitest'
import {
  generateTransactionFingerprint,
  normalizeVendorName,
  generateFingerprintsForTransactions,
  detectDuplicateTransactions,
  detectInternalTransfers
} from '@/lib/utils/fingerprint'
import type { Transaction } from '@/types/pdf-processing'

describe('Fingerprint Utils', () => {
  const userId = 'test-user-123'

  describe('normalizeVendorName', () => {
    it('should normalize vendor names correctly', () => {
      expect(normalizeVendorName('DR AMAZON INDIA')).toBe('amazon india')
      expect(normalizeVendorName('CREDIT SWIGGY PVT LTD')).toBe('swiggy pvt ltd')
      expect(normalizeVendorName('Zomato-Online@Food')).toBe('zomato online food')
    })

    it('should handle special characters', () => {
      expect(normalizeVendorName('ATM@HDFC-BANK!!!')).toBe('atm hdfc bank')
      expect(normalizeVendorName('UPI/PAYTM*WALLET')).toBe('upi paytm wallet')
    })
  })

  describe('generateTransactionFingerprint', () => {
    it('should generate consistent fingerprints', () => {
      const fp1 = generateTransactionFingerprint('2024-01-15', '1234.56', 'Amazon India', userId)
      const fp2 = generateTransactionFingerprint('2024-01-15', '1234.56', 'Amazon India', userId)
      
      expect(fp1).toBe(fp2)
      expect(fp1).toMatch(/^[a-f0-9]{64}$/) // SHA256 hash
    })

    it('should generate different fingerprints for different data', () => {
      const fp1 = generateTransactionFingerprint('2024-01-15', '1234.56', 'Amazon India', userId)
      const fp2 = generateTransactionFingerprint('2024-01-16', '1234.56', 'Amazon India', userId)
      const fp3 = generateTransactionFingerprint('2024-01-15', '1234.57', 'Amazon India', userId)
      
      expect(fp1).not.toBe(fp2)
      expect(fp1).not.toBe(fp3)
      expect(fp2).not.toBe(fp3)
    })

    it('should normalize amounts for consistent fingerprints', () => {
      const fp1 = generateTransactionFingerprint('2024-01-15', '1234.5', 'Amazon', userId)
      const fp2 = generateTransactionFingerprint('2024-01-15', '1234.50', 'Amazon', userId)
      
      expect(fp1).toBe(fp2)
    })
  })

  describe('generateFingerprintsForTransactions', () => {
    it('should add fingerprints to all transactions', () => {
      const transactions: Transaction[] = [
        {
          date: '2024-01-15',
          description: 'Amazon India',
          reference_number: 'REF123',
          raw_text: 'Amazon India transaction',
          amount: '1234.56',
          type: 'DEBIT',
          original_currency: '',
          original_amount: null
        },
        {
          date: '2024-01-16',
          description: 'Swiggy',
          reference_number: '',
          raw_text: 'Swiggy food order',
          amount: '567.89',
          type: 'DEBIT',
          original_currency: '',
          original_amount: null
        }
      ]

      const result = generateFingerprintsForTransactions(transactions, userId)
      
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('fingerprint')
      expect(result[1]).toHaveProperty('fingerprint')
      expect(result[0].fingerprint).toMatch(/^[a-f0-9]{64}$/)
      expect(result[1].fingerprint).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('detectDuplicateTransactions', () => {
    it('should detect exact duplicates', () => {
      const transactions = [
        {
          date: '2024-01-15',
          description: 'Amazon India',
          reference_number: 'REF123',
          raw_text: 'Amazon transaction',
          amount: '1234.56',
          type: 'DEBIT' as const,
          original_currency: '',
          original_amount: null,
          fingerprint: 'same-fingerprint-123'
        },
        {
          date: '2024-01-15',
          description: 'Amazon India',
          reference_number: 'REF123',
          raw_text: 'Amazon transaction',
          amount: '1234.56',
          type: 'DEBIT' as const,
          original_currency: '',
          original_amount: null,
          fingerprint: 'same-fingerprint-123'
        },
        {
          date: '2024-01-16',
          description: 'Swiggy',
          reference_number: 'REF456',
          raw_text: 'Swiggy transaction',
          amount: '567.89',
          type: 'DEBIT' as const,
          original_currency: '',
          original_amount: null,
          fingerprint: 'different-fingerprint-456'
        }
      ]

      const { unique, duplicates } = detectDuplicateTransactions(transactions)
      
      expect(unique).toHaveLength(2)
      expect(duplicates).toHaveLength(1)
      expect(duplicates[0].is_duplicate).toBe(true)
      expect(duplicates[0].duplicate_of).toBe('same-fingerprint-123')
    })
  })

  describe('detectInternalTransfers', () => {
    it('should detect credit card payments', () => {
      const transactions = [
        {
          date: '2024-01-15',
          description: 'CREDIT CARD PAYMENT',
          reference_number: 'REF123',
          raw_text: 'Credit card payment',
          amount: '5000.00',
          type: 'DEBIT' as const,
          original_currency: '',
          original_amount: null,
          fingerprint: 'debit-fingerprint',
          is_internal_transfer: false,
          related_transaction_id: undefined as string | undefined
        },
        {
          date: '2024-01-15',
          description: 'PAYMENT RECEIVED',
          reference_number: 'REF124',
          raw_text: 'Payment received from bank',
          amount: '5000.00',
          type: 'CREDIT' as const,
          original_currency: '',
          original_amount: null,
          fingerprint: 'credit-fingerprint',
          is_internal_transfer: false,
          related_transaction_id: undefined as string | undefined
        },
        {
          date: '2024-01-16',
          description: 'Amazon purchase',
          reference_number: 'REF125',
          raw_text: 'Amazon purchase',
          amount: '1000.00',
          type: 'DEBIT' as const,
          original_currency: '',
          original_amount: null,
          fingerprint: 'amazon-fingerprint',
          is_internal_transfer: false,
          related_transaction_id: undefined as string | undefined
        }
      ]

      const result = detectInternalTransfers(transactions)
      
      expect(result[0].is_internal_transfer).toBe(true)
      expect(result[1].is_internal_transfer).toBe(true)
      expect(result[2].is_internal_transfer).toBe(false)
      expect(result[0].related_transaction_id).toBe('credit-fingerprint')
      expect(result[1].related_transaction_id).toBe('debit-fingerprint')
    })

    it('should not detect internal transfers for different amounts', () => {
      const transactions = [
        {
          date: '2024-01-15',
          description: 'PAYMENT',
          reference_number: 'REF123',
          raw_text: 'Payment transaction',
          amount: '5000.00',
          type: 'DEBIT' as const,
          original_currency: '',
          original_amount: null,
          fingerprint: 'debit-fp',
          is_internal_transfer: false,
          related_transaction_id: undefined as string | undefined
        },
        {
          date: '2024-01-15',
          description: 'PAYMENT RECEIVED',
          reference_number: 'REF124',
          raw_text: 'Payment received',
          amount: '4999.99',
          type: 'CREDIT' as const,
          original_currency: '',
          original_amount: null,
          fingerprint: 'credit-fp',
          is_internal_transfer: false,
          related_transaction_id: undefined as string | undefined
        }
      ]

      const result = detectInternalTransfers(transactions)
      
      expect(result[0].is_internal_transfer).toBe(false)
      expect(result[1].is_internal_transfer).toBe(false)
    })
  })
})