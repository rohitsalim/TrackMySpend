import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { extractTextFromPDF, preprocessPDFText } from '@/lib/utils/pdf-extractor'

// Mock the AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn()
}))

// Mock @ai-sdk/google
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn()
}))

describe('PDF Extractor Utils', () => {
  beforeEach(() => {
    // Set mock environment variable for Google Gemini
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('extractTextFromPDF', () => {
    it('should extract text successfully', async () => {
      const { generateText } = await import('ai')
      const mockGenerateText = generateText as any
      
      mockGenerateText.mockResolvedValue({
        text: 'Sample PDF text content\nWith multiple lines'
      })

      const mockBuffer = Buffer.from('fake pdf data')
      const result = await extractTextFromPDF(mockBuffer)

      expect(result.success).toBe(true)
      expect(result.text).toBe('Sample PDF text content\nWith multiple lines')
      expect(result.metadata?.pages).toBe(1)
      expect(result.metadata?.info?.extractionMethod).toBe('gemini-2.5-flash')
      expect(mockGenerateText).toHaveBeenCalled()
    })

    it('should handle empty PDF', async () => {
      const { generateText } = await import('ai')
      const mockGenerateText = generateText as any
      
      mockGenerateText.mockResolvedValue({
        text: ''
      })

      const mockBuffer = Buffer.from('empty pdf')
      const result = await extractTextFromPDF(mockBuffer)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('EMPTY_PDF')
      expect(result.error?.message).toBe('PDF contains no readable text or Gemini could not extract text')
    })

    it('should handle extraction errors', async () => {
      const { generateText } = await import('ai')
      const mockGenerateText = generateText as any
      
      mockGenerateText.mockRejectedValue(new Error('API rate limit exceeded'))

      const mockBuffer = Buffer.from('corrupted pdf')
      const result = await extractTextFromPDF(mockBuffer)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('EXTRACTION_FAILED')
      expect(result.error?.message).toBe('API rate limit exceeded')
    })

    it('should handle invalid buffer', async () => {
      const result = await extractTextFromPDF(null as any)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('INVALID_BUFFER')
      expect(result.error?.message).toBe('Invalid PDF buffer provided')
    })

    it('should handle empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0)
      const result = await extractTextFromPDF(emptyBuffer)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('EMPTY_BUFFER')
      expect(result.error?.message).toBe('PDF buffer is empty')
    })
  })

  describe('preprocessPDFText', () => {
    it('should clean up common PDF artifacts', () => {
      const messyText = `
        
        Page 1    
        
        Transaction   Details    Amount
        
        2024-01-15    Amazon    1,234.56
        
        
        Page 2
        
        
        2024-01-16    Swiggy    567.89
        
        
      `

      const cleaned = preprocessPDFText(messyText)

      expect(cleaned).not.toContain('\n\n\n')
      expect(cleaned).not.toContain('  ')
      expect(cleaned).toContain('Transaction Details Amount')
      expect(cleaned.startsWith(' ')).toBe(false)
      expect(cleaned.endsWith(' ')).toBe(false)
    })

    it('should handle different line endings', () => {
      const windowsText = 'Line 1\r\nLine 2\r\nLine 3'
      const macText = 'Line 1\rLine 2\rLine 3'
      const unixText = 'Line 1\nLine 2\nLine 3'

      const cleanedWindows = preprocessPDFText(windowsText)
      const cleanedMac = preprocessPDFText(macText)
      const cleanedUnix = preprocessPDFText(unixText)

      expect(cleanedWindows).toBe('Line 1\nLine 2\nLine 3')
      expect(cleanedMac).toBe('Line 1\nLine 2\nLine 3')
      expect(cleanedUnix).toBe('Line 1\nLine 2\nLine 3')
    })

    it('should remove excessive whitespace', () => {
      const text = 'Word1     Word2\t\tWord3\n\n\nWord4'
      const cleaned = preprocessPDFText(text)

      expect(cleaned).toBe('Word1 Word2 Word3\n\nWord4')
    })

    it('should handle empty or whitespace-only text', () => {
      expect(preprocessPDFText('')).toBe('')
      expect(preprocessPDFText('   \n\n  \t  ')).toBe('')
      expect(preprocessPDFText('\n\n\n')).toBe('')
    })
  })
})