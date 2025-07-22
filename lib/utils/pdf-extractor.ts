// Dynamic import to avoid build issues with pdf-parse
import type { Result } from 'pdf-parse'

export interface PDFExtractionResult {
  success: boolean
  text?: string
  error?: {
    code: string
    message: string
  }
  metadata?: {
    pages: number
    info?: Record<string, unknown>
  }
}

export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<PDFExtractionResult> {
  try {
    // Dynamic import to avoid build issues
    const pdf = (await import('pdf-parse')).default
    const data: Result = await pdf(pdfBuffer)
    
    if (!data.text || data.text.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'EMPTY_PDF',
          message: 'PDF contains no readable text'
        }
      }
    }

    return {
      success: true,
      text: data.text,
      metadata: {
        pages: data.numpages,
        info: data.info
      }
    }
    
  } catch (error) {
    console.error('PDF extraction error:', error)
    
    return {
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to extract text from PDF'
      }
    }
  }
}

export function preprocessPDFText(text: string): string {
  return text
    // Remove common PDF artifacts
    .replace(/[^\S\r\n]+/g, ' ') // Replace multiple spaces/tabs with single space
    .replace(/\r\n/g, '\n') // Windows line endings to Unix
    .replace(/\r/g, '\n') // Mac line endings to Unix
    .replace(/\n{3,}/g, '\n\n') // Multiple newlines to double newline
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/['']/g, "'") // Normalize apostrophes
    .replace(/…/g, '...') // Replace ellipsis
    .replace(/–|—/g, '-') // Normalize dashes
    .replace(/ +/g, ' ') // Multiple spaces to single space
    .trim()
}