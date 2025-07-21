import { describe, it, expect } from 'vitest'
import { transactionSchema, statementSchema } from '@/types/pdf-processing'

describe('PDF Processing Types', () => {
  describe('transactionSchema', () => {
    it('should validate a complete transaction', () => {
      const validTransaction = {
        date: '2024-01-15',
        description: 'Amazon India',
        reference_number: 'REF123',
        raw_text: '15-01-2024;Amazon India;REF123;1234.56 DR',
        amount: '1234.56',
        type: 'DEBIT',
        original_currency: '',
        original_amount: null
      }

      const result = transactionSchema.safeParse(validTransaction)
      expect(result.success).toBe(true)
    })

    it('should validate transaction with foreign currency', () => {
      const foreignTransaction = {
        date: '2024-01-15',
        description: 'Amazon.com',
        reference_number: '',
        raw_text: '15-01-2024;Amazon.com USD 29.95',
        amount: '2487.63',
        type: 'DEBIT',
        original_currency: 'USD',
        original_amount: '29.95'
      }

      const result = transactionSchema.safeParse(foreignTransaction)
      expect(result.success).toBe(true)
    })

    it('should reject invalid date format', () => {
      const invalidTransaction = {
        date: '15-01-2024', // Wrong format
        description: 'Amazon India',
        reference_number: '',
        raw_text: 'transaction text',
        amount: '1234.56',
        type: 'DEBIT',
        original_currency: '',
        original_amount: null
      }

      const result = transactionSchema.safeParse(invalidTransaction)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toContain('YYYY-MM-DD format')
    })

    it('should reject invalid amount', () => {
      const invalidTransaction = {
        date: '2024-01-15',
        description: 'Amazon India',
        reference_number: '',
        raw_text: 'transaction text',
        amount: '-1234.56', // Negative amount
        type: 'DEBIT',
        original_currency: '',
        original_amount: null
      }

      const result = transactionSchema.safeParse(invalidTransaction)
      expect(result.success).toBe(false)
    })

    it('should reject invalid transaction type', () => {
      const invalidTransaction = {
        date: '2024-01-15',
        description: 'Amazon India',
        reference_number: '',
        raw_text: 'transaction text',
        amount: '1234.56',
        type: 'INVALID_TYPE', // Invalid type
        original_currency: '',
        original_amount: null
      }

      const result = transactionSchema.safeParse(invalidTransaction)
      expect(result.success).toBe(false)
    })

    it('should set default values correctly', () => {
      const minimalTransaction = {
        date: '2024-01-15',
        description: 'Amazon India',
        raw_text: 'transaction text',
        amount: '1234.56',
        type: 'DEBIT'
      }

      const result = transactionSchema.parse(minimalTransaction)
      expect(result.reference_number).toBe('')
      expect(result.original_currency).toBe('')
      expect(result.original_amount).toBe(null)
    })
  })

  describe('statementSchema', () => {
    it('should validate a bank statement', () => {
      const bankStatement = {
        statement_type: 'bank',
        bank_name: 'HDFC Bank',
        statement_start_date: '2024-01-01',
        statement_end_date: '2024-01-31',
        base_currency: 'INR',
        account_number: '1234',
        account_type: 'SAVINGS',
        transactions: [
          {
            date: '2024-01-15',
            description: 'Amazon India',
            reference_number: 'REF123',
            raw_text: 'transaction text',
            amount: '1234.56',
            type: 'DEBIT',
            original_currency: '',
            original_amount: null
          }
        ]
      }

      const result = statementSchema.safeParse(bankStatement)
      expect(result.success).toBe(true)
    })

    it('should validate a credit card statement', () => {
      const creditCardStatement = {
        statement_type: 'credit_card',
        bank_name: 'ICICI Bank',
        statement_start_date: '2024-01-01',
        statement_end_date: '2024-01-31',
        base_currency: 'INR',
        full_credit_card_number: '4532-XXXX-XXXX-1234',
        card_type: 'VISA',
        transactions: [
          {
            date: '2024-01-15',
            description: 'Amazon India',
            reference_number: '',
            raw_text: 'transaction text',
            amount: '1234.56',
            type: 'DEBIT',
            original_currency: '',
            original_amount: null
          }
        ]
      }

      const result = statementSchema.safeParse(creditCardStatement)
      expect(result.success).toBe(true)
    })

    it('should reject statement without transactions', () => {
      const emptyStatement = {
        statement_type: 'bank',
        bank_name: 'HDFC Bank',
        statement_start_date: '2024-01-01',
        statement_end_date: '2024-01-31',
        transactions: []
      }

      const result = statementSchema.safeParse(emptyStatement)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toContain('At least one transaction is required')
    })

    it('should reject invalid statement type', () => {
      const invalidStatement = {
        statement_type: 'invalid_type',
        bank_name: 'HDFC Bank',
        statement_start_date: '2024-01-01',
        statement_end_date: '2024-01-31',
        transactions: [
          {
            date: '2024-01-15',
            description: 'Amazon India',
            reference_number: '',
            raw_text: 'transaction text',
            amount: '1234.56',
            type: 'DEBIT',
            original_currency: '',
            original_amount: null
          }
        ]
      }

      const result = statementSchema.safeParse(invalidStatement)
      expect(result.success).toBe(false)
    })

    it('should set default values for base currency', () => {
      const statement = {
        statement_type: 'bank',
        bank_name: 'HDFC Bank',
        statement_start_date: '2024-01-01',
        statement_end_date: '2024-01-31',
        transactions: [
          {
            date: '2024-01-15',
            description: 'Amazon India',
            reference_number: '',
            raw_text: 'transaction text',
            amount: '1234.56',
            type: 'DEBIT',
            original_currency: '',
            original_amount: null
          }
        ]
      }

      const result = statementSchema.parse(statement)
      expect(result.base_currency).toBe('INR')
    })
  })
})