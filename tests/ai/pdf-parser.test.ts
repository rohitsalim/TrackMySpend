import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parsePDFStatement } from '@/lib/ai/pdf-parser'

// Mock the AI SDK
vi.mock('ai', () => ({
  generateObject: vi.fn()
}))

// Mock @ai-sdk/openai
vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn()
}))

describe('PDF Parser', () => {
  beforeEach(() => {
    // Set mock environment variable
    process.env.OPENAI_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should parse PDF statement successfully', async () => {
    const { generateObject } = await import('ai')
    const mockGenerateObject = generateObject as any
    
    const mockStatement = {
      statement_type: 'bank',
      bank_name: 'HDFC Bank',
      statement_start_date: '2024-01-01',
      statement_end_date: '2024-01-31',
      base_currency: 'INR',
      account_number: '1234',
      account_type: 'SAVINGS',
      full_credit_card_number: '',
      card_type: '',
      transactions: [
        {
          date: '2024-01-15',
          description: 'Amazon India',
          reference_number: 'REF123',
          raw_text: '2024-01-15;Amazon India;REF123;1234.56 DR',
          amount: '1234.56',
          type: 'DEBIT',
          original_currency: '',
          original_amount: null
        }
      ]
    }

    mockGenerateObject.mockResolvedValue({
      object: mockStatement
    })

    const pdfText = `
      HDFC Bank Statement
      Period: 01-Jan-2024 to 31-Jan-2024
      Account: XXXX1234 (SAVINGS)
      
      Date        Description    Ref      Amount
      15-Jan-24   Amazon India   REF123   1,234.56 DR
    `

    const result = await parsePDFStatement(pdfText)

    expect(result.success).toBe(true)
    expect(result.statement).toEqual(mockStatement)
    expect(result.parsing_confidence).toBeGreaterThan(0)
    expect(mockGenerateObject).toHaveBeenCalled()
  })

  it('should handle parsing errors', async () => {
    const { generateObject } = await import('ai')
    const mockGenerateObject = generateObject as any
    
    mockGenerateObject.mockRejectedValue(new Error('API rate limit exceeded'))

    const result = await parsePDFStatement('invalid pdf text')

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('PARSING_FAILED')
    expect(result.error?.message).toBe('API rate limit exceeded')
  })

  it('should handle missing API key', async () => {
    delete process.env.OPENAI_API_KEY

    const result = await parsePDFStatement('any text')

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('MISSING_API_KEY')
    expect(result.error?.message).toBe('OpenAI API key is not configured')
  })

  it('should calculate parsing confidence correctly', async () => {
    const { generateObject } = await import('ai')
    const mockGenerateObject = generateObject as any
    
    // High confidence statement with complete data
    const highConfidenceStatement = {
      statement_type: 'credit_card',
      bank_name: 'ICICI Bank',
      statement_start_date: '2024-01-01',
      statement_end_date: '2024-01-31',
      base_currency: 'INR',
      account_number: '',
      account_type: '',
      full_credit_card_number: '4532-XXXX-XXXX-1234',
      card_type: 'VISA',
      transactions: [
        {
          date: '2024-01-15',
          description: 'Amazon India',
          reference_number: 'REF123',
          raw_text: '15-01-2024;Amazon India;REF123;1234.56',
          amount: '1234.56',
          type: 'DEBIT',
          original_currency: 'USD',
          original_amount: '15.50'
        },
        {
          date: '2024-01-16',
          description: 'Swiggy',
          reference_number: 'REF456',
          raw_text: '16-01-2024;Swiggy;REF456;567.89',
          amount: '567.89',
          type: 'DEBIT',
          original_currency: '',
          original_amount: null
        }
      ]
    }

    mockGenerateObject.mockResolvedValue({
      object: highConfidenceStatement
    })

    const result = await parsePDFStatement('complete statement text')

    expect(result.success).toBe(true)
    expect(result.parsing_confidence).toBeGreaterThanOrEqual(80) // High confidence expected
  })

  it('should handle foreign currency transactions', async () => {
    const { generateObject } = await import('ai')
    const mockGenerateObject = generateObject as any
    
    const statementWithForeignTx = {
      statement_type: 'credit_card',
      bank_name: 'HDFC Bank',
      statement_start_date: '2024-01-01',
      statement_end_date: '2024-01-31',
      base_currency: 'INR',
      account_number: '',
      account_type: '',
      full_credit_card_number: '4532-XXXX-XXXX-1234',
      card_type: 'VISA',
      transactions: [
        {
          date: '2024-01-15',
          description: 'Amazon.com',
          reference_number: '',
          raw_text: '15-01-2024;Amazon.com USD 29.95;Converted: 2,487.63 INR',
          amount: '2487.63',
          type: 'DEBIT',
          original_currency: 'USD',
          original_amount: '29.95'
        }
      ]
    }

    mockGenerateObject.mockResolvedValue({
      object: statementWithForeignTx
    })

    const result = await parsePDFStatement('statement with foreign currency')

    expect(result.success).toBe(true)
    expect(result.statement?.transactions[0].original_currency).toBe('USD')
    expect(result.statement?.transactions[0].original_amount).toBe('29.95')
    expect(result.statement?.transactions[0].amount).toBe('2487.63') // Converted amount
  })
})