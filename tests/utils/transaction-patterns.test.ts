import { describe, it, expect } from 'vitest'
import { detectPaymentMethod, analyzeTransactionPatterns, getTopPaymentMethods } from '@/lib/utils/transaction-patterns'

describe('Transaction Patterns', () => {
  describe('detectPaymentMethod', () => {
    it('should detect UPI payments', () => {
      expect(detectPaymentMethod('UPI-AMAZON INDIA', 'UPI-AMAZON@RAPL')).toBe('upi')
      expect(detectPaymentMethod('UPI-REKHA P-9611834117eYBL', 'UPI-REKHA P-9611834117eYBL-UJVN')).toBe('upi')
      expect(detectPaymentMethod('UPI-SYED NAZIM', 'NAZIMSYED2@IBL-KKBK000800000')).toBe('upi')
      expect(detectPaymentMethod('UPI-SRI ABHAYA ANJANEYA', 'YESPAY.CSNS172100085')).toBe('upi')
      expect(detectPaymentMethod('UPI-SHAHNAWAZ ALAM', '776045025@AXL-BKID0000005')).toBe('upi')
      expect(detectPaymentMethod('Paytm Payment Gateway', 'PAYTM*12345')).toBe('upi')
      expect(detectPaymentMethod('PhonePe Transaction', 'PHONEPE*67890')).toBe('upi')
    })

    it('should detect card payments', () => {
      expect(detectPaymentMethod('RAZOR1234*MERCHANT', 'RAZOR1234*MERCHANT')).toBe('card')
      expect(detectPaymentMethod('PAYU*12345678', 'PAYU*12345678')).toBe('card')
      expect(detectPaymentMethod('Amazon.in', 'AMAZON INDIA')).toBe('card')
      expect(detectPaymentMethod('Swiggy', 'SWIGGY*ORDER123')).toBe('card')
      expect(detectPaymentMethod('ATM Withdrawal', 'ATM WD 123456')).toBe('card')
      expect(detectPaymentMethod('POS Transaction', 'POS*MERCHANT123')).toBe('card')
    })

    it('should detect bank transfers', () => {
      expect(detectPaymentMethod('NEFT Transfer', 'NEFT*12345')).toBe('bankTransfer')
      expect(detectPaymentMethod('IMPS Payment', 'IMPS*67890')).toBe('bankTransfer')
      expect(detectPaymentMethod('RTGS Transaction', 'RTGS*ABC123')).toBe('bankTransfer')
    })

    it('should default to other for unrecognized patterns', () => {
      expect(detectPaymentMethod('Local Shop', 'CASH PAYMENT')).toBe('other')
      expect(detectPaymentMethod('Unknown Vendor', 'UNKNOWN PATTERN')).toBe('other')
    })
  })

  describe('analyzeTransactionPatterns', () => {
    const mockTransactions = [
      {
        id: '1',
        vendor_name: 'UPI-PERSON NAME',
        vendor_name_original: 'UPI-PERSON@YBL',
        amount: 1000,
        type: 'DEBIT' as const,
        is_internal_transfer: false,
        user_id: 'user1',
        raw_transaction_id: 'raw1',
        category_id: null,
        transaction_date: '2025-01-15',
        notes: null,
        is_duplicate: false,
        duplicate_of_id: null,
        related_transaction_id: null,
        bank_account_id: null,
        credit_card_id: null,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z'
      },
      {
        id: '2',
        vendor_name: 'RAZOR1234*MERCHANT',
        vendor_name_original: 'RAZOR1234*MERCHANT',
        amount: 2000,
        type: 'DEBIT' as const,
        is_internal_transfer: false,
        user_id: 'user1',
        raw_transaction_id: 'raw2',
        category_id: null,
        transaction_date: '2025-01-15',
        notes: null,
        is_duplicate: false,
        duplicate_of_id: null,
        related_transaction_id: null,
        bank_account_id: null,
        credit_card_id: null,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z'
      },
      {
        id: '5',
        vendor_name: 'ATM Withdrawal',
        vendor_name_original: 'ATM WD 123456',
        amount: 1000,
        type: 'DEBIT' as const,
        is_internal_transfer: false,
        user_id: 'user1',
        raw_transaction_id: 'raw5',
        category_id: null,
        transaction_date: '2025-01-15',
        notes: null,
        is_duplicate: false,
        duplicate_of_id: null,
        related_transaction_id: null,
        bank_account_id: null,
        credit_card_id: null,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z'
      },
      {
        id: '3',
        vendor_name: 'Salary Credit',
        vendor_name_original: 'SALARY CREDIT',
        amount: 50000,
        type: 'CREDIT' as const,
        is_internal_transfer: false,
        user_id: 'user1',
        raw_transaction_id: 'raw3',
        category_id: null,
        transaction_date: '2025-01-15',
        notes: null,
        is_duplicate: false,
        duplicate_of_id: null,
        related_transaction_id: null,
        bank_account_id: null,
        credit_card_id: null,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z'
      },
      {
        id: '4',
        vendor_name: 'Credit Card Payment',
        vendor_name_original: 'CC PAYMENT',
        amount: 5000,
        type: 'DEBIT' as const,
        is_internal_transfer: true,
        user_id: 'user1',
        raw_transaction_id: 'raw4',
        category_id: null,
        transaction_date: '2025-01-15',
        notes: null,
        is_duplicate: false,
        duplicate_of_id: null,
        related_transaction_id: null,
        bank_account_id: null,
        credit_card_id: null,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z'
      }
    ]

    it('should correctly analyze transaction patterns', () => {
      const analysis = analyzeTransactionPatterns(mockTransactions)
      
      expect(analysis.totalIncome).toBe(50000)
      expect(analysis.totalExpenses).toBe(4000) // Excludes internal transfer (1000 + 2000 + 1000)
      expect(analysis.totalTransactions).toBe(5)
      
      // Check payment method breakdown
      expect(analysis.paymentMethods.upi.count).toBe(1)
      expect(analysis.paymentMethods.upi.amount).toBe(1000)
      
      expect(analysis.paymentMethods.card.count).toBe(2) // RAZOR merchant + ATM withdrawal
      expect(analysis.paymentMethods.card.amount).toBe(3000)
      
      expect(analysis.paymentMethods.other.count).toBe(2) // Salary + CC Payment
      expect(analysis.paymentMethods.other.amount).toBe(55000)
    })

    it('should handle empty transactions array', () => {
      const analysis = analyzeTransactionPatterns([])
      
      expect(analysis.totalIncome).toBe(0)
      expect(analysis.totalExpenses).toBe(0)
      expect(analysis.totalTransactions).toBe(0)
      expect(analysis.paymentMethods.upi.count).toBe(0)
    })
  })

  describe('getTopPaymentMethods', () => {
    const mockBreakdown = {
      upi: { count: 10, amount: 5000 },
      card: { count: 5, amount: 10000 },
      bankTransfer: { count: 2, amount: 20000 },
      other: { count: 1, amount: 1000 }
    }

    it('should return methods sorted by count', () => {
      const top = getTopPaymentMethods(mockBreakdown)
      
      expect(top[0].method).toBe('UPI')
      expect(top[0].count).toBe(10)
      expect(top[1].method).toBe('Card')
      expect(top[1].count).toBe(5)
      expect(top[2].method).toBe('Bank Transfer')
      expect(top[2].count).toBe(2)
      expect(top[3].method).toBe('Other')
      expect(top[3].count).toBe(1)
    })
  })
})