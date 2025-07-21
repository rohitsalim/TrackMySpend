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
  // Clean up common PDF parsing artifacts
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove page numbers and headers/footers that might interfere
    .replace(/^\d+\s*$/gm, '')
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove multiple consecutive newlines
    .replace(/\n\s*\n/g, '\n')
    .trim()
}